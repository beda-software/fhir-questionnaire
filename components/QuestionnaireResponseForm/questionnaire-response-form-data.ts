import { cleanObject, formatFHIRDateTime, initServices, useService } from '@beda.software/fhir-react';
import { RemoteDataResult, isFailure, isSuccess, mapSuccess, success } from '@beda.software/remote-data';
import { Bundle, Parameters, ParametersParameter, Questionnaire, QuestionnaireResponse, Resource } from 'fhir/r4b';
import moment from 'moment';

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
};

export type QuestionnaireResponseFormUpdateResponse = {
    questionnaireResponse: QuestionnaireResponse;
    extracted: boolean;
};

interface SdcServiceProvider {
    constraintCheck?: (params: Parameters) => Promise<RemoteDataResult<any>>;
    populate?: (params: Parameters) => Promise<RemoteDataResult<QuestionnaireResponse>>;
    extract?: (params: Parameters) => Promise<RemoteDataResult<any>>;
    getQuestionnaire?: (questionnaireId: string) => Promise<RemoteDataResult<Questionnaire>>;
    saveQuestionnaireResponse?: (qr: QuestionnaireResponse) => Promise<RemoteDataResult<QuestionnaireResponse>>;
    saveQuestionnaireResponseIntermediate?: (
        qr: QuestionnaireResponse,
    ) => Promise<RemoteDataResult<QuestionnaireResponse>>;
}

export interface QuestionnaireResponseFormProps {
    questionnaireLoader: QuestionnaireLoader;
    initialQuestionnaireResponse?: Partial<QuestionnaireResponse>;
    launchContextParameters?: ParametersParameter[];
    serviceProvider: Pick<ReturnType<typeof initServices>, 'service'>;
    sdcServiceProvider?: SdcServiceProvider;
    fhirService?: ReturnType<typeof initServices>['service'];
    autosave?: boolean;
}

export function getSdcServices(props: {
    serviceProvider: Pick<ReturnType<typeof initServices>, 'service'>;
    fhirService?: ReturnType<typeof initServices>['service'];
    sdcServiceProvider?: SdcServiceProvider;
}): Required<SdcServiceProvider> {
    const { serviceProvider, fhirService, sdcServiceProvider } = props;

    const defaultService = fhirService ?? serviceProvider.service;

    const defaultGetQuestionnaire = async (questionnaireId: string) => {
        return defaultService<Questionnaire>({
            method: 'GET',
            url: `/Questionnaire/${questionnaireId}/$assemble`,
        });
    };

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

    return {
        getQuestionnaire: sdcServiceProvider?.getQuestionnaire ?? defaultGetQuestionnaire,
        constraintCheck: sdcServiceProvider?.constraintCheck ?? defaultConstraintCheck,
        populate: sdcServiceProvider?.populate ?? defaultPopulate,
        extract: sdcServiceProvider?.extract ?? defaultExtract,
        saveQuestionnaireResponse:
            sdcServiceProvider?.saveQuestionnaireResponse ??
            persistSaveQuestionnaireReponseServiceFactory(defaultService),
        saveQuestionnaireResponseIntermediate:
            sdcServiceProvider?.saveQuestionnaireResponseIntermediate ??
            persistSaveQuestionnaireReponseServiceFactory(defaultService),
    };
}

export const getQuestionnaireFromRawIdFactory = (
    service: ReturnType<typeof initServices>['service'],
): ((questionnaireId: string) => Promise<RemoteDataResult<Questionnaire>>) => {
    return async (questionnaireId: string) =>
        mapSuccess(
            await service<Questionnaire>({
                method: 'GET',
                url: `/Questionnaire/${questionnaireId}`,
            }),
            (questionnaire) => questionnaire,
        );
};

