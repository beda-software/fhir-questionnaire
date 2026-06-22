import { cleanObject, formatFHIRDateTime, initServices, useService, uuid4 } from '@beda.software/fhir-react';
import { RemoteDataResult, isFailure, isSuccess, mapSuccess, success, failure } from '@beda.software/remote-data';
import { SdcServiceProvider, SdcServiceProviderContext, useClinicalContext } from '../../contexts';
import { mergeLaunchContextParameters } from '../../utils';
import {
    Bundle,
    Parameters,
    ParametersParameter,
    Questionnaire,
    QuestionnaireResponse,
    Resource,
    OperationOutcome,
} from 'fhir/r4b';
import moment from 'moment';
import { useCallback, useContext, useMemo } from 'react';

import {
    toFirstClassExtension,
    fromFirstClassExtension,
    mapFormToResponse,
    mapResponseToForm,
    calcInitialContext,
    removeDisabledAnswers,
    QuestionnaireResponseFormData,
} from 'sdc-qrf';

export type { QuestionnaireResponseFormData } from 'sdc-qrf';

export type QuestionnaireResponseFormSaveResponse<R extends Resource = any> = {
    questionnaireResponse: QuestionnaireResponse;
    extracted: boolean;
    extractedBundle: Bundle<R>[];
    extractedError?: OperationOutcome;
};

export type QuestionnaireResponseFormSaveResponseFailure = {
    questionnaireResponse?: QuestionnaireResponse;
    extractedError?: OperationOutcome;
};

export type QuestionnaireResponseFormUpdateResponse = {
    questionnaireResponse: QuestionnaireResponse;
    extracted: boolean;
};

export interface QuestionnaireResponseFormProps {
    questionnaireLoader: QuestionnaireLoader;
    initialQuestionnaireResponse?: Partial<QuestionnaireResponse>;
    launchContextParameters?: ParametersParameter[];
    serviceProvider: Pick<ReturnType<typeof initServices>, 'service'>;
    sdcServiceProvider?: SdcServiceProvider;
    fhirService?: ReturnType<typeof initServices>['service'];
    autosave?: boolean;
}

export function getSdcServices(
    props: Pick<QuestionnaireResponseFormProps, 'serviceProvider' | 'fhirService' | 'sdcServiceProvider'>,
    sdcServiceProviderFromContext?: SdcServiceProvider,
): Required<SdcServiceProvider> {
    const { serviceProvider, fhirService, sdcServiceProvider } = props;

    const defaultService = fhirService ?? serviceProvider.service;

    const defaultConstraintCheck = async (params: Parameters) => {
        return defaultService<any>({
            method: 'POST',
            url: '/QuestionnaireResponse/$constraint-check',
            data: params,
        });
    };

    const defaultPopulate = async (params: Parameters) => {
        return defaultService<QuestionnaireResponse>({
            method: 'POST',
            url: '/Questionnaire/$populate',
            data: params,
        });
    };

    const defaultExtract = async (params: Parameters) => {
        return defaultService<QuestionnaireResponse>({
            method: 'POST',
            url: '/Questionnaire/$extract',
            data: params,
        });
    };

    const defaultGetQuestionnaire = async (questionnaireId: string) => {
        return mapSuccess(
            await defaultService<Questionnaire>({
                method: 'GET',
                url: `/Questionnaire/${questionnaireId}`,
            }),
            (questionnaire) => questionnaire,
        );
    };

    const defaultAssemble = async (questionnaireId: string) => {
        return mapSuccess(
            await defaultService<Questionnaire>({
                method: 'GET',
                url: `/Questionnaire/${questionnaireId}/$assemble`,
            }),
            (questionnaire) => questionnaire,
        );
    };

    return {
        getQuestionnaire:
            sdcServiceProvider?.getQuestionnaire ??
            sdcServiceProviderFromContext?.getQuestionnaire ??
            defaultGetQuestionnaire,
        assemble: sdcServiceProvider?.assemble ?? sdcServiceProviderFromContext?.assemble ?? defaultAssemble,
        constraintCheck:
            sdcServiceProvider?.constraintCheck ??
            sdcServiceProviderFromContext?.constraintCheck ??
            defaultConstraintCheck,
        populate: sdcServiceProvider?.populate ?? sdcServiceProviderFromContext?.populate ?? defaultPopulate,
        extract: sdcServiceProvider?.extract ?? sdcServiceProviderFromContext?.extract ?? defaultExtract,
        saveCompletedQuestionnaireResponse:
            sdcServiceProvider?.saveCompletedQuestionnaireResponse ??
            sdcServiceProviderFromContext?.saveCompletedQuestionnaireResponse ??
            persistSaveQuestionnaireResponseServiceFactory(defaultService),
        saveInProgressQuestionnaireResponse:
            sdcServiceProvider?.saveInProgressQuestionnaireResponse ??
            sdcServiceProviderFromContext?.saveInProgressQuestionnaireResponse ??
            persistSaveQuestionnaireResponseServiceFactory(defaultService),
    };
}

