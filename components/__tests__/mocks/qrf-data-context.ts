import { FCEQuestionnaire, fromFirstClassExtension, QuestionnaireResponseFormData } from 'sdc-qrf';

export function buildQrfDataContext(
    fceQuestionnaire: FCEQuestionnaire,
    launchContextParameters: QuestionnaireResponseFormData['context']['launchContextParameters'] = [],
): QuestionnaireResponseFormData['context'] {
    return {
        fceQuestionnaire,
        questionnaire: fromFirstClassExtension(fceQuestionnaire),
        questionnaireResponse: {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
        },
        launchContextParameters,
    };
}
