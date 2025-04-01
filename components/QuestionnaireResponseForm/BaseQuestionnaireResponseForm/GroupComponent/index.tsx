import { GroupWrapperProps } from '../';
import { QuestionnaireItem } from '../../../../contrib/aidbox';
import { GroupItemProps, GroupItemComponent, QuestionItemComponent } from 'sdc-qrf';
import { ComponentType, FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import _ from 'lodash';

type GroupItemComponentExtended = FunctionComponent<
    PropsWithChildren<GroupItemProps> & {
        addItem?: () => void;
        removeItem?: (index: number) => void;
    }
>;

interface Props extends PropsWithChildren {
    itemProps: GroupItemProps;
    Control: GroupItemComponent | undefined;
    questionItemComponents: { [x: string]: QuestionItemComponent };
    itemControlQuestionItemComponents: { [x: string]: QuestionItemComponent };
    GroupWrapper?: ComponentType<GroupWrapperProps>;
    buildValue?: (existingItems: QuestionnaireItem[]) => QuestionnaireItem[];
}

function defaultBuildValue(existingItems: QuestionnaireItem[]): QuestionnaireItem[] {
    return [...existingItems, {} as QuestionnaireItem];
}

export function GroupComponent(props: Props) {
    const {
        itemProps,
        Control,
        GroupWrapper,
        questionItemComponents,
        itemControlQuestionItemComponents,
        buildValue = defaultBuildValue,
    } = props;

    if (!Control) return null;

    const GroupWidgetComponent = Control as GroupItemComponentExtended;
    const { questionItem, context, parentPath } = itemProps;
    const { repeats, linkId } = questionItem;
    const fieldName = [...parentPath, linkId];

    const { getValues, setValue } = useFormContext();
    const value = _.get(getValues(), fieldName);

    const items: QuestionnaireItem[] = value?.items.length ? value.items : [{}];

    const updateItems = (updatedItems: QuestionnaireItem[]) => {
        setValue([...fieldName, 'items'].join('.'), updatedItems);
    };

    const addItem = useCallback(() => {
        const updatedItems = buildValue(items);
        updateItems(updatedItems);
    }, [items, buildValue]);

    const removeItem = useCallback(
        (index: number) => {
            const updatedItems = items.filter((_, i: number) => i !== index);
            updateItems(updatedItems);
        },
        [items],
    );

    const renderQuestionItem = (i: QuestionnaireItem, index: number) => {
        const updatedParentPath = repeats
            ? [...parentPath, linkId, 'items', String(index)]
            : [...parentPath, linkId, 'items'];

        const code = i.itemControl?.coding?.[0].code;
        const Component =
            code && code in itemControlQuestionItemComponents
                ? itemControlQuestionItemComponents[code]
                : questionItemComponents[i.type];

        if (i.type === 'group') {
            return (
                <GroupComponent
                    {...props}
                    itemProps={{ ...itemProps, questionItem: i, parentPath: updatedParentPath }}
                    key={`${i.linkId}-${index}`}
                />
            );
        }

        if (!Component) {
            console.error(`Item type ${i.type} is not supported`);
            return null;
        }

        return (
            <Component
                key={`${i.linkId}-${index}`}
                context={context[0]}
                parentPath={updatedParentPath}
                questionItem={i}
            />
        );
    };

    const renderGroupContent = () => (
        <GroupWidgetComponent {...itemProps} addItem={addItem} removeItem={removeItem}>
            {items.map((_, index: number) =>
                questionItem.item?.map((i: QuestionnaireItem) => renderQuestionItem(i, index)),
            )}
        </GroupWidgetComponent>
    );

    return GroupWrapper ? (
        <GroupWrapper item={itemProps} control={Control}>
            {renderGroupContent()}
        </GroupWrapper>
    ) : (
        renderGroupContent()
    );
}
