# Full-width story artwork — 23 October 2026

Owner request: restore full-width question artwork and watercolor fading effects.

Change: `src/design/StoryArt.tsx` now delegates to the existing full-width `SceneArt` cover frame without a fixed width or contain fitting. The radial and horizontal/vertical edge masks remain. No assets, question content, motion or service behavior changed.

Evidence: `A01-03-full-width.png` captured from the existing iPhone 16 Pro / iOS 18.0 development app, served by Metro in Xcode Device Hub. Shows the wide first-glimpse painting with its soft paper-edge fade. No new native build was produced. `check.log`: TypeScript + 49 static checks + 3 Jest suites / 16 tests pass with Node 22.22.0. Broader appearance/accessibility/crop review and Android remain unverified.
