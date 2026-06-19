import { createContext, ReactNode, useContext, useMemo } from 'react';

import { ParametersParameter } from 'fhir/r4b';

import { appendLaunchContextParameters } from '../utils';

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

export function ClinicalContext({ context, children }: { context: ParametersParameter[]; children: ReactNode }) {
    const parent = useClinicalContext();

    const value = useMemo<ClinicalContextValue>(() => {
        return {
            parameters: appendLaunchContextParameters(parent.parameters, context),
        };
    }, [parent.parameters, context]);

    return <ClinicalContextReactContext.Provider value={value}>{children}</ClinicalContextReactContext.Provider>;
}
