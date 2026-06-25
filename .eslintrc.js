module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', tsconfigRootDir: __dirname, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Module boundary enforcement: import only via barrel index.ts
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['*/catalog/publishers/*', '*/catalog/games/*', '*/catalog/teams/*',
                  '*/catalog/characters/*', '*/catalog/products/*', '*/catalog/skus/*'],
          message: 'Import from src/catalog/index.ts barrel instead.' },
        { group: ['*/commerce/cart/*', '*/commerce/orders/*'],
          message: 'Import from src/commerce/index.ts barrel instead.' },
        { group: ['*/auth/clerk*', '*/auth/admin*', '*/auth/current-user*'],
          message: 'Import from src/auth/index.ts barrel instead.' },
        { group: ['*/fulfillment/supplier*', '*/fulfillment/mock*'],
          message: 'Import from src/fulfillment/index.ts barrel instead.' },
        { group: ['*/notifications/notifications.service*'],
          message: 'Import from src/notifications/index.ts barrel instead.' },
      ],
    }],
  },
};
