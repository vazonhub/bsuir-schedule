const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const MARKER = 'class SceneDelegate';
const IMPORT_LINE = 'import UIKit';

// Resolved by Xcode at build time to e.g. `BsuirTime.SceneDelegate`. Must match
// the Swift class injected below so iOS can instantiate it.
const SCENE_DELEGATE_CLASS = '$(PRODUCT_MODULE_NAME).SceneDelegate';

const SCENE_DELEGATE = `
/// iOS 26+ requires UIScene lifecycle adoption. Expo SDK 54 / RN 0.81 create the
/// window in the AppDelegate (and expo-dev-launcher depends on that), so this
/// scene delegate adopts that existing window onto the connecting scene — which
/// also gives it the scene's safe-area insets. The UIApplicationSceneManifest is
/// declared in app.json's infoPlist.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    if let appDelegate = UIApplication.shared.delegate as? AppDelegate,
       let appWindow = appDelegate.window {
      appWindow.windowScene = windowScene
      self.window = appWindow
      appWindow.makeKeyAndVisible()
    }

    if let url = connectionOptions.urlContexts.first?.url {
      RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`;

/**
 * Declares the `UIApplicationSceneManifest` in Info.plist, wired to our
 * `SceneDelegate` via `UISceneDelegateClassName`.
 *
 * This lives in the plugin (not app.json) on purpose: the manifest and the Swift
 * class it names are one concept, and splitting them is exactly what broke a
 * release build before — app.json declared scene adoption but never named the
 * delegate class, so on a clean prebuild iOS adopted the scene lifecycle yet
 * never instantiated `SceneDelegate`. The window was then never attached to a
 * scene and the app showed a black screen after the splash. Keeping both halves
 * here guarantees they can never drift again (and survives `expo prebuild`, since
 * `ios/` is gitignored and regenerated on every EAS build).
 */
function withSceneManifest(config) {
  return withInfoPlist(config, (c) => {
    const plist = c.modResults;
    const manifest = plist.UIApplicationSceneManifest ?? {};
    manifest.UIApplicationSupportsMultipleScenes = false;

    const configs = manifest.UISceneConfigurations ?? {};
    const appRole = configs.UIWindowSceneSessionRoleApplication ?? [];
    const first = appRole[0] ?? {};
    first.UISceneConfigurationName = first.UISceneConfigurationName ?? 'Default Configuration';
    first.UISceneDelegateClassName = SCENE_DELEGATE_CLASS;

    appRole[0] = first;
    configs.UIWindowSceneSessionRoleApplication = appRole;
    manifest.UISceneConfigurations = configs;
    plist.UIApplicationSceneManifest = manifest;
    return c;
  });
}

/**
 * Adopts the iOS 26+ UIScene lifecycle by injecting a UISceneDelegate that
 * attaches the AppDelegate's window to the connecting scene, and declaring the
 * matching UIApplicationSceneManifest (with UISceneDelegateClassName) in
 * Info.plist.
 */
function withSceneDelegate(config) {
  config = withAppDelegate(config, (c) => {
    let contents = c.modResults.contents;
    if (contents.includes(MARKER)) {
      return c;
    }
    if (!contents.includes(IMPORT_LINE)) {
      contents = contents.replace(/^(import Expo\n)/m, `$1${IMPORT_LINE}\n`);
    }
    c.modResults.contents = `${contents}\n${SCENE_DELEGATE}`;
    return c;
  });
  config = withSceneManifest(config);
  return config;
}

module.exports = withSceneDelegate;
