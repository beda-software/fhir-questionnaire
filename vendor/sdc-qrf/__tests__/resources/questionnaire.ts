import { Questionnaire } from '../../../../contrib/aidbox';

export const allergiesQuestionnaire: Questionnaire = {
    id: 'allergies',
    resourceType: 'Questionnaire',
    name: 'Allergies',
    status: 'active',
    item: [
        {
            linkId: 'type',
            text: 'Type',
            required: true,
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            answerOption: [
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '418634005',
                            display: 'Drug',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '414285001',
                            display: 'Food',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '426232007',
                            display: 'Environmental',
                        },
                    },
                },
            ],
        },
        {
            linkId: 'reaction',
            text: 'Reaction',
            type: 'choice',
            repeats: true,
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            answerOption: [
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '39579001',
                            display: 'Anaphylaxis',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '25064002',
                            display: 'Headache',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '247472004',
                            display: 'Hives (Wheal)',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '422587007',
                            display: 'Nausea',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '422400008',
                            display: 'Vomiting',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '782197009',
                            display: 'Other',
                        },
                    },
                },
            ],
        },
        {
            linkId: 'substance-drug',
            text: 'Substance',
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            enableWhen: [
                {
                    question: 'type',
                    operator: '=',
                    answer: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '418634005',
                        },
                    },
                },
            ],
            answerOption: [
                {
                    value: {
                        Coding: {
                            system: 'http://loinc.org',
                            code: 'LA26702-3',
                            display: 'Aspirin',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://loinc.org',
                            code: '\tLA30119-4',
                            display: 'Iodine',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://loinc.org',
                            code: 'LA14348-9',
                            display: 'Naproxen, ketoprofen or other non-steroidal',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://loinc.org',
                            code: 'LA28487-9',
                            display: 'Penicillin',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://loinc.org',
                            code: 'LA30118-6',
                            display: 'Sulfa drugs',
                        },
                    },
                },
            ],
        },
        {
            linkId: 'substance-food',
            text: 'Substance',
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            enableWhen: [
                {
                    question: 'type',
                    operator: '=',
                    answer: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '414285001',
                        },
                    },
                },
            ],
            answerOption: [
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '102259006',
                            display: 'Citrus fruit',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '102260001',
                            display: 'Peanut butter',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '102261002',
                            display: 'Strawberry',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '102262009',
                            display: 'Chocolate',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '102263004',
                            display: 'Eggs',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '102264005',
                            display: 'Cheese',
                        },
                    },
                },
            ],
        },
        {
            linkId: 'substance-environmental',
            text: 'Substance',
            type: 'choice',
            itemControl: {
                coding: [
                    {
                        code: 'inline-choice',
                    },
                ],
            },
            enableWhen: [
                {
                    question: 'type',
                    operator: '=',
                    answer: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '426232007',
                        },
                    },
                },
            ],
            answerOption: [
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '111088007',
                            display: 'Latex',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '256259004',
                            display: 'Pollen',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '256277009',
                            display: 'Grass pollen',
                        },
                    },
                },
                {
                    value: {
                        Coding: {
                            system: 'http://snomed.ct',
                            code: '256417003',
                            display: 'Horse dander',
                        },
                    },
                },
            ],
        },
        {
            linkId: 'notes',
            text: 'Notes',
            type: 'string',
        },
    ],
};
