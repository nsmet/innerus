# InnerUs - Codex implementation prompts

Prompt pack 1.0 - 22 October 2026. Product source: InnerUs handoff v1.3.

## How to use these prompts

Open the new project folder in Codex. It can contain only `InnerUs_Developer_Handoff.zip` or its extracted folder. The updated ZIP includes this prompt pack. Use the launcher below, or paste Prompt 1 directly. Then use Prompts 2-9 one at a time. Each is a complete milestone assignment; Codex should implement and verify that milestone before reporting back.

The owner has chosen **Expo, React Native and TypeScript for iOS and Android**. This supersedes the older iPhone-first plan. Small native service adapters are allowed inside the Expo project. The app UI and product logic remain shared.

Private iCloud sync is an iOS feature. Android starts with protected local storage and export. Neither cross-platform data sync nor cross-store purchase transfer is promised. On-device AI is capability-gated; the core product never depends on AI availability.

You do not need to add these prompts as an application dependency or configure an AI API key. These are development instructions, not a runtime AI service.

| Prompt | Reviewable outcome |
|---|---|
| 1 | Read the handoff, establish project instructions and create the Expo baseline. |
| 2 | Prove platform capabilities and record implementation decisions. |
| 3 | Build the reusable design system and complete first-date slice. |
| 4 | Complete the shared manual product and local catalogue. |
| 5 | Implement private iCloud on iOS and local-only privacy on Android. |
| 6 | Add recording and strictly on-device transcription/summary paths. |
| 7 | Implement platform purchases and legacy entitlement handling. |
| 8 | Complete production artwork, motion and accessibility. |
| 9 | Review the running product against all acceptance criteria and fix defects. |

## Launcher - paste this when the folder contains only the ZIP

```text
This folder contains the InnerUs developer handoff ZIP or its extracted contents. Find the handoff and extract it into a dedicated handoff folder if necessary, preserving the original archive and any existing files.

Find InnerUs_Codex_Prompts.md. Read its usage instructions and execute Prompt 1. Also read the complete developer specification and inspect the reference images it identifies.

The owner requires Expo, React Native and TypeScript for iOS and Android. The shared application must use a reusable design/component system. Stories and artwork are bundled locally; personal data and AI processing stay local, except optional private iCloud sync on iOS. Android starts local-only. No InnerUs login or backend.

Begin implementing Prompt 1 in this workspace. Finish its concrete deliverables and run the checks available here. Report actual results and blockers; do not stop with only a plan or claim that unavailable device tests passed.
```

## Prompt 1 - understand the handoff and establish the Expo project

```text
You are the lead product engineer implementing InnerUs in this workspace. Build it using Expo, React Native and TypeScript for iOS and Android.

Find InnerUs_Developer_Handoff.zip or the extracted handoff. Preserve originals and existing work. Extract into handoff/ if needed. Read the complete InnerUs_Developer_Specification.md in manageable sections, its README, the platform and design-system requirements, all acceptance criteria and the supplied conversation catalogue. Inspect both reference PNGs. Use the PDF when it clarifies visual hierarchy.

The expected handoff is v1.3, containing DS01-DS24 and AC01-AC64. Record the actual version. If a supplied file is older, record the discrepancy and continue unblocked work using the owner's explicit Expo requirement; do not invent missing source material.

Product requirements:
- One shared Expo application for both platforms. Platform adapters may use native code where necessary; the application UI is React Native.
- No InnerUs account, registration, authentication service or backend.
- Bundle stories, prompts, translations, artwork and fonts. Local search and recommendations. No remote catalogue or runtime content/update service.
- Protected local personal storage and strictly on-device AI. Optional private iCloud sync on iOS only. Android is local-only with export; no cross-platform sync or purchase-transfer promise.
- Preserve the adult watercolor direction, coherent topic-based conversations and shared component system. Use the supplied editorial content.
- Missing AI capabilities leave manual notes and deliberate voice keepsakes available. Never substitute cloud processing.

Inspect the workspace and toolchain before selecting versions. If no existing app source is present, start a new Expo project and record that legacy code, migration and entitlements have not been audited. Choose a compatible stable Expo SDK and dependencies; pin versions and retain the lockfile. Establish development builds for platform integrations. EAS is optional tooling, not a required app-user account.

Create a concise root AGENTS.md, preserving any existing applicable guidance. It should point to the actual handoff paths, product constraints, verified build/check commands and project records. Keep detailed requirements in the handoff rather than duplicating the full specification.

Create docs/BUILD_PLAN.md, docs/PROGRESS.md, docs/DECISIONS.md and docs/ACCEPTANCE.md. Track all 64 acceptance IDs with a short requirement, implementation location, evidence and status. Separate not started, implemented/unverified, verified and blocked. Record assumptions and real release gates. These records must let another Codex session resume without this chat.

Implement the runnable Expo baseline: shared navigation, initial semantic tokens, a real Tonight screen and the supplied first-date preview. Establish the local content structure and initial gallery route in development builds. Keep the gallery out of public navigation. This milestone starts the product; full conversations and all components follow in later milestones.

Run available dependency, TypeScript and project checks, then attempt iOS and Android development builds using the installed toolchains. State exactly which targets ran. If Xcode, Android SDK, signing or a device is unavailable, continue independent implementation and identify the precise missing prerequisite. Do not present a JavaScript check as a successful mobile build.

Complete this milestone now. Use reasonable defaults for reversible decisions. At the end, update the project records and report: what works, exact checks/results, how to run it, what remains unverified and the next milestone. Do not publish a release or change live store products.
```

