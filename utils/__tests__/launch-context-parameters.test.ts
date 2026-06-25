import { ParametersParameter } from 'fhir/r4b';

import { describe, expect, test } from 'vitest';

import { getFirstParameter, getArrayParameters } from '../launch-context-parameters';

const patient = (id: string): ParametersParameter => ({
    name: 'patient',
    resource: { resourceType: 'Patient', id },
});

describe('getParameters', () => {
    test('returns empty array when no match', () => {
        expect(getArrayParameters([patient('1')], 'encounter')).toEqual([]);
    });

    test('returns single match', () => {
        expect(getArrayParameters([patient('1')], 'patient')).toEqual([patient('1')]);
    });

    test('returns all matches child-first when names repeat', () => {
        const params = [patient('outer'), patient('inner')];

        expect(getArrayParameters(params, 'patient')).toEqual([patient('outer'), patient('inner')]);
    });
});

describe('getFirstParameter', () => {
    test('returns undefined when no match', () => {
        expect(getFirstParameter([patient('1')], 'encounter')).toBeUndefined();
    });

    test('returns outer entry when names repeat', () => {
        const params = [patient('outer'), patient('inner')];

        expect(getFirstParameter(params, 'patient')).toEqual(patient('outer'));
    });

    test('matches first entry of getArrayParameters', () => {
        const params = [patient('parent'), patient('child')];

        expect(getFirstParameter(params, 'patient')).toEqual(getArrayParameters(params, 'patient')[0]);
    });
});
