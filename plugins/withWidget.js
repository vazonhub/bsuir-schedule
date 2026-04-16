const { withEntitlementsPlist, withXcodeProject, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_NAME = 'ScheduleWidget';
const APP_GROUP = 'group.by.vazon.bsuirschedule';
const DEPLOYMENT_TARGET = '15.1';

function withWidget(config) {
  // 1. Main app entitlements
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return mod;
  });

  // 2. Widget target in Xcode project
  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const appBundleId = mod.ios?.bundleIdentifier ?? 'by.vazon.bsuirschedule';
    const widgetBundleId = appBundleId + '.widget';
    const appVersion = mod.version ?? '0.1.0';
    const buildNumber = mod.ios?.buildNumber ?? '1';

    // Skip if already added
    if (proj.pbxTargetByName(WIDGET_NAME)) return mod;

    const iosRoot = path.join(projectRoot, 'ios');
    const widgetDir = path.join(iosRoot, WIDGET_NAME);
    fs.mkdirSync(widgetDir, { recursive: true });

    // Copy Swift file
    const src = path.join(projectRoot, 'targets', 'widget', 'ScheduleWidget.swift');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(widgetDir, 'ScheduleWidget.swift'));
    }

    // Info.plist
    fs.writeFileSync(path.join(widgetDir, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
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
</plist>`);

    // Entitlements
    const entFile = `${WIDGET_NAME}.entitlements`;
    fs.writeFileSync(path.join(widgetDir, entFile), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`);

    // --- Xcode project manipulation ---
    const mainTargetUuid = proj.getFirstTarget().uuid;

    // Add PBX group for widget files
    const grp = proj.addPbxGroup(
      ['ScheduleWidget.swift', 'Info.plist', entFile],
      WIDGET_NAME,
      WIDGET_NAME,
    );
    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(grp.uuid, mainGroupId);

    // Generate UUIDs
    const targetUuid = proj.generateUuid();
    const productFileUuid = proj.generateUuid();
    const sourcePhaseUuid = proj.generateUuid();
    const fwPhaseUuid = proj.generateUuid();
    const resPhaseUuid = proj.generateUuid();
    const buildFileUuid = proj.generateUuid();
    const containerItemProxy = proj.generateUuid();
    const targetDependency = proj.generateUuid();
    const embedPhaseUuid = proj.generateUuid();
    const embedFileUuid = proj.generateUuid();

    // Find the Swift file reference from the group
    let swiftFileRef = null;
    const fileRefSection = proj.pbxFileReferenceSection();
    for (const key in fileRefSection) {
      const ref = fileRefSection[key];
      if (typeof ref === 'object' && ref.name === 'ScheduleWidget.swift') {
        swiftFileRef = key;
        break;
      }
    }
    if (!swiftFileRef) {
      // File ref might be path-based
      for (const key in fileRefSection) {
        const ref = fileRefSection[key];
        if (typeof ref === 'object' && ref.path && ref.path.includes('ScheduleWidget.swift')) {
          swiftFileRef = key;
          break;
        }
      }
    }

    // Build settings
    const mkSettings = (debug) => ({
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
      CLANG_ANALYZER_NONNULL: 'YES',
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_ENTITLEMENTS: `${WIDGET_NAME}/${entFile}`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: buildNumber,
      GENERATE_INFOPLIST_FILE: 'YES',
      INFOPLIST_FILE: `${WIDGET_NAME}/Info.plist`,
      INFOPLIST_KEY_CFBundleDisplayName: 'Schedule',
      INFOPLIST_KEY_NSHumanReadableCopyright: '""',
      IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
      LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: appVersion,
      PRODUCT_BUNDLE_IDENTIFIER: `"${widgetBundleId}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SKIP_INSTALL: 'YES',
      SWIFT_EMIT_LOC_STRINGS: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1,2"',
      ...(debug ? {
        DEBUG_INFORMATION_FORMAT: 'dwarf',
        SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"$(inherited) DEBUG"',
        SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
      } : {
        SWIFT_OPTIMIZATION_LEVEL: '"-Owholemodule"',
      }),
    });

    // Create build configurations
    const debugConfigUuid = proj.generateUuid();
    const releaseConfigUuid = proj.generateUuid();
    const configListUuid = proj.generateUuid();

    const buildConfigSection = proj.pbxXCBuildConfigurationSection();
    buildConfigSection[debugConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: mkSettings(true),
      name: 'Debug',
    };
    buildConfigSection[debugConfigUuid + '_comment'] = `Debug`;
    buildConfigSection[releaseConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: mkSettings(false),
      name: 'Release',
    };
    buildConfigSection[releaseConfigUuid + '_comment'] = `Release`;

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
    configListSection[configListUuid + '_comment'] = `Build configuration list for PBXNativeTarget "${WIDGET_NAME}"`;

    // Source build phase
    const buildPhaseSection = proj.hash.project.objects['PBXSourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXSourcesBuildPhase'] = buildPhaseSection;

    // Build file for Swift source
    const buildFileSection = proj.pbxBuildFileSection();
    buildFileSection[buildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: swiftFileRef,
      fileRef_comment: 'ScheduleWidget.swift',
    };
    buildFileSection[buildFileUuid + '_comment'] = 'ScheduleWidget.swift in Sources';

    buildPhaseSection[sourcePhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [{ value: buildFileUuid, comment: 'ScheduleWidget.swift in Sources' }],
      runOnlyForDeploymentPostprocessing: 0,
    };
    buildPhaseSection[sourcePhaseUuid + '_comment'] = 'Sources';

    // Frameworks build phase
    const fwSection = proj.hash.project.objects['PBXFrameworksBuildPhase'] || {};
    proj.hash.project.objects['PBXFrameworksBuildPhase'] = fwSection;
    fwSection[fwPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    fwSection[fwPhaseUuid + '_comment'] = 'Frameworks';

    // Resources build phase
    const resSection = proj.hash.project.objects['PBXResourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXResourcesBuildPhase'] = resSection;
    resSection[resPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    resSection[resPhaseUuid + '_comment'] = 'Resources';

    // Product file reference
    const prodGroup = proj.pbxGroupByName('Products');
    fileRefSection[productFileUuid] = {
      isa: 'PBXFileReference',
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${WIDGET_NAME}.appex`,
      sourceTree: 'BUILT_PRODUCTS_DIR',
    };
    fileRefSection[productFileUuid + '_comment'] = `${WIDGET_NAME}.appex`;
    if (prodGroup) {
      proj.addToPbxGroup(productFileUuid, prodGroup.uuid);
    }

    // Native target
    const nativeTargetSection = proj.pbxNativeTargetSection();
    nativeTargetSection[targetUuid] = {
      isa: 'PBXNativeTarget',
      buildConfigurationList: configListUuid,
      buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${WIDGET_NAME}"`,
      buildPhases: [
        { value: sourcePhaseUuid, comment: 'Sources' },
        { value: fwPhaseUuid, comment: 'Frameworks' },
        { value: resPhaseUuid, comment: 'Resources' },
      ],
      buildRules: [],
      dependencies: [],
      name: `"${WIDGET_NAME}"`,
      productName: `"${WIDGET_NAME}"`,
      productReference: productFileUuid,
      productReference_comment: `${WIDGET_NAME}.appex`,
      productType: '"com.apple.product-type.app-extension"',
    };
    nativeTargetSection[targetUuid + '_comment'] = WIDGET_NAME;

    // Add target to project
    const projectObj = proj.getFirstProject().firstProject;
    projectObj.targets.push({ value: targetUuid, comment: WIDGET_NAME });

    // Target dependency (main app depends on widget)
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
      remoteInfo: `"${WIDGET_NAME}"`,
    };

    depSection[targetDependency] = {
      isa: 'PBXTargetDependency',
      target: targetUuid,
      target_comment: WIDGET_NAME,
      targetProxy: containerItemProxy,
    };
    depSection[targetDependency + '_comment'] = `PBXTargetDependency`;

    // Add dependency to main target
    const mainTarget = nativeTargetSection[mainTargetUuid];
    if (mainTarget && mainTarget.dependencies) {
      mainTarget.dependencies.push({
        value: targetDependency,
        comment: 'PBXTargetDependency',
      });
    }

    // Embed App Extensions phase on main target
    const copySection = proj.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
    proj.hash.project.objects['PBXCopyFilesBuildPhase'] = copySection;

    const embedBuildFileUuid = proj.generateUuid();
    buildFileSection[embedBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productFileUuid,
      fileRef_comment: `${WIDGET_NAME}.appex`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    buildFileSection[embedBuildFileUuid + '_comment'] = `${WIDGET_NAME}.appex in Embed App Extensions`;

    copySection[embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '""',
      dstSubfolderSpec: 13,
      files: [
        { value: embedBuildFileUuid, comment: `${WIDGET_NAME}.appex in Embed App Extensions` },
      ],
      name: '"Embed App Extensions"',
      runOnlyForDeploymentPostprocessing: 0,
    };
    copySection[embedPhaseUuid + '_comment'] = 'Embed App Extensions';

    if (mainTarget && mainTarget.buildPhases) {
      mainTarget.buildPhases.push({
        value: embedPhaseUuid,
        comment: 'Embed App Extensions',
      });
    }

    return mod;
  });

  // 3. Patch Podfile: disable code signing for CocoaPods resource bundles
  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const podfilePath = path.join(mod.modRequest.projectRoot, 'ios', 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, 'utf8');
        const snippet = `
    # [withWidget] Disable code signing for CocoaPods resource bundles (Xcode 14+)
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end`;
        if (!podfile.includes('CODE_SIGNING_ALLOWED')) {
          // Insert before the last `end` of post_install, or append a new post_install block
          if (podfile.includes('post_install do |installer|')) {
            // Add before the closing end of post_install
            podfile = podfile.replace(
              /post_install do \|installer\|/,
              `post_install do |installer|${snippet}`
            );
          } else {
            podfile += `\npost_install do |installer|${snippet}\nend\n`;
          }
          fs.writeFileSync(podfilePath, podfile);
        }
      }
      return mod;
    },
  ]);

  return config;
}

module.exports = withWidget;
