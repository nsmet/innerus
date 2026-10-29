#!/usr/bin/env bash
# InnerUs iOS simulator verification. Run on the Mac from anywhere:
#   bash scripts/mac/ios-verify.sh            (or: npm run verify:ios)
# Optional: SKIP_NPM_CI=1 to reuse node_modules, SKIP_BUILD=1 to reuse the last build.
# iCloud sync is ON by default: the config plugin adds the development-only CloudKit entitlements
#   (container iCloud.local.innerus.development, team HNY46KCWAA) and this script lets Xcode register
#   the development App ID + iCloud container via automatic signing (-allowProvisioningUpdates; Xcode
#   must be signed in to that team). For sync / the probe round trip, sign the Simulator into an Apple
#   Account (Settings app).
# Local-only build (no iCloud entitlement; app shows "iCloud is unavailable"):
#   CLOUDKIT=0 bash scripts/mac/ios-verify.sh   (or npm run verify:ios:local)
#
# What it does (fictional data only, nothing is uploaded anywhere):
#   1. records toolchain versions; npm ci; npm run check
#   2. expo prebuild --clean (iOS) + pod install; xcodebuild for the simulator
#   3. installs the development build on one simulator, starts Metro on localhost
#   4. runs the platform probe twice (launch + relaunch) and collects its JSON
#   5. inspects the private store on disk (path, backup-exclusion xattr)
#   6. captures Tonight in light, dark, large text and Dutch
# Results: docs/evidence/ios-sim/<timestamp>/  (summary.txt first)
# A simulator run is NOT physical-device evidence for speech, AI, file protection or backup.

set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
ROOT=$(pwd)
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$ROOT/docs/evidence/ios-sim/$STAMP"
mkdir -p "$OUT"
exec > >(tee "$OUT/run.log") 2>&1

BUNDLE_ID=local.innerus.development
SCHEME=InnerUsDevelopment
PORT=8081
DD="$ROOT/ios/build/dd"
APP="$DD/Build/Products/Debug-iphonesimulator/$SCHEME.app"
SUMMARY="$OUT/summary.txt"
METRO_PID=""

log() { echo; echo "== $(date +%H:%M:%S) $*"; }
result() { printf '%-34s %s\n' "$1" "$2" | tee -a "$SUMMARY"; }
cleanup() {
  [ -n "$METRO_PID" ] && kill "$METRO_PID" 2>/dev/null
  if [ -n "${UDID:-}" ]; then
    xcrun simctl ui "$UDID" appearance light >/dev/null 2>&1
    xcrun simctl ui "$UDID" content_size large >/dev/null 2>&1
  fi
}
trap cleanup EXIT

echo "InnerUs iOS simulator verification $STAMP" > "$SUMMARY"

log "Toolchain"
{ sw_vers; xcodebuild -version; echo "node $(node -v)"; echo "npm $(npm -v)"; echo "pod $(pod --version 2>/dev/null || echo missing)"; } | tee "$OUT/toolchain.txt"
result "xcode" "$(xcodebuild -version | head -1)"

if [ "${SKIP_NPM_CI:-0}" != 1 ]; then
  log "npm ci"
  if npm ci --no-audit --no-fund > "$OUT/npm-ci.log" 2>&1; then result "npm ci" "ok"; else result "npm ci" "FAILED (see npm-ci.log)"; exit 1; fi
fi

log "npm run check"
if npm run check > "$OUT/check.log" 2>&1; then result "npm run check" "ok"; else result "npm run check" "FAILED (see check.log)"; fi
grep -E "passed|failed|Tests:" "$OUT/check.log" | tee -a "$SUMMARY"
grep -q "^Tests: .* passed" "$OUT/check.log" && ! grep -q "^Tests: .*failed" "$OUT/check.log" || result "jest" "DID NOT REPORT PASSING TESTS (see check.log)"

