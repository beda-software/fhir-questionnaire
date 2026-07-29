import { Extension } from 'fhir/r4b';

export const ASSEMBLED_FROM_EXTENSION_URL =
    'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembledFrom';

export function getExtensionCanonical(
    extensions: Extension[] | undefined,
    url: string,
): string | undefined {
    return extensions?.find((extension) => extension.url === url)?.valueCanonical;
}
