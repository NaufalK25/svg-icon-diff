import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      // Sorted imports, fixed by `eslint --fix` (bun run lint:fix). Groups, blank line between:
      // side effects (CSS) · react/next · other packages · @/ aliases · relative
      'simple-import-sort/imports': [
        'error',
        { groups: [['^\\u0000'], ['^react', '^next'], ['^@?\\w'], ['^@/'], ['^\\.']] },
      ],
      'simple-import-sort/exports': 'error',
      // Icons are SVGs from a CDN or data URLs and images.unoptimized is on —
      // next/image would add nothing
      '@next/next/no-img-element': 'off',
      // Allow dropping fields via rest destructuring: const { content: _c, ...rest } = meta
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Last: turns off rules that would conflict with Prettier's formatting
  prettier,
  // .claude/** holds installed agent skills (third-party tooling), not app code
  globalIgnores(['.next/**', '.vercel/**', '.cache/**', '.claude/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
