import hooks from 'eslint-plugin-react-hooks'

export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest', sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: Object.fromEntries(['window', 'document', 'navigator', 'fetch', 'console', 'localStorage',
      'setTimeout', 'clearTimeout', 'URL', 'URLSearchParams', 'IntersectionObserver', 'AbortController',
      'confirm', 'alert', 'Event', 'location'].map(name => [name, 'readonly'])),
  },
  plugins: { 'react-hooks': hooks },
  rules: {
    'no-undef': 'error',
    // ponytail: JSX references are not counted by core ESLint; uppercase components are build-checked.
    'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_', caughtErrors: 'none' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
  },
}, {
  files: ['api/**/*.js'],
  languageOptions: {
    globals: Object.fromEntries(['process', 'Buffer', 'AbortSignal', 'fetch', 'URL', 'URLSearchParams'].map(name => [name, 'readonly'])),
  },
  rules: { 'no-undef': 'error', 'no-unused-vars': ['error', { caughtErrors: 'none' }] },
}]
