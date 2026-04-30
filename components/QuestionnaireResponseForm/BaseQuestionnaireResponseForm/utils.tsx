import * as yup from 'yup';
import { t } from '@lingui/macro';

import {
    AnswerValue,
    FCEQuestionnaire,
    FCEQuestionnaireItem,
    getChecker,
    getAnswerValues,
    FormAnswerItems,
    toAnswerValue,
} from 'sdc-qrf';
import { ControllerFieldState, ControllerRenderProps, FieldValues } from 'react-hook-form';
import { QuestionnaireItemEnableWhen } from 'fhir/r4b';

export interface CustomYupTestsMap {
    [itemControlCode: string]: yup.TestConfig<any>[];
}

function applyCustomYupTestsToItem(
    questionnaireItem: FCEQuestionnaireItem,
    schema: yup.AnySchema,
    customYupTests?: CustomYupTestsMap,
): yup.AnySchema {
    if (!customYupTests) {
        return schema;
    }

    const itemControlCode = questionnaireItem.itemControl?.coding?.[0]?.code;
    if (!itemControlCode) {
        return schema;
    }

    const applicableYupTests = customYupTests[itemControlCode] ?? [];

    applicableYupTests.forEach((test) => {
        schema = schema.test(test);
    });
    return schema;
}

export function questionnaireToValidationSchema(questionnaire: FCEQuestionnaire, customYupTests?: CustomYupTestsMap) {
    return questionnaireItemsToValidationSchema(questionnaire.item ?? [], customYupTests);
}

export function questionnaireItemsToValidationSchema(
    questionnaireItems: FCEQuestionnaireItem[],
    customYupTests?: CustomYupTestsMap,
) {
    const validationSchema: Record<string, yup.AnySchema> = {};
    if (questionnaireItems.length === 0) {
        return yup.object(validationSchema) as yup.AnyObjectSchema;
    }
    questionnaireItems.forEach((item) => {
        let schema: yup.AnySchema;

        if (item.type === 'string' || item.type === 'text') {
            schema = yup.string();
            if (item.itemControl?.coding?.[0]?.code === 'email') {
                schema = (schema as yup.StringSchema).email();
            }
            if (item.required) {
                schema = schema.required();
            }
            if (item.maxLength && item.maxLength > 0) {
                schema = (schema as yup.StringSchema).max(item.maxLength);
            }
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ string: schema }));
        } else if (item.type === 'integer') {
            schema = yup.number().integer();
            if (item.required) {
                schema = schema.required();
            }
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ integer: schema }));
        } else if (item.type === 'decimal') {
            schema = yup.number();
            if (item.required) {
                schema = schema.required();
            }
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ decimal: schema }));
        } else if (item.type === 'quantity') {
            const quantitySchema = yup.object({
                value: item.required ? yup.number().required() : yup.number().nullable(),
                comparator: yup.string().oneOf(['<', '<=', '>=', '>']).nullable(),
                unit: yup.string().nullable(),
                system: yup.string().nullable(),
                code: yup.string().nullable(),
            });

            schema = item.required ? quantitySchema.required() : quantitySchema;
            schema = applyCustomYupTestsToItem(item, quantitySchema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ Quantity: schema }));
        } else if (item.type === 'date') {
            schema = yup.date();
            if (item.required) {
                schema = schema.required();
            }
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ date: schema }));
        } else if (item.type === 'dateTime') {
            schema = yup.date();
            if (item.required) {
                schema = schema.required();
            }
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ dateTime: schema }));
        } else if (item.type === 'time') {
            schema = yup.string().test(t`time`, t`Must be a valid time (HH:mm:ss)`, (value) => {
                if (!value) {
                    return true;
                }

                const isoTimeRegex = /([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?/;
                return isoTimeRegex.test(value);
            });
            if (item.required) {
                schema = schema.required();
            }
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ time: schema }));
        } else if (item.type === 'boolean') {
            schema = yup.boolean();
            if (item.required) {
                schema = schema.required();
            }
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
            schema = createSchemaArrayOfValues(yup.object({ boolean: schema }));
        } else if (item.type === 'group' && item.item) {
            schema = yup
                .object({
                    items: item.repeats
                        ? yup.array().of(questionnaireItemsToValidationSchema(item.item, customYupTests))
                        : questionnaireItemsToValidationSchema(item.item, customYupTests),
                })
                .required();
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
        } else {
            schema = item.required ? yup.array().of(yup.mixed()).min(1).required() : yup.mixed().nullable();
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
        }

        schema = item.required ? schema.required() : schema;

        if (item.enableWhen) {
            validationSchema[item.linkId] = getQuestionItemEnableWhenSchema({
                enableWhenItems: item.enableWhen,
                enableBehavior: item.enableBehavior,
                schema,
            });
        } else {
            validationSchema[item.linkId] = schema;
        }
    });

    return yup.object(validationSchema).required() as yup.AnyObjectSchema;
}

