import * as yup from 'yup';
import { t } from '@lingui/macro';

import {
    AnswerValue,
    EvaluateFhirpath,
    FCEQuestionnaire,
    FCEQuestionnaireItem,
    getChecker,
    getAnswerValues,
    FormAnswerItems,
    FormItems,
    toAnswerValue,
    getEnabledQuestions,
    calcInitialContext,
    QuestionnaireResponseFormData,
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
        try {
            schema = schema.test(test);
        } catch (error) {
            console.error(
                `Failed to apply custom yup test "${test.name}" for item control "${itemControlCode}"`,
                error,
            );
        }
    });
    return schema;
}

export function questionnaireToValidationSchema(
    questionnaire: FCEQuestionnaire,
    customYupTests?: CustomYupTestsMap,
    qrfDataContext?: QuestionnaireResponseFormData['context'],
    evaluateFhirpath?: EvaluateFhirpath,
) {
    return questionnaireItemsToValidationSchema(
        questionnaire.item ?? [],
        customYupTests,
        qrfDataContext,
        evaluateFhirpath,
    );
}

export function questionnaireItemsToValidationSchema(
    questionnaireItems: FCEQuestionnaireItem[],
    customYupTests?: CustomYupTestsMap,
    qrfDataContext?: QuestionnaireResponseFormData['context'],
    evaluateFhirpath?: EvaluateFhirpath,
    parentPath: string[] = [],
    warnedEnableWhenExpressionLinkIds: Set<string> = new Set(),
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
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
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
            const childParentPath = [...parentPath, item.linkId, 'items'];
            schema = yup
                .object({
                    items: item.repeats
                        ? yup
                              .array()
                              .of(
                                  questionnaireItemsToValidationSchema(
                                      item.item,
                                      customYupTests,
                                      qrfDataContext,
                                      evaluateFhirpath,
                                      childParentPath,
                                      warnedEnableWhenExpressionLinkIds,
                                  ),
                              )
                        : questionnaireItemsToValidationSchema(
                              item.item,
                              customYupTests,
                              qrfDataContext,
                              evaluateFhirpath,
                              childParentPath,
                              warnedEnableWhenExpressionLinkIds,
                          ),
                })
                .required();
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
        } else {
            schema = item.required ? yup.array().of(yup.mixed()).min(1).required() : yup.mixed().nullable();
            schema = applyCustomYupTestsToItem(item, schema, customYupTests);
        }

        schema = item.required ? schema.required() : schema;

        if (qrfDataContext && (item.enableWhen || item.enableWhenExpression)) {
            validationSchema[item.linkId] = yup
                .mixed()
                .test(
                    getIsQuestionEnabledTest({ item, itemSchema: schema, parentPath, qrfDataContext, evaluateFhirpath }),
                );
        } else if (item.enableWhen) {
            validationSchema[item.linkId] = getQuestionItemEnableWhenSchema({
                enableWhenItems: item.enableWhen,
                enableBehavior: item.enableBehavior,
                schema,
            });
        } else if (item.enableWhenExpression) {
            if (!warnedEnableWhenExpressionLinkIds.has(item.linkId)) {
                warnedEnableWhenExpressionLinkIds.add(item.linkId);
                console.warn(
                    `Item "${item.linkId}" defines enableWhenExpression, but questionnaireToValidationSchema/questionnaireItemsToValidationSchema was called without qrfDataContext. The item will be treated as always enabled for validation purposes.`,
                );
            }
            validationSchema[item.linkId] = schema;
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

interface GetIsQuestionEnabledTestProps {
    item: FCEQuestionnaireItem;
    itemSchema: yup.AnySchema;
    parentPath: string[];
    qrfDataContext: QuestionnaireResponseFormData['context'];
    evaluateFhirpath?: EvaluateFhirpath;
}

// yup builds a dot/bracket path for the field under test, e.g. `group.items[2].leaf`.
// That's exactly the shape sdc-qrf's getEnabledQuestions expects as parentPath (minus the
// item's own linkId), including the row index for items nested inside repeating groups -
// which the statically-threaded `parentPath` cannot know at schema-build time.
function resolveRuntimeParentPath(yupPath: string | undefined, fallbackParentPath: string[]): string[] {
    if (!yupPath) {
        return fallbackParentPath;
    }
    const segments = yupPath.match(/[^.[\]]+/g);
    if (!segments || segments.length === 0) {
        return fallbackParentPath;
    }
    return segments.slice(0, -1);
}

function getIsQuestionEnabledTest(props: GetIsQuestionEnabledTestProps): yup.TestConfig<any> {
    const { item, itemSchema, parentPath, qrfDataContext, evaluateFhirpath } = props;

    return {
        name: 'sdc-enable-when',
        test(value, testContext) {
            const rootValues = (testContext.from?.[testContext.from.length - 1]?.value ?? {}) as FormItems;
            const runtimeParentPath = resolveRuntimeParentPath(testContext.path, parentPath);
            const itemContext = calcInitialContext(qrfDataContext, rootValues);

            // Propagates as-is (not caught) when enableWhenExpression evaluates to a non-boolean -
            // sdc-qrf throws a plain Error here, which yup surfaces as a schema evaluation failure
            // rather than a validation result.
            const enabledItems = getEnabledQuestions(
                [item],
                runtimeParentPath,
                rootValues,
                itemContext,
                evaluateFhirpath,
            );

            if (enabledItems.length === 0) {
                return true;
            }

            try {
                // Passing `path` seeds itemSchema's own error paths/messages with testContext.path as the
                // base, so a nested failure (e.g. a required string with no answer) lands at
                // `linkId[0].value.string` - matching the nested field name the actual input control is
                // registered under via useController - instead of collapsing to just `linkId`, which would
                // block submission without ever highlighting the field.
                itemSchema.validateSync(value, {
                    abortEarly: false,
                    context: testContext.options.context,
                    path: testContext.path,
                } as yup.ValidateOptions);
            } catch (err) {
                if (err instanceof yup.ValidationError) {
                    return err;
                }
                throw err;
            }

            return true;
        },
    };
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
