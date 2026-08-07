import { GroupWrapperProps } from '../';
import { RootItemContext } from '../context';
import { GroupItemProps as GroupItemPropsBase, FormItems, QuestionItems, getItemKey, populateItemKey } from 'sdc-qrf';
import { ComponentType, PropsWithChildren, useCallback, useContext } from 'react';
import { useFormContext } from 'react-hook-form';
import _ from 'lodash';

export type GroupItemProps = PropsWithChildren<GroupItemPropsBase> & {
    addItem?: () => void;
    removeItem?: (index: number) => void;
};

export type GroupItemComponent = ComponentType<GroupItemProps>;

type Props = {
    itemProps: GroupItemProps;
    Control: GroupItemComponent;
    GroupWrapper?: ComponentType<GroupWrapperProps>;
    buildValue?: (existingItems: FormItems[]) => FormItems[];
};

function defaultBuildValue(existingItems: FormItems[]): FormItems[] {
    return [...existingItems, {}];
}

export function GroupComponent(props: Props) {
    const { itemProps, Control, GroupWrapper, buildValue = defaultBuildValue } = props;

    if (!Control) return null;

    const { questionItem, context, parentPath } = itemProps;
    const { repeats, linkId } = questionItem;
    const fieldName = [...parentPath, linkId];

    const rootContext = useContext(RootItemContext);
    const { getValues, setValue } = useFormContext();
    const value = _.get(getValues(), fieldName);

    const items: FormItems[] = value?.items?.length ? value.items : [{}];

    const updateItems = (updatedItems: FormItems[]) => {
        setValue([...fieldName, 'items'].join('.'), updatedItems);
    };

    const addItem = useCallback(() => {
        const updatedItems = buildValue(items).map((item) => populateItemKey(item) as FormItems);
        updateItems(updatedItems);
    }, [items, buildValue]);

    const removeItem = useCallback(
        (index: number) => {
            const updatedItems = items.filter((_, i: number) => i !== index);
            updateItems(updatedItems);
        },
        [items],
    );

    const instanceContext = (index: number) => (context[index] ?? context[0] ?? rootContext)!;

    // Children go through sdc-qrf's QuestionItems/QuestionItem — the only place
    // calculatedExpression, cqfExpressions and item variables are evaluated.
    const renderGroupContent = () => (
        <Control {...itemProps} addItem={addItem} removeItem={removeItem}>
            {repeats ? (
                items.map((item, index) => (
                    <QuestionItems
                        key={getItemKey(item) ?? index}
                        questionItems={questionItem.item ?? []}
                        parentPath={[...fieldName, 'items', String(index)]}
                        context={instanceContext(index)}
                    />
                ))
            ) : (
                <QuestionItems
                    questionItems={questionItem.item ?? []}
                    parentPath={[...fieldName, 'items']}
                    context={instanceContext(0)}
                />
            )}
        </Control>
    );

    return GroupWrapper ? (
        <GroupWrapper item={itemProps} control={Control}>
            {renderGroupContent()}
        </GroupWrapper>
    ) : (
        renderGroupContent()
    );
}
