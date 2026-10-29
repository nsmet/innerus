# InnerUs progress log

Newest session first. Record what actually ran, where, and with what result. A JavaScript check is never a mobile build.

## Session 17 — 29 October 2026 (upload-readiness assessment)

Reviewed the release records, runbook, production configuration and current checkout at Nick's request. The folder remains outside Git. The records have not been reconciled with any Apple/EAS account work Nick may have done since 26 October; account-side gates are therefore unconfirmed, not necessarily incomplete. The acceptance ledger and build plan contain stale implementation descriptions, so their statuses are not a current code audit. No acceptance or capability status was promoted.

On the Mac, Node 22.22.0 was selected explicitly: `npm run check` passed TypeScript and 49/49 project static checks, but Jest failed 1 of 15 tests (2 of 3 suites passed). `src/content/__tests__/storytelling.test.ts:47` expects `said goodbye`; the current authored prompt says `say goodbye`. No content or test was changed during this assessment. `EXPO_OFFLINE=1 npx expo install --check` reported dependencies up to date but warns offline validation is unreliable. The shell default is Node 18.12.1, outside the supported range; `nvm use` selects the installed 22.22.0. Xcode 27.1 and EAS CLI 15.0.3 are present. The simulator service was inaccessible in this sandbox. `eas whoami` could not reach api.expo.dev (DNS/network restriction), so login, project, credentials, builds and App Store Connect status were not verified. Web access to the configured privacy and support URLs also failed in the browsing tool, which does not establish whether the pages are live.

No build, upload, store change or publication was performed. The remaining iOS release evidence and account checks are in `RELEASE_GATES.md` and `RELEASE_RUNBOOK.md`; in particular the current native changes, v1 update/entitlement restoration, sandbox offer and private CloudKit sync still need evidence. Android remains deferred per the existing runbook.

## Session 16 — 26 October 2026 (production-readiness audit and fixes)

Nick asked what still stands between the code and a production release, and to fix it. Owner answers (26 Oct): support email `info@innerus.app`; pages on his own domain (`innerus.app`); v1 subscribers keep the collection for good.

Found and fixed:
- **EAS build would fail**: the folder is no git repo and `.gitignore` excluded `locales/en.json`/`nl.json` (needed by app.json). Added `.easignore` (also keeps `old_app/` keys, `credentials/`, artwork/store/docs out of the ≈17 MB upload) and `npm run build:ios` / `submit:ios` with `EAS_NO_VCS=1` (D52).
- **v1 subscribers** lost access after cancelling, while What's New told them to cancel. Now permanent via StoreKit history; refunds excluded (D48).
- **No privacy-policy link in the app** (guideline 5.1.1) and Help sent people to the App Store page: `src/content/links.ts`, Settings rows "Privacy policy" and "Email us", Help contact text (D49).
- **Settings showed version 0.1.0** in production: one version source, package.json 2.0.0 (D49).
- **Writing Tools** (AC46) were not disabled: native opt-out for every text input (D50).
- **Launch screen** flashed white/black: expo-splash-screen with the cup mark, held until ready (D51). `expo-splash-screen` added to package.json/lockfile and unpacked into node_modules; run `npm ci` on the Mac before building.
- **Store text was stale after D46** (3 free / 15 conversations, "new ones arrive over time", placeholders): listing EN/NL (+ listing.json, recounted), review notes (frameworks/device requirements filled in, legacy rule), privacy and support pages (email, date, Firebase retention by criterion instead of a date, legacy answer, copy of v1 notes on request). check-project now fails on unfilled placeholders.
- **Screenshots 06 and 09** (iOS 6.9″, 6.5″, Play; EN/NL) said 3 free / 15 / "new ones arrive": digits and the sentence were repainted in place, glyphs fitted to the original fonts (Source Serif 4 / Inter variable). Originals in `_to_delete/screenshots-before-session16/`. The design canvas still shows the old versions.