log "Pick simulator"
UDID=$(xcrun simctl list devices booted -j | node -e 'const d=JSON.parse(require("fs").readFileSync(0));const all=Object.values(d.devices).flat();const b=all.find(x=>x.state==="Booted"&&/iPhone/.test(x.name));process.stdout.write(b?b.udid:"")')
if [ -z "$UDID" ]; then
  UDID=$(xcrun simctl list devices available -j | node -e 'const d=JSON.parse(require("fs").readFileSync(0));const [rt,devs]=Object.entries(d.devices).filter(([k])=>/iOS/.test(k)).sort().pop()||[];const p=(devs||[]).find(x=>/^iPhone \d+$/.test(x.name))||(devs||[]).find(x=>/iPhone/.test(x.name));process.stdout.write(p?p.udid:"")')
  [ -z "$UDID" ] && { result "simulator" "NONE AVAILABLE"; exit 1; }
  xcrun simctl boot "$UDID"; open -a Simulator; sleep 8
fi
SIM_DESC=$(xcrun simctl list devices -j | node -e 'const d=JSON.parse(require("fs").readFileSync(0));for(const [rt,ds] of Object.entries(d.devices))for(const x of ds)if(x.udid===process.argv[1])process.stdout.write(x.name+" / "+rt.replace(/.*SimRuntime\./,""))' "$UDID")
result "simulator" "$SIM_DESC ($UDID)"

if [ "${SKIP_BUILD:-0}" != 1 ]; then
  log "expo prebuild --clean (ios) + pods"
  if INNERUS_CLOUDKIT="${CLOUDKIT:-1}" CI=1 EXPO_NO_TELEMETRY=1 npx expo prebuild --clean --platform ios > "$OUT/prebuild.log" 2>&1; then result "expo prebuild (ios)" "ok (CLOUDKIT=${CLOUDKIT:-1})"; else result "expo prebuild (ios)" "FAILED (see prebuild.log)"; exit 1; fi
  cp "ios/$SCHEME/$SCHEME.entitlements" "$OUT/entitlements.plist" 2>/dev/null
  if [ "${CLOUDKIT:-1}" != 0 ]; then
    log "Register development App ID + iCloud container (automatic signing, device build)"
    if xcodebuild -workspace "ios/$SCHEME.xcworkspace" -scheme "$SCHEME" -configuration Debug -destination 'generic/platform=iOS' \
        -derivedDataPath "$ROOT/ios/build/dd-device" -allowProvisioningUpdates build > "$OUT/registration.log" 2>&1; then
      result "signing/registration (device)" "ok"
    else
      result "signing/registration (device)" "FAILED (see registration.log)"
      grep -E "error:|No Accounts|No profiles|not available" "$OUT/registration.log" | sort -u | head -15 | tee -a "$SUMMARY"
    fi
  fi
  grep -c "InnerUsPlatform" ios/Podfile.lock >/dev/null 2>&1 && result "local module linked" "yes (InnerUsPlatform in Podfile.lock)" || result "local module linked" "NO"

  log "xcodebuild (simulator, Debug)"
  START=$(date +%s)
  if xcodebuild -workspace "ios/$SCHEME.xcworkspace" -scheme "$SCHEME" -configuration Debug -sdk iphonesimulator \
      -destination "id=$UDID" -derivedDataPath "$DD" -allowProvisioningUpdates build > "$OUT/xcodebuild.log" 2>&1; then
    result "xcodebuild" "BUILD SUCCEEDED in $(( $(date +%s) - START ))s"
  else
    result "xcodebuild" "BUILD FAILED (see xcodebuild.log)"
    grep -E "error:" "$OUT/xcodebuild.log" | sort -u | head -30 | tee "$OUT/build-errors.txt"
    exit 1
  fi
  grep -E "warning: .*modules/innerus-platform" "$OUT/xcodebuild.log" | sort -u > "$OUT/module-warnings.txt"
fi

log "Install"
# Skip the dev-menu onboarding overlay so screenshots show the app.
xcrun simctl spawn "$UDID" defaults write "$BUNDLE_ID" EXDevMenuIsOnboardingFinished -bool YES >/dev/null 2>&1
# Hide the dev-client floating tools button (it overlaps the Settings icon in screenshots; dev builds only).
xcrun simctl spawn "$UDID" defaults write "$BUNDLE_ID" EXDevMenuShowFloatingActionButton -bool NO >/dev/null 2>&1
xcrun simctl install "$UDID" "$APP" && result "install" "ok" || { result "install" "FAILED"; exit 1; }

