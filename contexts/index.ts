import { BaseQuestionnaireResponseFormProps } from '../components';
import { DebouncedFunc } from 'lodash';
import { createContext } from 'react';
import { FormItems } from 'sdc-qrf';

export * from './valueset-expand';

interface BaseQuestionnaireResponseFormPropsContextProps extends Partial<BaseQuestionnaireResponseFormProps> {
    submitting: boolean;
    saveDraft?: (currentFormValues: FormItems) => Promise<void>;
    debouncedSaveDraft?: DebouncedFunc<(currentFormValues: FormItems) => Promise<void>>;
}
export const BaseQuestionnaireResponseFormPropsContext = createContext<
    BaseQuestionnaireResponseFormPropsContextProps | undefined
>(undefined);
