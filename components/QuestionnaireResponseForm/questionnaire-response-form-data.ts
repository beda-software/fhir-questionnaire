import { cleanObject, formatFHIRDateTime, initServices, useService } from '@beda.software/fhir-react';
import { RemoteDataResult, failure, isFailure, isSuccess, mapSuccess, success } from '@beda.software/remote-data';
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
    service?: ReturnType<typeof initServices>['service'];
    assemble?: ReturnType<typeof initServices>['service'];
    constraintCheck?: ReturnType<typeof initServices>['service'];
    populate?: ReturnType<typeof initServices>['service'];
    extract?: ReturnType<typeof initServices>['service'];
    saveQuestionnaireResponse?: (
        qr: QuestionnaireResponse,
        service?: ReturnType<typeof initServices>['service'],
    ) => Promise<RemoteDataResult<QuestionnaireResponse>>;
}

export interface QuestionnaireResponseFormProps {
    questionnaireLoader: QuestionnaireLoader;
    initialQuestionnaireResponse?: Partial<QuestionnaireResponse>;
    launchContextParameters?: ParametersParameter[];
    /** Deprecated: Prefer using sdcServiceProvider or fhirService instead */
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

    return {
        service: sdcServiceProvider?.service ?? fhirService ?? serviceProvider.service,
        assemble: sdcServiceProvider?.assemble ?? fhirService ?? serviceProvider.service,
        constraintCheck: sdcServiceProvider?.constraintCheck ?? fhirService ?? serviceProvider.service,
        populate: sdcServiceProvider?.populate ?? fhirService ?? serviceProvider.service,
        extract: sdcServiceProvider?.extract ?? fhirService ?? serviceProvider.service,
        saveQuestionnaireResponse:
            sdcServiceProvider?.saveQuestionnaireResponse ?? persistSaveQuestionnaireReponseService,
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

export const persistSaveQuestionnaireReponseService: QuestionnaireResponseSaveService = async (qr, service) => {
    if (!service) {
        return Promise.resolve(failure('Service not provided'));
    }

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

    const sdcServices = getSdcServices(props);

    const fetchQuestionnaire = () => {
        if (questionnaireLoader.type === 'raw-id') {
            return sdcServices.service<Questionnaire>({
                method: 'GET',
                url: `/Questionnaire/${questionnaireLoader.questionnaireId}`,
            });
        }
        if (questionnaireLoader.type === 'id') {
            return sdcServices.assemble<Questionnaire>({
                method: 'GET',
                url: `/Questionnaire/${questionnaireLoader.questionnaireId}/$assemble`,
            });
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
            await sdcServices.populate<QuestionnaireResponse>({
                method: 'POST',
                url: '/Questionnaire/$populate',
                data: params,
            }),
            (draft): QuestionnaireResponse => ({
                ...initialQuestionnaireResponse,
                ...draft,
            }),
        );
        if (isSuccess(populateRemoteData) && autosave) {
            populateRemoteData.data.status = 'in-progress';
            populateRemoteData = await sdcServices.saveQuestionnaireResponse(
                populateRemoteData.data,
                sdcServices.service,
            );
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

    const constraintRemoteData = await sdcServices.constraintCheck({
        url: '/QuestionnaireResponse/$constraint-check',
        method: 'POST',
        data: {
            resourceType: 'Parameters',
            parameter: [
                { name: 'Questionnaire', resource: questionnaire },
                { name: 'QuestionnaireResponse', resource: questionnaireResponse },
                ...(launchContextParameters || []),
            ],
        },
    });
    if (isFailure(constraintRemoteData)) {
        return constraintRemoteData;
    }

    const saveQRRemoteData = await sdcServices.saveQuestionnaireResponse(questionnaireResponse, sdcServices.service);
    if (isFailure(saveQRRemoteData)) {
        return saveQRRemoteData;
    }

    const extractRemoteData = await sdcServices.extract<any>({
        method: 'POST',
        url: '/Questionnaire/$extract',
        data: {
            resourceType: 'Parameters',
            parameter: [
                { name: 'questionnaire', resource: questionnaire },
                { name: 'questionnaire_response', resource: saveQRRemoteData.data },
                ...(launchContextParameters || []),
            ],
        },
    });

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

        const responseRemoteData = await sdcServices.saveQuestionnaireResponse(
            draft.questionnaireResponse,
            sdcServices.service,
        );

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
