const { withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WATCH_NAME = 'BsuirWatch';
const APP_GROUP = 'group.by.vazon.bsuirschedule';
const WATCHOS_DEPLOYMENT_TARGET = '10.0';

/**
 * Adds a native watchOS app target to the iOS project.
 *
 * Mirrors `withWidget.js`: the Swift sources live in `targets/watch/` (source
 * of truth) and are copied into `ios/BsuirWatch/` on every prebuild, while the
 * pbxproj graph (target, build phases, dependency, "Embed Watch Content") is
 * built once. Unlike the widget (an app-extension `.appex`), the watch app is a
 * full `com.apple.product-type.application` embedded under the iOS app's
 * `Watch/` directory.
 */
function withWatchApp(config) {
  // 1. Main app entitlements — share the App Group (idempotent with withWidget).
  config = withEntitlementsPlist(config, (mod) => {
    const groups = mod.modResults['com.apple.security.application-groups'] ?? [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    mod.modResults['com.apple.security.application-groups'] = groups;
    return mod;
  });

  // 2. Watch app target in Xcode project.
  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const appBundleId = mod.ios?.bundleIdentifier ?? 'by.vazon.bsuirschedule';
    // NB: `.watchapp`, NOT `.watchkitapp`. Apple reserves the whole
    // `<app>.watchkitapp.*` namespace and refuses to register any App ID under
    // it, so the complication (which MUST be prefixed by the watch app id to
    // embed) could not live there. A modern WKApplication watch app does not
    // require the `.watchkitapp` suffix — any main-app-prefixed id works — so we
    // use `.watchapp` and nest the complication as `.watchapp.complications`.
    // These two App IDs are registered by hand in the Apple Developer portal
    // (see RELEASE.md §0); keep the strings in exact sync with what's there.
    const watchBundleId = appBundleId + '.watchapp';
    const appVersion = mod.version ?? '0.1.0';
    const buildNumber = mod.ios?.buildNumber ?? '1';

    const iosRoot = path.join(projectRoot, 'ios');
    const watchDir = path.join(iosRoot, WATCH_NAME);
    fs.mkdirSync(watchDir, { recursive: true });

    // --- Refresh Swift sources on every prebuild ---
    const srcDir = path.join(projectRoot, 'targets', 'watch');
    const swiftFiles = fs.existsSync(srcDir)
      ? fs.readdirSync(srcDir).filter((f) => f.endsWith('.swift'))
      : [];
    for (const file of swiftFiles) {
      fs.copyFileSync(path.join(srcDir, file), path.join(watchDir, file));
    }

    // --- Info.plist (full, so we control WKApplication keys) ---
    fs.writeFileSync(
      path.join(watchDir, 'Info.plist'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>Bsuir Time</string>
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
  <key>CFBundleLocalizations</key>
  <array>
    <string>en</string>
    <string>ru</string>
    <string>be</string>
  </array>
  <key>WKApplication</key>
  <true/>
  <key>WKCompanionAppBundleIdentifier</key>
  <string>${appBundleId}</string>
</dict>
</plist>`,
    );

    // --- Entitlements (App Group) ---
    const entFile = `${WATCH_NAME}.entitlements`;
    fs.writeFileSync(
      path.join(watchDir, entFile),
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

    // --- Asset catalog with a single-size AppIcon (required to run) ---
    const assetsDir = path.join(watchDir, 'Assets.xcassets');
    const appIconDir = path.join(assetsDir, 'AppIcon.appiconset');
    fs.mkdirSync(appIconDir, { recursive: true });
    fs.writeFileSync(
      path.join(assetsDir, 'Contents.json'),
      JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2),
    );
    fs.writeFileSync(
      path.join(appIconDir, 'Contents.json'),
      JSON.stringify(
        {
          images: [
            {
              filename: 'icon.png',
              idiom: 'universal',
              platform: 'watchos',
              size: '1024x1024',
            },
          ],
          info: { author: 'xcode', version: 1 },
        },
        null,
        2,
      ),
    );
    const iconSrc = path.join(projectRoot, 'assets', 'icon.png');
    if (fs.existsSync(iconSrc)) {
      fs.copyFileSync(iconSrc, path.join(appIconDir, 'icon.png'));
    }

    // The pbxproj graph only needs to be built once — skip if already present.
    if (proj.pbxTargetByName(WATCH_NAME)) return mod;

    // --- Xcode project manipulation ---
    const mainTargetUuid = proj.getFirstTarget().uuid;
    const nativeTargetSection = proj.pbxNativeTargetSection();

    // Add a PBX group for the watch files (Swift + Info.plist + entitlements + assets).
    const grp = proj.addPbxGroup(
      [...swiftFiles, 'Info.plist', entFile, 'Assets.xcassets'],
      WATCH_NAME,
      WATCH_NAME,
    );
    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(grp.uuid, mainGroupId);

    const fileRefSection = proj.pbxFileReferenceSection();
    const buildFileSection = proj.pbxBuildFileSection();

    // Map each file's basename to the PBXFileReference uuid `addPbxGroup` just
    // created. We read the uuids from the group's `children` (whose `comment` is
    // the clean basename) rather than scanning `pbxFileReferenceSection` by name:
    // at this point the in-memory refs store `name`/`path` wrapped in literal
    // quotes (`"RootView.swift"`), so an `=== basename` match silently misses
    // every file and the Sources phase ends up empty (no compiled executable).
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
    const buildPhaseSection = proj.hash.project.objects['PBXSourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXSourcesBuildPhase'] = buildPhaseSection;
    buildPhaseSection[sourcePhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: sourceFiles,
      runOnlyForDeploymentPostprocessing: 0,
    };
    buildPhaseSection[sourcePhaseUuid + '_comment'] = 'Sources';

    // --- Resources build phase (asset catalog) ---
    const resPhaseUuid = proj.generateUuid();
    const resFiles = [];
    const assetsRef = refByName['Assets.xcassets'];
    if (assetsRef) {
      // Ensure Xcode treats it as an asset catalog.
      fileRefSection[assetsRef].lastKnownFileType = 'folder.assetcatalog';
      const assetsBuildFileUuid = proj.generateUuid();
      buildFileSection[assetsBuildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: assetsRef,
        fileRef_comment: 'Assets.xcassets',
      };
      buildFileSection[assetsBuildFileUuid + '_comment'] = 'Assets.xcassets in Resources';
      resFiles.push({ value: assetsBuildFileUuid, comment: 'Assets.xcassets in Resources' });
    }
    const resSection = proj.hash.project.objects['PBXResourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXResourcesBuildPhase'] = resSection;
    resSection[resPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: resFiles,
      runOnlyForDeploymentPostprocessing: 0,
    };
    resSection[resPhaseUuid + '_comment'] = 'Resources';

    // --- Frameworks build phase (empty) ---
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
      ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_ENTITLEMENTS: `${WATCH_NAME}/${entFile}`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: buildNumber,
      GENERATE_INFOPLIST_FILE: 'NO',
      INFOPLIST_FILE: `${WATCH_NAME}/Info.plist`,
      LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks"',
      MARKETING_VERSION: appVersion,
      PRODUCT_BUNDLE_IDENTIFIER: `"${watchBundleId}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SDKROOT: 'watchos',
      // YES — the watch app is embedded into the iOS app via the "Embed Watch
      // Content" copy phase; it must NOT also be installed as a standalone
      // product. With NO it lands in the archive's top-level Applications/
      // alongside BsuirTime.app, so xcodebuild sees two apps, can't pick the
      // primary, classifies the archive as "Generic Xcode Archive" and refuses
      // to export (exportArchive: "expected one of {}" — an empty method set).
      // The embed copy reads BUILT_PRODUCTS_DIR and is unaffected by this flag.
      SKIP_INSTALL: 'YES',
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
      `Build configuration list for PBXNativeTarget "${WATCH_NAME}"`;

    // --- Product file reference (BsuirWatch.app) ---
    const productFileUuid = proj.generateUuid();
    fileRefSection[productFileUuid] = {
      isa: 'PBXFileReference',
      explicitFileType: '"wrapper.application"',
      includeInIndex: 0,
      path: `${WATCH_NAME}.app`,
      sourceTree: 'BUILT_PRODUCTS_DIR',
    };
    fileRefSection[productFileUuid + '_comment'] = `${WATCH_NAME}.app`;
    const prodGroup = proj.pbxGroupByName('Products');
    if (prodGroup) proj.addToPbxGroup(productFileUuid, prodGroup.uuid);

    // --- Native target ---
    const targetUuid = proj.generateUuid();
    nativeTargetSection[targetUuid] = {
      isa: 'PBXNativeTarget',
      buildConfigurationList: configListUuid,
      buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${WATCH_NAME}"`,
      buildPhases: [
        { value: sourcePhaseUuid, comment: 'Sources' },
        { value: fwPhaseUuid, comment: 'Frameworks' },
        { value: resPhaseUuid, comment: 'Resources' },
      ],
      buildRules: [],
      dependencies: [],
      name: `"${WATCH_NAME}"`,
      productName: `"${WATCH_NAME}"`,
      productReference: productFileUuid,
      productReference_comment: `${WATCH_NAME}.app`,
      productType: '"com.apple.product-type.application"',
    };
    nativeTargetSection[targetUuid + '_comment'] = WATCH_NAME;

    const projectObj = proj.getFirstProject().firstProject;
    projectObj.targets.push({ value: targetUuid, comment: WATCH_NAME });

    // --- Target dependency: main app depends on the watch app ---
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
      remoteInfo: `"${WATCH_NAME}"`,
    };
    depSection[targetDependency] = {
      isa: 'PBXTargetDependency',
      target: targetUuid,
      target_comment: WATCH_NAME,
      targetProxy: containerItemProxy,
    };
    depSection[targetDependency + '_comment'] = 'PBXTargetDependency';

    const mainTarget = nativeTargetSection[mainTargetUuid];
    if (mainTarget && mainTarget.dependencies) {
      mainTarget.dependencies.push({ value: targetDependency, comment: 'PBXTargetDependency' });
    }

    // --- Embed Watch Content phase on the main app ---
    const embedPhaseUuid = proj.generateUuid();
    const embedBuildFileUuid = proj.generateUuid();
    buildFileSection[embedBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productFileUuid,
      fileRef_comment: `${WATCH_NAME}.app`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    buildFileSection[embedBuildFileUuid + '_comment'] = `${WATCH_NAME}.app in Embed Watch Content`;

    const copySection = proj.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
    proj.hash.project.objects['PBXCopyFilesBuildPhase'] = copySection;
    copySection[embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '"$(CONTENTS_FOLDER_PATH)/Watch"',
      dstSubfolderSpec: 16,
      files: [{ value: embedBuildFileUuid, comment: `${WATCH_NAME}.app in Embed Watch Content` }],
      name: '"Embed Watch Content"',
      runOnlyForDeploymentPostprocessing: 0,
    };
    copySection[embedPhaseUuid + '_comment'] = 'Embed Watch Content';

    if (mainTarget && mainTarget.buildPhases) {
      mainTarget.buildPhases.push({ value: embedPhaseUuid, comment: 'Embed Watch Content' });
    }

    return mod;
  });

  return config;
}

module.exports = withWatchApp;
