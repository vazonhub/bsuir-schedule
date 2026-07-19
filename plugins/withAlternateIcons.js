const { withInfoPlist, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ICONS_SOURCE_DIR = 'assets/icons';

function withAlternateIcons(config) {
  // 1. Copy icon files into the iOS bundle directory
  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const srcDir = path.join(projectRoot, ICONS_SOURCE_DIR);
      const iosAppDir = path.join(projectRoot, 'ios', 'BsuirTime');

      if (!fs.existsSync(srcDir)) return mod;

      const files = fs
        .readdirSync(srcDir)
        .filter((f) => f.endsWith('.png') && f !== 'icon-bg-default.png');
      // Copy directly into the app bundle root — iOS looks for alternate icon files here
      for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(iosAppDir, file));
      }

      return mod;
    },
  ]);

  // 2. Register alternate icons in Info.plist
  config = withInfoPlist(config, (mod) => {
    const projectRoot = mod.modRequest.projectRoot;
    const srcDir = path.join(projectRoot, ICONS_SOURCE_DIR);

    if (!fs.existsSync(srcDir)) return mod;

    const files = fs
      .readdirSync(srcDir)
      .filter((f) => f.endsWith('.png') && f !== 'icon-bg-default.png');

    const alternateIcons = {};
    for (const file of files) {
      const name = file.replace('.png', '');
      alternateIcons[name] = {
        CFBundleIconFiles: [name],
        UIPrerenderedIcon: true,
      };
    }

    mod.modResults.CFBundleIcons = {
      ...(mod.modResults.CFBundleIcons || {}),
      CFBundlePrimaryIcon: {
        CFBundleIconFiles: ['AppIcon60x60'],
        UIPrerenderedIcon: false,
      },
      CFBundleAlternateIcons: alternateIcons,
    };

    return mod;
  });

  return config;
}

module.exports = withAlternateIcons;
