import { render } from '@testing-library/react';
import _ from 'lodash';
import { useFormContext } from 'react-hook-form';

import { RemoteDataResult, success } from '@beda.software/remote-data';

import {
    FCEQuestionnaire,
    FormItems,
    fromFirstClassExtension,
    ItemContext,
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

function GroupWidget(props: GroupItemProps) {
    const { questionItem, parentPath, context, addItem, removeItem } = props;
    const linkId = questionItem.linkId!;
    const groupPath = [...parentPath, linkId];
    const childItems = questionItem.item ?? [];
    const itemContext = (context as unknown as ItemContext[])[0]!;
    const { getValues } = useFormContext();

    if (!questionItem.repeats) {
        return (
            <fieldset data-testid={`group:${groupPath.join('.')}`}>
                <QuestionItems questionItems={childItems} parentPath={[...groupPath, 'items']} context={itemContext} />
            </fieldset>
        );
    }

    const groupValue = _.get(getValues(), groupPath);
    const instanceCount = Array.isArray(groupValue?.items) ? groupValue.items.length : 0;

    return (
        <fieldset data-testid={`group:${groupPath.join('.')}`}>
            {Array.from({ length: instanceCount }, (_unused, index) => (
                <div key={index} data-testid={`instance:${groupPath.join('.')}:${index}`}>
                    <QuestionItems
                        questionItems={childItems}
                        parentPath={[...groupPath, 'items', String(index)]}
                        context={itemContext}
                    />
                    <button
                        type="button"
                        data-testid={`remove:${groupPath.join('.')}:${index}`}
                        onClick={() => removeItem?.(index)}
                    >
                        remove {index}
                    </button>
                </div>
            ))}
            <button type="button" data-testid={`add:${groupPath.join('.')}`} onClick={() => addItem?.()}>
                add
            </button>
        </fieldset>
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
            questionItemComponents={{
                string: StringWidget,
                integer: IntegerWidget,
            }}
        />,
    );
}
