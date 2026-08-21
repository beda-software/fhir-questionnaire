import { describe, expect, test, vi } from 'vitest';
import { FCEQuestionnaire, FormItems, QuestionnaireResponseFormData } from 'sdc-qrf';

import { questionnaireItemsToValidationSchema } from '../../QuestionnaireResponseForm/BaseQuestionnaireResponseForm/utils';
import { buildQrfDataContext } from '../mocks/qrf-data-context';

describe('enableWhenExpression gates validation when context is supplied', () => {
    const fceQuestionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            { linkId: 'trigger', type: 'string' },
            {
                linkId: 'conditional',
                type: 'string',
                required: true,
                enableWhenExpression: {
                    language: 'text/fhirpath',
                    expression: "%QuestionnaireResponse.item.where(linkId='trigger').answer.valueString.first() = 'show'",
                },
            },
        ],
    };
    const qrfDataContext = buildQrfDataContext(fceQuestionnaire);

    test('expression-hidden required item is not enforced', async () => {
        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!, undefined, qrfDataContext);
        const values: FormItems = {
            trigger: [{ value: { string: 'hide' } }],
            conditional: undefined,
        };
        expect(await schema.isValid(values)).toBe(true);
    });

    test('expression-shown required item is enforced', async () => {
        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!, undefined, qrfDataContext);
        const values: FormItems = {
            trigger: [{ value: { string: 'show' } }],
            conditional: undefined,
        };
        expect(await schema.isValid(values)).toBe(false);
    });
});

describe('enableWhenExpression takes priority over enableWhen for validation', () => {
    const fceQuestionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            { linkId: 'toggle', type: 'boolean' },
            {
                linkId: 'conditional',
                type: 'string',
                required: true,
                enableWhen: [{ question: 'toggle', operator: '=', answerBoolean: true }],
                enableWhenExpression: {
                    language: 'text/fhirpath',
                    expression: 'false',
                },
            },
        ],
    };
    const qrfDataContext = buildQrfDataContext(fceQuestionnaire);

    test('expression result wins over enableWhen', async () => {
        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!, undefined, qrfDataContext);
        const values: FormItems = {
            toggle: [{ value: { boolean: true } }],
            conditional: undefined,
        };
        expect(await schema.isValid(values)).toBe(true);
    });
});

describe('Non-boolean expression result surfaces as a validation error', () => {
    const fceQuestionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'conditional',
                type: 'string',
                required: true,
                enableWhenExpression: {
                    language: 'text/fhirpath',
                    expression: "'not-a-boolean'",
                },
            },
        ],
    };
    const qrfDataContext = buildQrfDataContext(fceQuestionnaire);

    test('throws instead of returning a validation result', async () => {
        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!, undefined, qrfDataContext);
        const values: FormItems = { conditional: undefined };
        await expect(schema.validate(values)).rejects.toThrow('conditional');
    });
});

describe('Backward-compatible fallback without context', () => {
    test('no context supplied, enableWhen-only item behaves as before', async () => {
        const fceQuestionnaire: FCEQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                { linkId: 'toggle', type: 'boolean' },
                {
                    linkId: 'conditional',
                    type: 'string',
                    required: true,
                    enableWhen: [{ question: 'toggle', operator: '=', answerBoolean: true }],
                },
            ],
        };

        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!);
        expect(
            await schema.isValid({
                toggle: [{ value: { boolean: false } }],
                conditional: undefined,
            }),
        ).toBe(true);
        expect(
            await schema.isValid({
                toggle: [{ value: { boolean: true } }],
                conditional: undefined,
            }),
        ).toBe(false);
    });

    test('no context supplied, enableWhenExpression-only item warns and stays enforced', async () => {
        const fceQuestionnaire: FCEQuestionnaire = {
            resourceType: 'Questionnaire',
            status: 'active',
            item: [
                {
                    linkId: 'conditional',
                    type: 'string',
                    required: true,
                    enableWhenExpression: {
                        language: 'text/fhirpath',
                        expression: 'true',
                    },
                },
            ],
        };
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!);
        expect(await schema.isValid({ conditional: undefined })).toBe(false);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('conditional'));

        warnSpy.mockRestore();
    });
});

describe('enableWhen (no expression) on an item nested inside a repeating group', () => {
    const fceQuestionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'meds',
                type: 'group',
                repeats: true,
                item: [
                    { linkId: 'take-it', type: 'boolean' },
                    {
                        linkId: 'dose',
                        type: 'string',
                        required: true,
                        enableWhen: [{ question: 'take-it', operator: '=', answerBoolean: true }],
                    },
                ],
            },
        ],
    };

    test('row-specific enabling: only the enabled row enforces required', async () => {
        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!);

        // Row 0 enabled and missing dose -> invalid
        expect(
            await schema.isValid({
                meds: {
                    items: [
                        { 'take-it': [{ value: { boolean: true } }], dose: undefined },
                        { 'take-it': [{ value: { boolean: false } }], dose: undefined },
                    ],
                },
            }),
        ).toBe(false);

        // Row 0 disabled, row 1 enabled but filled -> valid
        expect(
            await schema.isValid({
                meds: {
                    items: [
                        { 'take-it': [{ value: { boolean: false } }], dose: undefined },
                        {
                            'take-it': [{ value: { boolean: true } }],
                            dose: [{ value: { string: 'aspirin' } }],
                        },
                    ],
                },
            }),
        ).toBe(true);
    });
});

describe('enableWhenExpression validation error lands on the nested field path', () => {
    const fceQuestionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        item: [
            {
                linkId: 'staff-only-reason',
                type: 'string',
                required: true,
                enableWhenExpression: {
                    language: 'text/fhirpath',
                    expression: "%Author.resourceType != 'Patient'",
                },
            },
        ],
    };
    const qrfDataContext: QuestionnaireResponseFormData['context'] = buildQrfDataContext(fceQuestionnaire, [
        { name: 'Author', resource: { resourceType: 'Practitioner', id: 'practitioner-1' } },
    ]);

    test('error path matches the answer input the control is registered under, not just the top-level linkId', async () => {
        const schema = questionnaireItemsToValidationSchema(fceQuestionnaire.item!, undefined, qrfDataContext);
        const values: FormItems = {
            'staff-only-reason': [{ value: { string: undefined } }],
        };

        await expect(schema.validate(values, { abortEarly: false })).rejects.toMatchObject({
            // Matches the path controls.tsx registers the text input under - the flat `staff-only-reason`
            // path would block submission without ever highlighting the field.
            inner: [expect.objectContaining({ path: 'staff-only-reason[0].value.string' })],
        });
    });
});
