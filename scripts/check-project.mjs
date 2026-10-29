#!/usr/bin/env node
// Static project checks for InnerUs. Runs offline with Node only.
// It verifies configuration and privacy boundaries that TypeScript/Jest cannot see.
// It is NOT a mobile build, device, storage, store, CloudKit or local-AI test.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const failures = [];
const passes = [];
const check = (ok, label) => (ok ? passes : failures).push(label);
const read = path => readFileSync(join(root, path), 'utf8');
const walk = dir => readdirSync(join(root, dir)).flatMap(name => {
  const path = join(dir, name);
  return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
});

// 1. Handoff and project records.
const handoffDir = readdirSync(root).find(name => name.startsWith('InnerUs_Developer_Handoff'));
check(Boolean(handoffDir), 'handoff folder present');
if (handoffDir) {
  for (const file of ['README.md', 'InnerUs_Developer_Specification.md', 'InnerUs_Codex_Prompts.md', 'references/approved-watercolor-ui.png', 'references/watercolor-scene-atlas.png']) {
    check(existsSync(join(root, handoffDir, file)), `handoff file ${file}`);
  }
  const spec = read(join(handoffDir, 'InnerUs_Developer_Specification.md'));
  check(/^Version 1\.3 /m.test(spec), 'handoff specification is v1.3');
}
for (const file of ['AGENTS.md', 'docs/BUILD_PLAN.md', 'docs/PROGRESS.md', 'docs/DECISIONS.md', 'docs/ACCEPTANCE.md', 'docs/RELEASE_GATES.md', 'docs/DESIGN_SYSTEM.md']) {
  check(existsSync(join(root, file)), `record ${file}`);
}

// 2. Acceptance ledger tracks every AC01-AC64 exactly once with a valid status.
if (existsSync(join(root, 'docs/ACCEPTANCE.md'))) {
  const rows = read('docs/ACCEPTANCE.md').split('\n').filter(line => /^\| AC\d\d \|/.test(line));
  const ids = rows.map(line => line.slice(2, 6));
  const expected = Array.from({ length: 64 }, (_, i) => `AC${String(i + 1).padStart(2, '0')}`);
  check(JSON.stringify(ids) === JSON.stringify(expected), 'ACCEPTANCE.md lists AC01-AC64 once, in order');
  const statuses = new Set(['not started', 'implemented-unverified', 'verified', 'blocked']);
  check(rows.every(line => statuses.has(line.split('|').at(-2).trim())), 'every acceptance row has a valid status');
}

// 3. Expo configuration: two platforms, no runtime update service, Android local-only defaults.
const app = JSON.parse(read('app.json')).expo;
check(JSON.stringify(app.platforms) === JSON.stringify(['ios', 'android']), 'app.json platforms are ios + android only');
check(app.updates?.enabled === false, 'runtime updates disabled (no OTA content service)');
check(app.android?.allowBackup === false, 'Android allowBackup=false');
const audioPlugin = (app.plugins ?? []).find(p => Array.isArray(p) && p[0] === 'expo-audio');
check(Boolean(audioPlugin?.[1]?.microphonePermission?.includes('only when you choose')), 'microphone purpose string says recording happens only when chosen');
check(['android.permission.CAMERA', 'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE'].every(p => (app.android?.blockedPermissions ?? []).includes(p)), 'unneeded Android permissions blocked');
check(/development/.test(app.ios?.bundleIdentifier ?? '') && /development/.test(app.android?.package ?? ''), 'app.json identifiers are development IDs (live identity only via APP_VARIANT=production)');
const appConfig = read('app.config.js');
check(/APP_VARIANT === 'production'/.test(appConfig) && /com\.nicksmet\.innerus/.test(appConfig), 'app.config.js applies the live identity only for APP_VARIANT=production');