## Prompt 2 - prove the platform boundaries before committing to them

```text
Read AGENTS.md, the project records and the handoff's platform, privacy, voice and purchase sections. Continue the existing Expo project.

Prove the critical platform capabilities with small experiments and fictional data before committing the product to a library or persistence design:
1. Protected local persistence and attachment storage on both platforms, including backup exclusions and failure recovery.
2. Optional private CloudKit sync through an iOS Expo adapter: local-first save, unavailable iCloud, offline queue and a same-account second-device round trip when configured. Android must have no substitute cloud service.
3. iOS on-device transcription of a recorded file and on-device SystemLanguageModel availability through suitable adapters.
4. Android strictly on-device transcription of a recorded clip, including language/model checks. Generic microphone recognition alone is insufficient proof.
5. Android local summarization eligibility, actual language/output support and the manual fallback. Do not assume Dutch support or silently switch to remote Gemini, translation or another cloud model.
6. A viable direct store integration for StoreKit and Google Play Billing, including client-only constraints. Do not introduce an entitlement server or third-party customer-data service by default.

Use current official Expo, Apple and Android documentation. Public documentation research and development dependency downloads are permitted; the no-server requirement governs the shipped product and personal content. Never upload private recordings or notes to development services.

Keep platform operations behind narrow typed interfaces so the shared React Native UI and design system remain independent. Follow the supported Expo module/configuration workflow and test that rebuilding native projects preserves required configuration.

Record a capability matrix with platform, OS/device, language, model state, observed result and evidence. Distinguish simulator checks from physical-device/network evidence. If a prerequisite is missing, record it as blocked and implement the truthful unsupported state. Continue unblocked manual-product work.

Document the simplest architecture that meets the evidence, including provisional deployment targets, local data/version strategy, adapter responsibilities and chosen dependencies. Reuse sound work; avoid a new abstraction for every screen. Finish with updated records, working experiments and a recommended implementation path, not only a list of possible libraries.
```

## Prompt 3 - build the shared system and complete first-date experience

```text
Read AGENTS.md, project progress and the handoff's experience, first-date, visual and design-system sections. Implement the complete A01 first-date slice using the established Expo project on both platforms.

The working path is Tonight -> topic detail -> five authored prompts with optional nudges -> closing invitation -> Finish. Implement Previous, Skip, close/resume and explicit completion exactly as specified. Keep a Moment opens a typed editor, saves durably and returns to its source screen without automatically advancing or finishing. Repeated taps must not create duplicate saves/completions. A couple can finish without saving anything.

Build the shared semantic colors, text styles, spacing, geometry, actions, navigation, topic presentation, prompt, nudge, scene, closing, Moment and status components this slice needs. Map them to DS identities. Use the same implementations in the app and local development gallery. Complete other DS components when their product flows are implemented; track them honestly.

Match the supplied watercolor references and native PDF anatomy while following explicit behaviour over incidental concept-image details. Use bundled Source Serif 4 with its license and platform font scaling. Preserve the paper palette, aubergine type and quiet adult illustrations. Text and controls remain real accessible React Native elements.

Implement authored chapter-to-scene mapping and shared motion roles. Artwork must settle while the couple talks. Reduced Motion uses static states or quiet transitions. The supplied flat PNGs are visual references, not production prop layers. Early reference crops must be labeled temporary in the asset record; do not claim independent layer animation is finished when it is not.

Demonstrate long English/Dutch prompts, light/dark, compact width, large text, screen-reader order and interruption/resume. Show that changing one shared style updates Tonight, the conversation and Moments together. Verify a real relaunch retains a saved note and resume position.

Run appropriate tests and mobile builds; inspect actual rendered screens where tools allow. Fix visible defects and preserve evidence. Update acceptance/progress records and provide a short walkthrough of the working slice and concrete artwork/device gaps.
```

