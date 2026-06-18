// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, test } from 'vitest';

import { RemoteDataResult, success } from '@beda.software/remote-data';

import { FCEQuestionnaireItem, FormItems, QuestionnaireResponseFormProvider } from 'sdc-qrf';

import { useFieldController } from '../QuestionnaireResponseForm';

async function fhirServiceStub<S = any, F = any>(): Promise<RemoteDataResult<S, F>> {
    return success({} as S);
}

describe('field subscription to ancestor-path writes', () => {
    const questionItem: FCEQuestionnaireItem = {
        linkId: 'parent',
        type: 'integer',
    };

    function Leaf() {
        const { value, onChange } = useFieldController<number>(['parent', 0, 'value', 'integer'], questionItem);

        return <input data-testid="leaf" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} />;
    }

    function Harness() {
        const form = useForm<FormItems>({ defaultValues: {} });

        return (
            <FormProvider {...form}>
                <QuestionnaireResponseFormProvider
                    formValues={{}}
                    setFormValues={() => {}}
                    fhirService={fhirServiceStub}
                    questionItemComponents={{}}
                >
                    <Leaf />
                    <button onClick={() => form.setValue('parent', [{ value: { integer: 100 } }])}>set</button>
                    <button onClick={() => form.setValue('parent', undefined)}>clear</button>
                </QuestionnaireResponseFormProvider>
            </FormProvider>
        );
    }

    test('leaf field receives updates when an ancestor path is written as a whole', async () => {
        render(<Harness />);

        fireEvent.click(screen.getByText('set'));
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('leaf').value).toBe('100');
        });

        fireEvent.click(screen.getByText('clear'));
        await waitFor(() => {
            expect(screen.getByTestId<HTMLInputElement>('leaf').value).toBe('');
        });
    });
});
