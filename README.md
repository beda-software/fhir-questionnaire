# Installation instructions

- Add this repository as a project dependency
```sh
git submodule add 'https or git repository link' packages/@beda.software/fhir-questionnaire/
```
- Update your project `package.json` with `yarn` workspaces configuration
```json
{
    ...,
    "private": true,
    "workspaces": [
        "packages/@beda.software/fhir-questionnaire"
    ],
    "dependencies": {
        ...,
        "@beda.software/fhir-questionnaire": "1.0.0",
        ...
    }
}
```
- Link workspace as a project dependency
```sh
yarn install
```

Please refer to the official `yarn` documentation for additional details on [yarn workspace](https://classic.yarnpkg.com/lang/en/docs/workspaces/) usage.

# Development

Make sure global dependencies (like `react`) are defined as peer-dependencies.

`yarn workspace @beda.software/fhir-questionnaire cmd` can be used while in a root project to manage submodule dependecies (when needed).
