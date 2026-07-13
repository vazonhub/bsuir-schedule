const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# [withModularHeaders]';

function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (c) => {
      const podfilePath = path.join(c.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes(MARKER)) {
        return c;
      }

      const insertion = `  ${MARKER} required for Swift pods (AppCheckCore) with non-modular transitive deps\n  use_modular_headers!\n`;
      podfile = podfile.replace(/(target 'BsuirTime' do\n)(\s*use_expo_modules!\n)/, `$1$2${insertion}`);

      fs.writeFileSync(podfilePath, podfile);
      return c;
    },
  ]);
}

module.exports = withModularHeaders;
