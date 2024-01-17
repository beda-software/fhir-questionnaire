import { QuestionnaireResponse as FHIRQuestionnaireResponse } from 'fhir/r4b';

import { QuestionnaireResponse as FCEQuestionnaireResponse } from '../../../../../contrib/aidbox';

import { fromFHIRReference } from '../../../converter';

export function processReference(fhirQuestionnaireResponse: FHIRQuestionnaireResponse): FCEQuestionnaireResponse {
    const { encounter, source, ...commonProperties } = fhirQuestionnaireResponse;
    const fceQuestionnaireResponse: FCEQuestionnaireResponse = commonProperties as FCEQuestionnaireResponse;
    if (encounter?.reference) {
        fceQuestionnaireResponse.encounter = fromFHIRReference(encounter);
    }
    if (source?.reference) {
        fceQuestionnaireResponse.source = fromFHIRReference(source);
    }
    return fceQuestionnaireResponse;
}
