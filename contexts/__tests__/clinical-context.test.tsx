// @vitest-environment jsdom
import { ParametersParameter } from 'fhir/r4b';
import React, { ReactNode } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { getFirstParameter, getParameters } from '../../utils';
import { ClinicalContext, useClinicalContext } from '../clinical-context';

const patient = (id: string): ParametersParameter => ({
    name: 'patient',
    resource: { resourceType: 'Patient', id },
});

const encounter = (id: string): ParametersParameter => ({
    name: 'encounter',
    resource: {
        resourceType: 'Encounter',
        id,
        class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'IMP',
            display: 'inpatient encounter',
        },
        status: 'planned',
    },
});

function wrapperWithContext(context: ParametersParameter[]) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <ClinicalContext context={context}>{children}</ClinicalContext>;
    };
}

describe('ClinicalContext', () => {
    test('returns empty defaults without a provider', () => {
        const { result } = renderHook(() => useClinicalContext());

        expect(result.current.parameters).toEqual([]);
    });

    test('exposes provided context parameters', () => {
        const { result } = renderHook(() => useClinicalContext(), {
            wrapper: wrapperWithContext([patient('1'), encounter('2')]),
        });

        expect(result.current.parameters).toEqual([patient('1'), encounter('2')]);
    });

    test('inherits parent parameters when child context is empty', () => {
        const outer = [patient('1')];

        const { result } = renderHook(() => useClinicalContext(), {
            wrapper: ({ children }) => (
                <ClinicalContext context={outer}>
                    <ClinicalContext context={[]}>{children}</ClinicalContext>
                </ClinicalContext>
            ),
        });

        expect(result.current.parameters).toStrictEqual(outer);
    });

    test('appends nested context in storage order', () => {
        const { result } = renderHook(() => useClinicalContext(), {
            wrapper: ({ children }) => (
                <ClinicalContext context={[patient('outer'), encounter('1')]}>
                    <ClinicalContext context={[patient('inner')]}>{children}</ClinicalContext>
                </ClinicalContext>
            ),
        });

        expect(result.current.parameters).toEqual([patient('outer'), encounter('1'), patient('inner')]);
    });

    test('supports parent-first lookup for duplicate names via utils', () => {
        const { result } = renderHook(() => useClinicalContext(), {
            wrapper: ({ children }) => (
                <ClinicalContext context={[patient('outer')]}>
                    <ClinicalContext context={[patient('inner')]}>{children}</ClinicalContext>
                </ClinicalContext>
            ),
        });

        expect(getParameters(result.current.parameters, 'patient')).toEqual([patient('outer'), patient('inner')]);
        expect(getFirstParameter(result.current.parameters, 'patient')).toEqual(patient('outer'));
    });
});
