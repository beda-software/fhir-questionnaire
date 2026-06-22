import { ParametersParameter } from 'fhir/r4b';

export { getFirstParameter, getArrayParameters as getParameters } from './launch-context-parameters';

export function appendLaunchContextParameters(
    base: ParametersParameter[],
    additions: ParametersParameter[],
): ParametersParameter[] {
    return [...base, ...additions];
}
