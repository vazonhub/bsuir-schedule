import type { ConfigContext, ExpoConfig } from 'expo/config';

const pkg = require('./package.json');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  version: pkg.version,
});
