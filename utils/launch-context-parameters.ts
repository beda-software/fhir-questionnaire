import { ParametersParameter } from 'fhir/r4b';

import { compileAsArray, compileAsFirst, fhirpathR4Model } from './fhirpath';

type ParametersResource = { resourceType: 'Parameters'; parameter: ParametersParameter[] };

const matchParametersByName = compileAsArray<ParametersResource, ParametersParameter>(
    'parameter.where(name = %name)',
    fhirpathR4Model,
);

const getFirstMatchingParameter = compileAsFirst<ParametersResource, ParametersParameter>(
    'parameter.where(name = %name).first()',
    fhirpathR4Model,
);

function wrapAsParameters(params: ParametersParameter[]): ParametersResource {
    return { resourceType: 'Parameters', parameter: params };
}

export function getArrayParameters(params: ParametersParameter[], name: string): ParametersParameter[] {
    return [...matchParametersByName(wrapAsParameters(params), { name })];
}

export function getFirstParameter(params: ParametersParameter[], name: string): ParametersParameter | undefined {
    return getFirstMatchingParameter(wrapAsParameters(params), { name });
}
