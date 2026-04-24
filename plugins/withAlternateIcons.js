const { withInfoPlist, withXcodeProject, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ICONS_SOURCE_DIR = 'assets/icons';

function withAlternateIcons(config) {
  // 1. Copy icon files into the iOS bundle
  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const srcDir = path.join(projectRoot, ICONS_SOURCE_DIR);
      const iosDir = path.join(projectRoot, 'ios', 'BsuirTime');
      const destDir = path.join(iosDir, 'AlternateIcons');

      if (!fs.existsSync(srcDir)) return mod;

      fs.mkdirSync(destDir, { recursive: true });

      const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.png') && f !== 'icon-bg-default.png');
      for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }

      return mod;
    },
  ]);

  // 2. Add icon files to Xcode project build resources
  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const srcDir = path.join(projectRoot, ICONS_SOURCE_DIR);

    if (!fs.existsSync(srcDir)) return mod;

    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.png') && f !== 'icon-bg-default.png');
    const mainGroup = proj.getFirstProject().firstProject.mainGroup;

    // Find or create AlternateIcons group
    let groupKey = null;
    const groups = proj.hash.project.objects['PBXGroup'];
    for (const key of Object.keys(groups)) {
      if (typeof groups[key] === 'object' && groups[key].name === 'AlternateIcons') {
        groupKey = key;
        break;
      }
    }

    if (!groupKey) {
      groupKey = proj.pbxCreateGroup('AlternateIcons', 'BsuirTime/AlternateIcons');
      const mainGroupObj = groups[mainGroup];
      if (mainGroupObj && mainGroupObj.children) {
        mainGroupObj.children.push({ value: groupKey, comment: 'AlternateIcons' });
      }
    }

    for (const file of files) {
      const filePath = `BsuirTime/AlternateIcons/${file}`;
      // Check if already added
      const existing = proj.hash.project.objects['PBXFileReference'];
      const alreadyAdded = Object.values(existing).some(
        (ref) => typeof ref === 'object' && ref.path === filePath,
      );
      if (!alreadyAdded) {
        proj.addResourceFile(filePath, { target: proj.getFirstTarget().uuid }, groupKey);
      }
    }

    return mod;
  });

  // 3. Register alternate icons in Info.plist
  config = withInfoPlist(config, (mod) => {
    const projectRoot = mod.modRequest.projectRoot;
    const srcDir = path.join(projectRoot, ICONS_SOURCE_DIR);

    if (!fs.existsSync(srcDir)) return mod;

    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.png') && f !== 'icon-bg-default.png');

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
