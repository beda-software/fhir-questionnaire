import { QuestionnaireResponse } from '../../../../contrib/aidbox';
import { getInitialItemCount } from './utils';

const resource: QuestionnaireResponse = {
    item: [
        {
            linkId: 'main-group',
            item: [
                {
                    linkId: 'main-group-card',
                    item: [
                        { linkId: 'text01', answer: [{ value: { string: '1' } }] },
                        { linkId: 'text02', answer: [{ value: { string: '2' } }] },
                    ],
                },
                {
                    linkId: 'sub-group-card',
                    item: [
                        { linkId: 'text03', answer: [{ value: { string: '3' } }] },
                        { linkId: 'text04', answer: [{ value: { string: '4' } }] },
                    ],
                },
                {
                    linkId: 'primary-group',
                    item: [
                        {
                            linkId: 'group11',
                            item: [
                                {
                                    linkId: 'group12',
                                    item: [
                                        { linkId: 'text11', answer: [{ value: { string: '5' } }] },
                                        { linkId: 'text12', answer: [{ value: { string: '6' } }] },
                                    ],
                                },
                                {
                                    linkId: 'group12',
                                    item: [
                                        { linkId: 'text11', answer: [{ value: { string: '7' } }] },
                                        { linkId: 'text12', answer: [{ value: { string: '8' } }] },
                                    ],
                                },
                            ],
                        },
                        {
                            linkId: 'group11',
                            item: [
                                {
                                    linkId: 'group12',
                                    item: [
                                        { linkId: 'text11', answer: [{ value: { string: '9' } }] },
                                        { linkId: 'text12', answer: [{ value: { string: '10' } }] },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    linkId: 'secondary-group',
                    item: [
                        {
                            linkId: 'group21',
                            item: [
                                { linkId: 'text21', answer: [{ value: { string: '11' } }] },
                                {
                                    linkId: 'group22',
                                    item: [
                                        { linkId: 'text22', answer: [{ value: { string: '12' } }] },
                                        { linkId: 'text23', answer: [{ value: { string: '13' } }] },
                                    ],
                                },
                            ],
                        },
                        {
                            linkId: 'group21',
                            item: [
                                { linkId: 'text21', answer: [{ value: { string: '14' } }] },
                                {
                                    linkId: 'group22',
                                    item: [
                                        { linkId: 'text22', answer: [{ value: { string: '15' } }] },
                                        { linkId: 'text23', answer: [{ value: { string: '16' } }] },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
    status: 'completed',
    questionnaire: 'repeatable-group-full-example',
    resourceType: 'QuestionnaireResponse',
};

describe('getInitialItemCount - nested structure with repeats', () => {
    it('counts direct groups in main-group', () => {
        const path = ['main-group', 'items'];
        expect(getInitialItemCount(resource, path, 'main-group-card')).toBe(1);
        expect(getInitialItemCount(resource, path, 'sub-group-card')).toBe(1);
        expect(getInitialItemCount(resource, path, 'primary-group')).toBe(1);
        expect(getInitialItemCount(resource, path, 'secondary-group')).toBe(1);
    });

    it('counts group11 repeats inside primary-group', () => {
        const path = ['main-group', 'items', 'primary-group', 'items'];
        expect(getInitialItemCount(resource, path, 'group11')).toBe(2);
    });

    it('counts group12 repeats inside each group11', () => {
        const path = ['main-group', 'items', 'primary-group', 'items', 'group11', 'items'];
        expect(getInitialItemCount(resource, path, 'group12')).toBe(3);
    });

    it('counts questions inside group12', () => {
        const path = ['main-group', 'items', 'primary-group', 'items', 'group11', 'items', 'group12', 'items'];
        expect(getInitialItemCount(resource, path, 'text11')).toBe(3);
        expect(getInitialItemCount(resource, path, 'text12')).toBe(3);
    });

    it('counts group21 repeats inside secondary-group', () => {
        const path = ['main-group', 'items', 'secondary-group', 'items'];
        expect(getInitialItemCount(resource, path, 'group21')).toBe(2);
    });

    it('counts group22 repeats inside group21', () => {
        const path = ['main-group', 'items', 'secondary-group', 'items', 'group21', 'items'];
        expect(getInitialItemCount(resource, path, 'group22')).toBe(2);
    });

    it('counts questions inside group22', () => {
        const path = ['main-group', 'items', 'secondary-group', 'items', 'group21', 'items', 'group22', 'items'];
        expect(getInitialItemCount(resource, path, 'text22')).toBe(2);
        expect(getInitialItemCount(resource, path, 'text23')).toBe(2);
    });

    it('counts top-level text questions', () => {
        const path = ['main-group', 'items', 'main-group-card', 'items'];
        expect(getInitialItemCount(resource, path, 'text01')).toBe(1);
        expect(getInitialItemCount(resource, path, 'text02')).toBe(1);
    });

    it('returns 0 if linkId not found', () => {
        const path = ['main-group', 'items'];
        expect(getInitialItemCount(resource, path, 'non-existent')).toBe(0);
    });
});
