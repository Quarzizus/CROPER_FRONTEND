// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

/** angular-eslint publica configuraciones sin `files`: se acotan aquí. */
const scoped = (configs, files) => configs.map((config) => ({ ...config, files }));

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.angular/**', 'odd/**', 'docs/**'],
  },
  { ...eslint.configs.recommended, files: ['**/*.{ts,js}'] },
  ...scoped(tseslint.configs.recommended, ['**/*.ts']),
  ...scoped(angular.configs.tsRecommended, ['**/*.ts']),
  prettierConfig,
  {
    files: ['**/*.ts'],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
    },
  },
  {
    // §4: `domain` es TypeScript puro. Sin Angular, sin NgRx, sin RxJS y sin UI.
    files: ['src/app/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@angular/*',
                '@ngrx/*',
                'rxjs',
                'rxjs/*',
                '@spartan-ng/*',
                '@ng-icons/*',
                '@angular/cdk/*',
                '../presentation/*',
                '../infrastructure/*',
                '../application/*',
              ],
              message: 'domain es TypeScript puro: no importa Angular, NgRx, RxJS ni otras capas.',
            },
          ],
        },
      ],
    },
  },
  {
    // §4: `presentation` consume el store; nunca repositorio ni HttpClient.
    files: ['src/app/**/presentation/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/common/http', '../infrastructure/*', '../../infrastructure/*'],
              message: 'presentation consume el store (application); nunca repositorio ni HttpClient.',
            },
          ],
        },
      ],
    },
  },
  ...scoped(angular.configs.templateRecommended, ['**/*.html']),
  ...scoped(angular.configs.templateAccessibility, ['**/*.html']),
];
