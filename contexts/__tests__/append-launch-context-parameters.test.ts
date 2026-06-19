import { ParametersParameter } from 'fhir/r4b';

import { describe, expect, test } from 'vitest';

import { appendLaunchContextParameters } from '../../utils';

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

describe('appendLaunchContextParameters', () => {
    test('returns base when additions are empty', () => {
        const base = [patient('1')];

        expect(appendLaunchContextParameters(base, [])).toBe(base);
    });

    test('returns additions when base is empty', () => {
        const additions = [patient('1')];

        expect(appendLaunchContextParameters([], additions)).toBe(additions);
    });

    test('appends distinct parameters in order', () => {
        const base = [patient('1')];
        const additions = [encounter('2')];

        expect(appendLaunchContextParameters(base, additions)).toEqual([patient('1'), encounter('2')]);
    });

    test('keeps duplicate names in storage order', () => {
        const base = [patient('parent')];
        const additions = [patient('child')];

        expect(appendLaunchContextParameters(base, additions)).toEqual([patient('parent'), patient('child')]);
    });
});