// 4. Dependencies pinned exactly; lockfile present; no network/analytics SDKs.
const pkg = JSON.parse(read('package.json'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
check(Object.values(allDeps).every(version => /^\d+\.\d+\.\d+$/.test(version)), 'all dependencies pinned to exact versions');
check(existsSync(join(root, 'package-lock.json')), 'package-lock.json retained');
const forbiddenPackages = /(analytics|sentry|bugsnag|firebase|amplitude|mixpanel|segment|expo-updates|openai|anthropic|gemini|axios)/i;
check(!Object.keys(allDeps).some(name => forbiddenPackages.test(name)), 'no analytics, crash-reporting, OTA-update, cloud-AI or HTTP client dependencies');

// 5. Source: bundled content only, no remote calls, gallery only in development.
const sources = [...walk('src'), 'App.tsx', 'index.ts'].filter(path => /\.(ts|tsx)$/.test(path) && !path.includes('__tests__'));
const offenders = (pattern) => sources.filter(path => pattern.test(read(path))).map(path => relative(root, join(root, path)));
// Only the platform purchase-management pages and InnerUs's own public pages may appear (links.ts, D49),
// opened by an explicit tap in the system browser; the app never loads them itself.
const allowedUrl = /https:\/\/(apps\.apple\.com\/account\/subscriptions|play\.google\.com\/store\/account|innerus\.app\/(privacy|support)\.html)/g;
const urlOffenders = sources.filter(path => /https?:\/\//.test(read(path).replace(allowedUrl, ''))).map(path => relative(root, join(root, path)));
check(urlOffenders.length === 0, `no remote URLs in app source except store purchase management and innerus.app pages ${urlOffenders.join(', ')}`);
// Release text must not ship with unfilled placeholders (support email, URLs, dates).
const placeholderFiles = ['store/web/privacy.html', 'store/web/support.html', 'store/metadata/listing.en.md', 'store/metadata/listing.nl.md', 'store/metadata/listing.json', 'store/metadata/review-notes.md']
  .filter(path => existsSync(join(root, path)) && /\[(SUPPORT EMAIL|SUPPORT URL|PRIVACY URL|PHONE|DELETION DATE|VERWIJDERDATUM|DATE OF PUBLICATION|PUBLICATIEDATUM|FRAMEWORKS[^\]]*|DEVICE[^\]]*)\]/.test(read(path)));
check(placeholderFiles.length === 0, `no unfilled store placeholders ${placeholderFiles.join(', ')}`);
check(offenders(/\bfetch\(|XMLHttpRequest|WebSocket|EventSource/).length === 0, 'no network APIs in app source');
check(offenders(/console\.(log|info|debug)\(/).length === 0, 'no console logging in app source');
const navigator = read('src/navigation/AppNavigator.tsx');
for (const screen of ['GalleryScreen', 'ProbeScreen']) {
  check(new RegExp(`__DEV__ \\? require\\('\\.\\./dev/${screen}'\\)`).test(navigator) && new RegExp(`__DEV__ && ${screen}`).test(navigator), `${screen} route is compiled only into development builds`);
}
check(!/Gallery/.test(read('src/design/Navigation.tsx')), 'gallery is not a public tab');
check(!offenders(/from '\.\.\/dev\//).filter(path => !path.endsWith('AppNavigator.tsx')).length, 'production code does not import development fixtures');

// 5b. Native adapters: no networking APIs or URLs in Swift/Kotlin sources.
const nativeSources = walk('modules').filter(path => /\.(swift|kt)$/.test(path));
check(nativeSources.length > 0, 'native adapter sources present');
const nativeOffenders = nativeSources.filter(path => /URLSession|HttpURLConnection|OkHttp|https?:\/\/|PrivateCloudCompute/.test(read(path)));
check(nativeOffenders.length === 0, `no network APIs, URLs or Private Cloud Compute in native adapters ${nativeOffenders.join(', ')}`);
check(/innerus_data_extraction_rules/.test(read('modules/innerus-platform/app.plugin.js')) && JSON.stringify(app.plugins).includes('./modules/innerus-platform/app.plugin.js'), 'Android backup/transfer exclusion plugin registered');

// 6. Bundled assets and licences.
for (const file of ['assets/fonts/SourceSerif4-Regular.ttf', 'assets/fonts/OFL-SourceSerif4.md', 'assets/art/cafe.jpg', 'assets/art/kitchen.jpg', 'assets/art/window.jpg', 'assets/art/travel.jpg', 'assets/art/notebook.jpg', 'assets/art/garden.jpg', 'assets/art/closing-cafe.jpg', 'assets/fonts/SourceSerif4-Italic.ttf']) {
  check(existsSync(join(root, file)), `bundled asset ${file}`);
}

// Each chapter is an individual phone-size export, never an accidentally bundled full atlas.
const storyDir = join(root, 'assets/art/stories');
const storyFiles = existsSync(storyDir) ? readdirSync(storyDir).filter(file => /\.jpg$/.test(file)) : [];
check(storyFiles.length === 90, '90 bundled story frames (15 topics × five prompts + closing)');
function jpegSize(data) {
  for (let cursor = 2; cursor + 9 < data.length;) {
    if (data[cursor] !== 0xff) return null;
    const marker = data[cursor + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) return [data.readUInt16BE(cursor + 7), data.readUInt16BE(cursor + 5)];
    const length = data.readUInt16BE(cursor + 2);
    if (length < 2) return null;
    cursor += length + 2;
  }
  return null;
}
check(storyFiles.length === 90 && storyFiles.every(file => JSON.stringify(jpegSize(readFileSync(join(storyDir, file)))) === '[512,512]'), 'all chapter exports are 512×512 with no neighbouring cells');

for (const line of passes) console.log(`ok   ${line}`);
for (const line of failures) console.log(`FAIL ${line}`);
console.log(`\n${passes.length} passed, ${failures.length} failed (static checks only; not a mobile build)`);
process.exit(failures.length ? 1 : 0);
