import { ParametersParameter } from 'fhir/r4b';

import { compileAsArray, compileAsFirst, fhirpathR4Model } from './fhirpath';

type ParametersResource = { resourceType: 'Parameters'; parameter: ParametersParameter[] };

const matchParametersByName = compileAsArray<ParametersResource, ParametersParameter>(
    'parameter.where(name = %name)',
    fhirpathR4Model,
);

const getLastMatchingParameter = compileAsFirst<ParametersResource, ParametersParameter>(
    'parameter.where(name = %name).last()',
    fhirpathR4Model,
);

function wrapAsParameters(params: ParametersParameter[]): ParametersResource {
    return { resourceType: 'Parameters', parameter: params };
}

export function getParameters(params: ParametersParameter[], name: string): ParametersParameter[] {
    return [...matchParametersByName(wrapAsParameters(params), { name })].reverse();
}

export function getFirstParameter(params: ParametersParameter[], name: string): ParametersParameter | undefined {
    return getLastMatchingParameter(wrapAsParameters(params), { name });
}