export const getQuestionnaireFromAssembleFactory = (
    service: ReturnType<typeof initServices>['service'],
): ((questionnaireId: string) => Promise<RemoteDataResult<Questionnaire>>) => {
    return async (questionnaireId: string) =>
        mapSuccess(
            await service<Questionnaire>({
                method: 'GET',
                url: `/Questionnaire/${questionnaireId}/$assemble`,
            }),
            (questionnaire) => questionnaire,
        );
};

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

// use factory pattern (qr, service => (qr)())
export const inMemorySaveQuestionnaireResponseService: QuestionnaireResponseSaveService = (qr) =>
    Promise.resolve(success(qr));

export const persistSaveQuestionnaireReponseServiceFactory = (
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
export async function loadQuestionnaireResponseFormData(props: QuestionnaireResponseFormProps) {
    const { launchContextParameters, questionnaireLoader, initialQuestionnaireResponse, autosave } = props;

    const service = props.fhirService ?? props.serviceProvider.service;
    const sdcServices = getSdcServices(props);

    const fetchQuestionnaire = () => {
        if (questionnaireLoader.type === 'raw-id') {
            return getQuestionnaireFromRawIdFactory(service)(questionnaireLoader.questionnaireId);
        }
        if (questionnaireLoader.type === 'id') {
            return getQuestionnaireFromAssembleFactory(service)(questionnaireLoader.questionnaireId);
        }

        return questionnaireLoader.questionnaireService();
    };

    const questionnaireRemoteData = await fetchQuestionnaire();

    if (isFailure(questionnaireRemoteData)) {
        return questionnaireRemoteData;
    }

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
            }),
        );
        if (isSuccess(populateRemoteData) && autosave) {
            populateRemoteData.data.status = 'in-progress';
            populateRemoteData = await sdcServices.saveQuestionnaireResponseIntermediate(populateRemoteData.data);
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
): Promise<RemoteDataResult<QuestionnaireResponseFormSaveResponse>> {
    const { formData, launchContextParameters } = props;

    const sdcServices = getSdcServices(props);

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
        return constraintRemoteData;
    }

    const saveQRRemoteData = await sdcServices.saveQuestionnaireResponse(questionnaireResponse);
    if (isFailure(saveQRRemoteData)) {
        return saveQRRemoteData;
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

    // TODO: save extract result info QuestionnaireResponse.extractedResources and store
    // TODO: extracted flag

    return success({
        questionnaireResponse: saveQRRemoteData.data,
        extracted: isSuccess(extractRemoteData),
        extractedBundle: isSuccess(extractRemoteData) ? extractRemoteData.data : undefined,
    });
}

export function useQuestionnaireResponseFormData(props: QuestionnaireResponseFormProps, deps: any[] = []) {
    const sdcServices = getSdcServices(props);

    const [response] = useService<QuestionnaireResponseFormData>(async () => {
        const r = await loadQuestionnaireResponseFormData(props);

        return mapSuccess(r, ({ context, formValues }) => {
            const result: QuestionnaireResponseFormData = {
                formValues,
                context,
            };
            return result;
        });
    }, [props, ...deps]);

    const handleUpdate = async (
        qrFormData: QuestionnaireResponseFormData,
    ): Promise<RemoteDataResult<QuestionnaireResponseFormUpdateResponse>> => {
        const draft = fromQuestionnaireResponseFormData(qrFormData, {
            status: 'in-progress',
            authored: formatFHIRDateTime(moment()),
        });

        const responseRemoteData = await sdcServices.saveQuestionnaireResponseIntermediate(draft.questionnaireResponse);

        return mapSuccess(responseRemoteData, (questionnaireResponse) => ({
            questionnaireResponse,
            extracted: false,
        }));
    };

    const handleSave = async (
        qrFormData: QuestionnaireResponseFormData,
    ): Promise<RemoteDataResult<QuestionnaireResponseFormSaveResponse>> =>
        handleFormDataSave({
            ...props,
            formData: qrFormData,
        });

    return { response, handleSave, handleUpdate };
}
