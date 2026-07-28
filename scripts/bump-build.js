#!/usr/bin/env node
/**
 * Increments the native build numbers in app.json:
 *   - ios.buildNumber   (string, e.g. "49" -> "50")
 *   - android.versionCode (number, e.g. 18 -> 19)
 *
 * We manage these locally (eas.json `appVersionSource: "local"`, no
 * `autoIncrement`) so that EVERY iOS target — the main app plus the embedded
 * watch / complication / widget extensions created by the config plugins — bakes
 * the SAME CFBundleVersion during prebuild. Apple rejects an app whose extension
 * CFBundleVersion differs from the parent app's, and EAS remote autoIncrement
 * only ever bumped the main target (see RELEASE.md).
 *
 * Run standalone for a same-version rebuild (`npm run bump:build`); the
 * `bump:patch|minor|major` scripts also call it so a release bump moves the build
 * numbers forward too.
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const config = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const { ios, android } = config.expo;

const currentIos = parseInt(ios.buildNumber, 10);
if (Number.isNaN(currentIos)) {
  throw new Error(`ios.buildNumber is not an integer string: ${JSON.stringify(ios.buildNumber)}`);
}
const nextIos = currentIos + 1;
ios.buildNumber = String(nextIos);

const currentAndroid = android.versionCode;
if (!Number.isInteger(currentAndroid)) {
  throw new Error(`android.versionCode is not an integer: ${JSON.stringify(currentAndroid)}`);
}
const nextAndroid = currentAndroid + 1;
android.versionCode = nextAndroid;

fs.writeFileSync(appJsonPath, JSON.stringify(config, null, 2) + '\n');

console.log(`ios.buildNumber:   ${currentIos} -> ${nextIos}`);
console.log(`android.versionCode: ${currentAndroid} -> ${nextAndroid}`);
