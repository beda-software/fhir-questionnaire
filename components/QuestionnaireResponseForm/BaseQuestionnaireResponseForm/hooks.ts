import { useCallback } from 'react';
import _ from 'lodash';
import { useController, useFormContext } from 'react-hook-form';

import { FCEQuestionnaireItem, FormAnswerItems, useQuestionnaireResponseFormContext } from 'sdc-qrf';

export function useFieldController<T = unknown>(fieldName: Array<string | number>, questionItem: FCEQuestionnaireItem) {
    const qrfContext = useQuestionnaireResponseFormContext();
    const { readOnly, repeats, entryFormat, helpText } = questionItem;
    const { control } = useFormContext();

    const isGroup = questionItem.type === 'group';
    const defaultValue = isGroup ? { items: [] } : [];

    // @ts-expect-error because T might be array
    const { field, fieldState } = useController<T>({
        control: control,
        name: fieldName.join('.'),
        ...(repeats ? { defaultValue } : {}),
    });

    const onMultiChange = useCallback(
        (option: FormAnswerItems) => {
            // NOTE: it's used online in inline-choice
            if (repeats) {
                const formAnswers = (field.value ?? []) as FormAnswerItems[];
                const valueIndex = formAnswers.findIndex((v) => _.isEqual(v.value, option.value));

                if (valueIndex === -1) {
                    field.onChange([...formAnswers, option]);
                } else {
                    formAnswers.splice(valueIndex, 1);
                    field.onChange(formAnswers);
                }
            } else {
                field.onChange([option]);
            }
        },
        [repeats, field],
    );

    // This is a wrapper for react-select that always wrap single value into array
    // @ts-expect-error It's hard to define proper type of onSelect
    const onSelect = useCallback((option: unknown) => field.onChange([].concat(option)), [field]);

    return {
        ...field,
        value: field.value as T | undefined,
        onChange: (value: T | undefined) => field.onChange(value),
        onMultiChange,
        onSelect,
        fieldState,
        disabled: readOnly || qrfContext.readOnly,
        placeholder: entryFormat,
        helpText,
    };
}
