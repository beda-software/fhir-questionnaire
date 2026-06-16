// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { FCEQuestionnaire } from 'sdc-qrf';

import { renderForm } from './render-form';

describe('non-repeating group', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'non-repeating-group',
        item: [
            {
                linkId: 'vitals',
                type: 'group',
                item: [
                    { linkId: 'systolic', type: 'string' },
                    { linkId: 'diastolic', type: 'string' },
                ],
            },
        ],
    };

    test('sibling fields keep independent values', () => {
        renderForm(questionnaire);

        fireEvent.change(screen.getByTestId<HTMLInputElement>('vitals.items.systolic'), { target: { value: '120' } });
        fireEvent.change(screen.getByTestId<HTMLInputElement>('vitals.items.diastolic'), { target: { value: '80' } });

        expect(screen.getByTestId<HTMLInputElement>('vitals.items.systolic').value).toBe('120');
        expect(screen.getByTestId<HTMLInputElement>('vitals.items.diastolic').value).toBe('80');

        fireEvent.change(screen.getByTestId<HTMLInputElement>('vitals.items.systolic'), { target: { value: '' } });

        expect(screen.getByTestId<HTMLInputElement>('vitals.items.systolic').value).toBe('');
        expect(screen.getByTestId<HTMLInputElement>('vitals.items.diastolic').value).toBe('80');
    });
});

describe('nested groups', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'nested-groups',
        item: [
            {
                linkId: 'outer',
                type: 'group',
                item: [
                    { linkId: 'outer-note', type: 'string' },
                    {
                        linkId: 'inner',
                        type: 'group',
                        item: [{ linkId: 'inner-note', type: 'string' }],
                    },
                ],
            },
        ],
    };

    test('fields at different nesting levels keep independent values', () => {
        renderForm(questionnaire);

        fireEvent.change(screen.getByTestId<HTMLInputElement>('outer.items.outer-note'), {
            target: { value: 'outer' },
        });
        fireEvent.change(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.inner-note'), {
            target: { value: 'inner' },
        });

        expect(screen.getByTestId<HTMLInputElement>('outer.items.outer-note').value).toBe('outer');
        expect(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.inner-note').value).toBe('inner');

        fireEvent.change(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.inner-note'), {
            target: { value: '' },
        });

        expect(screen.getByTestId<HTMLInputElement>('outer.items.inner.items.inner-note').value).toBe('');
        expect(screen.getByTestId<HTMLInputElement>('outer.items.outer-note').value).toBe('outer');
    });
});

describe('repeatable group', () => {
    const questionnaire: FCEQuestionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'repeatable-group',
        item: [
            {
                linkId: 'meds',
                type: 'group',
                repeats: true,
                item: [{ linkId: 'med-name', type: 'string' }],
            },
        ],
    };

    test('each instance keeps its own value', () => {
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

        expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-name').value).toBe('aspirin');
        expect(screen.getByTestId<HTMLInputElement>('meds.items.1.med-name').value).toBe('ibuprofen');

        fireEvent.change(screen.getByTestId<HTMLInputElement>('meds.items.1.med-name'), {
            target: { value: 'naproxen' },
        });
        expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-name').value).toBe('aspirin');
        expect(screen.getByTestId<HTMLInputElement>('meds.items.1.med-name').value).toBe('naproxen');

        fireEvent.change(screen.getByTestId<HTMLInputElement>('meds.items.0.med-name'), { target: { value: '' } });
        expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-name').value).toBe('');
        expect(screen.getByTestId<HTMLInputElement>('meds.items.1.med-name').value).toBe('naproxen');
    });

    test('adding an instance preserves existing instances', async () => {
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

        expect(screen.queryByTestId('meds.items.2.med-name')).toBeNull();

        fireEvent.click(screen.getByTestId('add:meds'));

        await waitFor(() => {
            expect(screen.queryByTestId('meds.items.2.med-name')).not.toBeNull();
        });
        expect(screen.getByTestId<HTMLInputElement>('meds.items.2.med-name').value).toBe('');
        expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-name').value).toBe('aspirin');
        expect(screen.getByTestId<HTMLInputElement>('meds.items.1.med-name').value).toBe('ibuprofen');
    });

    test('removing an instance shifts the remaining ones', async () => {
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

        fireEvent.click(screen.getByTestId('remove:meds:0'));

        await waitFor(() => {
            expect(screen.queryByTestId('meds.items.1.med-name')).toBeNull();
        });
        expect(screen.getByTestId<HTMLInputElement>('meds.items.0.med-name').value).toBe('ibuprofen');
    });
});
