import React, { ComponentType, useCallback, useMemo } from 'react';
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
    QuestionItems,
    QuestionnaireResponseFormData,
    QuestionnaireResponseFormProvider,
} from 'sdc-qrf';

export interface BaseQuestionnaireResponseFormProps {
    formData: QuestionnaireResponseFormData;
    onSubmit?: (formData: QuestionnaireResponseFormData) => Promise<any>;
    onEdit?: (formValues: FormItems) => Promise<any>;
    readOnly?: boolean;
    validation?: Pick<UseFormProps<FormItems>, 'resolver' | 'mode'>;
    itemControlQuestionItemComponents?: ItemControlQuestionItemComponentMapping;
    itemControlGroupItemComponents?: ItemControlGroupItemComponentMapping;
    questionItemComponents?: QuestionItemComponentMapping;
    groupItemComponent?: GroupItemComponent;

    ItemWrapper?: ComponentType<{
        item: QuestionItemProps;
        control: QuestionItemComponent;
        children: React.ReactElement;
    }>;
    GroupWrapper?: ComponentType<{
        item: GroupItemProps;
        control: GroupItemComponent;
        children: React.ReactElement;
    }>;
    FormWrapper?: ComponentType<{
        handleSubmit: ReturnType<UseFormReturn<FormItems>['handleSubmit']>;
    }>;
}

export function BaseQuestionnaireResponseForm(props: BaseQuestionnaireResponseFormProps) {
    const {
        formData,
        readOnly,
        validation,
        onSubmit,
        onEdit,
        ItemWrapper,
        GroupWrapper,
        FormWrapper = React.Fragment,
    } = props;

    const form = useForm<FormItems>({
        defaultValues: formData.formValues,
        ...validation,
    });

    const formValues = form.watch();

    const wrapControls = useCallback(
        (mapping: { [x: string]: QuestionItemComponent }): { [x: string]: QuestionItemComponent } => {
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
        (mapping: { [x: string]: GroupItemComponent }): { [x: string]: GroupItemComponent } => {
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
        () => wrapControls(props.questionItemComponents),
        [wrapControls, props.questionItemComponents],
    );
    const itemControlQuestionItemComponents = useMemo(
        () => wrapControls(props.itemControlQuestionItemComponents),
        [wrapControls, props.itemControlQuestionItemComponents],
    );
    const itemControlGroupItemComponents = useMemo(
        () => wrapGroups(props.itemControlGroupItemComponents),
        [wrapGroups, props.itemControlGroupItemComponents],
    );

    const groupItemComponent = useMemo(
        () =>
            function GroupItemComponent(itemProps: GroupItemProps) {
                const Control = props.groupItemComponent;

                if (GroupWrapper) {
                    return (
                        <GroupWrapper item={itemProps} control={Control}>
                            <Control {...itemProps} />
                        </GroupWrapper>
                    );
                }

                return <Control {...itemProps} />;
            },
        [GroupWrapper],
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
                >
                    <QuestionItems
                        questionItems={formData.context.questionnaire.item!}
                        parentPath={[]}
                        context={calcInitialContext(formData.context, formValues)}
                    />
                </FormWrapper>
            </QuestionnaireResponseFormProvider>
        </FormProvider>
    );
}
