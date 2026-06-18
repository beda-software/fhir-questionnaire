import { createContext, ReactNode, useContext, useMemo } from 'react';

import { ParametersParameter } from 'fhir/r4b';

import { appendLaunchContextParameters } from '../utils';

export interface ClinicalContextValue {
    parameters: ParametersParameter[];
    getParameter: (name: string) => ParametersParameter[];
    getParameterAsFirst: (name: string) => ParametersParameter | undefined;
}

const defaultValue: ClinicalContextValue = {
    parameters: [],
    getParameter: () => [],
    getParameterAsFirst: () => undefined,
};

const ClinicalContextReactContext = createContext<ClinicalContextValue>(defaultValue);

export function useClinicalContext(): ClinicalContextValue {
    return useContext(ClinicalContextReactContext);
}

function collectParameterMatches(params: ParametersParameter[], name: string): ParametersParameter[] {
    const matches: ParametersParameter[] = [];

    for (const p of params) {
        if (p.name === name) {
            matches.push(p);
        }
    }

    return matches;
}

export function getParameter(params: ParametersParameter[], name: string): ParametersParameter[] {
    return collectParameterMatches(params, name).reverse();
}

export function getParameterAsFirst(params: ParametersParameter[], name: string): ParametersParameter | undefined {
    const matches = collectParameterMatches(params, name);

    if (!matches.length) {
        return undefined;
    }

    return matches[matches.length - 1];
}

export function ClinicalContext({ context, children }: { context: ParametersParameter[]; children: ReactNode }) {
    const parent = useClinicalContext();

    const merged = useMemo(() => {
        return appendLaunchContextParameters(parent.parameters, context);
    }, [parent.parameters, context]);

    const value = useMemo<ClinicalContextValue>(
        () => ({
            parameters: merged,
            getParameter: (name) => getParameter(merged, name),
            getParameterAsFirst: (name) => getParameterAsFirst(merged, name),
        }),
        [merged],
    );

    return <ClinicalContextReactContext.Provider value={value}>{children}</ClinicalContextReactContext.Provider>;
}
