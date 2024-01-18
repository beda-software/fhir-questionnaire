import _ from 'lodash';
import React, { ReactElement, useMemo } from 'react';
import { FormItems } from '../../vendor/sdc-qrf';

import { RenderRemoteData } from '@beda.software/fhir-react';
import { RemoteDataResult, isSuccess } from '@beda.software/remote-data';

import {
    QuestionnaireResponseFormData,
    QuestionnaireResponseFormProps,
    QuestionnaireResponseFormSaveResponse,
    useQuestionnaireResponseFormData,
} from './questionnaire-response-form-data';
import { BaseQuestionnaireResponseForm, BaseQuestionnaireResponseFormProps } from './BaseQuestionnaireResponseForm';

export type {
    QuestionItemProps,
    FormWrapperProps,
    ItemWrapperProps,
    GroupWrapperProps,
} from './BaseQuestionnaireResponseForm';
export { useFieldController } from './BaseQuestionnaireResponseForm/hooks';
export { questionnaireIdLoader } from './questionnaire-response-form-data';

interface Props
    extends QuestionnaireResponseFormProps,
        Pick<
            BaseQuestionnaireResponseFormProps,
            | 'questionItemComponents'
            | 'itemControlQuestionItemComponents'
            | 'itemControlGroupItemComponents'
            | 'ItemWrapper'
            | 'GroupWrapper'
            | 'FormWrapper'
        > {
    onSuccess?: (resource: QuestionnaireResponseFormSaveResponse) => void;
    onFailure?: (error: any) => void;
    onEdit?: (formValues: FormItems) => Promise<any>;
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

export function useQuestionnaireResponseForm(props: Props) {
    // TODO find what cause rerender and fix it
    // remove this temporary hack
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoizedProps = useMemo(() => props, [JSON.stringify(props)]);

    const { response, handleSave } = useQuestionnaireResponseFormData(memoizedProps);
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

    return { response, onSubmit, readOnly };
}

export function QuestionnaireResponseForm(props: Props) {
    const { response, onSubmit, readOnly } = useQuestionnaireResponseForm(props);

    return (
        <RenderRemoteData remoteData={response} {...props.remoteDataRenderConfig}>
            {(formData) => (
                <BaseQuestionnaireResponseForm formData={formData} onSubmit={onSubmit} readOnly={readOnly} {...props} />
            )}
        </RenderRemoteData>
    );
}
