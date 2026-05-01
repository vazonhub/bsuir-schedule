const { withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that adds the WidgetKitBridge native module to the
 * main app target so that React Native can call
 * WidgetCenter.shared.reloadAllTimelines().
 */
function withWidgetKitBridge(config) {
  return withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const iosRoot = path.join(projectRoot, 'ios');
    const appName = mod.modRequest.projectName;
    const appDir = path.join(iosRoot, appName);

    // Copy Swift and ObjC files into the app target directory
    const srcDir = path.join(projectRoot, 'ios-native');
    const filesToCopy = ['WidgetKitBridge.swift', 'WidgetKitBridge.m'];

    for (const file of filesToCopy) {
      const src = path.join(srcDir, file);
      const dst = path.join(appDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Find the main target group
    const mainTarget = proj.getFirstTarget();
    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;

    // Find app group under main group
    const pbxGroupSection = proj.hash.project.objects['PBXGroup'];
    let appGroupId = null;
    const mainGroup = pbxGroupSection[mainGroupId];
    if (mainGroup && mainGroup.children) {
      for (const child of mainGroup.children) {
        const g = pbxGroupSection[child.value];
        if (g && (g.name === appName || g.path === appName)) {
          appGroupId = child.value;
          break;
        }
      }
    }

    // Add source files to the main app target
    for (const file of filesToCopy) {
      const filePath = path.join(appName, file);

      // Check if already added
      const fileRefSection = proj.pbxFileReferenceSection();
      let alreadyExists = false;
      for (const key in fileRefSection) {
        const ref = fileRefSection[key];
        if (typeof ref === 'object' && ref.path && ref.path.includes(file)) {
          alreadyExists = true;
          break;
        }
      }
      if (alreadyExists) continue;

      proj.addSourceFile(filePath, { target: mainTarget.uuid }, appGroupId);
    }

    // Link WidgetKit framework to main target
    const fwAlreadyLinked = Object.values(proj.pbxBuildFileSection()).some(
      (bf) => typeof bf === 'object' && bf.fileRef_comment === 'WidgetKit.framework',
    );
    if (!fwAlreadyLinked) {
      proj.addFramework('WidgetKit.framework', {
        weak: true,
        target: mainTarget.uuid,
      });
    }

    return mod;
  });
}

module.exports = withWidgetKitBridge;
