import { ComponentType, PropsWithChildren, useCallback, useEffect, useMemo } from 'react';

import { yupResolver } from '@hookform/resolvers/yup';
import _ from 'lodash';
import { FormProvider, useForm, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';

import {
    calcInitialContext,
    FormItems,
    getEnabledQuestions,
    ItemControlGroupItemComponentMapping,
    ItemControlQuestionItemComponentMapping,
    QuestionItem,
    QuestionItemComponent,
    QuestionItemComponentMapping,
    QuestionItemProps,
    QuestionnaireResponseFormData,
    QuestionnaireResponseFormProvider,
} from 'sdc-qrf';
import { GroupComponent, GroupItemComponent, GroupItemProps } from './GroupComponent';

import { questionnaireToValidationSchema } from './utils';
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
    onEdit?: (formData: QuestionnaireResponseFormData) => Promise<any>;
    readOnly?: boolean;
    widgetsByQuestionType?: QuestionItemComponentMapping;
    widgetsByQuestionItemControl?: ItemControlQuestionItemComponentMapping;
    widgetsByGroupQuestionItemControl?: ItemControlGroupItemComponentMapping;
    groupItemComponent: GroupItemComponent;

    ItemWrapper?: ComponentType<ItemWrapperProps>;
    GroupWrapper?: ComponentType<GroupWrapperProps>;
    FormWrapper: ComponentType<FormWrapperProps>;
}

export function BaseQuestionnaireResponseForm(props: BaseQuestionnaireResponseFormProps) {
    const { formData, readOnly, onSubmit, onEdit, ItemWrapper, GroupWrapper, FormWrapper } = props;

    const schema: yup.AnyObjectSchema = useMemo(
        () => questionnaireToValidationSchema(formData.context.questionnaire),
        [formData.context.questionnaire],
    );

    const form = useForm<FormItems>({
        defaultValues: formData.formValues,
        resolver: yupResolver(schema),
        mode: 'onChange',
    });

    useEffect(() => {
        const subscription = form.watch((formValues) => {
            onEdit?.({ formValues: formValues as FormItems, context: formData.context });
        });
        return () => subscription.unsubscribe();
    }, [form, formData.context, onEdit]);

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
        () => (itemProps: GroupItemProps) =>
            (
                <GroupComponent
                    itemProps={itemProps}
                    Control={props.groupItemComponent}
                    GroupWrapper={GroupWrapper}
                    questionItemComponents={questionItemComponents}
                    itemControlQuestionItemComponents={itemControlQuestionItemComponents}
                />
            ),
        [GroupWrapper, props.groupItemComponent],
    );

    return (
        <FormProvider {...form}>
            <QuestionnaireResponseFormProvider
                formValues={formValues}
                setFormValues={(values, fieldPath, value) => {
                    form.setValue(fieldPath.join('.'), value);
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
