/**
 * Expo config plugin that adds Unity Ads BannerView native modules
 * for iOS and Android.
 */
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withUnityBanner(config) {
  // iOS: copy files and add to Xcode project
  config = withDangerousMod(config, [
    'ios',
    async (c) => {
      const projRoot = c.modRequest.projectRoot;
      const iosDir = path.join(c.modRequest.platformProjectRoot, c.modRequest.projectName);
      const srcDir = path.join(projRoot, 'targets/unity-banner');

      const files = ['UnityBannerViewManager.swift', 'UnityBannerViewManager.m'];
      for (const file of files) {
        const src = path.join(srcDir, file);
        const dst = path.join(iosDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        }
      }

      // Ensure bridging header includes RCTViewManager
      const appName = c.modRequest.projectName;
      const bridgingPath = path.join(iosDir, `${appName}-Bridging-Header.h`);
      if (fs.existsSync(bridgingPath)) {
        let header = fs.readFileSync(bridgingPath, 'utf8');
        if (!header.includes('RCTViewManager.h')) {
          header = header.replace(
            '#import <React/RCTBridgeModule.h>',
            '#import <React/RCTBridgeModule.h>\n#import <React/RCTViewManager.h>',
          );
          fs.writeFileSync(bridgingPath, header);
        }
      }

      return c;
    },
  ]);

  config = withXcodeProject(config, (c) => {
    const proj = c.modResults;
    const projName = c.modRequest.projectName;
    const groupKey = proj.findPBXGroupKey({ name: projName }) || proj.getFirstProject().firstProject.mainGroup;

    const files = ['UnityBannerViewManager.swift', 'UnityBannerViewManager.m'];
    for (const file of files) {
      // Check if file already added
      const existing = Object.values(proj.hash.project.objects.PBXBuildFile || {}).find(
        (bf) => typeof bf === 'object' && bf.fileRef_comment && bf.fileRef_comment.includes(file),
      );
      if (existing) continue;

      proj.addSourceFile(
        `${projName}/${file}`,
        { target: proj.getFirstTarget().uuid },
        groupKey,
      );
    }
    return c;
  });

  // Android: copy Kotlin files and register package
  config = withDangerousMod(config, [
    'android',
    async (c) => {
      const projRoot = c.modRequest.projectRoot;
      const androidPkg = path.join(
        c.modRequest.platformProjectRoot,
        'app/src/main/java/by/vazon/bsuirtime/unitybanner',
      );
      const srcDir = path.join(projRoot, 'targets/unity-banner');

      fs.mkdirSync(androidPkg, { recursive: true });

      const files = [
        'UnityBannerViewManager.kt',
        'UnityBannerPackage.kt',
      ];
      for (const file of files) {
        const src = path.join(srcDir, file);
        const dst = path.join(androidPkg, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        }
      }

      // Register the package in MainApplication.kt
      const mainAppPath = path.join(
        c.modRequest.platformProjectRoot,
        'app/src/main/java/by/vazon/bsuirtime/MainApplication.kt',
      );
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, 'utf8');
        const importLine = 'import by.vazon.bsuirtime.unitybanner.UnityBannerPackage';
        const addLine = '              add(UnityBannerPackage())';

        if (!content.includes('UnityBannerPackage')) {
          content = content.replace(
            'import expo.modules.ApplicationLifecycleDispatcher',
            `${importLine}\nimport expo.modules.ApplicationLifecycleDispatcher`,
          );
          content = content.replace(
            '// Packages that cannot be autolinked yet can be added manually here, for example:',
            `// Packages that cannot be autolinked yet can be added manually here, for example:\n${addLine}`,
          );
          fs.writeFileSync(mainAppPath, content);
        }
      }

      return c;
    },
  ]);

  return config;
}

module.exports = withUnityBanner;
