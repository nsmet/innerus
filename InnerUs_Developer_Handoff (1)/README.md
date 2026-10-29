# InnerUs developer handoff

Version 1.3 - 22 October 2026 - Expo, iOS and Android.

The owner requires one Expo / React Native / TypeScript app for iOS and Android. Earlier native iPhone-only direction is superseded. Development builds may use small native platform adapters for CloudKit, local AI, audio and store services.

Start with InnerUs_Codex_Prompts.md for the launcher and milestone prompts. Read InnerUs_Developer_Specification.md as the product source; the PDF presents the same product requirements visually. DS01-DS24 and AC01-AC64 define the shared design system and acceptance requirements.

Stories, translations, artwork and fonts ship inside the app. Personal data is stored and processed locally. No InnerUs backend, remote catalogue, asset CDN, runtime update service or cloud AI. Optional private iCloud sync is iOS-only. Android starts local-only with deliberate export. No cross-platform data sync or purchase transfer is promised.

The component gallery uses the same React Native implementations as the app and runs locally with fictional fixtures. Platform AI support is conditional: unsupported devices/languages retain recording and manual notes. Android Dutch summaries are not assumed supported.

The references folder contains the approved watercolor UI and companion atlas. They are visual references, not production animation layers. The specification includes 18 bilingual conversation drafts: 15 launch topics (3 free, 12 paid) and 3 excluded backlog drafts. Editorial/language review, couple testing and actual layered artwork remain release work.

Inspect existing code and historical entitlements if available. When starting from this handoff alone, record the missing legacy audit and configuration as release gates; do not invent a completed migration. Begin with the Expo baseline, capability probes and complete first-date slice.

This package contains no implementation code. Prompt instructions tell the developer to create and verify the application; the handoff does not claim any device, store, cloud or local-AI tests have already passed.
