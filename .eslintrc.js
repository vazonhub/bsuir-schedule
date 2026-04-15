module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    'react-native/react-native': true,
    es2022: true,
    node: true,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-native', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'prettier/prettier': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react-native/no-raw-text': 'off',
    'react-native/sort-styles': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'warn',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'ios/', 'android/', 'babel.config.js'],
};
