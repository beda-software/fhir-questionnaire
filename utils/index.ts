import { ParametersParameter } from 'fhir/r4b';

export function appendLaunchContextParameters(
    base: ParametersParameter[],
    additions: ParametersParameter[],
): ParametersParameter[] {
    if (!additions.length) {
        return base;
    }

    if (!base.length) {
        return additions;
    }

    return [...base, ...additions];
}
