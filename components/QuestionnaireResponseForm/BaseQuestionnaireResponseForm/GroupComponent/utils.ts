import { QuestionnaireResponse } from '../../../../contrib/aidbox';
import fhirpath from 'fhirpath';

export function getInitialItemCount(resource: QuestionnaireResponse, parentPath: string[], linkId: string) {
    const expression = buildFhirPathExpression(parentPath, linkId);
    const items = fhirpath.evaluate(resource, expression) as any[];
    return items.length;
}

function buildFhirPathExpression(parentPath: string[], linkId: string) {
    let expression = 'item';
    for (let i = 0; i < parentPath.length; i++) {
        const part = parentPath[i];
        if (part === 'items') continue;
        if (!isNaN(Number(part))) {
            expression += `[${part}]`;
        } else {
            if (!expression.endsWith('item')) {
                expression += `.item`;
            }
            expression += `.where(linkId='${part}')`;
        }
    }
    if (!expression.endsWith('item')) {
        expression += `.item`;
    }
    expression += `.where(linkId='${linkId}')`;
    return expression;
}