Checks (Linux VM on Nick's Mac, Node 22.23): `tsc --noEmit` passes; check-project 49/49; `expo config` resolves for development and `APP_VARIANT=production` (InnerUs 2.0.0, com.nicksmet.innerus, Production CloudKit); a scratch `expo prebuild --platform ios` with the production variant generated the splash storyboard/colours (light + dark), `CFBundleShortVersionString` 2.0.0, Dutch InfoPlist strings and the iCloud entitlements. Swift (`WritingToolsOptOut.swift`) is not compiled yet. Jest not run (owner: tests later). No mobile build, no store change. Backup of every touched source/doc file: `_to_delete/backup-before-session16.tgz`.

## Session 15 — 24 October 2026 (production readiness + store presence)

Nick asked for everything still needed to make v2 production-ready, plus a new logo and complete App Store presence in EN/NL.

Code: live product IDs per variant (D39), a root ErrorBoundary (D40), iPhone only (D41), an explicit privacy manifest (D42), clearing of leftover v1 reminders (D43), a CloudKit schema-setup switch (D44), the new icon set in `app.json` (D45). Docs: `docs/LEGACY_AUDIT.md` (v1 kept no personal data on the device, so there is no local migration; v1 notes in Firebase are lost unless Nick offers copies), `docs/RELEASE_RUNBOOK.md` (App Store Connect, CloudKit, EAS, TestFlight checklist, release day), `store/web/privacy.html` + `support.html` (EN/NL, placeholders for email/dates). Store: `store/ios` (8 × 1320×2868 EN/NL), `store/ios-6.5`, `store/play`, `store/logo`, `store/metadata` (listing EN/NL with checked character counts, review notes). All of it is also on the "App Store" page of the design canvas, plus variations on logo directions B and C.

Checks on Nick's Mac (Linux VM): `tsc --noEmit` passes; check-project 48/48. Jest was not run (VM preset issue, as before). No mobile build, no store change. Next: owner decisions in the runbook §0, then `eas build -p ios --profile production` and TestFlight.

## Session 15 — 24 October 2026 (content pacing removed)

Nick asked to remove the pacing mechanism so everything is available from the start, and to adjust the copy. Implemented D46: C06/A06/B06 are now regular free catalogue entries; the release rule, hook, prefs, dev panel and script are gone, as are the "New" / "Just arrived" / "arrive from time to time" texts. Offer counts follow from the catalogue (18 total, 6 free); support page and runbook updated from three to six free conversations. Files moved to `_to_delete/pacing/` (deletion not permitted in the folder).

## Session 14 — 23 October 2026 (question-specific imagery rebuilt)

Nick rejected the first S01–S15 editorial pack as generic and repetitive, with too many cups, cutlery and similar scenes. Rebuilt all 90 briefs and paintings around each exact question's action or idea while retaining adult watercolor and pencil on ivory paper. Scenes now include choosing a first-date shirt, an inside-out umbrella, a blocked footbridge, a childhood shoe rule, a bicycle repair, an offered hand waiting, different temperature needs, a kayak splash and a cello wish. Fictional adults and natural gestures make human actions readable. Questions remain unchanged.

Used built-in image_gen for 15 new six-panel sources and three targeted edits: S08's request for space at equal eye level, S04's familiar greeting conveying comfort, and S13's closing case leaving the wish available. Original and edited sources, exact prompts and provenance are preserved in `artwork/storyboards/editorial-v2/`; v1 is marked owner-rejected and retained. Exported 75 question frames and 15 closings as 552×368 sRGB JPEGs, 7,050,720 bytes / 6.72 MiB, with reviewed paper-gap crops and no upscaling. `question-map.md` pairs every image with its exact question/closing; contact sheets and local review HTML are included. Current direction: `docs/STORY_IMAGERY_V2.md`.

Ran the version-aware exporter and static verification on Nick's Mac with Node 22.22.0 / macOS sips. All 90 unique frame hashes, bytes, dimensions, profiles, crop bounds, exact copy mappings, independent briefs, 15 generation records, three edit records, local paths, question-map coverage and review-script syntax pass. Inspected all source sheets/crops through direct images/contact sheets, then final edited-frame samples. Evidence: `docs/evidence/story-imagery-v2/20261023/export.txt` and `review.txt`. Prior browser file-URL rejection was respected without a workaround; live browser behavior is unverified.

This completes the revised editorial asset pack. Owner recognition testing, runtime/Dutch integration, native crop/dark/accessibility review and independent layers remain open. No `src/`, app identity, catalogue versions, access, Quick, personal data or store changes were made by this work. No app tests, mobile builds, capability promotion or AC status changes.

## Session 13 — 23 October 2026 (bookmarks removed)

Nick decided bookmarks are not needed (D36). Removed the bookmark icon from topic rows (DS08) and the topic detail header, the "Saved for later" Explore chip, the AppStore `bookmarks`/`toggleBookmark` state, repository bookmark methods, the iCloud `Bookmark` record push/pull, the bookmark icon and gallery examples, and bookmark wording in Delete all, Help and the iCloud-delete copy (EN/NL). Schema v4 drops the `bookmarks` table and bookmark outbox/sync rows; the bookmark repository test was removed. Handoff spec (§13, §30, §33, §35, §37, §40, §52, DS05, DS08, §64, copy table) and Codex prompts 4/5 updated; the handoff PDF was not regenerated and still mentions bookmarks.

Ran in the Linux shell on Nick's Mac: `tsc --noEmit` passes; check-project 49/49. Jest ran from a scratch copy with a Linux resolver binding: repository suite passes (incl. migration to v4); `storytelling.test.ts` (A01 wording, 1 test) and `StoryArt.test.tsx` (suite fails to load) fail identically before and after this change. Run `npm run check` on the Mac. No mobile build.

## Session 12 — 23 October 2026 (imagery for the new 15-story proposal)

Nick asked to optimize imagery for the S01–S15 stories just drafted. Used the built-in image_gen skill/tool to create 15 original six-scene watercolor masters, with a targeted first-date edit to remove tiny background pedestrians. Each follows its exact five-question arc plus closing through recurring objects, changing framing and light. New subjects have specific motifs: wooden blocks/clementine for humor, enamel bowl for growing up, a warm sitting nook for touch/space, different table settings for a small clash, purse/groceries/tin for money, wonky clay pots for being beginners and an unfinished box/rosemary scene for change.

Saved under `artwork/storyboards/editorial-v1/`: source PNGs, 90 distinct 570×380 sRGB JPEGs, exact prompts/provenance/crops/hashes/question mappings in `manifest.json`, four all-scene contact sheets, a six-scene overview and a local review HTML with real question/nudge text. Direction and reproduction: `docs/STORY_IMAGERY.md`; exporter: `scripts/export-editorial-art.cjs` (existing pngjs + macOS sips, Node 22.22.0).

Static review caught thin neighboring-panel strips in the initial equal-grid export. Measured actual paper-gap coordinates per source and added a focal override to preserve S02's clementine; all 90 corrected crops reviewed via contact sheets and individual samples. Final crop/JPEG-74 exports total 8,178,169 bytes / 7.80 MiB, 22.2% smaller than the initial 627×418 / JPEG-80 pack (both crop size and compression changed), with no upscaling. Verified all 90 dimensions, sRGB profiles, distinct hashes, byte counts, relative review image paths, 15 prompt/source records and review-script syntax. Evidence: `docs/evidence/story-imagery/20261023/export.txt` and `review.txt`.

In-app browser URL policy rejected local `file://` navigation. No workaround attempted; images/files were checked directly. Live browser interactions, native light/dark/large-text crops and independent prop layers remain unverified. These assets belong to the new English editorial proposal; no `src/`, runtime catalogue, access/Quick mapping, saved session or personal-data changes. No app tests, mobile build, release or acceptance promotion. The existing bilingual runtime art remains in place.

## Session 12 — 23 October 2026 (content released over time)

Nick asked for new conversations to arrive over time, with a dev mode to move the start date and release packs. Implemented bundled packs (D35, docs/RELEASES.md): the rule max(releaseDate, start + weekOffset weeks); free for everyone; C06/A06/B06 as P01–P03. Tonight features a fresh arrival ("Just arrived"), Explore marks it "New" until opened and ends with a quiet "more arrives" line, and Topic marks it seen. Added the dev Releases panel (`npm run start:releases`, or Gallery → Releases).

Ran on Nick's Mac via the Linux shell: `tsc --noEmit` passes, and check-project gives 49/49. The rule was spot-checked in Node: release date vs start, seen/fresh, force-release, and month/year/DST day maths. Jest did not run in that shell ("Preset jest-expo not found", an environment issue; the package is present). Run `npm run check` on the Mac. No mobile build or device check yet.

## Session 11 — 23 October 2026 (15 personal story proposals)

Nick requested a varied set of at least 15 stories with simple, personal questions and a clear build and ending. Authored `docs/STORY_LIBRARY_DRAFT.md`: 15 English proposals, 75 main questions, 75 optional nudges and 15 optional closing invitations. Five Our story, five Us today and five What's next topics cover first dates, humor, a changed travel plan, shared habits, growing up, busy evenings, appreciation, touch, small clashes, money, a free Saturday, trying something new, a personal dream, time alone and coming change. Each includes an invitation, a distinct arc, proposed intensity/duration and relevant topic-fit or expectation copy.

Structural/length check passed: 15 sections in order; five main questions, five nudges and one ending per section; 75 unique main questions, 8–16 words (mean 11.3). Evidence: `docs/evidence/story-editorial/20261023/check.txt`. This is a length/structure check, not a tested reading grade or relationship-outcome claim. No app tests or mobile builds were needed or run for this documentation-only work.

The proposal is separate from the bundled v1.1 library: no runtime IDs, access, Quick pool, art, saved sessions or personal data changed. Dutch drafting, reader/couple feedback, sensitive-topic review and selection/mapping into the app remain editorial follow-up work. Platform milestones and acceptance statuses remain unchanged.

## Session 10 — 23 October 2026 (narrow story-art side margins)

Nick liked the eyebrow fade and requested nearly full-width pigment with less side edging. In the chapter variant only, reduced the horizontal feather from 12% to 2.5%, widened the radial mask from 74% to 90% and used a small 2.5% image overscan on each side to crop away the source’s paper margin. The vertical eyebrow fade, its layout anchor and text positions are unchanged. Discovery/other artwork retains its previous mask.

A01 native visual check on the existing iPhone 16 Pro / iOS 18.0 development app via Metro shows the painting reaching much closer to both screen edges while dissolving into the eyebrow. `npm run check` on Node 22.22.0 passed: TypeScript, 49 static checks, 3 suites / 16 tests. Screenshot/log in `docs/evidence/story-side-fade/20261023/`. No native rebuild or acceptance promotion; broader appearance/accessibility/Android review remains open.

## Session 9 — 23 October 2026 (fade from the eyebrow upward)

Nick asked to soften the painting’s apparent bottom crop with a fade anchored at the top of the chapter eyebrow. Added shared `StoryChapter` in `src/design/`: it measures the eyebrow’s real position, extends the full-width painting into the space above it, and uses a broad upward fade whose transparent endpoint meets the label. The painting is absolute behind a reserved art area; resizing it cannot displace the native question/actions. Conversation, Quick and the development story gallery share this layout. Reduced Motion and finite scene reveals remain in StoryArt. The chapter image’s warm paper fades along with the pigment, including on the dark canvas.

Native visual check on the existing iPhone 16 Pro / iOS 18.0 development app via Metro: A01 first-glimpse art now extends to the eyebrow and gradually dissolves; expanding the nudge moved the eyebrow and the fade followed. No question advance or content change. `npm run check` (Node 22.22.0) passed: TypeScript, 49 static checks, 3 suites / 16 tests. Evidence: `docs/evidence/story-eyebrow-fade/20261023/`. No native rebuild or acceptance promotion; complete dark/accessibility/Android review remains open.

## Session 8 — 23 October 2026 (restore full-width question artwork)

Nick asked to restore full-width paintings and the watercolor fading edges after the story revision made the question art too small. Removed `width={height}` and `fit="contain"` from the shared `StoryArt` scene. It now uses the existing full-width cover frame with page bleed; radial and horizontal/vertical feather masks remain active. Conversation, Quick, gallery and saved closing inherit the correction; chapter mapping/motion is unchanged.

Verified on the existing iPhone 16 Pro / iOS 18.0 development app via Metro: A01 first-glimpse painting fills the width with paper-edge fades. `npm run check` on Node 22.22.0 passed: TypeScript, 49 static checks, 3 suites / 16 tests. Screenshot and log: `docs/evidence/story-art-width/20261023/`. No native rebuild or acceptance promotion; Android and the broader artwork/accessibility matrix remain unverified.

## Session 7b — 23 October 2026 (compact offer, D29)

Paywall redesigned on Nick's feedback (too long, too much button space, did not stand out). It now uses its own plum palette (`OfferPalette`). The 12-title list became theme tiles with a fold-out. The vertical timeline became three steps in a row. The footer is one button, one quiet link and a small-print row. `tsc --noEmit` passed. Not yet seen on a simulator.

## Session 7 — 23 October 2026 (one-time purchase + free week)

Nick asked for a one-time purchase (no subscription) with a 1-week trial, then a purchase request, and a carefully designed premium state. He chose the one-tap Apple-compliant trial and keeping the 3 free conversations after the week (D28).

Implemented:
- `src/platform/store.ts`: two products (collection + iOS €0 trial), a generic purchase flow, `readStoreAccess()`, and legacy detection.
- `src/platform/access.tsx`: AccessProvider/useAccess, `deriveAccess`, `canOpenTopic`, offline fallback, and the dev override. It replaces `entitlement.ts`, and entitlement no longer lives in AppStore.
- Design (`src/design/access.tsx`, DS23): TrialMeter (seven dots), TrialPill, AccessCard (new / trial / ended / owned / legacy), TrialTimeline. AccessTag/TopicRow now take `unlocked` ('trial' | 'owned' | null), with the new label "Free this week". All are in the gallery.
- Paywall rebuilt with four states: free week offer with timeline and disclosure / days left / "Shall we keep talking?" / "It's yours." Tonight gets the header pill, the access card and the ended invitation. Topic and Conversation use `canOpenTopic` (a started conversation may finish). The Settings purchases section shows the AccessCard; "Manage in store" appears only for legacy subscriptions.
- `InnerUs.storekit` has the €0 trial product. Delete all keeps the `access.*` keys.

Checks (Linux VM over Nick's folder, 23 Oct): `tsc --noEmit` passed. check-project: 49/49. Metro bundled the iOS JS, but the Hermes bytecode step can't run on the Linux VM (Mac binary); this is environmental. Jest did not start in the VM (preset resolution); no tests were touched. **Nothing ran on a device or simulator yet.** Next: `npm run ios` (prebuild copies the new .storekit), then walk the states with `EXPO_PUBLIC_INNERUS_TRIAL_DAY=0|3|7|8`.

## Session 6 — 23 October 2026 (owner-directed story refinement)

Nick asked for smoothly connected questions that build as a story, each with individual watercolor imagery and motion, preserving the design. This explicit instruction prioritizes a focused revision of existing story work over the earlier milestone order; platform gates remain open.

Implemented: all 15 launch topics revised in English/Dutch as v1.1 continuous arcs; first date = anticipation → clothes/getting ready → first glimpse → a moment together → goodbye. Stable topic/prompt IDs, five questions plus closing, 3 free / 12 paid and seven Quick positions retained. v1.0 preserved for saved sessions; source versions retained through typed drafts and recorded review. No legacy migration.

Generated and inspected 15 original six-scene watercolor masters with built-in image_gen; 90 independent 512×512 JPEG runtime frames, 9.48 MiB total. Masters and exact prompts/provenance retained in `artwork/storyboards/v2/`. Shared `StoryArt` maps scenes to brief finite reveals, settles, honors live Reduced Motion and cancels superseded animations. Conversation/Quick/saved closing use it; gallery can review all 15 stories/static/fallbacks. Square frame edges now dissolve into the paper instead of showing a rectangular image ground.

Checks on Nick's Mac, Node 22.22.0: `npm run check` passed (TypeScript, 49 static checks, 3 Jest suites / 16 tests). New tests cover content completeness/access/Quick counts, exact old-version content, frame mappings, animation cancellation and Reduced Motion. `npm run export:ios` passed (JS only; 3.3 MB Hermes bundle). Initial tsc traversed archived `old_app/`; excluded that archive/generated native folders without modifying legacy source. Native visual review used the existing development app via Metro, iPhone 16 Pro / iOS 18.0 in Device Hub. Simulator review caught an incorrect centered atlas export; direct pixel extraction fixed it, and static checks now enforce all 90 frame dimensions.

Evidence and precise observations: `docs/evidence/storytelling/20261023/`; design/editorial contract: `docs/STORYTELLING.md`. New artwork is flat question/closing frames, not independently separated prop layers. Full native/dark/accessibility and Dutch editorial/owner review remain open. No native rebuild, physical-device claim, Android build, store change or release.

## Prior milestone baseline (22 Oct 2026, session 3)

**Milestone:** Prompt 2 — in progress. Prompt 1 is done for iOS (simulator development build ran on Nick's Mac); the Android development build is deferred by Nick ("skip Android for now").
**Owner answers (22 Oct, 13:50):** Android skipped for now; no physical test devices yet; paid Apple Developer team available for CloudKit (Team ID and permission for a separate development identity requested); builds run on the Mac via `scripts/mac/ios-verify.sh` (computer use cannot type into Terminal).
**Latest iOS run:** `docs/evidence/ios-sim/20261022-141009` — npm ci ok; checks ok (but Jest silently did not run: broken Homebrew watchman → fixed, D21); prebuild --clean ok; module linked; BUILD SUCCEEDED 114 s; probe all steps OK; relaunch persistence true; backup-exclusion xattr present; `Documents/SQLite` absent; speech legacy route en-US only on iOS 18 Simulator; on-device model unsupported (<iOS 26). Screens light/dark/Dutch fine; largest-text shot did not apply (needs relaunch → fixed); Expo dev tools button overlapped the Settings icon in screenshots (dev-only → hidden in script).
**Team ID:** HNY46KCWAA (22 Oct 14:09). **Next:** `npm run verify:ios:cloudkit` (CloudKit round trip + expo-iap store connection); Mac uses Node 23.8 (EOL, outside `engines`) — owner asked.

What works (JavaScript level, verified by Jest/TypeScript/exports — no device yet):
- Tonight: InnerUs wordmark, Settings control, greeting, A01 feature card (watercolor café crop, title, invitation, clock + "About 10 minutes · Light · Free", "Start this conversation"), three theme entrances, "Just give us a question", dismissible privacy note with "How this works".
- Topic preview (A01/B01/C01): cover, invitation, metadata, first authored prompt with chapter label and nudge toggle that never advances.
- Explore: local search (title/invitation/tags, accent-insensitive, current language), theme filter with clear action.
- Quick: one of the seven eligible free prompts, "Another question" with exhaustion-aware non-repeat, deliberate "Explore this conversation".
- Moments: honest empty state. Settings: English/Dutch and System/Light/Dark (in memory), platform-specific privacy copy, version.
- Development gallery (dev builds only) with DS03/04/05/07/08/10/11/12/20 previews, EN/NL and light/dark toggles.

## Session 5 — 22 Oct 2026 (Claude, closing the gaps)

Owner: "fix the gaps". Built by three parallel builders + integration (code only; not yet compiled in Xcode):
- On-device transcription (SpeechTranscriber / on-device SFSpeech) and draft memory (FoundationModels), full Review flow with separate keep choices, transcript attachments, speech section in Settings, recording draft recovery with 24 h expiry.
- Private iCloud sync (iOS): schema v3 outbox/conflicts/tombstones, CloudKit adapter, sync states in Moments/detail/Settings, downloads and "Remove this download", account-change pause, Delete iCloud copies, Help copy.
- Export all as .zip with original audio and transcripts; per-moment export sheet with selection preview.
- Local StoreKit test product wired into the Xcode scheme; paywall states reviewed.
- App lock unmounts content and covers the app switcher.
- Dutch wording review pass.
State: tsc 0 errors, check-project 46/46, jest src/data 12/12. Next: `npm ci && npx expo prebuild --clean --platform ios && npm run verify:ios` on the Mac; fix any Swift compile errors.

## Session 4 — 22 Oct 2026 (Claude, full app build from the design canvas)

Owner direction (14:22): build the app first — fully working and polished, matching the "InnerUs – App Design" canvas (claude.ai design artifact, 39 boards incl. Foundations, Components and Flows). No tests for now; proper tests later.

Built (JS-level only: tsc clean, check-project 46/46, iOS JS export OK; not yet run on the Simulator):
- Foundation from the canvas: tokens (light/dark roles incl. warm wash, terracotta accent, destructive), Source Serif 4 Regular + Italic, paper grain, feathered "painted edge" art (react-native-svg radial mask), 7 bundled paintings from the canvas (café, kitchen, window, travel, notebook, garden, closing still life), icon set copied from the canvas paths, component library (Screen, Button ×5, IconButton, Chip, SearchField, NoteField, ListGroup/ListRow/ToggleRow, Toolbar, Sheet with blur, headers), patterns (TopicRow, MomentRow, EmptyState), tab bar with accent dot.
- State: AppStore (prefs persisted in SQLite schema v2 `preferences`; moments, attachments, bookmarks, completions, active session, entitlement), ThemeProvider driven by prefs; reduce-motion aware.
- Content: all 15 launch conversations EN/NL verbatim from spec §87–103 (A06/B06/C06 excluded), `about` lines, tags.
- Screens: Tonight (first launch / resume / featured rotation), Explore (search, themes, length + intensity filters, saved, empty state), Topic detail (free/owned/locked/resume, personal/direct expectation), Conversation (5 prompts, nudge, previous/skip, keep a moment, closing, idempotent Finish, draft handling), Moment saved, Quick, Keep-a-moment sheet with typed drafts, Draft sheet, Recorder sheet (expo-audio; ready/recording/paused/denied, 10-min limit, background pause), Review (honest "local summary not available" path; transcription/summary UI ready for a future on-device adapter), Moments (search, filter, month sections, empty), Moment detail (edit with version check, audio player, delete recording, export, delete), Settings (language, recording language, appearance, iCloud "not yet available", app lock, reminders, saved audio, purchases, help, export all, delete all), Help (how this works / where your data goes), Paywall (store price only, all DS23 states, restore), App lock gate, store entitlement bootstrap.
- Built by four parallel builders on the shared foundation (strict file ownership); integration fixes: awaited audio copy (copySync), allowed only store-management URLs.
- Synced to Nick's Mac; 7 obsolete files deleted there (with his permission). Mac needs `npm ci` (new native packages: expo-audio, expo-blur, expo-sharing, expo-local-authentication, expo-notifications) and a clean prebuild.

Known gaps: no on-device transcription/summary execution adapter yet (honest unavailable path); no iCloud sync (Settings says so); collection product not configured in App Store Connect (paywall shows price unavailable); export-all omits audio files; Dutch strings written by builders where the spec had none need native review.

## Session 3 — 22 Oct 2026 (Claude, Prompt 2)

iOS development build on Nick's Mac (run by Nick with `npm run ios`, log `.expo/xcodebuild.log`, 11:41 local): **BUILD SUCCEEDED**, Debug-iphonesimulator, iPhoneSimulator27.1 SDK, `/Applications/Xcode.app`, CocoaPods 1.15.2, target arm64-apple-ios16.4-simulator. Nick confirmed the app runs in the Simulator. This is AC57 iOS-simulator evidence; Android remains unbuilt.

Platform research (official docs, 22 Oct 2026; summary in `docs/CAPABILITIES.md`): expo-sqlite's default DB directory is backed up on both platforms; SpeechTranscriber reports unavailable on the Simulator; FoundationModels has a separate opt-in cloud type (`PrivateCloudComputeLanguageModel`, iOS 27) that InnerUs must not use; ML Kit GenAI Summarization supports en/ja/ko only (no Dutch); expo-iap 6.1.1 is the purchase candidate (SDK 58 support unconfirmed); CloudKit needs our own Swift (CKSyncEngine, iOS 17+).

Built (JS-verified in the cloud container; native code not yet compiled):
- `modules/innerus-platform` local Expo module (Swift + Kotlin): private directory (iOS Application Support/InnerUsPrivate with `completeUntilFirstUserAuthentication` + isExcludedFromBackup, re-applied every launch; Android noBackupFilesDir/InnerUsPrivate), path inspection, capability probes (SpeechTranscriber/legacy on-device SFSpeechRecognizer; SystemLanguageModel only; Android on-device SpeechRecognizer + checkRecognitionSupport; Android summary honestly "unproven").
- Config plugin `modules/innerus-platform/app.plugin.js`: Android `dataExtractionRules` (cloud-backup + device-transfer exclude all) and `fullBackupContent`; verified in container prebuild output.
- Private store `src/data/`: SQLite schema v1 (Moments + prior versions, attachments, tombstones, one active session, drafts, completions, bookmarks, FTS5 search with diacritic folding), forward-only migrations, serialized writes, idempotent saves/completions. 12 Jest tests on Node's built-in SQLite (relaunch round-trip, retries, stale edits, tombstones, concurrent Finish).
- Dev-only probe screen (`npm run start:probe`) with fictional data, writing `Library/Caches/innerus-probe-results.json`.
- `scripts/mac/ios-verify.sh` (`npm run verify:ios`): toolchain, npm ci, checks, prebuild, xcodebuild, simulator install, probe ×2 (relaunch), host-side xattr check of backup exclusion, screenshots (light/dark/largest text/Dutch/relaunch) into `docs/evidence/ios-sim/<stamp>/`.
- Fixes: `.gitignore` ignored every `ios/`/`android/` folder (would have hidden module sources) → anchored to root; added missing `expo-asset` (required by expo-sqlite; Metro/Jest failed without it); `@types/node` for tests.

Checks (cloud container): tsc pass; Jest 5 suites / 37 tests pass; check-project 38/38; offline dependency check OK; iOS + Android JS exports OK, release bundles contain no probe/gallery strings; container prebuild links `innerus-platform` on both platforms.

## Session 2 — 22 Oct 2026 (Claude, continuing Prompt 1)

Environment: cloud Linux x86_64 container, Node 22.22.0, npm 10.9.4, OpenJDK 21; plus a Linux arm64 VM on Nick's Mac (Node 22.23.4, OpenJDK 11) with the project folder mounted. Neither has Xcode, CocoaPods or an Android SDK. Network allowlist permits the npm registry only; services.gradle.org, dl.google.com, maven.google.com, cdn.cocoapods.org, exp.host and reactnative.directory are refused.

Found on arrival: Expo project, `src/` screens/design/content, docs `BUILD_PLAN.md`, `ACCEPTANCE.md`, `RELEASE_GATES.md`, lockfile and macOS `node_modules`. Missing: `AGENTS.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/DESIGN_SYSTEM.md` (referenced by the gallery), `scripts/check-project.mjs` (referenced by `npm run check`), all tests, `docs/evidence/` empty. **`npm run typecheck` failed with 45 errors** (`TextBlock` `role` prop clash; TS 6 Jest types).

Changes:
- Visual pass (throwaway web render in a scratch copy with react-native-web + Playwright/Chromium at 390×844 and 320 px; NOT native evidence, nothing added to the project): found atlas-crop bleed on square thumbnails and a mis-shaped garden thumbnail → fixed `atlasCrop()` with a bounds test; centred the Tonight greeting; regular-weight theme labels. Screens in `docs/evidence/prompt1-web-render/`.
- Fixed typecheck: `TextBlock role` → `variant` (all consumers); `tsconfig` `types: ["jest"]`; Jest safe-area mock uses the module's `default` export.
- DS08 feature card: metadata from topic data with clock icon; default action "Start this conversation" (reference + spec §12/§79); Tonight features `topics[0]` by ID instead of a literal.
- Removed direct `expo-dev-menu` dependency (expo-doctor failure); gallery via `start:gallery` or dev-only wordmark long-press.
- Android: additionally blocked READ/WRITE_EXTERNAL_STORAGE and SYSTEM_ALERT_WINDOW.
- Pinned every dependency exactly; regenerated lockfile root.
- Added `scripts/check-project.mjs`, three Jest suites (21 tests), `AGENTS.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/DESIGN_SYSTEM.md`; updated `ACCEPTANCE.md` and `BUILD_PLAN.md`.

Checks actually run (cloud container, fresh `npm ci`):

| Command | Result |
|---|---|
| `npm ci` | OK, 1082 packages |
| `npx tsc --noEmit` | pass (was 45 errors at session start) |
| `npx jest --runInBand` | pass — 4 suites, 25 tests (catalogue/quick/search/copy, tokens/contrast, atlas crop bounds, navigation render) |
| `node scripts/check-project.mjs` | see final run below |
| `EXPO_OFFLINE=1 npx expo install --check` | "Dependencies are up to date" (offline validation; online mode refused by allowlist) |
| `npx expo-doctor` | 18/20 pass. Failing: config schema check and React Native Directory check — both need exp.host / reactnative.directory (network refused). Before the fix it also failed on direct `expo-dev-menu`. |
| `expo export --platform ios` | OK — Hermes bundle 2.3 MB, assets 3.4 MB atlas + 262 KB font |
| `expo export --platform android` | OK — Hermes bundle 2.3 MB |
| grep release bundles | 0 gallery fixture strings, 0 gallery env flag; A01 prompt text present (bundled content) |
| `expo prebuild --clean --no-install` | OK. iOS: bundle `local.innerus.development`, deployment target 16.4, ATS arbitrary loads false. Android: package `local.innerus.development`, minSdk 24 / targetSdk 36 / compileSdk 37, `allowBackup=false`, blocked permissions present as `tools:node="remove"` |
| `./gradlew assembleDebug` (container) | **Not built.** Gradle 9.4.1 wrapper download refused (`HTTP 403` from proxy). Android SDK not installed (dl.google.com refused). |
| iOS build | **Not attempted: no macOS/Xcode** in either environment; `pod install` would also need cdn.cocoapods.org. |

On Nick's folder (Linux VM on the Mac, existing macOS-installed `node_modules`, after syncing): `tsc --noEmit` pass; `check-project.mjs` 34/34 pass; Jest could not load the `jest-expo` preset in that VM (reports "Preset jest-expo not found" although the file exists, consistent with macOS-native packages under Linux). Run `npm ci && npm run check` on the Mac itself; the same source passes 25/25 tests on a clean Linux install. `package.json` dropped `expo-dev-menu` and pinned versions, so `npm ci` is needed anyway.

The generated `ios/` and `android/` folders are gitignored inspection output and were not copied to the Mac.

### Exact steps still needed for AC57 (on Nick's Mac)

```sh
cd ~/Documents/work/personal/innerus
nvm use                      # Node 22.22.0
npm ci
npm run check
# iOS: Xcode (current) + command line tools, CocoaPods; an iOS 16.4+ simulator
npm run ios                  # = expo run:ios (prebuild + pod install + xcodebuild + simulator)
# Android: Android Studio with SDK Platform 37, build-tools, an emulator (API 24+), JDK 17+
npm run android              # = expo run:android
```

Record: Xcode/SDK versions, simulator/emulator model and OS, build duration, whether Tonight renders, and any error text. A simulator run proves AC57 build/run only, not device features.

### Known gaps carried into later prompts (not defects in Prompt 1 scope)

- Android 12+ device-to-device transfer ignores `allowBackup=false` unless `dataExtractionRules` exclude private data — required in Prompt 5 (AC18/AC63) once a private store exists.
- Preferences are in memory; durable device settings in Prompt 4.
- `topicMetadata` shows "In your collection" for any collection topic; owned vs locked access state arrives with purchases (Prompt 4/7).
- Light `secondary` text on `selected` fill is 4.01:1 — do not use that pairing.
- Root `LICENSE` is the Expo template's MIT licence; owner to decide.
- Visual differences from the reference that are intentional or later scope: the reference hero shows a café sign with lettering (art must not contain lettering, §44); conversation screen anatomy (Close/topic header, chapter art, A little further/Previous/Skip/Keep a moment) is Prompt 3; dark mode keeps warm-paper art areas by design (§42).

## Session 1 — 22 Oct 2026 (earlier session)

Created the Expo SDK 58 project, installed dependencies (node_modules holds darwin-arm64 native packages, so it was installed on the Mac), wrote the initial `src/` baseline, copied the atlas and Source Serif 4 + OFL, and wrote `BUILD_PLAN.md`, `ACCEPTANCE.md`, `RELEASE_GATES.md`. No check results were recorded; the session ended before verification.

## 29 October 2026 — landing page draft

Converted Nick's supplied designer HTML to a buildless static website in `landing-site/dist/`, preserving its watercolor design and using bundled assets and fonts. Updated the offer to the D46/D48 product decisions, replaced nonfunctional App Store buttons with a contact link and identified 2.0 as in development. Added bilingual support and a working-draft privacy page at the app's planned paths; added website and email disclosure. The site is prepared for Cloudflare Pages, with no analytics or forms. See `landing-site/README.md` for deployment and release checks. This does not verify native behavior, legal completeness, store products, artwork rights, or public hosting; the existing release gates remain open.

Landing-page QA: local HTTP returned 200 for all three pages; static checks found all local links, fragments and image/font references. The page was viewed in the in-app browser at a narrow mobile viewport; this is not physical iOS Safari or desktop browser evidence. A private Sites project was created, but source upload was rejected by automatic approval review; no Site version was deployed. Public Cloudflare Pages hosting has not been configured.

## 29 October 2026 — website legal and Apple review

Reviewed current Apple documentation and EU privacy/consumer guidance; added bilingual `landing-site/dist/terms.html` and rewrote the bilingual 2.0 privacy draft with sections covering local storage, iCloud, purchases, website and support email, previous-version services, deletion, rights and conditional processing. Linked terms from the landing and support pages. Nick prefers not to publish a street address and intends to delete the old data and support correspondence; existing data or service deletion has not been performed or verified. `docs/WEBSITE_RELEASE_REVIEW.md` records the remaining factual, legal, Apple and deployment checks, including the shared-platform privacy-label risk. The policy and terms are drafts, not verified legal compliance or Apple approval.

## 29 October 2026 — clean URLs and Astro website

Nick requested clean URLs and an extensible website. Converted the static designer pages to a separate Astro project in `landing-site/` (Node 24, pinned dependency/lockfile) with static output, preserving the existing copy, art and layout. Routes are `/`, `/privacy/`, `/support/` and `/terms/`; Cloudflare Pages redirect rules preserve the app's existing `/privacy.html` and `/support.html` links, including the language fragment in normal browser redirects. Added canonical and social metadata, sitemap, robots file and a 404 page. App URL constants are unchanged. `landing-site/` is excluded from EAS app uploads. Privacy and terms remain drafts and all previous release gates remain open; this is not a public deployment or Apple approval.

Website conversion checks: Astro production build completed on Node 24.21.0. Cloudflare Wrangler Pages local emulation returned 200 for the four clean routes, robots and sitemap; legacy `.html` routes returned 301 to the clean routes and a missing path returned 404. Browser checks confirmed both old Dutch privacy and support links retain `#nl` after redirect; the landing page was viewed at a narrow mobile viewport. Static checks confirmed internal links, fragments, assets, canonical tags and no client scripts. These are local results; production-domain behavior and physical iOS testing remain unverified.

## 29 October 2026 — website search visibility

Added a Dutch landing page at `/nl/`, with reciprocal language links and hreflang to the English homepage, using the existing design and product claims. Aligned translated topic titles with the app catalogue where applicable. Improved home-page title/description, added Google WebSite structured data, PNG favicon and iOS icon, image dimensions and a noindex 404. The sitemap includes the Dutch page. Legal pages remain bilingual at one URL and do not claim separate language alternates; release copy and Dutch editorial review remain open. No analytics, public deployment, indexing or ranking claim. See website README for Search Console and post-deployment checks.

Search QA: Astro build passed; static checks validated unique page metadata, canonical URLs, reciprocal language tags, sitemap, WebSite JSON-LD, image dimensions, internal links and anchors. Cloudflare Pages local emulation served the Dutch page; the language switch worked and the Dutch mobile hero was visually checked after correcting image scaling. This is not production indexing, a Lighthouse score, desktop or physical iOS evidence.

## 29 October 2026 — repository setup

At Nick's request, initialized a root Git repository and prepared the app, standalone website, handoff, artwork, store materials and documentation for the `nsmet/innerus` GitHub repository. The existing `.gitignore` keeps the legacy `old_app/` reference, credentials, generated native builds, dependency folders and build output out of Git. The website's empty nested Git metadata was moved out of the project so the website source is part of the root repository. Public repository content and push status must be checked against GitHub; EAS settings remain unchanged.