start_metro() { # $1 = EXPO_PUBLIC_INNERUS_START value or empty
  [ -n "$METRO_PID" ] && { kill "$METRO_PID" 2>/dev/null; wait "$METRO_PID" 2>/dev/null; }
  lsof -ti tcp:$PORT | xargs kill 2>/dev/null
  CI=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_INNERUS_START="$1" npx expo start --dev-client --port $PORT --clear > "$OUT/metro-${1:-app}.log" 2>&1 &
  METRO_PID=$!
  for _ in $(seq 1 90); do curl -s "http://127.0.0.1:$PORT/status" | grep -q running && return 0; sleep 1; done
  return 1
}
open_app() { # loads the bundle from local Metro and waits for it to render
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1
  xcrun simctl openurl "$UDID" "innerus-development://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$PORT"
  sleep "${1:-30}"
}
relaunch_app() { # same bundle, cold process (launchMode most-recent)
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1; sleep 2
  xcrun simctl launch "$UDID" "$BUNDLE_ID" "$@" >/dev/null; sleep "${RELAUNCH_WAIT:-20}"
}
shot() { xcrun simctl io "$UDID" screenshot "$OUT/$1.png" >/dev/null 2>&1 && echo "screenshot $1.png"; }
DATA=""
collect_probe() {
  DATA=$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data)
  cp "$DATA/Library/Caches/innerus-probe-results.json" "$OUT/$1.json" 2>/dev/null \
    && result "$1" "$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1])).summary)' "$OUT/$1.json")" \
    || result "$1" "NO RESULTS FILE"
}

log "Probe: first launch"
if start_metro probe; then result "metro (probe)" "running"; else result "metro (probe)" "FAILED (see metro-probe.log)"; exit 1; fi
open_app 45; shot probe-launch1; collect_probe probe-launch1
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1]));for(const s of r.steps)if(["capabilities","cloudkit","store"].includes(s.name))console.log(s.name+": "+JSON.stringify(s.detail))' "$OUT/probe-launch1.json" 2>/dev/null | tee -a "$SUMMARY"
log "Probe: relaunch"
relaunch_app; shot probe-launch2; collect_probe probe-launch2

log "Private store on disk (host view of the simulator container)"
{
  echo "Documents/ (expo-sqlite default, backed up):"; ls -la "$DATA/Documents" 2>&1; ls -la "$DATA/Documents/SQLite" 2>&1
  echo; echo "Application Support/InnerUsPrivate:"; ls -la "$DATA/Library/Application Support/InnerUsPrivate" 2>&1
  echo; echo "Extended attributes (com.apple.metadata:com_apple_backup_excludeItem = excluded from backup):"
  xattr -l "$DATA/Library/Application Support/InnerUsPrivate" 2>&1
} | tee "$OUT/private-store-on-disk.txt"
if xattr -p com.apple.metadata:com_apple_backup_excludeItem "$DATA/Library/Application Support/InnerUsPrivate" >/dev/null 2>&1; then
  result "backup-exclusion xattr" "present on InnerUsPrivate"
else
  result "backup-exclusion xattr" "MISSING"
fi
[ -e "$DATA/Documents/SQLite" ] && result "Documents/SQLite" "EXISTS (unexpected)" || result "Documents/SQLite" "absent (good)"

log "App screens"
if start_metro ""; then result "metro (app)" "running"; else result "metro (app)" "FAILED"; exit 1; fi
xcrun simctl ui "$UDID" appearance light; xcrun simctl ui "$UDID" content_size large
open_app 40; shot tonight-light
xcrun simctl ui "$UDID" appearance dark; sleep 4; shot tonight-dark
# Text size is read at launch in this build, so relaunch after changing it.
xcrun simctl ui "$UDID" appearance light; xcrun simctl ui "$UDID" content_size accessibility-extra-extra-extra-large; relaunch_app; shot tonight-largest-text
xcrun simctl ui "$UDID" content_size large; sleep 2
relaunch_app -AppleLanguages "(nl)" -AppleLocale nl_BE; shot tonight-dutch
relaunch_app; shot tonight-relaunch

result "evidence folder" "docs/evidence/ios-sim/$STAMP"
log "Done. Summary:"; cat "$SUMMARY"
