import js from '@eslint/js';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import {type Linter} from 'eslint';
import eslintPluginN from 'eslint-plugin-n';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

const baseConfig: Linter.Config = {
  name: 'base',
  files: ['**/*.{js,jsx,ts,tsx}'],
  languageOptions: {
    parser: tseslint.parser as Exclude<Linter.Config['languageOptions'], undefined>['parser'],
    sourceType: 'module',
    parserOptions: {
      projectService: true,
      tsconfigRootDir: __dirname,
      warnOnUnsupportedTypeScriptVersion: false,
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: true,
    reportUnusedInlineConfigs: 'error',
  },
  plugins: {
    n: eslintPluginN,
    prettier: eslintPluginPrettier,
    '@typescript-eslint': typescriptEslintPlugin,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...eslintPluginPrettierRecommended.rules,
    ...(tseslint.configs.recommendedTypeChecked.reduce(
      (obj, item) => ({...obj, ...item.rules}),
      {}
    ) as Linter.Config['rules']),
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-duplicate-type-constituents': 'off',
    '@typescript-eslint/no-redundant-type-constituents': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-array-constructor': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-warning-comments': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'prettier/prettier': [
      'error',
      {
        bracketSpacing: false,
        singleQuote: true,
        trailingComma: 'es5',
        arrowParens: 'avoid',
        printWidth: 120,
      },
    ],
    'no-restricted-properties': ['error', {object: 'describe', property: 'only'}, {object: 'it', property: 'only'}],
    'no-unneeded-ternary': 'error',
    'no-trailing-spaces': 'error',
    'block-scoped-var': 'error',
    'prefer-const': 'error',
    'eol-last': 'error',
    'prefer-arrow-callback': 'error',
    'n/no-extraneous-import': 'off',
    'n/no-missing-import': 'off',
    'n/no-empty-function': 'off',
    'n/no-unsupported-features/es-syntax': 'off',
    'n/no-missing-require': 'off',
    'n/shebang': 'off',
    'no-dupe-class-members': 'off',
    'no-var': 'error',
    'no-sparse-arrays': 'off',
    'require-atomic-updates': 'off',
    curly: ['error', 'all'],
    eqeqeq: 'error',
    quotes: ['warn', 'single', {avoidEscape: true}],
  },
  ignores: ['.*.js', '*.setup.js', '*.config.js', '.turbo/', '.coverage/', 'dist/', 'node_modules/'],
};

const vitestConfig: Linter.Config = {
  name: 'vitest',
  files: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/unbound-method': 'off',
  },
  ignores: ['.*.js', '*.setup.js', '*.config.js', '.turbo/', '.coverage/', 'dist/', 'node_modules/'],
};

export default [baseConfig, vitestConfig];
