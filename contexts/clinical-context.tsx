import { createContext, ReactNode, useContext, useMemo } from 'react';

import { ParametersParameter } from 'fhir/r4b';

import { mergeLaunchContextParameters } from '../utils';

export interface ClinicalContextValue {
    parameters: ParametersParameter[];
}

const defaultValue: ClinicalContextValue = {
    parameters: [],
};

const ClinicalContextReactContext = createContext<ClinicalContextValue>(defaultValue);

export function useClinicalContext(): ClinicalContextValue {
    return useContext(ClinicalContextReactContext);
}

export function ClinicalContext({
    context,
    children,
    append,
}: {
    context: ParametersParameter[];
    children: ReactNode;
    append?: boolean;
}) {
    const parent = useClinicalContext();

    const value = useMemo<ClinicalContextValue>(() => {
        return {
            parameters: mergeLaunchContextParameters(parent.parameters, context, append),
        };
    }, [parent.parameters, context, append]);

    return <ClinicalContextReactContext.Provider value={value}>{children}</ClinicalContextReactContext.Provider>;
}