function createSchemaArrayOfValues(value: yup.AnyObjectSchema) {
    return yup.array().of(yup.object({ value }));
}

interface GetQuestionItemEnableWhenSchemaProps {
    enableWhenItems: QuestionnaireItemEnableWhen[];
    enableBehavior: string | undefined;
    schema: yup.AnySchema;
}

function getQuestionItemEnableWhenSchema(props: GetQuestionItemEnableWhenSchemaProps) {
    return getEnableWhenItemsSchema({ ...props, currentIndex: 0 });
}
interface GetEnableWhenItemSchemaProps extends GetQuestionItemEnableWhenSchemaProps {
    currentIndex: number;
    prevConditionResults?: boolean[];
}
function getEnableWhenItemsSchema(props: GetEnableWhenItemSchemaProps): yup.AnySchema {
    const { enableWhenItems, enableBehavior, currentIndex, schema, prevConditionResults } = props;

    const { question, operator, ...enableWhen } = enableWhenItems[currentIndex]!;
    const answer = toAnswerValue(enableWhen, 'answer')!;

    const isLastItem = currentIndex === enableWhenItems.length - 1;

    const conditionResults = prevConditionResults ? [...prevConditionResults] : [];
    return yup.mixed().when(question, {
        is: (formAnswers: FormAnswerItems[]) => {
            const isConditionSatisfied = isEnableWhenItemSucceed({
                formAnswers,
                answer,
                operator,
            });

            if (!enableBehavior || enableBehavior === 'all') {
                return isConditionSatisfied;
            }

            conditionResults.push(isConditionSatisfied);

            if (isLastItem) {
                return conditionResults.some((result) => result);
            }

            return true;
        },
        then: () =>
            !isLastItem
                ? getEnableWhenItemsSchema({
                      enableWhenItems,
                      currentIndex: currentIndex + 1,
                      schema,
                      enableBehavior,
                      prevConditionResults: [...conditionResults],
                  })
                : schema,
        otherwise: () => yup.mixed().nullable(),
    });
}

interface IsEnableWhenItemSucceedProps {
    formAnswers: FormAnswerItems[] | undefined;
    answer: AnswerValue;
    operator: QuestionnaireItemEnableWhen['operator'];
}
function isEnableWhenItemSucceed(props: IsEnableWhenItemSucceedProps): boolean {
    const { formAnswers, answer, operator } = props;

    if (!formAnswers || formAnswers.length === 0) {
        return false;
    }

    const formAnswerValues = getAnswerValues(formAnswers);
    if (formAnswerValues.length === 0) {
        return false;
    }

    const checker = getChecker(operator);
    return checker(formAnswerValues, answer);
}

export function getFieldErrorMessage(
    field: ControllerRenderProps<FieldValues, any>,
    fieldState: ControllerFieldState,
    text?: string,
) {
    if (!fieldState || !fieldState.invalid) {
        return undefined;
    }

    if (!fieldState.error || !fieldState.error.message) {
        return undefined;
    }
    // replace [0], [1] with .0, .1 to match field.name
    const errorMessageWithInternalFieldName = fieldState.error.message.replace(/\[(\d+)\]/g, '.$1');

    const errorMessageWithHumanReadableFieldName = errorMessageWithInternalFieldName.replace(field.name, text ?? '');

    return errorMessageWithHumanReadableFieldName;
}
