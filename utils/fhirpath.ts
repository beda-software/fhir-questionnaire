import fhirpath, { Context, Model } from 'fhirpath';
import fhirpathR4Model from 'fhirpath/fhir-context/r4';

export { fhirpathR4Model };

type NonEmptyArray<T> = [T, ...T[]];

export function compileAsArray<SRC, DST = unknown, REQ = false>(expression: string, model?: Model) {
    const path = fhirpath.compile(expression, model);

    return (s: SRC, context?: Context) => path(s, context) as REQ extends true ? NonEmptyArray<DST> : DST[];
}

export function compileAsFirst<SRC, DST = unknown, REQ = false>(expression: string, model?: Model) {
    const path = fhirpath.compile(expression, model);

    return (s: SRC, context?: Context) => {
        const result = path(s, context) as DST[];

        return result[0] as REQ extends true ? DST : DST | undefined;
    };
}
