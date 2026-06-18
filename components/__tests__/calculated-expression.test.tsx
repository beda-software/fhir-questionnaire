// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { FCEQuestionnaire, QuestionnaireResponseFormData } from 'sdc-qrf';

import { renderForm } from './render-form';

describe('calculatedExpression (top-level item)', () => {
    const fceQuestionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'calculated-expression-reset',
        item: [
            {
                linkId: 'daily-activity-level',
                text: 'Daily activity tolerance',
                type: 'string',
            },
            {
                linkId: 'support-score',
                text: 'Support score',
                type: 'integer',
                readOnly: true,
                calculatedExpression: {
                    language: 'text/fhirpath',
                    expression:
                        "iif(%QuestionnaireResponse.item.where(linkId='daily-activity-level').answer.valueString.first() = '2', 100, {})",
                },
            },
        ],
    };

    test('populates the dependent field when the expression yields a value', async () => {
        renderForm(fceQuestionnaire);

        fireEvent.change(screen.getByTestId<HTMLInputElement>('daily-activity-level'), { target: { value: '2' } });

        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('support-score').value).toBe('100');
        });
    });

    test('clears the displayed value when the expression result becomes empty', async () => {
        renderForm(fceQuestionnaire);

        fireEvent.change(screen.getByTestId<HTMLInputElement>('daily-activity-level'), { target: { value: '2' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('support-score').value).toBe('100');
        });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('daily-activity-level'), { target: { value: '0' } });

        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('support-score').value).toBe('');
        });
    });

    test('does not keep a stale answer in submitted form values', async () => {
        const onSubmit = vi.fn<(formData: QuestionnaireResponseFormData) => Promise<void>>(async () => {});
        renderForm(fceQuestionnaire, { onSubmit });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('daily-activity-level'), { target: { value: '2' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('support-score').value).toBe('100');
        });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('daily-activity-level'), { target: { value: '0' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('support-score').value).toBe('');
        });

        fireEvent.submit(screen.getByText('Save'));
        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
        });

        const submittedFormData = onSubmit.mock.lastCall![0];
        expect(submittedFormData.formValues['support-score']).toBeUndefined();
    });
});

describe('calculatedExpression inside a non-repeating group', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'group-calculated',
        item: [
            { linkId: 'trigger', type: 'string' },
            {
                linkId: 'vitals',
                type: 'group',
                item: [
                    { linkId: 'systolic', type: 'string' },
                    { linkId: 'diastolic', type: 'string' },
                    {
                        linkId: 'vitals-score',
                        type: 'integer',
                        readOnly: true,
                        calculatedExpression: {
                            language: 'text/fhirpath',
                            expression: `iif(%QuestionnaireResponse.item.where(linkId='trigger').answer.valueString.first() = '2', 100, {})`,
                        },
                    },
                ],
            },
        ],
    };

    test('populates and clears the calculated field without touching siblings', async () => {
        renderForm(questionnaire);

        fireEvent.change(screen.getByTestId<HTMLInputElement>('vitals.items.systolic'), { target: { value: '120' } });
        fireEvent.change(screen.getByTestId<HTMLInputElement>('trigger'), { target: { value: '2' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('vitals.items.vitals-score').value).toBe('100');
        });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('trigger'), { target: { value: '0' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('vitals.items.vitals-score').value).toBe('');
        });

        expect(screen.getByTestId<HTMLInputElement>('vitals.items.systolic').value).toBe('120');
    });
});

describe('calculatedExpression inside nested groups', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'nested-group-calculated',
        item: [
            { linkId: 'trigger', type: 'string' },
            {
                linkId: 'outer',
                type: 'group',
                item: [
                    { linkId: 'outer-note', type: 'string' },
                    {
                        linkId: 'inner',
                        type: 'group',
                        item: [
                            { linkId: 'inner-note', type: 'string' },
                            {
                                linkId: 'deep-score',
                                type: 'integer',
                                readOnly: true,
                                calculatedExpression: {
                                    language: 'text/fhirpath',
                                    expression: `iif(%QuestionnaireResponse.item.where(linkId='trigger').answer.valueString.first() = '2', 100, {})`,
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    };

    test('populates and clears a calculated field nested two groups deep', async () => {
        renderForm(questionnaire);

        fireEvent.change(screen.getByTestId<HTMLInputElement>('outer.items.outer-note'), {
            target: { value: 'outer' },
        });
        fireEvent.change(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.inner-note'), {
            target: { value: 'inner' },
        });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('trigger'), { target: { value: '2' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.deep-score').value).toBe('100');
        });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('trigger'), { target: { value: '0' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.deep-score').value).toBe('');
        });

        expect(screen.getByTestId<HTMLInputElement>('outer.items.outer-note').value).toBe('outer');
        expect(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.inner-note').value).toBe('inner');
    });
});

describe('calculatedExpression inside a repeatable group', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'repeatable-group-calculated',
        item: [
            { linkId: 'trigger', type: 'string' },
            {
                linkId: 'meds',
                type: 'group',
                repeats: true,
                item: [
                    { linkId: 'med-name', type: 'string' },
                    {
                        linkId: 'med-score',
                        type: 'integer',
                        readOnly: true,
                        calculatedExpression: {
                            language: 'text/fhirpath',
                            expression: `iif(%QuestionnaireResponse.item.where(linkId='trigger').answer.valueString.first() = '2', 100, {})`,
                        },
                    },
                ],
            },
        ],
    };

    test('calculated field clears in every instance, leaving plain fields intact', async () => {
        renderForm(questionnaire, {
            formValues: {
                meds: {
                    items: [
                        { 'med-name': [{ value: { string: 'aspirin' } }] },
                        { 'med-name': [{ value: { string: 'ibuprofen' } }] },
                    ],
                },
            },
        });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('trigger'), { target: { value: '2' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-score').value).toBe('100');
            expect(screen.getByTestId<HTMLInputElement>('meds.items.1.med-score').value).toBe('100');
        });

        fireEvent.change(screen.getByTestId<HTMLInputElement>('trigger'), { target: { value: '0' } });
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-score').value).toBe('');
            expect(screen.getByTestId<HTMLInputElement>('meds.items.1.med-score').value).toBe('');
        });

        expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-name').value).toBe('aspirin');
        expect(screen.getByTestId<HTMLInputElement>('meds.items.1.med-name').value).toBe('ibuprofen');
    });
});