## Prompt 4 - complete the shared manual product

```text
Read AGENTS.md, project records and the relevant experience/content/settings sections. Complete the shared manual product on iOS and Android using the existing components.

Bundle all 15 launch conversations in English and Dutch: A01-A05, B01-B05 and C01-C05. The free set is A01, B01 and C01. Keep A06, B06 and C06 out of the public catalogue and paid offer. Preserve the five main prompts, optional nudges, closing invitations and stable content identities; do not rewrite approved structure to make a parser easier.

Implement Tonight's local rotation and resume, Explore search/combined filters, topic details/access states and Quick mode. Use only the seven specified eligible free prompts, with exhaustion-aware non-repetition. Choosing another quick question must not silently start a full conversation.

Complete Moments listing/search/detail/edit, readable single/all export, attachment controls and scoped deletion. Keep saved question snapshots stable through content changes. Implement device-specific preferences, language choice, appearance, optional local reminders and optional platform lock. Android explains local-only recovery; iCloud settings are iOS-specific.

Use real local durability and failure handling. Keep unavailable later integrations visibly honest. Every core/manual flow works offline without an account, AI or purchase. Complete the relevant gallery components and empty/error states alongside these features.

Verify content counts, access mapping, localization, navigation/back behaviour, session versioning, save/relaunch, export completeness and large-text behaviour on both platforms. Record actual checks and remaining integration gaps. Do not count placeholder handlers as completed functionality.
```

## Prompt 5 - implement private storage and iOS sync

```text
Read AGENTS.md, the capability evidence and all handoff privacy/sync/retention requirements. Implement the established local-first storage model and iOS private CloudKit adapter. Keep Android local-only.

Sync only committed selected items and the allowed preferences on iOS. Active sessions and uncommitted audio/transcripts stay device-local. Distinguish local durability, queued upload, confirmed sync and attachment download. A cloud error must never block reading a conversation or destroy the only pending local copy.

Implement stable identities, safe retries, recoverable concurrent versions, deletion history and account isolation. A previous iCloud account's local store must not upload into a new account. Resolve attachment failures, quota-full, offline cloud deletion and safe cache removal. Removing a device copy, turning sync off and deleting the synced library must have different consequences and copy.

Exclude private stores, search indexes, drafts and attachments from automatic backup on both platforms, including the applicable Android extraction rules. Verify actual configuration and behaviour rather than assuming a storage library sets the required flags. Local-only Android recovery uses deliberate export. Do not add Google login, a Google Drive sync service or cross-platform migration.

Keep private content out of logs, crash breadcrumbs, app-switcher previews, notifications and support defaults. Opt out of external/system writing integrations as required. Use platform lock and share controls appropriately. Preserve purchase rights when personal content is deleted.

Test the scenarios possible here with fictional data; use actual configured development containers/accounts where available. Do not create or modify production containers or pretend a mock proves real cloud convergence. Document exact configuration/device steps still required and continue independent work.

Update the acceptance matrix with evidence for the iOS-specific checks and the shared Android privacy checks. Review implementation code for accidental server destinations and data-loss paths, fix findings, and report the resulting behaviour.
```

## Prompt 6 - add recording and strictly local intelligence

