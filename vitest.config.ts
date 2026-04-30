import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@lingui/macro': '/components/__tests__/mocks/lingui-macro.ts',
        },
    },
    test: {
        globals: true,
        environment: 'node',
    },
});
