import { ParametersParameter } from 'fhir/r4b';

export { getFirstParameter, getArrayParameters as getParameters } from './launch-context-parameters';

export function mergeLaunchContextParameters(
    base: ParametersParameter[],
    additions: ParametersParameter[],
    append?: boolean,
): ParametersParameter[] {
    if (append) {
        return [...base, ...additions];
    }

    const additionNames = new Set(additions.map((p) => p.name));
    return [...base.filter((p) => !additionNames.has(p.name)), ...additions];
}
