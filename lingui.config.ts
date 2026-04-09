import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
    locales: ['en'],
    format: 'po',
    catalogs: [
        {
            path: '<rootDir>/components/locale/{locale}/messages',
            include: ['<rootDir>/components'],
            exclude: ['**/node_modules/**'],
        },
    ],
};

export default config;
