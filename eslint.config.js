const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      'ios/',
      'android/',
      'babel.config.js',
      'eslint.config.js',
      'jest.config.js',
      'jest.setup.js',
      'services/',
      'scripts/',
    ],
  },
  ...compat.config({
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
      // Ложные срабатывания на фабричном паттерне тем `makeStyles(Palette) => StyleSheet.create(...)`:
      // плагин не связывает такие стили с использованиями (issue jsx-eslint/eslint-plugin-react-native#276).
      'react-native/no-unused-styles': 'off',
      // require() в RN легитимен для ассетов (Metro) и ленивой загрузки нативных модулей.
      // Whitelist явный — новые произвольные require по-прежнему ошибка.
      '@typescript-eslint/no-require-imports': [
        'error',
        {
          allow: [
            '\\.(png|jpe?g|gif|webp)$',
            '/widgets/ScheduleWidget$',
            '\\./package\\.json$',
            '^@mrnitrox/react-native-unity-ads-monetization$',
            '^@react-native-google-signin/google-signin$',
            '^@react-native-async-storage/async-storage$',
            '^expo-alternate-app-icons$',
            '^expo-application$',
            '^react$',
            '^react-native$',
            '^react-native-android-widget$',
            '^react-native-iap$',
            '^react-native-shared-group-preferences$',
            '^@services/api$',
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // `const { [key]: _removed, ...rest } = obj` — идиома удаления ключа.
          ignoreRestSiblings: true,
        },
      ],
      // disallowTypeAnnotations: false — разрешает `as typeof import('...')`
      // в местах ленивой загрузки нативных модулей.
      '@typescript-eslint/consistent-type-imports': ['warn', { disallowTypeAnnotations: false }],
    },
  }),
  {
    // Expo config plugins и target-конфиги — CommonJS Node-скрипты.
    files: ['plugins/**/*.js', 'targets/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Примитивы react-native-android-widget (FlexWidget и др.) не поддерживают
    // StyleSheet — стили передаются только инлайн-объектами.
    files: ['src/widgets/**/*.tsx'],
    rules: {
      'react-native/no-inline-styles': 'off',
    },
  },
];
