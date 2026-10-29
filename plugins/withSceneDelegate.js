const { withAppDelegate } = require('expo/config-plugins');

const MARKER = 'class SceneDelegate';
const IMPORT_LINE = 'import UIKit';

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
 * Adopts the iOS 26+ UIScene lifecycle by injecting a UISceneDelegate that
 * attaches the AppDelegate's window to the connecting scene. Paired with the
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
    c.modResults.contents = `${contents}\n${SCENE_DELEGATE}`;
    return c;
  });
}

module.exports = withSceneDelegate;
