import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/.next/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: { project: './tsconfig.lint.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
