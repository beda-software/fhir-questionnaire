import { useCallback } from "react";
import _ from "lodash";
import { useController, useFormContext } from "react-hook-form";

import { FCEQuestionnaireItem, FormAnswerItems, useQuestionnaireResponseFormContext } from "sdc-qrf";

export function useFieldController<T = unknown>(
  fieldName: Array<string | number>,
  questionItem: FCEQuestionnaireItem
) {
  const qrfContext = useQuestionnaireResponseFormContext();
  const { readOnly, repeats } = questionItem;
  const { control } = useFormContext();

  // @ts-ignore
  const { field, fieldState } = useController<T>({
    control: control,
    name: fieldName.join("."),
    ...(repeats ? { defaultValue: [] } : {}),
  });

  const onMultiChange = useCallback(
    (option: FormAnswerItems) => {
      // NOTE: it's used online in inline-choice
      if (repeats) {
        const formAnswers = (field.value ?? []) as FormAnswerItems[];
        const valueIndex = formAnswers.findIndex((v) =>
          _.isEqual(v.value, option.value)
        );

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
    [repeats, field]
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
