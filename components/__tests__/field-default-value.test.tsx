// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import _ from 'lodash';
import { FormProvider, useForm, UseFormReturn } from 'react-hook-form';
import { describe, expect, test, vi } from 'vitest';

import { RemoteDataResult, success } from '@beda.software/remote-data';

import { FCEQuestionnaire, FCEQuestionnaireItem, FormItems, QuestionnaireResponseFormProvider } from 'sdc-qrf';

import { fromQuestionnaireResponseFormData, useFieldController } from '../QuestionnaireResponseForm';
import { renderForm } from './render-form';

async function fhirServiceStub<S = any, F = any>(): Promise<RemoteDataResult<S, F>> {
    return success({} as S);
}

function renderField(fieldName: Array<string | number>, questionItem: FCEQuestionnaireItem) {
    let form: UseFormReturn<FormItems> | undefined;

    function Field() {
        useFieldController(fieldName, questionItem);

        return null;
    }

    function Harness() {
        form = useForm<FormItems>({ defaultValues: {} });

        return (
            <FormProvider {...form}>
                <QuestionnaireResponseFormProvider
                    formValues={{}}
                    setFormValues={() => {}}
                    fhirService={fhirServiceStub}
                    questionItemComponents={{}}
                >
                    <Field />
                </QuestionnaireResponseFormProvider>
            </FormProvider>
        );
    }

    render(<Harness />);

    return () => form!.getValues();
}

describe('useFieldController default value', () => {
    test.each([
        ['string', 'string'],
        ['integer', 'integer'],
        ['decimal', 'decimal'],
        ['boolean', 'boolean'],
        ['date', 'date'],
    ] as const)('repeating %s item bound to a single answer value gets no array default', (type, valueKey) => {
        const getValues = renderField(['item', 0, 'value', valueKey], { linkId: 'item', type, repeats: true });

        expect(_.get(getValues(), ['item', 0, 'value', valueKey])).toBeUndefined();
    });

    test('repeating choice item bound to the answers array defaults to []', () => {
        const getValues = renderField(['item'], { linkId: 'item', type: 'choice', repeats: true });

        expect(getValues().item).toEqual([]);
    });

    test('repeating group bound to the item defaults to { items: [] }', () => {
        const getValues = renderField(['group'], { linkId: 'group', type: 'group', repeats: true, item: [] });

        expect(getValues().group).toEqual({ items: [] });
    });

    test('non-repeating item bound to the answers array gets no default', () => {
        const getValues = renderField(['item'], { linkId: 'item', type: 'choice' });

        expect(getValues().item).toBeUndefined();
    });

    test('nested repeating item bound to the answers array defaults to []', () => {
        const getValues = renderField(['group', 'items', 'item'], { linkId: 'item', type: 'choice', repeats: true });

        expect(_.get(getValues(), ['group', 'items', 'item'])).toEqual([]);
    });
});

describe('submitting a form with empty repeating single-value items', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'empty-repeating-items',
        item: [
            { linkId: 'phone', type: 'string', repeats: true, readOnly: true },
            { linkId: 'count', type: 'integer', repeats: true },
        ],
    };

    test('passes validation and produces no answers', async () => {
        const onSubmit = vi.fn(async () => {});

        renderForm(questionnaire, { onSubmit });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });

        const formData = (onSubmit.mock.calls[0] as unknown[])[0] as Parameters<
            typeof fromQuestionnaireResponseFormData
        >[0];

        expect(_.get(formData.formValues, ['phone', 0, 'value', 'string'])).toBeUndefined();
        expect(_.get(formData.formValues, ['count', 0, 'value', 'integer'])).toBeUndefined();

        const { questionnaireResponse } = fromQuestionnaireResponseFormData(formData);
        const answers = (questionnaireResponse.item ?? []).flatMap((item) => item.answer ?? []);

        expect(answers).toEqual([]);
    });
});
