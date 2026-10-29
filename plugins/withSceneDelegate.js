const { withAppDelegate } = require('expo/config-plugins');

const MARKER = 'class SceneDelegate';

const IMPORT_LINE = 'import UIKit';

const SCENE_DELEGATE = `
/// iOS 26+ requires UIScene lifecycle adoption. Expo SDK 54 / RN 0.81 still
/// create the window in the AppDelegate, so this scene delegate re-parents that
/// already-mounted React Native root onto a scene-bound window — otherwise iOS
/// 26+ crashes on launch (NoSceneLifecycleAdoption) or shows an empty (black)
/// scene-owned window. The scene manifest is declared in app.json's infoPlist.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let sceneWindow = UIWindow(windowScene: windowScene)
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      sceneWindow.rootViewController = appDelegate.window?.rootViewController
      appDelegate.window = sceneWindow
    }
    self.window = sceneWindow
    sceneWindow.makeKeyAndVisible()

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
 * Injects a UIScene delegate into the generated Swift AppDelegate so the app
 * adopts the iOS 26+ scene lifecycle (see the class doc comment). Paired with
 * the UIApplicationSceneManifest declared in app.json.
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
