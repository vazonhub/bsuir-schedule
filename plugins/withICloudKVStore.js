const { withXcodeProject, withEntitlementsPlist } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SWIFT_SOURCE = `import Foundation

@objc(ICloudKVStore)
class ICloudKVStore: NSObject {

  private let store = NSUbiquitousKeyValueStore.default

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func getItem(_ key: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let value = store.string(forKey: key)
    resolve(value as Any)
  }

  @objc func setItem(_ key: String, value: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    store.set(value, forKey: key)
    store.synchronize()
    resolve(NSNull())
  }

  @objc func removeItem(_ key: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    store.removeObject(forKey: key)
    store.synchronize()
    resolve(NSNull())
  }

  @objc func getAllKeys(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let keys = Array(store.dictionaryRepresentation.keys)
    resolve(keys)
  }
}
`;

const OBJC_BRIDGE = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ICloudKVStore, NSObject)

RCT_EXTERN_METHOD(getItem:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setItem:(NSString *)key
                  value:(NSString *)value
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeItem:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAllKeys:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
`;

function withICloudKVStore(config) {
  // 1. Add iCloud KV entitlement
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.ubiquity-kvstore-identifier'] =
      '$(TeamIdentifierPrefix)by.vazon.bsuirschedule';
    mod.modResults['com.apple.developer.icloud-container-identifiers'] = [];
    return mod;
  });

  // 2. Add native source files to Xcode project
  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const appName = mod.modRequest.projectName || 'BsuirTime';
    const appDir = path.join(projectRoot, 'ios', appName);

    // Write source files
    fs.writeFileSync(path.join(appDir, 'ICloudKVStore.swift'), SWIFT_SOURCE);
    fs.writeFileSync(path.join(appDir, 'ICloudKVStore.m'), OBJC_BRIDGE);

    // Ensure bridging header imports React types for Swift
    const bridgingPath = path.join(appDir, appName + '-Bridging-Header.h');
    if (fs.existsSync(bridgingPath)) {
      let bh = fs.readFileSync(bridgingPath, 'utf8');
      if (!bh.includes('RCTBridgeModule.h')) {
        bh += '\n#import <React/RCTBridgeModule.h>\n';
        fs.writeFileSync(bridgingPath, bh);
      }
    }

    // Add to Xcode project — find the main app group by its known key pattern
    const groups = proj.hash.project.objects.PBXGroup;
    const appGroupKey = Object.keys(groups).find((key) => {
      const g = groups[key];
      return typeof g === 'object' && g.name === appName && !g.path;
    });
    const targetKey = proj.findTargetKey(appName);

    if (appGroupKey && targetKey) {
      const refs = proj.hash.project.objects.PBXFileReference || {};
      const hasSwift = Object.values(refs).some(
        (ref) => typeof ref === 'object' && String(ref.path || '').includes('ICloudKVStore.swift')
      );
      if (!hasSwift) {
        proj.addSourceFile(appName + '/ICloudKVStore.swift', { target: targetKey }, appGroupKey);
        proj.addSourceFile(appName + '/ICloudKVStore.m', { target: targetKey }, appGroupKey);
      }
    }

    return mod;
  });

  return config;
}

module.exports = withICloudKVStore;
