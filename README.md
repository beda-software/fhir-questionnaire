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

# Development

Make sure global dependencies (like `react`) are defined as peer-dependencies.

```sh
yarn typecheck
yarn test
```
