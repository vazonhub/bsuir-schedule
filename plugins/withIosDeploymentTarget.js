const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# [withIosDeploymentTarget]';
const MIN_TARGET = '15.1';

/**
 * Xcode 27 turns "pod targets iOS below the supported minimum" from a warning
 * into a hard build error. Several transitive pods (SDWebImage, GoogleSignIn,
 * AppAuth, GoogleUtilities, …) still ship podspecs targeting iOS 9–13, which
 * breaks the build. This plugin raises every pod target's deployment target to
 * the app minimum inside the Podfile `post_install` hook.
 */
function withIosDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (c) => {
      const podfilePath = path.join(c.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes(MARKER)) {
        return c;
      }

      const loop =
        `    ${MARKER} Xcode 27 rejects pods targeting iOS < ${MIN_TARGET}; raise the floor.\n` +
        `    installer.pods_project.targets.each do |target|\n` +
        `      target.build_configurations.each do |bc|\n` +
        `        current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']\n` +
        `        if current.nil? || current.to_f < ${MIN_TARGET}\n` +
        `          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'\n` +
        `        end\n` +
        `      end\n` +
        `    end\n`;

      // Insert the loop at the start of the post_install block.
      podfile = podfile.replace(/(post_install do \|installer\|\n)/, `$1${loop}`);

      fs.writeFileSync(podfilePath, podfile);
      return c;
    },
  ]);
}

module.exports = withIosDeploymentTarget;
