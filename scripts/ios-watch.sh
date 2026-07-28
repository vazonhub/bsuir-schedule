#!/usr/bin/env bash
#
# Build + launch the watchOS app on a simulator paired with the iPhone you
# already booted via `npm run ios`. Companion (WatchConnectivity) sync only
# works when the watch is paired with the *running* phone, so this script
# pairs them explicitly.
#
# Usage: npm run ios:watch
set -euo pipefail

WORKSPACE="ios/BsuirTime.xcworkspace"
SCHEME="BsuirWatch"
WATCH_BUNDLE_ID="by.vazon.bsuirschedule.watch"
DERIVED="ios/build-watch"

if [ ! -d "${WORKSPACE}" ]; then
  echo "[x] ${WORKSPACE} not found - run 'npm run ios' (or 'npm run prebuild') first." >&2
  exit 1
fi

# 1. The iPhone simulator you already booted.
IPHONE_UDID=$(xcrun simctl list devices booted -j | node -e '
  const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
  let u = "";
  for (const rt in d.devices)
    for (const dev of d.devices[rt])
      if (dev.name.includes("iPhone")) u = dev.udid;
  process.stdout.write(u);
')
if [ -z "${IPHONE_UDID}" ]; then
  echo "[x] No booted iPhone simulator. Run 'npm run ios' first." >&2
  exit 1
fi
echo "[>] iPhone (booted): ${IPHONE_UDID}"

# 2. Reuse the watch already paired with this iPhone, else pick a free watch
#    (one not in any pair) and pair it. A watch can only belong to one pair.
WATCH_UDID=$(xcrun simctl list pairs -j | node -e '
  const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const phone = process.argv[1];
  let w = "";
  for (const id in d.pairs) if (d.pairs[id].phone.udid === phone) w = d.pairs[id].watch.udid;
  process.stdout.write(w);
' "${IPHONE_UDID}")

if [ -z "${WATCH_UDID}" ]; then
  WATCH_UDID=$(xcrun simctl list -j | node -e '
    const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const paired = new Set(Object.values(d.pairs).map((p) => p.watch.udid));
    let w = "";
    for (const rt in d.devices) {
      if (!/watchOS/.test(rt)) continue;
      for (const dev of d.devices[rt])
        if (dev.isAvailable && !paired.has(dev.udid)) { w = dev.udid; break; }
      if (w) break;
    }
    process.stdout.write(w);
  ')
  if [ -z "${WATCH_UDID}" ]; then
    echo "[x] No free watch simulator to pair. Free one in Xcode > Devices, or 'xcrun simctl unpair'." >&2
    exit 1
  fi
  echo "[>] Pairing watch ${WATCH_UDID} with the booted iPhone..."
  xcrun simctl pair "${WATCH_UDID}" "${IPHONE_UDID}" >/dev/null
fi
echo "[>] Watch: ${WATCH_UDID}"

# 3. Boot the watch and surface the Simulator UI.
xcrun simctl boot "${WATCH_UDID}" 2>/dev/null || true
open -a Simulator

# 4. Build the watch scheme for this specific watch simulator.
echo "[>] Building ${SCHEME} ..."
xcodebuild \
  -workspace "${WORKSPACE}" \
  -scheme "${SCHEME}" \
  -configuration Debug \
  -destination "id=${WATCH_UDID}" \
  -derivedDataPath "${DERIVED}" \
  build

# 5. Install + launch on the watch.
APP_PATH=$(find "${DERIVED}/Build/Products" -name "BsuirWatch.app" -path "*watchsimulator*" | head -1)
if [ -z "${APP_PATH}" ]; then
  echo "[x] Built BsuirWatch.app not found under ${DERIVED}." >&2
  exit 1
fi
echo "[>] Installing ${APP_PATH}"
xcrun simctl install "${WATCH_UDID}" "${APP_PATH}"
xcrun simctl launch "${WATCH_UDID}" "${WATCH_BUNDLE_ID}"
echo "[ok] Launched ${WATCH_BUNDLE_ID} on watch ${WATCH_UDID} (paired with iPhone ${IPHONE_UDID})."
