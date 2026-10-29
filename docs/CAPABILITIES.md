# InnerUs capability matrix and platform architecture (Prompt 2)

Living record of what each platform capability has actually shown, where and how. A capability is only "proven" by the evidence column. Simulator and JavaScript results never prove device behaviour, privacy or AI support. Fictional data only.

## Architecture (simplest that meets the evidence so far)

| Layer | Choice | Location |
|---|---|---|
| Shared UI, content, session rules | React Native + TypeScript | `src/` |
| Private store | expo-sqlite 58 in the adapter's private directory; schema v1; FTS5 search | `src/data/` |
| Platform adapter | One local Expo module, narrow typed API, no network code | `modules/innerus-platform/` |
| Native configuration | Config plugin (Android backup/transfer rules); `app.json` permissions | `modules/innerus-platform/app.plugin.js` |
| Capability gating | `probeCapabilities()` returns honest states: ready, needs-download, unsupported-device/-language, disabled-by-user, not-ready, unavailable, unproven | `modules/innerus-platform/index.ts` |
| Later adapters | Recording (expo-audio candidate), transcription/summary execution, CloudKit (own Swift, CKSyncEngine, iOS 17+), purchases (expo-iap candidate) | to be added to the same module or vetted packages |

Provisional deployment targets: iOS 16.4 (SDK 58 default; CKSyncEngine needs 17, AI needs 26), Android minSdk 24 (on-device recognizer API 31, file input 33). Not a product decision until the legacy audit.

## Matrix

| Capability | Platform | Device / OS | Language | Model state | Observed | Evidence |
|---|---|---|---|---|---|---|
| Protected private store (location, backup flag) | iOS | iPhone 16 Pro Simulator, iOS 18.0 (Xcode 27.1) | — | — | **Observed 22 Oct 14:13**: DB + WAL/SHM + attachment in `Library/Application Support/InnerUsPrivate`; directory carries `com.apple.metadata:com_apple_backup_excludeItem`; nothing in `Documents/SQLite`. Protection class reads `none` (Simulator does not enforce Data Protection). | `docs/evidence/ios-sim/20261022-141009/probe-launch*.json`, `private-store-on-disk.txt` |
| Private store survives relaunch | iOS | iPhone 16 Pro Simulator, iOS 18.0 | — | — | **Observed**: launch 1 `persistedFromPreviousLaunch=false`, cold relaunch `true`; exact fictional text and accent-insensitive search (`cafe`→1 hit) | `docs/evidence/ios-sim/20261022-141009/probe-launch1.json`, `probe-launch2.json` |
| File protection class enforced | iOS | physical device needed | — | — | not testable on Simulator (reads `none`) | — |
| iCloud backup exclusion effective | iOS | physical device + backup | — | — | not started | — |
| Backup + device-transfer exclusion | Android | any (API 31+) | — | — | config generated in container prebuild only | `android/app/src/main/res/xml/innerus_*` (generated) |
| On-device speech availability | iOS | iPhone 16 Pro Simulator, iOS 18.0 | en-US ready, nl-NL / nl-BE unsupported | — | **Observed**: iOS 18 takes the legacy route (SFSpeechRecognizer `supportsOnDeviceRecognition`); SpeechTranscriber path needs iOS 26+. Availability only — no recorded file transcribed; Simulator is not device evidence. | `docs/evidence/ios-sim/20261022-141009/probe-launch1.json` |
| Recorded-file transcription | iOS / Android | physical device needed | en, nl | — | not started | — |
| SystemLanguageModel availability | iOS | iPhone 16 Pro Simulator, iOS 18.0 | — | — | **Observed**: `unsupported-device` (FoundationModels needs iOS 26). Correct honest state; needs an iOS 26+ Apple Intelligence device. | `docs/evidence/ios-sim/20261022-141009/probe-launch1.json` |
| Local summary | Android | — | nl | — | **unproven**; ML Kit Summarization lists en/ja/ko only | docs (A16), D18 |
| CloudKit account status + private-DB round trip (fictional record) | iOS | Simulator signed into an Apple Account | — | — | ready to run: `npm run verify:ios:cloudkit` | `probe-launch1.json` step `cloudkit`, `registration.log` |
| Two-device convergence, offline queue, quota | iOS | 2 same-account devices | — | — | not started (Prompt 5) | — |
| StoreKit connection (expo-iap 6.1.1, openiap 4.0.3) | iOS | Simulator | — | — | installed; connect + fetch of the development product pending next run (expect connected, 0 products) | probe step `store` |
| Purchase states / restore | both | sandbox | — | — | not started (Prompt 7) | — |

## Story-rendering observation — 23 October 2026

The existing iPhone 16 Pro / iOS 18.0 development app rendered the revised A01 questions and individually exported watercolor scenes via Metro; native screenshots and observations are in `docs/evidence/storytelling/20261023/`. Jest covers animation replacement and Reduced Motion, but does not establish physical-device accessibility/motion behavior. No adapter, privacy, storage, CloudKit, speech, AI or store capability was promoted by this UI change. No new native build was produced.

Full-width follow-up (23 Oct): the same existing iOS simulator app rendered A01 with the restored cover framing and watercolor fades; screenshot/check log in `docs/evidence/story-art-width/20261023/`. This is a layout observation only and changes no platform capability status.

Eyebrow-fade follow-up (23 Oct): on the same iOS simulator, A01’s broad lower fade met the eyebrow and followed its position as the nudge expanded. Evidence: `docs/evidence/story-eyebrow-fade/20261023/`. No platform capability status changes; dark/large-text/Android coverage remains pending.

Side-margin refinement (23 Oct): A01 rendered with narrow side feathers and an almost full-width painting in the same existing iOS simulator app (`docs/evidence/story-side-fade/20261023/`). Layout evidence only; no platform capability promotion.

## Owner inputs and blockers

Question-specific imagery revision 2 (23 Oct): the replacement S01–S15 pack has 15 source sheets and 90 distinct 552×368 sRGB exports, exact question/closing briefs, three targeted edits and direct/static review evidence in `docs/evidence/story-imagery-v2/20261023/`. V1 is owner-rejected history. This exercised local asset generation/export only; no app adapter, device, model or platform capability was exercised or promoted. Runtime/native review and owner recognition testing remain open.

Story-imagery asset work (23 Oct): 15 source sheets / 90 optimized S01–S15 exports passed static image/mapping/profile/hash/path checks (`docs/evidence/story-imagery/20261023/`). The in-app browser rejected local-file navigation; direct image review completed instead. No app or platform adapter ran, no new native build was made and no capability status changes.

Editorial-only work (23 Oct): `docs/STORY_LIBRARY_DRAFT.md` contains 15 English proposals with a documented Markdown structure/length check. No adapter, device, model or platform capability was exercised or promoted by this work.

- Team ID received (HNY46KCWAA). Registering the development App ID/container happens when Nick runs `npm run verify:ios:cloudkit` with Xcode signed in to that team.
- Physical devices: none available yet → speech/AI/file-protection/backup proofs stay unverified; products keep manual paths.
- Android: deferred by the owner.
