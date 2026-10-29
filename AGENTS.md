# InnerUs — agent instructions

One Expo / React Native / TypeScript app for iOS and Android. Owner: Nick. Do not publish releases or change live store products.

## Sources of truth

- Product contract: `InnerUs_Developer_Handoff (1)/InnerUs_Developer_Specification.md` (v1.3, 22 Oct 2026). The PDF in the same folder is the same content, visually. Explicit behaviour and AC01–AC64 beat incidental details in concept images.
- Milestone prompts: `InnerUs_Developer_Handoff (1)/InnerUs_Codex_Prompts.md` (prompt pack 1.0). Work one prompt at a time; the earliest unfinished one first.
- Visual references: `InnerUs_Developer_Handoff (1)/references/approved-watercolor-ui.png` and `watercolor-scene-atlas.png`. Flat references, not production layers.
- Records (read before working, update before finishing): `docs/PROGRESS.md`, `docs/BUILD_PLAN.md`, `docs/DECISIONS.md`, `docs/ACCEPTANCE.md`, `docs/RELEASE_GATES.md`, `docs/DESIGN_SYSTEM.md`, `docs/CAPABILITIES.md` (platform evidence matrix).

## Non-negotiable product constraints

- No InnerUs account, login, backend, analytics, remote catalogue, CDN, remote flags or OTA update service. `app.json` keeps `updates.enabled: false`.
- Stories, translations, artwork and fonts are bundled. Personal data is stored and processed on the device. Optional private iCloud sync is iOS-only; Android is local-only with deliberate export.
- AI is strictly on-device and capability-gated; manual notes and voice keepsakes always work. Never add a cloud fallback.
- Screens compose the shared design system in `src/design/`; components receive state and callbacks and never own storage, AI, purchases or network. The gallery (`src/dev/`) is development-only and uses fictional fixtures.
- Private data lives only in the adapter's private directory (`src/data/openPrivateStore.ts`), never in expo-sqlite's default (backed-up) directory. Native adapters contain no network code.
- Personal content never goes to logs, errors, notifications or test fixtures. Use fictional data.
- Public links (privacy policy, support, info@innerus.app) live only in `src/content/links.ts`; the app never loads them itself. Version: `package.json` only.
- `app.json` keeps the development IDs (`local.innerus.development`). The live identity (`com.nicksmet.innerus`, v1 EAS project, production iCloud container) is applied only by `app.config.js` when `APP_VARIANT=production` (D27). Legacy data, products and entitlements are still unaudited: see `docs/RELEASE_GATES.md`. Do not invent a migration. `old_app/` is a read-only reference copy of v1: never edit it.

## Commands (verified 2026-10-22 on Linux, Node 22)

```sh
npm ci                      # Node >=22.13 <23 (.nvmrc 22.22.0); versions pinned exactly, lockfile retained
npm run check               # tsc --noEmit + scripts/check-project.mjs + jest
EXPO_OFFLINE=1 npx expo install --check   # dependency compatibility (online mode needs api.expo.dev)
npx expo-doctor             # 2 of 20 checks need exp.host / reactnative.directory
npm run export:ios          # JS bundle only — NOT a mobile build
npm run export:android      # JS bundle only — NOT a mobile build
npx expo prebuild --clean --no-install   # generates ios/ and android/ (gitignored) to inspect native config
npm run ios                 # expo run:ios — macOS + Xcode + CocoaPods (ran on Nick's Mac 22 Oct, simulator)
npm run android             # expo run:android — needs Android SDK/JDK 17+ (not yet run anywhere)
npm start                   # Metro for a development build (Expo Go is not the target)
npm run start:gallery       # opens the component gallery first (dev builds only)
npm run start:probe         # opens the Prompt 2 platform probe (fictional data, dev builds only)
npm run verify:ios          # Mac only: full iOS simulator verification → docs/evidence/ios-sim/<stamp>/
npm run build:ios           # Nick only: EAS production build (EAS_NO_VCS=1; .easignore decides the upload)
npm run submit:ios          # Nick only: upload the latest build to TestFlight
```

In a development build, long-press the InnerUs wordmark on Tonight to open the gallery.

## Evidence rules

A TypeScript, Jest, check-project or JS export result is never evidence of an iOS/Android build, device behaviour, storage/backup, store, CloudKit or local-AI support. Promote an `ACCEPTANCE.md` row to `verified` only with complete evidence for the whole requirement; otherwise `implemented-unverified` with the missing proof named, or `blocked` with the missing prerequisite.
