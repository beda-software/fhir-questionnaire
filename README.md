# Installation instructions

Install the package:

```sh
yarn add @beda.software/fhir-questionnaire
```

You can also install with other package managers:

```sh
npm install @beda.software/fhir-questionnaire
pnpm add @beda.software/fhir-questionnaire
```

### Local development

To use an unreleased version, install directly from Git or a local path:

```sh
# from the remote repository — pin to a specific commit hash for reproducibility
yarn add git+https://github.com/beda-software/fhir-questionnaire.git#<commit-hash>

# from a local clone
yarn add git+file:///home/user/path/to/fhir-questionnaire#<commit-hash>
```

`prepare` runs on install and builds the `dist` artifacts in-place.

## Peer dependencies

Make sure your project provides peer dependencies:

- `react`
- `@types/react`
- `typescript`

## Usage

```ts
import { QuestionnaireResponseForm, useQuestionnaireResponseForm } from '@beda.software/fhir-questionnaire';
```

### ClinicalContext

Wrap part of your app to share FHIR launch context (`ParametersParameter[]`) with nested forms and components, instead of passing `launchContextParameters` on every form.

```tsx
import {
    ClinicalContext,
    QuestionnaireResponseForm,
    getFirstParameter,
    getParameters,
    questionnaireIdLoader,
    useClinicalContext,
} from '@beda.software/fhir-questionnaire';

function PatientChart({ patient, encounter, children }) {
    return (
        <ClinicalContext
            context={[
                { name: 'patient', resource: patient },
                { name: 'encounter', resource: encounter },
            ]}
        >
            {children}
        </ClinicalContext>
    );
}

function MyForm() {
    return (
        <QuestionnaireResponseForm
            questionnaireLoader={questionnaireIdLoader('vitals')}
            serviceProvider={serviceProvider}
        />
    );
}

function ContextReader() {
    const { parameters } = useClinicalContext();

    const patient = getFirstParameter(parameters, 'patient')?.resource;
    const allPatients = getParameters(parameters, 'patient');

    // ...
}
```

#### How context grows

Context is **append-only**: parent parameters are kept and child parameters are appended. Duplicate names are allowed.

| Layer                       | Parent            | Child (appended)               |
| --------------------------- | ----------------- | ------------------------------ |
| Nested `ClinicalContext`    | ancestor provider | current `context` prop         |
| `QuestionnaireResponseForm` | `ClinicalContext` | `launchContextParameters` prop |

Storage order in `parameters` is parent first, child last.

#### Lookup helpers

`useClinicalContext()` exposes only `parameters`. Use the exported utility functions for lookups:

| Function | Returns | Behavior |
| -------- | ------- | -------- |
| `getParameters(params, name)` | `ParametersParameter[]` | All matches, **child-first** (most recent / deepest first) |
| `getFirstParameter(params, name)` | `ParametersParameter \| undefined` | The deepest (last-appended) match for that name |

Example when both outer and inner providers supply a `patient` parameter:

```
parameters (storage):              [outer-patient, inner-patient]
getParameters(params, 'patient'):  [inner-patient, outer-patient]
getFirstParameter(params, 'patient'): inner-patient
```

```ts
import { getFirstParameter, getParameters } from '@beda.software/fhir-questionnaire';

getParameters(allParams, 'patient');
getFirstParameter(allParams, 'patient');
```

When no `ClinicalContext` provider is mounted, `useClinicalContext()` returns `{ parameters: [] }` and forms behave as before with only explicit `launchContextParameters`.

# Development

Make sure global dependencies (like `react`) are defined as peer-dependencies.

```sh
yarn typecheck
yarn test
```