interface QuestionnaireServiceLoader {
    type: 'service';
    questionnaireService: () => Promise<RemoteDataResult<Questionnaire>>;
}

interface QuestionnaireIdLoader {
    type: 'id';
    questionnaireId: string;
}

interface QuestionnaireIdWOAssembleLoader {
    type: 'raw-id';
    questionnaireId: string;
}

type QuestionnaireLoader = QuestionnaireServiceLoader | QuestionnaireIdLoader | QuestionnaireIdWOAssembleLoader;

export function questionnaireServiceLoader(
    questionnaireService: QuestionnaireServiceLoader['questionnaireService'],
): QuestionnaireServiceLoader {
    return {
        type: 'service',
        questionnaireService,
    };
}

export function questionnaireIdLoader(questionnaireId: string): QuestionnaireIdLoader {
    return {
        type: 'id',
        questionnaireId,
    };
}

export function questionnaireIdWOAssembleLoader(questionnaireId: string): QuestionnaireIdWOAssembleLoader {
    return {
        type: 'raw-id',
        questionnaireId,
    };
}

type QuestionnaireResponseSaveService = (
    qr: QuestionnaireResponse,
    service?: ReturnType<typeof initServices>['service'],
) => Promise<RemoteDataResult<QuestionnaireResponse>>;

export const inMemorySaveQuestionnaireResponseService: QuestionnaireResponseSaveService = (qr) =>
    Promise.resolve(success(qr));

export const persistSaveQuestionnaireResponseServiceFactory = (
    service: ReturnType<typeof initServices>['service'],
): ((qr: QuestionnaireResponse) => Promise<RemoteDataResult<QuestionnaireResponse>>) => {
    return async (qr: QuestionnaireResponse) => {
        const versionId = qr.meta && qr.meta.versionId;
        return mapSuccess(
            await service<QuestionnaireResponse>({
                method: qr.id ? 'PUT' : 'POST',
                url: `/${qr.resourceType}${qr.id ? '/' + qr.id : ''}`,
                ...(qr.id && versionId ? { headers: { 'If-Match': versionId } } : {}),
                data: cleanObject(qr),
            }),
            (savedQR) => savedQR,
        );
    };
};

export function toQuestionnaireResponseFormData(
    questionnaire: Questionnaire,
    questionnaireResponse: QuestionnaireResponse,
    launchContextParameters: ParametersParameter[] = [],
): QuestionnaireResponseFormData {
    return {
        context: {
            // TODO: we can't change type inside qrf utils
            fceQuestionnaire: toFirstClassExtension(questionnaire),
            questionnaire,
            questionnaireResponse: questionnaireResponse,
            launchContextParameters: launchContextParameters || [],
        },
        formValues: mapResponseToForm(questionnaireResponse, questionnaire),
    };
}

export function fromQuestionnaireResponseFormData(
    formData: QuestionnaireResponseFormData,
    responseSubmissionStatus?: Pick<QuestionnaireResponse, 'status' | 'authored'>,
) {
    const { formValues, context } = formData;
    const { questionnaireResponse, questionnaire } = context;
    const itemContext = calcInitialContext(formData.context, formValues);
    const enabledQuestionsFormValues = removeDisabledAnswers(questionnaire, formValues, itemContext);

    const finalFHIRQuestionnaireResponse: QuestionnaireResponse = {
        ...questionnaireResponse,
        ...mapFormToResponse(enabledQuestionsFormValues, questionnaire),
        ...responseSubmissionStatus,
    };

    return {
        questionnaire: fromFirstClassExtension(questionnaire),
        questionnaireResponse: finalFHIRQuestionnaireResponse,
        launchContextParameters: formData.context.launchContextParameters,
    };
}

