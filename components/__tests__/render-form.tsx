import { render } from '@testing-library/react';

import { RemoteDataResult, success } from '@beda.software/remote-data';

import {
    FCEQuestionnaire,
    FormItems,
    fromFirstClassExtension,
    ItemContext,
    ItemControlGroupItemComponentMapping,
    QuestionItemProps,
    QuestionItems,
} from 'sdc-qrf';

import {
    BaseQuestionnaireResponseForm,
    BaseQuestionnaireResponseFormProps,
    FormWrapperProps,
} from '../QuestionnaireResponseForm/BaseQuestionnaireResponseForm';
import { GroupItemProps } from '../QuestionnaireResponseForm/BaseQuestionnaireResponseForm/GroupComponent';
import { useFieldController } from '../QuestionnaireResponseForm';

async function fhirServiceStub<S = any, F = any>(): Promise<RemoteDataResult<S, F>> {
    return success({} as S);
}

function StringWidget({ parentPath, questionItem }: QuestionItemProps) {
    const path = [...parentPath, questionItem.linkId!];
    const { value, onChange, disabled } = useFieldController<string>([...path, 0, 'value', 'string'], questionItem);

    return (
        <input
            data-testid={path.join('.')}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

function IntegerWidget({ parentPath, questionItem }: QuestionItemProps) {
    const path = [...parentPath, questionItem.linkId!];
    const { value, onChange, disabled } = useFieldController<number>([...path, 0, 'value', 'integer'], questionItem);

    return (
        <input
            data-testid={path.join('.')}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
    );
}

// Group widget that consumes the pre-built `children` (one element per group instance)
// instead of instantiating QuestionItems itself.
function GroupWidget(props: GroupItemProps) {
    const { questionItem, parentPath, children, addItem, removeItem } = props;
    const groupPath = [...parentPath, questionItem.linkId!];
    const childrenArray = Array.isArray(children) ? children : [children];

    return (
        <fieldset data-testid={`group:${groupPath.join('.')}`}>
            {childrenArray.map((child, index) => (
                <div key={index} data-testid={`instance:${groupPath.join('.')}:${index}`}>
                    {child}
                    {questionItem.repeats && (
                        <button
                            type="button"
                            data-testid={`remove:${groupPath.join('.')}:${index}`}
                            onClick={() => removeItem?.(index)}
                        >
                            remove {index}
                        </button>
                    )}
                </div>
            ))}
            {questionItem.repeats && (
                <button type="button" data-testid={`add:${groupPath.join('.')}`} onClick={addItem}>
                    add
                </button>
            )}
        </fieldset>
    );
}

// Group widget that ignores `children` and renders its items via sdc-qrf itself.
export function SelfRenderingGroupWidget(props: GroupItemProps) {
    const { questionItem, parentPath, context } = props;

    return (
        <QuestionItems
            questionItems={questionItem.item ?? []}
            parentPath={[...parentPath, questionItem.linkId!, 'items']}
            context={(context as unknown as ItemContext[])[0]!}
        />
    );
}

function TestFormWrapper({ handleSubmit, items }: FormWrapperProps) {
    return (
        <form onSubmit={handleSubmit}>
            {items}
            <button type="submit">Save</button>
        </form>
    );
}

interface RenderOptions {
    onSubmit?: BaseQuestionnaireResponseFormProps['onSubmit'];
    formValues?: FormItems;
    itemControlGroupItemComponents?: ItemControlGroupItemComponentMapping;
}

export function renderForm(fceQuestionnaire: FCEQuestionnaire, options: RenderOptions = {}) {
    return render(
        <BaseQuestionnaireResponseForm
            formData={{
                context: {
                    fceQuestionnaire,
                    questionnaire: fromFirstClassExtension(fceQuestionnaire),
                    questionnaireResponse: {
                        resourceType: 'QuestionnaireResponse',
                        status: 'in-progress',
                    },
                    launchContextParameters: [],
                },
                formValues: options.formValues ?? {},
            }}
            onSubmit={options.onSubmit}
            fhirService={fhirServiceStub}
            FormWrapper={TestFormWrapper}
            groupItemComponent={GroupWidget}
            itemControlGroupItemComponents={options.itemControlGroupItemComponents}
            questionItemComponents={{
                string: StringWidget,
                integer: IntegerWidget,
            }}
        />,
    );
}
