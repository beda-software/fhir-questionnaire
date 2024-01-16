import _ from 'lodash';
import { useMemo } from 'react';
import { FormItems, ItemControlGroupItemComponentMapping, ItemControlQuestionItemComponentMapping } from 'sdc-qrf';

import { RenderRemoteData } from '@beda.software/fhir-react';
import { RemoteDataResult, isSuccess } from '@beda.software/remote-data';

import {
    QuestionnaireResponseFormData,
    QuestionnaireResponseFormProps,
    QuestionnaireResponseFormSaveResponse,
    useQuestionnaireResponseFormData,
} from './questionnaire-response-form-data';
import { BaseQuestionnaireResponseForm } from './BaseQuestionnaireResponseForm';

interface Props extends QuestionnaireResponseFormProps {
    onSuccess?: (resource: QuestionnaireResponseFormSaveResponse) => void;
    onFailure?: (error: any) => void;
    onEdit?: (formValues: FormItems) => Promise<any>;
    readOnly?: boolean;
    itemControlQuestionItemComponents?: ItemControlQuestionItemComponentMapping;
    itemControlGroupItemComponents?: ItemControlGroupItemComponentMapping;
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
        <RenderRemoteData remoteData={response}>
            {(formData) => (
                <BaseQuestionnaireResponseForm formData={formData} onSubmit={onSubmit} readOnly={readOnly} {...props} />
            )}
        </RenderRemoteData>
    );
}