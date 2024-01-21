import { useCallback } from 'react';
import _ from 'lodash';
import { useController, useFormContext } from 'react-hook-form';

import { useQuestionnaireResponseFormContext } from '../../../vendor/sdc-qrf';
import { QuestionnaireItem } from '../../../contrib/aidbox';

export function useFieldController<T = any>(fieldName: Array<string | number>, questionItem: QuestionnaireItem) {
    const qrfContext = useQuestionnaireResponseFormContext();
    const { readOnly, repeats } = questionItem;
    const { control } = useFormContext();

    const { field, fieldState } = useController({
        control: control,
        name: fieldName.join('.'),
        ...(repeats ? { defaultValue: [] } : {}),
    });

    const onMultiChange = useCallback(
        (option: any) => {
            if (repeats) {
                const arrayValue = (field.value ?? []) as any[];
                const valueIndex = arrayValue.findIndex((v) => _.isEqual(v?.value, option.value));

                if (valueIndex === -1) {
                    field.onChange([...arrayValue, option]);
                } else {
                    arrayValue.splice(valueIndex, 1);
                    field.onChange(arrayValue);
                }
            } else {
                field.onChange(option);
            }
        },
        [repeats, field],
    );

    return {
        ...field,
        value: field.value as T | undefined,
        onChange: (value: T | undefined) => field.onChange(value),
        onMultiChange,
        fieldState,
        disabled: readOnly || qrfContext.readOnly,
    };
}
