import { ParametersParameter } from 'fhir/r4b';

import { describe, expect, test } from 'vitest';

import { getFirstParameter, getParameters } from '../launch-context-parameters';

const patient = (id: string): ParametersParameter => ({
    name: 'patient',
    resource: { resourceType: 'Patient', id },
});

describe('getParameters', () => {
    test('returns empty array when no match', () => {
        expect(getParameters([patient('1')], 'encounter')).toEqual([]);
    });

    test('returns single match', () => {
        expect(getParameters([patient('1')], 'patient')).toEqual([patient('1')]);
    });

    test('returns all matches child-first when names repeat', () => {
        const params = [patient('parent'), patient('child')];

        expect(getParameters(params, 'patient')).toEqual([patient('child'), patient('parent')]);
    });
});

describe('getFirstParameter', () => {
    test('returns undefined when no match', () => {
        expect(getFirstParameter([patient('1')], 'encounter')).toBeUndefined();
    });

    test('returns child entry when names repeat', () => {
        const params = [patient('parent'), patient('child')];

        expect(getFirstParameter(params, 'patient')).toEqual(patient('child'));
    });

    test('matches first entry of getParameters', () => {
        const params = [patient('parent'), patient('child')];

        expect(getFirstParameter(params, 'patient')).toEqual(getParameters(params, 'patient')[0]);
    });
});
