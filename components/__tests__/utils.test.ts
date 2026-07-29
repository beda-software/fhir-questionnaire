import { Extension } from 'fhir/r4b';
import { describe, expect, test } from 'vitest';

import { ASSEMBLED_FROM_EXTENSION_URL, getExtensionCanonical } from '../QuestionnaireResponseForm/utils';

describe('getExtensionCanonical', () => {
    test('returns valueCanonical for a matching extension url', () => {
        const extensions: Extension[] = [
            {
                url: 'https://example.org/other',
                valueString: 'ignored',
            },
            {
                url: ASSEMBLED_FROM_EXTENSION_URL,
                valueCanonical: 'allergies',
            },
        ];

        expect(getExtensionCanonical(extensions, ASSEMBLED_FROM_EXTENSION_URL)).toBe('allergies');
    });

    test('returns undefined when extensions is missing', () => {
        expect(getExtensionCanonical(undefined, ASSEMBLED_FROM_EXTENSION_URL)).toBeUndefined();
    });

    test('returns undefined when no extension matches the url', () => {
        const extensions: Extension[] = [
            {
                url: 'https://example.org/other',
                valueCanonical: 'other',
            },
        ];

        expect(getExtensionCanonical(extensions, ASSEMBLED_FROM_EXTENSION_URL)).toBeUndefined();
    });
});
