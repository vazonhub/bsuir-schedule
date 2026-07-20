const { withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const EXT_NAME = 'BsuirWatchComplication';
const WATCH_NAME = 'BsuirWatch';
const APP_GROUP = 'group.by.vazon.bsuirschedule';
const WATCHOS_DEPLOYMENT_TARGET = '10.0';

/**
 * Adds a watchOS WidgetKit extension (complications) to the project and embeds
 * it inside the watch app.
 *
 * Mirrors `withWatchApp.js`: Swift sources live in `targets/watch-complication/`
 * (source of truth) and are copied into `ios/BsuirWatchComplication/` on every
 * prebuild; the pbxproj graph is built once. Unlike the watch app (a full
 * application embedded in the iOS app), this is an app-extension `.appex` with
 * `NSExtensionPointIdentifier = com.apple.widgetkit-extension`, embedded under
 * the watch app's `PlugIns/`.
 *
 * Must run AFTER `withWatchApp` so the `BsuirWatch` target exists to attach the
 * dependency and "Embed Foundation Extensions" phase to.
 */
function withWatchComplication(config) {
  // 1. Main app entitlements — share the App Group (idempotent with the others).
  config = withEntitlementsPlist(config, (mod) => {
    const groups = mod.modResults['com.apple.security.application-groups'] ?? [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    mod.modResults['com.apple.security.application-groups'] = groups;
    return mod;
  });

  // 2. Complication extension target in Xcode project.
  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const appBundleId = mod.ios?.bundleIdentifier ?? 'by.vazon.bsuirschedule';
    const extBundleId = appBundleId + '.watchkitapp.complication';
    const appVersion = mod.version ?? '0.1.0';
    const buildNumber = mod.ios?.buildNumber ?? '1';

    const iosRoot = path.join(projectRoot, 'ios');
    const extDir = path.join(iosRoot, EXT_NAME);
    fs.mkdirSync(extDir, { recursive: true });

    // --- Refresh Swift sources on every prebuild ---
    const srcDir = path.join(projectRoot, 'targets', 'watch-complication');
    const swiftFiles = fs.existsSync(srcDir)
      ? fs.readdirSync(srcDir).filter((f) => f.endsWith('.swift'))
      : [];
    for (const file of swiftFiles) {
      fs.copyFileSync(path.join(srcDir, file), path.join(extDir, file));
    }

    // --- Info.plist (WidgetKit extension) ---
    fs.writeFileSync(
      path.join(extDir, 'Info.plist'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>Schedule</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`,
    );

    // --- Entitlements (App Group) ---
    const entFile = `${EXT_NAME}.entitlements`;
    fs.writeFileSync(
      path.join(extDir, entFile),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`,
    );

    // The pbxproj graph only needs to be built once — skip if already present.
    if (proj.pbxTargetByName(EXT_NAME)) return mod;

    const nativeTargetSection = proj.pbxNativeTargetSection();
    const fileRefSection = proj.pbxFileReferenceSection();
    const buildFileSection = proj.pbxBuildFileSection();

    // Add a PBX group for the extension files.
    const grp = proj.addPbxGroup([...swiftFiles, 'Info.plist', entFile], EXT_NAME, EXT_NAME);
    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(grp.uuid, mainGroupId);

    // Map basename → file-reference uuid via the group's children. We read uuids
    // here (comment is the clean basename) rather than scanning the file
    // reference section by name: the in-memory refs store name/path wrapped in
    // literal quotes, so an `=== basename` match misses and the Sources phase
    // ends up empty (no compiled executable).
    const refByName = {};
    for (const child of grp.pbxGroup.children) {
      refByName[child.comment] = child.value;
    }

    // --- Sources build phase (all Swift files) ---
    const sourcePhaseUuid = proj.generateUuid();
    const sourceFiles = [];
    for (const swiftFile of swiftFiles) {
      const ref = refByName[swiftFile];
      if (!ref) continue;
      const buildFileUuid = proj.generateUuid();
      buildFileSection[buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: ref,
        fileRef_comment: swiftFile,
      };
      buildFileSection[buildFileUuid + '_comment'] = `${swiftFile} in Sources`;
      sourceFiles.push({ value: buildFileUuid, comment: `${swiftFile} in Sources` });
    }
    const sourcesSection = proj.hash.project.objects['PBXSourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXSourcesBuildPhase'] = sourcesSection;
    sourcesSection[sourcePhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: sourceFiles,
      runOnlyForDeploymentPostprocessing: 0,
    };
    sourcesSection[sourcePhaseUuid + '_comment'] = 'Sources';

    // --- Frameworks build phase (empty; SwiftUI/WidgetKit auto-linked) ---
    const fwPhaseUuid = proj.generateUuid();
    const fwSection = proj.hash.project.objects['PBXFrameworksBuildPhase'] || {};
    proj.hash.project.objects['PBXFrameworksBuildPhase'] = fwSection;
    fwSection[fwPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    fwSection[fwPhaseUuid + '_comment'] = 'Frameworks';

    // --- Build settings ---
    const mkSettings = (debug) => ({
      APPLICATION_EXTENSION_API_ONLY: 'YES',
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_ENTITLEMENTS: `${EXT_NAME}/${entFile}`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: buildNumber,
      GENERATE_INFOPLIST_FILE: 'NO',
      INFOPLIST_FILE: `${EXT_NAME}/Info.plist`,
      LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: appVersion,
      PRODUCT_BUNDLE_IDENTIFIER: `"${extBundleId}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SDKROOT: 'watchos',
      SKIP_INSTALL: 'NO',
      SWIFT_EMIT_LOC_STRINGS: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '4',
      WATCHOS_DEPLOYMENT_TARGET: WATCHOS_DEPLOYMENT_TARGET,
      ...(debug
        ? {
            DEBUG_INFORMATION_FORMAT: 'dwarf',
            SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"$(inherited) DEBUG"',
            SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
          }
        : {
            SWIFT_OPTIMIZATION_LEVEL: '"-Owholemodule"',
          }),
    });

    const debugConfigUuid = proj.generateUuid();
    const releaseConfigUuid = proj.generateUuid();
    const configListUuid = proj.generateUuid();

    const buildConfigSection = proj.pbxXCBuildConfigurationSection();
    buildConfigSection[debugConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: mkSettings(true),
      name: 'Debug',
    };
    buildConfigSection[debugConfigUuid + '_comment'] = 'Debug';
    buildConfigSection[releaseConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: mkSettings(false),
      name: 'Release',
    };
    buildConfigSection[releaseConfigUuid + '_comment'] = 'Release';

    const configListSection = proj.pbxXCConfigurationList();
    configListSection[configListUuid] = {
      isa: 'XCConfigurationList',
      buildConfigurations: [
        { value: debugConfigUuid, comment: 'Debug' },
        { value: releaseConfigUuid, comment: 'Release' },
      ],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: 'Release',
    };
    configListSection[configListUuid + '_comment'] =
      `Build configuration list for PBXNativeTarget "${EXT_NAME}"`;

    // --- Product file reference (BsuirWatchComplication.appex) ---
    const productFileUuid = proj.generateUuid();
    fileRefSection[productFileUuid] = {
      isa: 'PBXFileReference',
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${EXT_NAME}.appex`,
      sourceTree: 'BUILT_PRODUCTS_DIR',
    };
    fileRefSection[productFileUuid + '_comment'] = `${EXT_NAME}.appex`;
    const prodGroup = proj.pbxGroupByName('Products');
    if (prodGroup) proj.addToPbxGroup(productFileUuid, prodGroup.uuid);

    // --- Native target (app-extension) ---
    const targetUuid = proj.generateUuid();
    nativeTargetSection[targetUuid] = {
      isa: 'PBXNativeTarget',
      buildConfigurationList: configListUuid,
      buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${EXT_NAME}"`,
      buildPhases: [
        { value: sourcePhaseUuid, comment: 'Sources' },
        { value: fwPhaseUuid, comment: 'Frameworks' },
      ],
      buildRules: [],
      dependencies: [],
      name: `"${EXT_NAME}"`,
      productName: `"${EXT_NAME}"`,
      productReference: productFileUuid,
      productReference_comment: `${EXT_NAME}.appex`,
      productType: '"com.apple.product-type.app-extension"',
    };
    nativeTargetSection[targetUuid + '_comment'] = EXT_NAME;
    proj.getFirstProject().firstProject.targets.push({ value: targetUuid, comment: EXT_NAME });

    // --- Locate the watch app target to embed into ---
    let watchTargetUuid = null;
    for (const key in nativeTargetSection) {
      if (nativeTargetSection[key + '_comment'] === WATCH_NAME) {
        watchTargetUuid = key;
        break;
      }
    }
    // withWatchApp must have run first (it's listed after this plugin because
    // Expo applies xcodeproj mods in reverse order). Bail rather than produce a
    // dangling, un-embedded extension.
    if (!watchTargetUuid) return mod;

    const watchTarget = nativeTargetSection[watchTargetUuid];

    // --- Target dependency: watch app depends on the extension ---
    const containerItemProxy = proj.generateUuid();
    const targetDependency = proj.generateUuid();
    const depSection = proj.hash.project.objects['PBXTargetDependency'] || {};
    proj.hash.project.objects['PBXTargetDependency'] = depSection;
    const proxySection = proj.hash.project.objects['PBXContainerItemProxy'] || {};
    proj.hash.project.objects['PBXContainerItemProxy'] = proxySection;

    proxySection[containerItemProxy] = {
      isa: 'PBXContainerItemProxy',
      containerPortal: proj.getFirstProject().uuid,
      containerPortal_comment: 'Project object',
      proxyType: 1,
      remoteGlobalIDString: targetUuid,
      remoteInfo: `"${EXT_NAME}"`,
    };
    depSection[targetDependency] = {
      isa: 'PBXTargetDependency',
      target: targetUuid,
      target_comment: EXT_NAME,
      targetProxy: containerItemProxy,
    };
    depSection[targetDependency + '_comment'] = 'PBXTargetDependency';
    if (watchTarget.dependencies) {
      watchTarget.dependencies.push({ value: targetDependency, comment: 'PBXTargetDependency' });
    }

    // --- "Embed Foundation Extensions" phase on the watch app ---
    const embedPhaseUuid = proj.generateUuid();
    const embedBuildFileUuid = proj.generateUuid();
    buildFileSection[embedBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productFileUuid,
      fileRef_comment: `${EXT_NAME}.appex`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    buildFileSection[embedBuildFileUuid + '_comment'] =
      `${EXT_NAME}.appex in Embed Foundation Extensions`;

    const copySection = proj.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
    proj.hash.project.objects['PBXCopyFilesBuildPhase'] = copySection;
    copySection[embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '""',
      dstSubfolderSpec: 13,
      files: [
        { value: embedBuildFileUuid, comment: `${EXT_NAME}.appex in Embed Foundation Extensions` },
      ],
      name: '"Embed Foundation Extensions"',
      runOnlyForDeploymentPostprocessing: 0,
    };
    copySection[embedPhaseUuid + '_comment'] = 'Embed Foundation Extensions';
    if (watchTarget.buildPhases) {
      watchTarget.buildPhases.push({
        value: embedPhaseUuid,
        comment: 'Embed Foundation Extensions',
      });
    }

    return mod;
  });

  return config;
}

module.exports = withWatchComplication;
