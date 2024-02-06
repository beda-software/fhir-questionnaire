import React, { ReactElement, useMemo } from 'react';

import { RenderRemoteData } from '@beda.software/fhir-react';
import { RemoteDataResult, isSuccess } from '@beda.software/remote-data';
import _, { debounce } from 'lodash';

import { BaseQuestionnaireResponseForm, BaseQuestionnaireResponseFormProps } from './BaseQuestionnaireResponseForm';
import {
    QuestionnaireResponseFormData,
    QuestionnaireResponseFormProps,
    QuestionnaireResponseFormSaveResponse,
    useQuestionnaireResponseFormData,
} from './questionnaire-response-form-data';

export type {
    QuestionItemProps,
    FormWrapperProps,
    ItemWrapperProps,
    GroupWrapperProps,
} from './BaseQuestionnaireResponseForm';
export { useFieldController } from './BaseQuestionnaireResponseForm/hooks';
export { questionnaireIdLoader, questionnaireIdWOAssembleLoader } from './questionnaire-response-form-data';

interface Props
    extends QuestionnaireResponseFormProps,
        Pick<
            BaseQuestionnaireResponseFormProps,
            | 'widgetsByQuestionType'
            | 'widgetsByQuestionItemControl'
            | 'widgetsByGroupQuestionItemControl'
            | 'ItemWrapper'
            | 'GroupWrapper'
            | 'FormWrapper'
            | 'validation'
        > {
    onSuccess?: (resource: QuestionnaireResponseFormSaveResponse) => void;
    onFailure?: (error: any) => void;
    readOnly?: boolean;
    remoteDataRenderConfig?: {
        renderFailure?: (error: any) => ReactElement;
        renderLoading?: () => ReactElement;
    };
}

export function onFormResponse(props: {
    response: RemoteDataResult<QuestionnaireResponseFormSaveResponse>;
    onSuccess?: (resource: any) => void;
    onFailure?: (error: any) => void;
}) {
    const { response, onSuccess, onFailure } = props;

    if (isSuccess(response)) {
        if (response.data.extracted) {
            onSuccess?.(response.data);
        } else {
            onFailure?.('Error while extracting');
        }
    } else {
        onFailure?.(response.error);
    }
}

const TIMEOUT_TO_SAVE_DRAFT_RESPONSE_AFTER_MS = 1000;

export function useQuestionnaireResponseForm(props: Props) {
    // TODO find what cause rerender and fix it
    // remove this temporary hack
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoizedProps = useMemo(() => props, [JSON.stringify(props)]);

    const { response, handleSave, handleUpdate } = useQuestionnaireResponseFormData(memoizedProps);
    const { onSuccess, onFailure, readOnly, initialQuestionnaireResponse } = memoizedProps;

    const onSubmit = async (formData: QuestionnaireResponseFormData) => {
        const modifiedFormData = _.merge({}, formData, {
            context: {
                questionnaireResponse: {
                    questionnaire: initialQuestionnaireResponse?.questionnaire,
                },
            },
        });

        delete modifiedFormData.context.questionnaireResponse.meta;

        const saveResponse = await handleSave(modifiedFormData);
        onFormResponse({ response: saveResponse, onSuccess, onFailure });
    };

    const saveDraftDebounced = debounce(async (formData: QuestionnaireResponseFormData) => {
        delete formData.context.questionnaireResponse.meta;

        await handleUpdate(formData);
    }, TIMEOUT_TO_SAVE_DRAFT_RESPONSE_AFTER_MS);

    return {
        response,
        onSubmit,
        onEdit: props.autosave
            ? async (formData: QuestionnaireResponseFormData) => {
                  await saveDraftDebounced(formData);
              }
            : undefined,
        readOnly,
    };
}

export function QuestionnaireResponseForm(props: Props) {
    const { response, onSubmit, onEdit, readOnly } = useQuestionnaireResponseForm(props);

    return (
        <RenderRemoteData remoteData={response} {...props.remoteDataRenderConfig}>
            {(formData) => (
                <BaseQuestionnaireResponseForm
                    formData={formData}
                    onSubmit={onSubmit}
                    onEdit={onEdit}
                    readOnly={readOnly}
                    {...props}
                />
            )}
        </RenderRemoteData>
    );
}
