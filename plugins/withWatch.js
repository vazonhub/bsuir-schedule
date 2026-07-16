const { withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// watchOS companion: a single-target watch app (BsuirWatch) plus a WidgetKit
// extension (BsuirWatchWidget) embedded INSIDE that watch app for complications.
// Modeled on ./plugins/withWidget.js.
//
// The project is managed/CNG (ios/ is generated), so the whole target graph is
// (re)built here on prebuild. Swift sources live in targets/watch/ (app) and
// targets/watch-widget/ (extension) and are copied into ios/ on every prebuild.
// SnapshotModel.swift + LessonSupport.swift are shared: compiled into BOTH the
// app and the extension (one file reference, two build files).

const WATCH_NAME = 'BsuirWatch';
const WATCH_WIDGET_NAME = 'BsuirWatchWidget';
const APP_GROUP = 'group.by.vazon.bsuirschedule';
const WATCH_DEPLOYMENT_TARGET = '9.0';
// Files shared between the watch app and its widget extension.
const SHARED_SWIFT = ['SnapshotModel.swift', 'LessonSupport.swift'];

function getNativeTargetUuid(proj, name) {
  const section = proj.pbxNativeTargetSection();
  for (const key in section) {
    if (key.endsWith('_comment')) continue;
    const t = section[key];
    if (typeof t === 'object' && (t.name === name || t.name === `"${name}"`)) return key;
  }
  return null;
}

function findFileRef(proj, filename) {
  const section = proj.pbxFileReferenceSection();
  for (const key in section) {
    if (key.endsWith('_comment')) continue;
    const ref = section[key];
    if (typeof ref !== 'object') continue;
    const name = (ref.name || '').replace(/"/g, '');
    const p = (ref.path || '').replace(/"/g, '');
    if (name === filename || p === filename || p.endsWith('/' + filename)) return key;
  }
  return null;
}

function copySwiftSources(projectRoot, subdir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const srcDir = path.join(projectRoot, 'targets', subdir);
  const files = fs.existsSync(srcDir)
    ? fs.readdirSync(srcDir).filter((f) => f.endsWith('.swift'))
    : [];
  for (const f of files) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
  }
  return files;
}

function optSettings(debug) {
  return debug
    ? {
        DEBUG_INFORMATION_FORMAT: 'dwarf',
        SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"$(inherited) DEBUG"',
        SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
      }
    : {
        SWIFT_OPTIMIZATION_LEVEL: '"-Owholemodule"',
        DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
      };
}

function makeConfigList(proj, targetName, mkSettings) {
  const debugUuid = proj.generateUuid();
  const releaseUuid = proj.generateUuid();
  const listUuid = proj.generateUuid();

  const cfgSection = proj.pbxXCBuildConfigurationSection();
  cfgSection[debugUuid] = { isa: 'XCBuildConfiguration', buildSettings: mkSettings(true), name: 'Debug' };
  cfgSection[debugUuid + '_comment'] = 'Debug';
  cfgSection[releaseUuid] = { isa: 'XCBuildConfiguration', buildSettings: mkSettings(false), name: 'Release' };
  cfgSection[releaseUuid + '_comment'] = 'Release';

  const listSection = proj.pbxXCConfigurationList();
  listSection[listUuid] = {
    isa: 'XCConfigurationList',
    buildConfigurations: [
      { value: debugUuid, comment: 'Debug' },
      { value: releaseUuid, comment: 'Release' },
    ],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: 'Release',
  };
  listSection[listUuid + '_comment'] = `Build configuration list for PBXNativeTarget "${targetName}"`;
  return listUuid;
}

/** Create a Sources build phase from a list of {name, ref} file references. */
function makeSourcesPhase(proj, fileRefs) {
  const buildFileSection = proj.pbxBuildFileSection();
  const files = [];
  for (const { name, ref } of fileRefs) {
    const bf = proj.generateUuid();
    buildFileSection[bf] = { isa: 'PBXBuildFile', fileRef: ref, fileRef_comment: name };
    buildFileSection[bf + '_comment'] = `${name} in Sources`;
    files.push({ value: bf, comment: `${name} in Sources` });
  }
  const phaseUuid = proj.generateUuid();
  const section = proj.hash.project.objects['PBXSourcesBuildPhase'] || {};
  proj.hash.project.objects['PBXSourcesBuildPhase'] = section;
  section[phaseUuid] = {
    isa: 'PBXSourcesBuildPhase',
    buildActionMask: 2147483647,
    files,
    runOnlyForDeploymentPostprocessing: 0,
  };
  section[phaseUuid + '_comment'] = 'Sources';
  return phaseUuid;
}

function makeEmptyPhase(proj, isa, comment) {
  const uuid = proj.generateUuid();
  const section = proj.hash.project.objects[isa] || {};
  proj.hash.project.objects[isa] = section;
  section[uuid] = { isa, buildActionMask: 2147483647, files: [], runOnlyForDeploymentPostprocessing: 0 };
  section[uuid + '_comment'] = comment;
  return uuid;
}

/**
 * Embed `productFileUuid` (an .app or .appex) into `hostTargetUuid`.
 * dstSubfolderSpec 16 = watch content ($(CONTENTS_FOLDER_PATH)/Watch),
 * dstSubfolderSpec 13 = PlugIns (app extensions).
 */
function embedProduct(proj, hostTargetUuid, productFileUuid, productName, phaseName, dstSubfolderSpec, dstPath) {
  const buildFileSection = proj.pbxBuildFileSection();
  const embedFile = proj.generateUuid();
  buildFileSection[embedFile] = {
    isa: 'PBXBuildFile',
    fileRef: productFileUuid,
    fileRef_comment: productName,
    settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
  };
  buildFileSection[embedFile + '_comment'] = `${productName} in ${phaseName}`;

  const phaseUuid = proj.generateUuid();
  const copySection = proj.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
  proj.hash.project.objects['PBXCopyFilesBuildPhase'] = copySection;
  copySection[phaseUuid] = {
    isa: 'PBXCopyFilesBuildPhase',
    buildActionMask: 2147483647,
    dstPath: dstPath,
    dstSubfolderSpec,
    files: [{ value: embedFile, comment: `${productName} in ${phaseName}` }],
    name: `"${phaseName}"`,
    runOnlyForDeploymentPostprocessing: 0,
  };
  copySection[phaseUuid + '_comment'] = phaseName;

  const host = proj.pbxNativeTargetSection()[hostTargetUuid];
  if (host && host.buildPhases) host.buildPhases.push({ value: phaseUuid, comment: phaseName });
}

/** Add a target dependency: `hostTargetUuid` depends on `depTargetUuid`. */
function addDependency(proj, hostTargetUuid, depTargetUuid, depName) {
  const proxy = proj.generateUuid();
  const dep = proj.generateUuid();
  const depSection = proj.hash.project.objects['PBXTargetDependency'] || {};
  proj.hash.project.objects['PBXTargetDependency'] = depSection;
  const proxySection = proj.hash.project.objects['PBXContainerItemProxy'] || {};
  proj.hash.project.objects['PBXContainerItemProxy'] = proxySection;

  proxySection[proxy] = {
    isa: 'PBXContainerItemProxy',
    containerPortal: proj.getFirstProject().uuid,
    containerPortal_comment: 'Project object',
    proxyType: 1,
    remoteGlobalIDString: depTargetUuid,
    remoteInfo: `"${depName}"`,
  };
  depSection[dep] = { isa: 'PBXTargetDependency', target: depTargetUuid, target_comment: depName, targetProxy: proxy };
  depSection[dep + '_comment'] = 'PBXTargetDependency';

  const host = proj.pbxNativeTargetSection()[hostTargetUuid];
  if (host && host.dependencies) host.dependencies.push({ value: dep, comment: 'PBXTargetDependency' });
}

function writePlist(file, body) {
  fs.writeFileSync(file, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${body}
</dict>
</plist>`);
}

function withWatch(config) {
  // Main app must be in the App Group (withWidget also sets this; kept here so
  // withWatch is self-sufficient / order-independent).
  config = withEntitlementsPlist(config, (mod) => {
    const key = 'com.apple.security.application-groups';
    const groups = new Set(mod.modResults[key] || []);
    groups.add(APP_GROUP);
    mod.modResults[key] = Array.from(groups);
    return mod;
  });

  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const appBundleId = mod.ios?.bundleIdentifier ?? 'by.vazon.bsuirschedule';
    const watchBundleId = appBundleId + '.watchkitapp';
    const watchWidgetBundleId = watchBundleId + '.widget';
    const kvIdentifier = '$(TeamIdentifierPrefix)' + appBundleId;
    const appVersion = mod.version ?? '0.1.0';
    const buildNumber = mod.ios?.buildNumber ?? '1';

    const iosRoot = path.join(projectRoot, 'ios');
    const watchDir = path.join(iosRoot, WATCH_NAME);
    const widgetDir = path.join(iosRoot, WATCH_WIDGET_NAME);
    const watchEntFile = `${WATCH_NAME}.entitlements`;
    const widgetEntFile = `${WATCH_WIDGET_NAME}.entitlements`;

    // ── Refresh sources & generated files on every prebuild ──
    const watchSwiftFiles = copySwiftSources(projectRoot, 'watch', watchDir);
    const widgetSwiftFiles = copySwiftSources(projectRoot, 'watch-widget', widgetDir);

    // Watch app asset catalog (AppIcon + AccentColor). Copied whole.
    const assetsSrc = path.join(projectRoot, 'targets', 'watch', 'Assets.xcassets');
    const hasAssets = fs.existsSync(assetsSrc);
    if (hasAssets) {
      fs.cpSync(assetsSrc, path.join(watchDir, 'Assets.xcassets'), { recursive: true });
    }

    // Watch app Info.plist (single-target watchOS app: WKApplication=YES).
    writePlist(path.join(watchDir, 'Info.plist'), `  <key>CFBundleDevelopmentRegion</key>
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
  <key>WKApplication</key>
  <true/>
  <key>WKCompanionAppBundleIdentifier</key>
  <string>${appBundleId}</string>`);

    // Watch app entitlements: App Group + iCloud KV (transport, WATCH_PLAN §3).
    writePlist(path.join(watchDir, watchEntFile), `  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
  <key>com.apple.developer.ubiquity-kvstore-identifier</key>
  <string>${kvIdentifier}</string>`);

    // Watch widget extension Info.plist (WidgetKit extension point).
    writePlist(path.join(widgetDir, 'Info.plist'), `  <key>CFBundleDevelopmentRegion</key>
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
  </dict>`);

    // Watch widget entitlements: App Group only (reads the cached snapshot).
    writePlist(path.join(widgetDir, widgetEntFile), `  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>`);

    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    const prodGroup = proj.pbxGroupByName('Products');
    const fileRefSection = proj.pbxFileReferenceSection();

    // ══════════ Watch app target ══════════
    if (!getNativeTargetUuid(proj, WATCH_NAME)) {
      const groupFiles = [...watchSwiftFiles, 'Info.plist', watchEntFile];
      if (hasAssets) groupFiles.push('Assets.xcassets');
      const grp = proj.addPbxGroup(groupFiles, WATCH_NAME, WATCH_NAME);
      proj.addToPbxGroup(grp.uuid, mainGroupId);

      const appFileRefs = watchSwiftFiles
        .map((name) => ({ name, ref: findFileRef(proj, name) }))
        .filter((x) => x.ref);

      const mkSettings = (debug) => ({
        ...(hasAssets ? { ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon' } : {}),
        ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
        CLANG_ANALYZER_NONNULL: 'YES',
        CLANG_ENABLE_MODULES: 'YES',
        CODE_SIGN_ENTITLEMENTS: `${WATCH_NAME}/${watchEntFile}`,
        CODE_SIGN_STYLE: 'Automatic',
        CURRENT_PROJECT_VERSION: buildNumber,
        GENERATE_INFOPLIST_FILE: 'NO',
        INFOPLIST_FILE: `${WATCH_NAME}/Info.plist`,
        INFOPLIST_KEY_CFBundleDisplayName: '"Bsuir Time"',
        INFOPLIST_KEY_NSHumanReadableCopyright: '""',
        LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks"',
        MARKETING_VERSION: appVersion,
        PRODUCT_BUNDLE_IDENTIFIER: `"${watchBundleId}"`,
        PRODUCT_NAME: '"$(TARGET_NAME)"',
        SDKROOT: 'watchos',
        SKIP_INSTALL: 'NO',
        SUPPORTED_PLATFORMS: '"watchos watchsimulator"',
        SWIFT_EMIT_LOC_STRINGS: 'YES',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '4',
        WATCHOS_DEPLOYMENT_TARGET: WATCH_DEPLOYMENT_TARGET,
        ...optSettings(debug),
      });

      const configListUuid = makeConfigList(proj, WATCH_NAME, mkSettings);
      const sourcePhaseUuid = makeSourcesPhase(proj, appFileRefs);
      const fwPhaseUuid = makeEmptyPhase(proj, 'PBXFrameworksBuildPhase', 'Frameworks');
      const resPhaseUuid = makeEmptyPhase(proj, 'PBXResourcesBuildPhase', 'Resources');

      // Add the asset catalog to the Resources phase so AppIcon compiles in.
      if (hasAssets) {
        const assetsRef = findFileRef(proj, 'Assets.xcassets');
        if (assetsRef) {
          const buildFileSection = proj.pbxBuildFileSection();
          const bf = proj.generateUuid();
          buildFileSection[bf] = { isa: 'PBXBuildFile', fileRef: assetsRef, fileRef_comment: 'Assets.xcassets' };
          buildFileSection[bf + '_comment'] = 'Assets.xcassets in Resources';
          proj.hash.project.objects['PBXResourcesBuildPhase'][resPhaseUuid].files.push({
            value: bf,
            comment: 'Assets.xcassets in Resources',
          });
        }
      }

      const productFileUuid = proj.generateUuid();
      fileRefSection[productFileUuid] = {
        isa: 'PBXFileReference',
        explicitFileType: '"wrapper.application"',
        includeInIndex: 0,
        path: `${WATCH_NAME}.app`,
        sourceTree: 'BUILT_PRODUCTS_DIR',
      };
      fileRefSection[productFileUuid + '_comment'] = `${WATCH_NAME}.app`;
      if (prodGroup) proj.addToPbxGroup(productFileUuid, prodGroup.uuid);

      const targetUuid = proj.generateUuid();
      proj.pbxNativeTargetSection()[targetUuid] = {
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
      proj.pbxNativeTargetSection()[targetUuid + '_comment'] = WATCH_NAME;
      proj.getFirstProject().firstProject.targets.push({ value: targetUuid, comment: WATCH_NAME });

      // Main app depends on & embeds the watch app.
      const mainTargetUuid = proj.getFirstTarget().uuid;
      addDependency(proj, mainTargetUuid, targetUuid, WATCH_NAME);
      embedProduct(proj, mainTargetUuid, productFileUuid, `${WATCH_NAME}.app`, 'Embed Watch Content', 16, '"$(CONTENTS_FOLDER_PATH)/Watch"');
    }

    const watchTargetUuid = getNativeTargetUuid(proj, WATCH_NAME);

    // ══════════ Watch widget extension target ══════════
    if (watchTargetUuid && !getNativeTargetUuid(proj, WATCH_WIDGET_NAME)) {
      const grp = proj.addPbxGroup([...widgetSwiftFiles, 'Info.plist', widgetEntFile], WATCH_WIDGET_NAME, WATCH_WIDGET_NAME);
      proj.addToPbxGroup(grp.uuid, mainGroupId);

      // Widget-specific sources + shared model/support files (reused refs).
      const widgetFileRefs = [
        ...widgetSwiftFiles.map((name) => ({ name, ref: findFileRef(proj, name) })),
        ...SHARED_SWIFT.map((name) => ({ name, ref: findFileRef(proj, name) })),
      ].filter((x) => x.ref);

      const mkSettings = (debug) => ({
        ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
        CLANG_ANALYZER_NONNULL: 'YES',
        CLANG_ENABLE_MODULES: 'YES',
        CODE_SIGN_ENTITLEMENTS: `${WATCH_WIDGET_NAME}/${widgetEntFile}`,
        CODE_SIGN_STYLE: 'Automatic',
        CURRENT_PROJECT_VERSION: buildNumber,
        GENERATE_INFOPLIST_FILE: 'NO',
        INFOPLIST_FILE: `${WATCH_WIDGET_NAME}/Info.plist`,
        INFOPLIST_KEY_CFBundleDisplayName: 'Schedule',
        INFOPLIST_KEY_NSHumanReadableCopyright: '""',
        LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
        MARKETING_VERSION: appVersion,
        PRODUCT_BUNDLE_IDENTIFIER: `"${watchWidgetBundleId}"`,
        PRODUCT_NAME: '"$(TARGET_NAME)"',
        SDKROOT: 'watchos',
        SKIP_INSTALL: 'YES',
        SUPPORTED_PLATFORMS: '"watchos watchsimulator"',
        SWIFT_EMIT_LOC_STRINGS: 'YES',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '4',
        WATCHOS_DEPLOYMENT_TARGET: WATCH_DEPLOYMENT_TARGET,
        ...optSettings(debug),
      });

      const configListUuid = makeConfigList(proj, WATCH_WIDGET_NAME, mkSettings);
      const sourcePhaseUuid = makeSourcesPhase(proj, widgetFileRefs);
      const fwPhaseUuid = makeEmptyPhase(proj, 'PBXFrameworksBuildPhase', 'Frameworks');
      const resPhaseUuid = makeEmptyPhase(proj, 'PBXResourcesBuildPhase', 'Resources');

      const productFileUuid = proj.generateUuid();
      fileRefSection[productFileUuid] = {
        isa: 'PBXFileReference',
        explicitFileType: '"wrapper.app-extension"',
        includeInIndex: 0,
        path: `${WATCH_WIDGET_NAME}.appex`,
        sourceTree: 'BUILT_PRODUCTS_DIR',
      };
      fileRefSection[productFileUuid + '_comment'] = `${WATCH_WIDGET_NAME}.appex`;
      if (prodGroup) proj.addToPbxGroup(productFileUuid, prodGroup.uuid);

      const targetUuid = proj.generateUuid();
      proj.pbxNativeTargetSection()[targetUuid] = {
        isa: 'PBXNativeTarget',
        buildConfigurationList: configListUuid,
        buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${WATCH_WIDGET_NAME}"`,
        buildPhases: [
          { value: sourcePhaseUuid, comment: 'Sources' },
          { value: fwPhaseUuid, comment: 'Frameworks' },
          { value: resPhaseUuid, comment: 'Resources' },
        ],
        buildRules: [],
        dependencies: [],
        name: `"${WATCH_WIDGET_NAME}"`,
        productName: `"${WATCH_WIDGET_NAME}"`,
        productReference: productFileUuid,
        productReference_comment: `${WATCH_WIDGET_NAME}.appex`,
        productType: '"com.apple.product-type.app-extension"',
      };
      proj.pbxNativeTargetSection()[targetUuid + '_comment'] = WATCH_WIDGET_NAME;
      proj.getFirstProject().firstProject.targets.push({ value: targetUuid, comment: WATCH_WIDGET_NAME });

      // Watch app depends on & embeds the widget extension (into its PlugIns).
      addDependency(proj, watchTargetUuid, targetUuid, WATCH_WIDGET_NAME);
      embedProduct(proj, watchTargetUuid, productFileUuid, `${WATCH_WIDGET_NAME}.appex`, 'Embed App Extensions', 13, '""');
    }

    return mod;
  });

  return config;
}

module.exports = withWatch;