/*
    Hook uses for:
    On mount:
    1. Loads Questionnaire resource: either from service (assembled with subquestionnaires) or from id
    2. Populates QuestionnaireResponse for that Questionnaire with passed
       launch context parameters
    3. Converts QuestionnaireRespnse data to initial form values and returns back


    handleSave:
    4. Uploads files attached to QuestionnaireResponse in AWS
    5. Validate questionnaireResponse with constraint operation
    6. Saves or stays in memory updated QuestionnaireResponse data from form values
    7. Applies related with Questionnaire mappers for extracting updated data to
       resources specified in the mappers
    8. Returns updated QuestionnaireResponse resource and extract result
**/
export async function loadQuestionnaireResponseFormData(
    props: QuestionnaireResponseFormProps,
    sdcServiceProviderFromContext?: SdcServiceProvider,
) {
    const { launchContextParameters, initialQuestionnaireResponse, autosave, questionnaireLoader } = props;

    const sdcServices = getSdcServices(props, sdcServiceProviderFromContext);

    const fetchQuestionnaire = async () => {
        if (questionnaireLoader.type === 'raw-id') {
            return sdcServices.getQuestionnaire(questionnaireLoader.questionnaireId);
        }
        if (questionnaireLoader.type === 'id') {
            return sdcServices.assemble(questionnaireLoader.questionnaireId);
        }
        return questionnaireLoader.questionnaireService();
    };

    const questionnaireRemoteData = await fetchQuestionnaire();

    if (isFailure(questionnaireRemoteData)) {
        return questionnaireRemoteData;
    }

    const fceQuestionnaire = toFirstClassExtension(questionnaireRemoteData.data);

    const questionnaireId = fceQuestionnaire.id ?? fceQuestionnaire.assembledFrom;

    const params: Parameters = {
        resourceType: 'Parameters',
        parameter: [
            { name: 'questionnaire', resource: questionnaireRemoteData.data },
            ...(launchContextParameters || []),
        ],
    };

    let populateRemoteData: RemoteDataResult<QuestionnaireResponse>;
    if (initialQuestionnaireResponse?.id) {
        populateRemoteData = success(initialQuestionnaireResponse as QuestionnaireResponse);
    } else {
        populateRemoteData = mapSuccess(
            await sdcServices.populate(params),
            (draft): QuestionnaireResponse => ({
                ...initialQuestionnaireResponse,
                ...draft,
                id: draft.id ?? uuid4(),
                questionnaire: questionnaireId,
            }),
        );
        if (isSuccess(populateRemoteData) && autosave) {
            populateRemoteData.data.status = 'in-progress';
            populateRemoteData = await sdcServices.saveInProgressQuestionnaireResponse(populateRemoteData.data);
        }
    }

    return mapSuccess(populateRemoteData, (populatedQR) => {
        const questionnaire = questionnaireRemoteData.data;
        const questionnaireResponse = populatedQR;

        return toQuestionnaireResponseFormData(questionnaire, questionnaireResponse, launchContextParameters);
    });
}

