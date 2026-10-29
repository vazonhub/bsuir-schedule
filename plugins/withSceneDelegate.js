const { withAppDelegate } = require('expo/config-plugins');

const MARKER = 'class SceneDelegate';
const IMPORT_LINE = 'import UIKit';

// The window-creation block Expo generates inside `didFinishLaunching`. It is
// moved into the scene delegate so the app adopts the iOS 26+ scene lifecycle.
const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\([\s\S]*?\)\s*\n\s*#endif\n/;

const WINDOW_BLOCK_REPLACEMENT =
  '    // The window + React Native root are created in `SceneDelegate` for the\n' +
  '    // iOS 26+ UIScene lifecycle (correct safe-area insets, no launch crash).\n';

const SCENE_DELEGATE = `
/// iOS 26+ requires UIScene lifecycle adoption. Expo SDK 54 / RN 0.81 do not
/// generate a scene delegate, so we add one here: the React Native root is
/// mounted into a scene-bound window (which reports correct safe-area insets).
/// The UIApplicationSceneManifest is declared in app.json's infoPlist.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let window = UIWindow(windowScene: windowScene)
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      appDelegate.reactNativeFactory?.startReactNative(
        withModuleName: "main",
        in: window,
        launchOptions: nil
      )
      appDelegate.window = window
    }
    self.window = window

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
 * Adopts the iOS 26+ UIScene lifecycle for the Expo/RN AppDelegate: moves the
 * window + React Native startup into a UISceneDelegate. Paired with the
 * UIApplicationSceneManifest declared in app.json.
 */
function withSceneDelegate(config) {
  return withAppDelegate(config, (c) => {
    let contents = c.modResults.contents;
    if (contents.includes(MARKER)) {
      return c;
    }
    if (!contents.includes(IMPORT_LINE)) {
      contents = contents.replace(/^(import Expo\n)/m, `$1${IMPORT_LINE}\n`);
    }
    contents = contents.replace(WINDOW_BLOCK, WINDOW_BLOCK_REPLACEMENT);
    c.modResults.contents = `${contents}\n${SCENE_DELEGATE}`;
    return c;
  });
}

module.exports = withSceneDelegate;
