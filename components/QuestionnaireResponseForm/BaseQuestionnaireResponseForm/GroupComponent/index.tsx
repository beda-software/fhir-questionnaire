import { GroupWrapperProps } from '../';
import { QuestionnaireItem } from '../../../../contrib/aidbox';
import { GroupItemProps, GroupItemComponent, QuestionItemComponent } from 'sdc-qrf';
import { ComponentType, FunctionComponent, PropsWithChildren, useCallback, useState } from 'react';
import { getInitialItemCount } from './utils';

type GroupItemComponentExtended = FunctionComponent<PropsWithChildren<GroupItemProps> & { addItem: () => void }>;

interface Props extends PropsWithChildren {
    itemProps: GroupItemProps;
    Control: GroupItemComponent | undefined;
    questionItemComponents: { [x: string]: QuestionItemComponent };
    itemControlQuestionItemComponents: { [x: string]: QuestionItemComponent };
    GroupWrapper?: ComponentType<GroupWrapperProps>;
    addItem?: () => void;
}

export function GroupComponent(props: Props) {
    const { itemProps, Control, GroupWrapper, questionItemComponents, itemControlQuestionItemComponents } = props;
    if (!Control) return null;

    const GroupWidgetComponent = Control as GroupItemComponentExtended;
    const { questionItem, context, parentPath } = itemProps;
    const { repeats, linkId } = questionItem;

    const [itemCount, setItemCount] = useState(
        () => getInitialItemCount(context[0].resource, parentPath, linkId) || 1,
    );
    const addItem = useCallback(() => {
        setItemCount((prevCount) => prevCount + 1);
    }, []);

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
        <GroupWidgetComponent {...itemProps} addItem={addItem}>
            {Array.from({ length: itemCount }).flatMap(
                (_, index) => questionItem.item?.map((i: QuestionnaireItem) => renderQuestionItem(i, index)) || [],
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