```text
Read AGENTS.md, platform capability evidence and all voice/AI/privacy requirements. Implement optional per-question or general-Moment recording with the platform adapters. Shared UI/state and review components remain in React Native.

Require explicit Start and permission; support Pause, Resume, Stop, playback and Discard. Apply the disclosed ten-minute clip limit. Calls, backgrounding, lock and route changes interrupt safely and never auto-resume capture. Recover valid partial clips. Implement the specified recording-draft expiry without deleting an open review; typed-only drafts follow their own rules.

Run transcription only through a proven on-device recorded-file route. Check platform, language, installed model and readiness independently. Unsupported devices/languages keep audio/manual writing. Never fall back to a remote recognizer, Private Cloud Compute, remote Gemini or a third-party AI endpoint.

Allow transcript correction before summary generation. Use the selected transcript and topic/question context only. iOS uses the explicitly local model when available. Android uses only a proven supported local path; current Google summarization documentation does not establish Dutch support. A missing or unsuitable local path must remain an honest manual fallback.

Preserve uncertainty, negation, disagreement and exact quotes. Do not infer speakers, emotions, diagnoses or agreements. Spoken instructions inside a transcript are source material, not instructions to the model. Handle long input locally without silent truncation. Do not fabricate speaker labels to fit an API format.

The first summary is explicit; later automatic draft generation requires the specified opt-in. Every save requires review. Summary/note, transcript and audio retention are separate; raw audio and full transcript start off. Unselected temporary material is removed according to the handoff.

Use fictional English/Dutch evaluation clips. Test cancellations, short/no speech, poor recognition, model downloads, unsupported language and interruption. Prove supported processing in airplane mode and inspect network traffic on real targets where available. Mark physical/network checks unverified if they cannot run here. Update the gallery, records and acceptance evidence, then report supported combinations and limitations accurately.
```

## Prompt 7 - implement purchases without changing the privacy model

```text
Read AGENTS.md and the offering, legacy and platform requirements. Implement the three-free/twelve-paid one-time collection using an appropriate Expo-compatible direct platform integration.

Use StoreKit on iOS and Google Play Billing on Android, with store-provided localized price/product metadata. The EUR 19.99 figure is a proposed test price, not permission to change a live product. Keep product identifiers and environment configuration explicit; never invent production identifiers or ownership.

Handle available, owned, canceled, failed, pending, refunded/revoked and restored states. Android non-consumable purchases need the correct purchase-state and acknowledgement flow. Explain client-only verification limits in the decision record. Do not add a new backend or third-party customer-data service without an explicit product decision.

Use store test environments and clearly separated fixtures. Do not grant real ownership from a synced paid flag or a development fixture. Keep free content, saved Moments, recording/manual tools, export and deletion available as specified. Do not interrupt an active free conversation with an upsell.

If original iOS code, receipts, product definitions or historical promises are absent, keep legacy mapping as a release gate. Prepare the integration/migration checklist and test fixtures; do not claim that customer access has been preserved without evidence. Never delete private content when paid access changes.

Purchases restore within their respective stores. No iOS-to-Android entitlement transfer or common account is promised. Test the flow and return context on both platforms, complete DS23's real states, update the acceptance matrix and report live configuration still needed. Do not change live store products or publish.
```

## Prompt 8 - finish artwork, motion and access

```text
Read AGENTS.md and the approved references, art plans and design-system chapters. Complete the visual product on iOS and Android using the running app's shared components.

Produce/integrate the required bundled covers, compact crops, base scenes, independent props, closing compositions, static fallbacks and dark-safe treatments for every launch topic. Follow the six scene families and supplied chapter mappings. Use only fictional editorial content in external art-generation tools; never personal recordings or saved text.

Use appropriate image-generation/asset tools if available. If a required production asset cannot be made here, create a precise asset request with composition, dimensions/slot, layers, anchors, states and generation prompt. Keep its absence visible in the release checklist. A flat screenshot or crop does not satisfy the independent-prop requirement.

Complete the shared motion roles and rapid-navigation handling. Scenes rest during conversation; Reduced Motion preserves the authored state. Native platform service sheets remain platform appropriate. Android Back, keyboard, edge-to-edge/safe-area behaviour and system text scaling must work naturally.

Inspect the actual UI against the references. Fix inconsistent type, color, spacing, truncation, crowded prompts, wrong crops and accidental image lettering. Keep the adult watercolor feel and avoid replacing it with generic blobs, emoji, hearts or character mascots. Bundle reviewed fonts/licenses and document asset provenance.

Complete all DS01-DS24 gallery entries with relevant states, English/Dutch, light/dark and accessibility examples. Demonstrate component reuse with another topic/art family and a shared-token change across screens. Verify offline startup from a release-style build without Metro or a runtime content service.

Run suitable visual, interaction, performance and accessibility checks on both target platforms. Record measured devices/builds and any unverified work. Finish with updated evidence, remaining asset requests and the next concrete fixes.
```

