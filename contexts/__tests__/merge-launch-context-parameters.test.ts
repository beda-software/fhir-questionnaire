import { ParametersParameter } from 'fhir/r4b';

import { describe, expect, test } from 'vitest';

import { mergeLaunchContextParameters } from '../../utils';

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

describe('mergeLaunchContextParameters', () => {
    test('returns base when additions are empty', () => {
        const base = [patient('1')];

        expect(mergeLaunchContextParameters(base, [])).toEqual(base);
    });

    test('returns additions when base is empty', () => {
        const additions = [patient('1')];

        expect(mergeLaunchContextParameters([], additions)).toEqual(additions);
    });

    test('appends distinct parameters in order', () => {
        const base = [patient('1')];
        const additions = [encounter('2')];

        expect(mergeLaunchContextParameters(base, additions)).toEqual([patient('1'), encounter('2')]);
    });

    test('additions overwrite base params with matching name by default', () => {
        const base = [patient('parent')];
        const additions = [patient('child')];

        expect(mergeLaunchContextParameters(base, additions)).toEqual([patient('child')]);
    });

    test('additions overwrite only matching names, keeping unmatched base params', () => {
        const base = [patient('parent'), encounter('1')];
        const additions = [patient('child')];

        expect(mergeLaunchContextParameters(base, additions)).toEqual([encounter('1'), patient('child')]);
    });

    test('keeps duplicate names in storage order when append=true', () => {
        const base = [patient('parent')];
        const additions = [patient('child')];

        expect(mergeLaunchContextParameters(base, additions, true)).toEqual([patient('parent'), patient('child')]);
    });
});