export async function handleFormDataSave(
    props: QuestionnaireResponseFormProps & {
        formData: QuestionnaireResponseFormData;
    },
    sdcServiceProviderFromContext?: SdcServiceProvider,
): Promise<RemoteDataResult<QuestionnaireResponseFormSaveResponse, QuestionnaireResponseFormSaveResponseFailure>> {
    const { formData, launchContextParameters } = props;

    const sdcServices = getSdcServices(props, sdcServiceProviderFromContext);

    const { questionnaire, questionnaireResponse } = fromQuestionnaireResponseFormData(formData, {
        status: 'completed',
        authored: formatFHIRDateTime(moment()),
    });

    const constraintCheckParams: Parameters = {
        resourceType: 'Parameters',
        parameter: [
            { name: 'Questionnaire', resource: questionnaire },
            { name: 'QuestionnaireResponse', resource: questionnaireResponse },
            ...(launchContextParameters || []),
        ],
    };

    const constraintRemoteData = await sdcServices.constraintCheck(constraintCheckParams);
    if (isFailure(constraintRemoteData)) {
        return failure({
            extractedError: constraintRemoteData.error,
        });
    }

    const saveQRRemoteData = await sdcServices.saveCompletedQuestionnaireResponse(questionnaireResponse);
    if (isFailure(saveQRRemoteData)) {
        return failure({
            extractedError: saveQRRemoteData.error,
        });
    }

    const extractParams: Parameters = {
        resourceType: 'Parameters',
        parameter: [
            { name: 'questionnaire', resource: questionnaire },
            { name: 'questionnaire_response', resource: saveQRRemoteData.data },
            ...(launchContextParameters || []),
        ],
    };

    const extractRemoteData = await sdcServices.extract(extractParams);

    if (isFailure(extractRemoteData)) {
        // if extract fails we use the same saveCompletedQuestionnaireResponse to rollback QR with the in-progress status to avoid data loss
        const saveQRRemoteDataError = await sdcServices.saveCompletedQuestionnaireResponse({
            ...saveQRRemoteData.data,
            status: 'in-progress',
        });

        if (isSuccess(saveQRRemoteDataError)) {
            return failure({
                extractedError: extractRemoteData.error,
                questionnaireResponse: saveQRRemoteDataError.data,
            });
        }

        return failure({
            extractedError: extractRemoteData.error,
            questionnaireResponse: saveQRRemoteData.data,
        });
    }

    // TODO: save extract result info QuestionnaireResponse.extractedResources and store
    // TODO: extracted flag

    return success({
        questionnaireResponse: saveQRRemoteData.data,
        extracted: isSuccess(extractRemoteData),
        extractedBundle: isSuccess(extractRemoteData) ? extractRemoteData.data : undefined,
    });
}

export function useQuestionnaireResponseFormData(props: QuestionnaireResponseFormProps, deps: any[] = []) {
    const sdcServiceProviderFromContext = useContext(SdcServiceProviderContext);
    const { parameters: clinicalParams } = useClinicalContext();

    const {
        questionnaireLoader,
        initialQuestionnaireResponse,
        serviceProvider,
        sdcServiceProvider,
        fhirService,
        autosave,
        launchContextParameters: propsLaunchParams,
    } = props;

    const mergedLaunchContextParameters = useMemo(() => {
        return mergeLaunchContextParameters(clinicalParams, propsLaunchParams ?? []);
    }, [clinicalParams, propsLaunchParams]);

    const propsWithClinicalContext = useMemo(
        () => ({
            questionnaireLoader,
            initialQuestionnaireResponse,
            serviceProvider,
            sdcServiceProvider,
            fhirService,
            autosave,
            launchContextParameters: mergedLaunchContextParameters,
        }),
        [
            questionnaireLoader,
            initialQuestionnaireResponse,
            serviceProvider,
            sdcServiceProvider,
            fhirService,
            autosave,
            mergedLaunchContextParameters,
        ],
    );

    const sdcServices = useMemo(
        () => getSdcServices(propsWithClinicalContext, sdcServiceProviderFromContext),
        [propsWithClinicalContext, sdcServiceProviderFromContext],
    );

    const [response] = useService<QuestionnaireResponseFormData>(async () => {
        const r = await loadQuestionnaireResponseFormData(propsWithClinicalContext, sdcServiceProviderFromContext);

        return mapSuccess(r, ({ context, formValues }) => {
            const result: QuestionnaireResponseFormData = {
                formValues,
                context,
            };
            return result;
        });
    }, [propsWithClinicalContext, ...deps]);

    const handleUpdate = useCallback(
        async (
            qrFormData: QuestionnaireResponseFormData,
        ): Promise<RemoteDataResult<QuestionnaireResponseFormUpdateResponse>> => {
            const draft = fromQuestionnaireResponseFormData(qrFormData, {
                status: 'in-progress',
                authored: formatFHIRDateTime(moment()),
            });

            return sdcServices
                .saveInProgressQuestionnaireResponse(draft.questionnaireResponse)
                .then((responseRemoteData) =>
                    mapSuccess(responseRemoteData, (questionnaireResponse) => ({
                        questionnaireResponse,
                        extracted: false,
                    })),
                );
        },
        [sdcServices],
    );

    const handleSave = useCallback(
        async (
            qrFormData: QuestionnaireResponseFormData,
        ): Promise<
            RemoteDataResult<QuestionnaireResponseFormSaveResponse, QuestionnaireResponseFormSaveResponseFailure>
        > => handleFormDataSave({ ...propsWithClinicalContext, formData: qrFormData }, sdcServiceProviderFromContext),
        [propsWithClinicalContext, sdcServiceProviderFromContext],
    );

    return { response, handleSave, handleUpdate };
}
