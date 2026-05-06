import { success } from '@beda.software/remote-data';
import { Parameters as FHIRParameters, Questionnaire, QuestionnaireResponse } from 'fhir/r4b';

import { describe, expect, test, vi } from 'vitest';
import {
    getSdcServices,
    QuestionnaireResponseFormProps,
} from '../QuestionnaireResponseForm/questionnaire-response-form-data';

type FhirService = NonNullable<QuestionnaireResponseFormProps['fhirService']>;

const parameters: FHIRParameters = {
    resourceType: 'Parameters',
    parameter: [
        {
            name: 'questionnaire',
            resource: {
                resourceType: 'Questionnaire',
                status: 'active',
            },
        },
    ],
};

const questionnaire: Questionnaire = {
    resourceType: 'Questionnaire',
    id: 'test-questionnaire',
    status: 'active',
};

const questionnaireResponse: QuestionnaireResponse = {
    resourceType: 'QuestionnaireResponse',
    id: 'test-response',
    status: 'in-progress',
};

const createService = (response = questionnaireResponse) =>
    vi.fn(async () => success(response)) as unknown as FhirService;

describe('getSdcServices', () => {
    test('uses the default service for SDC operation wrappers', async () => {
        const service = createService();
        const sdcServices = getSdcServices({
            serviceProvider: {
                service,
            },
        });

        await sdcServices.constraintCheck(parameters);
        await sdcServices.populate(parameters);
        await sdcServices.extract(parameters);
        await sdcServices.getQuestionnaire('test-questionnaire');
        await sdcServices.assemble('test-questionnaire');

        expect(service).toHaveBeenNthCalledWith(1, {
            method: 'POST',
            url: '/QuestionnaireResponse/$constraint-check',
            data: parameters,
        });
        expect(service).toHaveBeenNthCalledWith(2, {
            method: 'POST',
            url: '/Questionnaire/$populate',
            data: parameters,
        });
        expect(service).toHaveBeenNthCalledWith(3, {
            method: 'POST',
            url: '/Questionnaire/$extract',
            data: parameters,
        });
        expect(service).toHaveBeenNthCalledWith(4, {
            method: 'GET',
            url: '/Questionnaire/test-questionnaire',
        });
        expect(service).toHaveBeenNthCalledWith(5, {
            method: 'GET',
            url: '/Questionnaire/test-questionnaire/$assemble',
        });
    });

    test('uses fhirService instead of serviceProvider.service for defaults', async () => {
        const serviceProviderService = createService();
        const fhirService = createService();
        const sdcServices = getSdcServices({
            serviceProvider: {
                service: serviceProviderService,
            },
            fhirService,
        });

        await sdcServices.populate(parameters);

        expect(fhirService).toHaveBeenCalledWith({
            method: 'POST',
            url: '/Questionnaire/$populate',
            data: parameters,
        });
        expect(serviceProviderService).not.toHaveBeenCalled();
    });

    test('uses provided SDC service overrides', async () => {
        const service = createService();
        const constraintCheck = vi.fn(async () => success({}));
        const populate = vi.fn(async () => success(questionnaireResponse));
        const extract = vi.fn(async () => success({}));
        const getQuestionnaire = vi.fn(async () => success(questionnaire));
        const assemble = vi.fn(async () => success(questionnaire));
        const saveCompletedQuestionnaireResponse = vi.fn(async () => success(questionnaireResponse));
        const saveInProgressQuestionnaireResponse = vi.fn(async () => success(questionnaireResponse));
        const sdcServices = getSdcServices({
            serviceProvider: {
                service,
            },
            sdcServiceProvider: {
                constraintCheck,
                populate,
                extract,
                getQuestionnaire,
                assemble,
                saveCompletedQuestionnaireResponse,
                saveInProgressQuestionnaireResponse,
            },
        });

        await sdcServices.constraintCheck(parameters);
        await sdcServices.populate(parameters);
        await sdcServices.extract(parameters);
        await sdcServices.getQuestionnaire('test-questionnaire');
        await sdcServices.assemble('test-questionnaire');
        await sdcServices.saveCompletedQuestionnaireResponse(questionnaireResponse);
        await sdcServices.saveInProgressQuestionnaireResponse(questionnaireResponse);

        expect(constraintCheck).toHaveBeenCalledWith(parameters);
        expect(populate).toHaveBeenCalledWith(parameters);
        expect(extract).toHaveBeenCalledWith(parameters);
        expect(getQuestionnaire).toHaveBeenCalledWith('test-questionnaire');
        expect(assemble).toHaveBeenCalledWith('test-questionnaire');
        expect(saveCompletedQuestionnaireResponse).toHaveBeenCalledWith(questionnaireResponse);
        expect(saveInProgressQuestionnaireResponse).toHaveBeenCalledWith(questionnaireResponse);
        expect(service).not.toHaveBeenCalled();
    });

    test('creates default save handlers with the selected service', async () => {
        const service = createService(questionnaireResponse);
        const sdcServices = getSdcServices({
            serviceProvider: {
                service,
            },
        });

        await sdcServices.saveCompletedQuestionnaireResponse(questionnaireResponse);
        await sdcServices.saveInProgressQuestionnaireResponse(questionnaireResponse);

        expect(service).toHaveBeenNthCalledWith(1, {
            method: 'PUT',
            url: '/QuestionnaireResponse/test-response',
            data: questionnaireResponse,
        });
        expect(service).toHaveBeenNthCalledWith(2, {
            method: 'PUT',
            url: '/QuestionnaireResponse/test-response',
            data: questionnaireResponse,
        });
    });
});
