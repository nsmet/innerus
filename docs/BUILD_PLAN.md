# InnerUs build plan

Source: `InnerUs_Developer_Handoff (1)/InnerUs_Codex_Prompts.md` (prompt pack 1.0, 22 October 2026) and `InnerUs_Developer_Specification.md` (v1.3). The README and complete specification have been read. The supplied package contains no implementation code or legacy audit.

The owner's Expo / React Native / TypeScript requirement applies to one shared iOS and Android application. Native adapters may implement platform services. Work locally; do not publish or change live store products.

| Prompt | Reviewable deliverable | State / exit evidence |
|---|---|---|
| 1 | Establish project guidance and records; pinned Expo baseline and lockfile; shared navigation/tokens; Tonight and supplied first-date preview; local content structure; private development gallery. | **iOS done (simulator build ran 22 Oct); Android deferred by owner.** Typecheck, 21 Jest tests, check-project, offline dependency check, 18/20 expo-doctor, iOS/Android JS exports and prebuild pass (see `PROGRESS.md`). iOS/Android development builds not yet run: no Xcode/Android SDK in the sessions so far. Close by running `npm run ios` and `npm run android` on the Mac. |
| 2 | Prototype protected persistence/backup rules, iOS private CloudKit, recorded-file local speech, local summary capabilities, and direct store integration. | **In progress.** Storage layer, native module, Android backup plugin, capability probes and Mac verification script written; awaiting iOS simulator run. CloudKit awaits Team ID. Physical devices: none yet. Capability matrix distinguishes device, OS, language, model, simulator and physical-device evidence; unsupported states stay truthful. |
| 3 | Complete the A01 five-prompt first-date slice, closing, explicit finish, resume and durable manual Moment; extend shared design system/gallery. | Not started. Verify real relaunch, navigation/idempotence, bilingual text and accessibility; label reference crops temporary. |
| 4 | Complete 15-topic shared manual product: Explore, Quick, Moments, export/delete, settings and local durability. | Not started. Validate 3 free / 12 paid / 3 excluded backlog mapping and the seven eligible quick prompts. |
| 5 | Implement protected local storage and iOS private sync, conflicts, account isolation, retention and deletion. | Not started. Android stays local-only; prove backup exclusions and recovery with fictional data. |
| 6 | Add explicit recording/recovery and proven strictly on-device transcription/reviewed summaries. | Not started. Test recorded clips, interruptions, expiry, language/model support and network boundary; manual alternatives remain available. |
| 7 | Implement StoreKit / Play Billing and audited legacy rights. | Not started. Sandbox state/restore evidence and legacy fixtures required; owner controls live offer and historical promise changes. |
| 8 | Complete production art/motion, DS01–DS24 gallery and accessibility. | Not started. Approved layered assets, provenance, native screen review and shared-token/second-family demonstrations required. |
| 9 | Review running product against all AC01–AC64 and fix defects. | Not started. Reproducible native builds, device/state matrix, traffic evidence and release-gate closure; publication remains outside this work. |

## Owner-directed refinement — 23 October 2026

Nick explicitly prioritized story progression and question-specific watercolor imagery/motion. Implemented the v1.1 bilingual arcs for all 15 launch topics, 90 bundled paintings, finite shared reveal motion, old-version resume and a story review gallery. This is a focused revision of existing Prompt 3/4/8 work; it does not close Prompt 2 or promote broad milestone completion. See `STORYTELLING.md` and `docs/evidence/storytelling/20261023/`. Independent prop layers, complete native/accessibility review and owner approval remain open.

23 Oct follow-up: restored full-width StoryArt cover framing with the watercolor edge fades at Nick’s request. A01 iOS simulator screenshot and passing existing checks are in `docs/evidence/story-art-width/20261023/`; milestone/release statuses remain unchanged.

23 Oct eyebrow-fade follow-up: Conversation, Quick and story gallery now share `StoryChapter`; the full-width painting dissolves upward from the eyebrow’s actual position. A01 native collapsed/expanded-nudge review and check log: `docs/evidence/story-eyebrow-fade/20261023/`. Broad milestone statuses remain unchanged.

23 Oct side-margin refinement: narrowed chapter-side feathers and trimmed the source paper border for almost full-width imagery, retaining the eyebrow fade. A01 native screenshot and passing checks: `docs/evidence/story-side-fade/20261023/`. Milestone states remain unchanged.

## Continuation rules

23 Oct imagery revision 2: Nick rejected the first S01–S15 pack as generic and repetitive. Completed `artwork/storyboards/editorial-v2/` with 90 independent exact-question briefs, 15 new source sheets, three targeted edits and 90 visually reviewed 552×368 sRGB exports. See `STORY_IMAGERY_V2.md`, the pack's `question-map.md` and `docs/evidence/story-imagery-v2/20261023/`. Shared watercolor medium now permits varied fictional human actions and settings instead of recurring decorative props. V1 is retained as owner-rejected history. Owner recognition testing and deliberate runtime/Dutch/native integration remain open; no platform milestone closes.

23 Oct imagery follow-up: completed a versioned S01–S15 editorial asset pack (`STORY_IMAGERY.md`): 15 six-scene masters, 90 optimized landscape JPEGs, exact question mappings, provenance and local/static review artifacts. Static export/color/hash/path checks passed; in-app browser local-file review was blocked, with direct image review completed instead. Runtime integration remains separate and must preserve identities, versions, Dutch review, access, Quick eligibility and the shared measured-fade design. No platform milestone closes.

23 Oct editorial request: `STORY_LIBRARY_DRAFT.md` is a completed first English proposal of 15 varied five-question stories with nudges and endings. Main-question lengths/structure checked (`docs/evidence/story-editorial/20261023/check.txt`). This owner-directed content work does not advance the implementation milestone sequence. Before runtime use, select topics, review with readers/couples, assess sensitive topics, translate/review Dutch and map versions/identities/art/access explicitly.

Read root `AGENTS.md`, then `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/ACCEPTANCE.md`, `docs/RELEASE_GATES.md` and `docs/DESIGN_SYSTEM.md` before continuing. Inspect actual code and preserve existing work. Complete the earliest unfinished milestone instead of creating another project.

Only promote an acceptance row when its full requirement has supporting evidence. A successful JavaScript export or TypeScript check is not an iOS/Android build, device, storage, store, CloudKit or local-AI test. Partial work stays `implemented-unverified`, with its missing evidence named.

The supplied flat PNGs establish approved visual direction; they do not satisfy independently animated chapter layers. Editorial/translation drafts and the provisional commercial offer are development defaults pending the release gates.
