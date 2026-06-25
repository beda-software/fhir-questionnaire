import { RemoteDataResult } from '@beda.software/remote-data';
import { BaseQuestionnaireResponseFormProps } from '../components';
import { DebouncedFunc } from 'lodash';
import { createContext } from 'react';
import { FormItems } from 'sdc-qrf';
import { Parameters, Questionnaire, QuestionnaireResponse } from 'fhir/r4b';

export * from './valueset-expand';
export * from './clinical-context';

interface BaseQuestionnaireResponseFormPropsContextProps extends Partial<BaseQuestionnaireResponseFormProps> {
    submitting: boolean;
    saveDraft?: (currentFormValues: FormItems) => Promise<void>;
    debouncedSaveDraft?: DebouncedFunc<(currentFormValues: FormItems) => Promise<void>>;
}
export const BaseQuestionnaireResponseFormPropsContext = createContext<
    BaseQuestionnaireResponseFormPropsContextProps | undefined
>(undefined);

export interface SdcServiceProvider {
    /** Validate QuestionnaireResponse with $constraint-check operation */
    constraintCheck?: (params: Parameters) => Promise<RemoteDataResult<any>>;
    /** Populate QuestionnaireResponse */
    populate?: (params: Parameters) => Promise<RemoteDataResult<QuestionnaireResponse>>;
    /** Run $extract operation */
    extract?: (params: Parameters) => Promise<RemoteDataResult<any>>;
    /** Assemble Questionnaire resource with $assemble operation when using questionnaireLoader.type === 'id'*/
    assemble?: (questionnaireId: string) => Promise<RemoteDataResult<Questionnaire>>;
    /** Get Questionnaire resource when using questionnaireLoader.type === 'raw-id'*/
    getQuestionnaire?: (questionnaireId: string) => Promise<RemoteDataResult<Questionnaire>>;
    /** Save completed QuestionnaireResponse */
    saveCompletedQuestionnaireResponse?: (
        qr: QuestionnaireResponse,
    ) => Promise<RemoteDataResult<QuestionnaireResponse>>;
    /** Save in-progress QuestionnaireResponse  */
    saveInProgressQuestionnaireResponse?: (
        qr: QuestionnaireResponse,
    ) => Promise<RemoteDataResult<QuestionnaireResponse>>;
}

export const SdcServiceProviderContext = createContext<SdcServiceProvider | undefined>(undefined);
