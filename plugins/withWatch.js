const { withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// watchOS companion app target. Modeled on ./plugins/withWidget.js.
//
// Phase 0 scope: the watch APP target only (a single-target watchOS app,
// product-type application, WKApplication=YES). The watch WIDGET extension
// that hosts complications is added later (Phase 3), embedded into this app.
//
// The project is managed/CNG (ios/ is generated), so the whole target graph is
// (re)built here on prebuild. Swift sources live in targets/watch/ and are
// copied into ios/BsuirWatch/ on every prebuild so edits propagate.

const WATCH_NAME = 'BsuirWatch';
const APP_GROUP = 'group.by.vazon.bsuirschedule';
const WATCH_DEPLOYMENT_TARGET = '9.0';

function withWatch(config) {
  // 1. Ensure the main app is in the App Group (withWidget also sets this;
  //    kept here so withWatch is self-sufficient / order-independent).
  config = withEntitlementsPlist(config, (mod) => {
    const key = 'com.apple.security.application-groups';
    const groups = new Set(mod.modResults[key] || []);
    groups.add(APP_GROUP);
    mod.modResults[key] = Array.from(groups);
    return mod;
  });

  // 2. Watch app target in the Xcode project.
  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const appBundleId = mod.ios?.bundleIdentifier ?? 'by.vazon.bsuirschedule';
    const watchBundleId = appBundleId + '.watchkitapp';
    const kvIdentifier = '$(TeamIdentifierPrefix)' + appBundleId;
    const appVersion = mod.version ?? '0.1.0';
    const buildNumber = mod.ios?.buildNumber ?? '1';

    const iosRoot = path.join(projectRoot, 'ios');
    const watchDir = path.join(iosRoot, WATCH_NAME);
    fs.mkdirSync(watchDir, { recursive: true });

    // Refresh Swift sources on every prebuild so edits in targets/watch/
    // propagate even when the pbxproj target already exists.
    const srcDir = path.join(projectRoot, 'targets', 'watch');
    const swiftFiles = fs.existsSync(srcDir)
      ? fs.readdirSync(srcDir).filter((f) => f.endsWith('.swift'))
      : [];
    for (const f of swiftFiles) {
      fs.copyFileSync(path.join(srcDir, f), path.join(watchDir, f));
    }

    const entFile = `${WATCH_NAME}.entitlements`;

    // Info.plist — single-target watchOS app (watchOS 7+): WKApplication=YES.
    fs.writeFileSync(path.join(watchDir, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
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
  <key>WKApplication</key>
  <true/>
  <key>WKCompanionAppBundleIdentifier</key>
  <string>${appBundleId}</string>
</dict>
</plist>`);

    // Entitlements — App Group (shared with widget/main) + iCloud KV store
    // (the transport for phone → watch snapshot delivery, see WATCH_PLAN.md §3).
    fs.writeFileSync(path.join(watchDir, entFile), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
  <key>com.apple.developer.ubiquity-kvstore-identifier</key>
  <string>${kvIdentifier}</string>
</dict>
</plist>`);

    // Source files are refreshed above on every prebuild. The pbxproj graph
    // below only needs to be built once — skip if the target already exists.
    if (proj.pbxTargetByName(WATCH_NAME)) return mod;

    // --- Xcode project manipulation ---
    const mainTargetUuid = proj.getFirstTarget().uuid;

    // Add PBX group for watch files (swift sources + Info.plist + entitlements)
    const grp = proj.addPbxGroup(
      [...swiftFiles, 'Info.plist', entFile],
      WATCH_NAME,
      WATCH_NAME,
    );
    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(grp.uuid, mainGroupId);

    // Resolve the created file references for each swift source.
    const fileRefSection = proj.pbxFileReferenceSection();
    const swiftFileRefs = [];
    for (const name of swiftFiles) {
      for (const key in fileRefSection) {
        const ref = fileRefSection[key];
        if (typeof ref !== 'object') continue;
        const refName = (ref.name || '').replace(/"/g, '');
        const refPath = (ref.path || '').replace(/"/g, '');
        if (refName === name || refPath === name || refPath.endsWith('/' + name)) {
          swiftFileRefs.push({ name, ref: key });
          break;
        }
      }
    }

    // Build settings for the watchOS app target.
    const mkSettings = (debug) => ({
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
      CLANG_ANALYZER_NONNULL: 'YES',
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_ENTITLEMENTS: `${WATCH_NAME}/${entFile}`,
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
      ...(debug ? {
        DEBUG_INFORMATION_FORMAT: 'dwarf',
        SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"$(inherited) DEBUG"',
        SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
      } : {
        SWIFT_OPTIMIZATION_LEVEL: '"-Owholemodule"',
        DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
      }),
    });

    // Create build configurations + list.
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
    configListSection[configListUuid + '_comment'] = `Build configuration list for PBXNativeTarget "${WATCH_NAME}"`;

    // Sources build phase (one PBXBuildFile per swift source).
    const buildFileSection = proj.pbxBuildFileSection();
    const sourceFiles = [];
    for (const { name, ref } of swiftFileRefs) {
      const bfUuid = proj.generateUuid();
      buildFileSection[bfUuid] = {
        isa: 'PBXBuildFile',
        fileRef: ref,
        fileRef_comment: name,
      };
      buildFileSection[bfUuid + '_comment'] = `${name} in Sources`;
      sourceFiles.push({ value: bfUuid, comment: `${name} in Sources` });
    }

    const sourcePhaseUuid = proj.generateUuid();
    const sourcePhaseSection = proj.hash.project.objects['PBXSourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXSourcesBuildPhase'] = sourcePhaseSection;
    sourcePhaseSection[sourcePhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: sourceFiles,
      runOnlyForDeploymentPostprocessing: 0,
    };
    sourcePhaseSection[sourcePhaseUuid + '_comment'] = 'Sources';

    // Frameworks build phase (SwiftUI/WatchKit are implicit, no explicit links).
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

    // Resources build phase (empty for now).
    const resPhaseUuid = proj.generateUuid();
    const resSection = proj.hash.project.objects['PBXResourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXResourcesBuildPhase'] = resSection;
    resSection[resPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    resSection[resPhaseUuid + '_comment'] = 'Resources';

    // Product file reference (.app wrapper).
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
    if (prodGroup) {
      proj.addToPbxGroup(productFileUuid, prodGroup.uuid);
    }

    // Native target (product-type application → watchOS app).
    const targetUuid = proj.generateUuid();
    const nativeTargetSection = proj.pbxNativeTargetSection();
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

    // Register target on the project.
    const projectObj = proj.getFirstProject().firstProject;
    projectObj.targets.push({ value: targetUuid, comment: WATCH_NAME });

    // Target dependency: main app depends on the watch app (build order + embed).
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

    // "Embed Watch Content" copy-files phase on the main app.
    // dstSubfolderSpec 16 + dstPath $(CONTENTS_FOLDER_PATH)/Watch is the
    // canonical Xcode representation for embedding a watchOS app.
    const embedBuildFileUuid = proj.generateUuid();
    buildFileSection[embedBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productFileUuid,
      fileRef_comment: `${WATCH_NAME}.app`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    buildFileSection[embedBuildFileUuid + '_comment'] = `${WATCH_NAME}.app in Embed Watch Content`;

    const embedPhaseUuid = proj.generateUuid();
    const copySection = proj.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
    proj.hash.project.objects['PBXCopyFilesBuildPhase'] = copySection;
    copySection[embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '"$(CONTENTS_FOLDER_PATH)/Watch"',
      dstSubfolderSpec: 16,
      files: [
        { value: embedBuildFileUuid, comment: `${WATCH_NAME}.app in Embed Watch Content` },
      ],
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

module.exports = withWatch;
