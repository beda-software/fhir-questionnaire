import React, { ComponentType, PropsWithChildren, useCallback, useMemo } from 'react';

import _ from 'lodash';
import { FormProvider, useForm, UseFormProps, UseFormReturn } from 'react-hook-form';

import {
    calcInitialContext,
    FormItems,
    GroupItemComponent,
    GroupItemProps,
    ItemControlGroupItemComponentMapping,
    ItemControlQuestionItemComponentMapping,
    QuestionItemComponent,
    QuestionItemComponentMapping,
    QuestionItemProps,
    QuestionItem,
    QuestionnaireResponseFormData,
    QuestionnaireResponseFormProvider,
    getEnabledQuestions,
} from '../../../vendor/sdc-qrf';

export type { QuestionItemProps };

export interface FormWrapperProps {
    handleSubmit: ReturnType<UseFormReturn<FormItems>['handleSubmit']>;
    items: Array<ReturnType<typeof QuestionItem>>;
}

export type ItemWrapperProps = PropsWithChildren<{
    item: QuestionItemProps;
    control: QuestionItemComponent;
}>;

export type GroupWrapperProps = PropsWithChildren<{
    item: GroupItemProps;
    control: GroupItemComponent;
}>;

export interface BaseQuestionnaireResponseFormProps {
    formData: QuestionnaireResponseFormData;
    onSubmit?: (formData: QuestionnaireResponseFormData) => Promise<any>;
    onEdit?: (formValues: FormItems) => Promise<any>;
    readOnly?: boolean;
    validation?: Pick<UseFormProps<FormItems>, 'resolver' | 'mode'>;
    widgetsByQuestionType?: QuestionItemComponentMapping;
    widgetsByQuestionItemControl?: ItemControlQuestionItemComponentMapping;
    widgetsByGroupQuestionItemControl?: ItemControlGroupItemComponentMapping;
    groupItemComponent?: GroupItemComponent;

    ItemWrapper?: ComponentType<ItemWrapperProps>;
    GroupWrapper?: ComponentType<GroupWrapperProps>;
    FormWrapper: ComponentType<FormWrapperProps>;
}

export function BaseQuestionnaireResponseForm(props: BaseQuestionnaireResponseFormProps) {
    const { formData, readOnly, validation, onSubmit, onEdit, ItemWrapper, GroupWrapper, FormWrapper } = props;

    const form = useForm<FormItems>({
        defaultValues: formData.formValues,
        ...validation,
    });

    const formValues = form.watch();

    const wrapControls = useCallback(
        (mapping?: { [x: string]: QuestionItemComponent }): { [x: string]: QuestionItemComponent } => {
            return _.chain(mapping)
                .toPairs()
                .map(([key, Control]) => [
                    key,
                    (itemProps: QuestionItemProps) => {
                        if (ItemWrapper) {
                            return (
                                <ItemWrapper item={itemProps} control={Control}>
                                    <Control {...itemProps} />
                                </ItemWrapper>
                            );
                        }

                        return <Control {...itemProps} />;
                    },
                ])
                .fromPairs()
                .value();
        },
        [ItemWrapper],
    );

    const wrapGroups = useCallback(
        (mapping?: { [x: string]: GroupItemComponent }): { [x: string]: GroupItemComponent } => {
            return _.chain(mapping)
                .toPairs()
                .map(([key, Control]) => [
                    key,
                    (itemProps: GroupItemProps) => {
                        if (GroupWrapper) {
                            return (
                                <GroupWrapper item={itemProps} control={Control}>
                                    <Control {...itemProps} />
                                </GroupWrapper>
                            );
                        }

                        return <Control {...itemProps} />;
                    },
                ])
                .fromPairs()
                .value();
        },
        [GroupWrapper],
    );

    const questionItemComponents = useMemo(
        () => wrapControls(props.widgetsByQuestionType),
        [wrapControls, props.widgetsByQuestionType],
    );
    const itemControlQuestionItemComponents = useMemo(
        () => wrapControls(props.widgetsByQuestionItemControl),
        [wrapControls, props.widgetsByQuestionItemControl],
    );
    const itemControlGroupItemComponents = useMemo(
        () => wrapGroups(props.widgetsByGroupQuestionItemControl),
        [wrapGroups, props.widgetsByGroupQuestionItemControl],
    );

    const groupItemComponent = useMemo(
        () =>
            function GroupItemComponent(itemProps: GroupItemProps) {
                const Control = props.groupItemComponent;

                if (!Control) {
                    return null;
                }

                if (GroupWrapper) {
                    return (
                        <GroupWrapper item={itemProps} control={Control}>
                            <Control {...itemProps} />
                        </GroupWrapper>
                    );
                }

                return <Control {...itemProps} />;
            },
        [GroupWrapper, props.groupItemComponent],
    );

    return (
        <FormProvider {...form}>
            <QuestionnaireResponseFormProvider
                formValues={formValues}
                setFormValues={(values, fieldPath, value) => {
                    form.setValue(fieldPath.join('.'), value);
                    onEdit?.(values);
                }}
                groupItemComponent={groupItemComponent}
                itemControlGroupItemComponents={itemControlGroupItemComponents}
                questionItemComponents={questionItemComponents}
                itemControlQuestionItemComponents={itemControlQuestionItemComponents}
                readOnly={readOnly}
            >
                <FormWrapper
                    handleSubmit={form.handleSubmit(async () => {
                        await onSubmit?.({ ...formData, formValues });
                    })}
                    items={useMemo(() => {
                        const initialContext = calcInitialContext(formData.context, formValues);
                        const parentPath = Array.of<string>();
                        return getEnabledQuestions(
                            formData.context.questionnaire.item!,
                            parentPath,
                            formValues,
                            initialContext,
                        ).map((item) => {
                            return (
                                <QuestionItem
                                    key={item.linkId}
                                    questionItem={item}
                                    context={initialContext}
                                    parentPath={parentPath}
                                />
                            );
                        });
                    }, [formData.context, formValues])}
                />
            </QuestionnaireResponseFormProvider>
        </FormProvider>
    );
}
