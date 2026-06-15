import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'upstream_*.js',
      '*.test.ts',
      '*.spec.ts',
      '*.test.js',
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      'react/no-deprecated': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'no-empty': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/no-did-mount-set-state': 'off',
      'react/no-did-update-set-state': 'off',
      '@next/next/no-duplicate-head': 'off',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]