## Prompt 9 - perform the pre-release review and fix what you find

```text
Act as the engineer receiving this project for final review. Read AGENTS.md, the current handoff, decision/progress records and the actual code. Review the running app against AC01-AC64 and DS01-DS24. Fix defects you can verify instead of producing only a report.

Inspect real navigation, conversation endings/resume, authored content/access mapping, durable saves, retention/deletion/export, iOS account isolation/sync, Android local-only behaviour, store entitlements, voice interruption, local-AI fallbacks and all shared-system consumers.

Check release configuration for unexpected network destinations, embedded remote content/fonts, automatic update services, personal-data logs, backups and inappropriate development routes/fixtures. Verify that previews cannot trigger real capture/purchases or access personal Moments. Confirm there is no app account or cloud-AI fallback.

Run appropriate automated checks and both mobile builds, inspect rendered screens and execute the available device/state matrix. Check local processing with airplane-mode and network evidence where possible. Distinguish code inspection, simulation, physical-device observation and missing proof. A passing TypeScript/Jest check is not device, StoreKit, CloudKit or AI evidence.

Give every acceptance item an accurate status and evidence location. Record remaining issues with severity, reproducible steps and the exact missing input. Do not silently downgrade the specification to make the checklist green. Resolve routine implementation issues autonomously and leave only concrete owner/configuration/device/editorial gates.

Deliver a concise review report, the corrected implementation, reproducible run/build instructions and a release checklist. Separate development completeness from release readiness. Owner approval is still required for live pricing, historical entitlement changes, public publication and unresolved product decisions. Do not publish.
```

## Resume prompt - when a session ends before its milestone is complete

```text
Continue the current InnerUs milestone. Read the applicable AGENTS.md, docs/PROGRESS.md, docs/BUILD_PLAN.md, docs/DECISIONS.md and docs/ACCEPTANCE.md, then inspect the actual workspace and relevant handoff sections. Preserve completed work and continue the earliest unfinished requirement in this milestone.

The application is Expo/React Native/TypeScript for iOS and Android. Keep the local-content/privacy boundaries and shared component system. Do not create a second project or restart the build. Complete implementation and verification, fix findings, update the records and report actual results. If one dependency is blocked, progress independent work and identify the precise missing prerequisite.
```

## Visual feedback prompt - for a screen that feels too generic

```text
Review the actual screen against references/approved-watercolor-ui.png, the scene atlas and the handoff's explicit anatomy/design-system requirements. Identify the concrete visual differences, then fix them in the shared tokens/components or the appropriate bundled artwork.

Preserve working behaviour, accessibility and privacy. Keep the adult watercolor palette, serif prompt hierarchy, quiet space and authored scene progression. Make live labels native React Native text. Inspect the updated result on iOS and Android and show the changed screen plus other consumers of any shared style you altered. Record remaining production-asset gaps honestly.
```

## Evidence and guidance

The product rules come from the handoff and the owner's explicit Expo decision. The milestone breakdown and project-record filenames are suggested working conventions, not Codex features that automatically enforce completion.

The concise AGENTS.md approach and goal/context/constraints/completion structure follow current official Codex guidance:

- [Codex project instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex best practices](https://learn.chatgpt.com/guides/best-practices)

Platform facts and limits are sourced in the handoff. Useful starting references:

- [Expo custom native code](https://docs.expo.dev/workflow/customizing/)
- [Expo local development builds](https://docs.expo.dev/guides/local-app-development/)
- [Android on-device summarization](https://developers.google.com/ml-kit/genai/summarization/android)
- [Android on-device speech API](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [Google Play Billing integration](https://developer.android.com/google/play/billing/integrate)

Recheck the current SDK and API documentation during implementation. This prompt pack does not establish that a native integration, device/language combination or store configuration has already passed testing.
