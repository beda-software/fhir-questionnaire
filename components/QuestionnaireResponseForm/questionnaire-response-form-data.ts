import { formatFHIRDateTime, initServices, useService } from '@beda.software/fhir-react';
import { RemoteDataResult, isFailure, isSuccess, mapSuccess, success } from '@beda.software/remote-data';
import {
    QuestionnaireResponse as FHIRQuestionnaireResponse,
    Parameters,
    ParametersParameter,
    Questionnaire as FHIRQuestionnaire,
} from 'fhir/r4b';
import moment from 'moment';

import {
    QuestionnaireResponse as FCEQuestionnaireResponse,
    ParametersParameter as FCEParametersParameter,
} from '../../contrib/aidbox';
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

export type QuestionnaireResponseFormSaveResponse = {
    questionnaireResponse: FHIRQuestionnaireResponse;
    extracted: boolean;
};

export interface QuestionnaireResponseFormProps {
    questionnaireLoader: QuestionnaireLoader;
    initialQuestionnaireResponse?: Partial<FHIRQuestionnaireResponse>;
    launchContextParameters?: ParametersParameter[];
    serviceProvider: ReturnType<typeof initServices>;
    autosave?: boolean;
}

interface QuestionnaireServiceLoader {
    type: 'service';
    questionnaireService: () => Promise<RemoteDataResult<FHIRQuestionnaire>>;
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

export function toQuestionnaireResponseFormData(
    questionnaire: FHIRQuestionnaire,
    questionnaireResponse: FHIRQuestionnaireResponse,
    launchContextParameters: ParametersParameter[] = [],
): QuestionnaireResponseFormData {
    return {
        context: {
            // TODO: we can't change type inside qrf utils
            questionnaire: toFirstClassExtension(questionnaire),
            questionnaireResponse: toFirstClassExtension(questionnaireResponse),
            launchContextParameters: launchContextParameters || [],
        },
        formValues: mapResponseToForm(
            toFirstClassExtension(questionnaireResponse),
            toFirstClassExtension(questionnaire),
        ),
    };
}

export function fromQuestionnaireResponseFormData(
    formData: QuestionnaireResponseFormData,
    responseSubmissionStatus?: Pick<FCEQuestionnaireResponse, 'status' | 'authored'>,
) {
    const { formValues, context } = formData;
    const { questionnaireResponse, questionnaire } = context;
    const itemContext = calcInitialContext(formData.context, formValues);
    const enabledQuestionsFormValues = removeDisabledAnswers(questionnaire, formValues, itemContext);

    const finalFCEQuestionnaireResponse: FCEQuestionnaireResponse = {
        ...questionnaireResponse,
        ...mapFormToResponse(enabledQuestionsFormValues, questionnaire),
        ...responseSubmissionStatus,
    };

    return {
        questionnaire: fromFirstClassExtension(questionnaire),
        questionnaireResponse: fromFirstClassExtension(finalFCEQuestionnaireResponse),
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
async function loadQuestionnaireResponseFormData(props: QuestionnaireResponseFormProps) {
    const { launchContextParameters, questionnaireLoader, initialQuestionnaireResponse, serviceProvider, autosave } =
        props;

    const fetchQuestionnaire = () => {
        if (questionnaireLoader.type === 'raw-id') {
            return serviceProvider.service<FHIRQuestionnaire>({
                method: 'GET',
                url: `/Questionnaire/${questionnaireLoader.questionnaireId}`,
            });
        }
        if (questionnaireLoader.type === 'id') {
            return serviceProvider.service<FHIRQuestionnaire>({
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

    let populateRemoteData: RemoteDataResult<FHIRQuestionnaireResponse>;
    if (initialQuestionnaireResponse?.id) {
        populateRemoteData = success(initialQuestionnaireResponse as FHIRQuestionnaireResponse);
    } else {
        populateRemoteData = mapSuccess(
            await serviceProvider.service<FHIRQuestionnaireResponse>({
                method: 'POST',
                url: '/Questionnaire/$populate',
                data: params,
            }),
            (draft): FHIRQuestionnaireResponse => ({
                ...initialQuestionnaireResponse,
                ...draft,
            }),
        );
        if (isSuccess(populateRemoteData) && autosave) {
            populateRemoteData.data.status = 'in-progress';
            populateRemoteData = await serviceProvider.saveFHIRResource(populateRemoteData.data);
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
    const { formData, launchContextParameters, serviceProvider } = props;

    const { questionnaire, questionnaireResponse } = fromQuestionnaireResponseFormData(formData, {
        status: 'completed',
        authored: formatFHIRDateTime(moment()),
    });

    const constraintRemoteData = await serviceProvider.service({
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

    const saveQRRemoteData = await serviceProvider.saveFHIRResource(questionnaireResponse);
    if (isFailure(saveQRRemoteData)) {
        return saveQRRemoteData;
    }

    const extractRemoteData = await serviceProvider.service<any>({
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
    const [response] = useService<QuestionnaireResponseFormData>(async () => {
        const r = await loadQuestionnaireResponseFormData(props);

        return mapSuccess(r, ({ context, formValues }) => {
            const result: QuestionnaireResponseFormData = {
                formValues,
                context: {
                    launchContextParameters: context.launchContextParameters as unknown as FCEParametersParameter[],
                    questionnaire: context.questionnaire,
                    questionnaireResponse: context.questionnaireResponse,
                },
            };
            return result;
        });
    }, [props, ...deps]);

    const handleUpdate = async (
        qrFormData: QuestionnaireResponseFormData,
    ): Promise<RemoteDataResult<QuestionnaireResponseFormSaveResponse>> => {
        const draft = fromQuestionnaireResponseFormData(qrFormData, { status: 'in-progress' });
        const responseRemoteData = await props.serviceProvider.saveFHIRResource(draft.questionnaireResponse);
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
