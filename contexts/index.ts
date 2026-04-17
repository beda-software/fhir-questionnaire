import { BaseQuestionnaireResponseFormProps } from '../components';
import { DebouncedFunc } from 'lodash';
import { createContext } from 'react';
import { FormItems, ItemControlGroupItemComponentMapping, ItemControlQuestionItemComponentMapping } from 'sdc-qrf';

export const ItemControlQuestionItemWidgetsContext = createContext<ItemControlQuestionItemComponentMapping>({});
export const ItemControlGroupItemWidgetsContext = createContext<ItemControlGroupItemComponentMapping>({});

export const ItemControlQuestionItemReadonlyWidgetsContext = createContext<ItemControlQuestionItemComponentMapping>({});
export const ItemControlGroupItemReadonlyWidgetsContext = createContext<ItemControlGroupItemComponentMapping>({});

export * from './valueset-expand';

interface BaseQuestionnaireResponseFormPropsContextProps extends Partial<BaseQuestionnaireResponseFormProps> {
    submitting: boolean;
    saveDraft?: (currentFormValues: FormItems) => Promise<void>;
    debouncedSaveDraft?: DebouncedFunc<(currentFormValues: FormItems) => Promise<void>>;
}
export const BaseQuestionnaireResponseFormPropsContext = createContext<
    BaseQuestionnaireResponseFormPropsContextProps | undefined
>(undefined);
