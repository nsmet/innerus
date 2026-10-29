# Prompt 1 visual inspection — web approximation

Captured 22 Oct 2026 from a throwaway scratch copy of this project with `react-native-web` 0.21 / `react-dom` 19.3 added and `expo export --platform web`, rendered in Chromium (Playwright) at 390×844 @2x and 320 px. Nothing web-related was added to the project.

**This is not native iOS/Android evidence.** Fonts, safe areas, tab bar and image scaling can differ on devices. Use it only to compare layout and art crops with `references/approved-watercolor-ui.png`.

- `zoom-thumbnails-before-crop-fix.png` shows the atlas bleed that was fixed (`atlasCrop()` in `src/design/Illustration.tsx`).
- All other images are after the fix: Tonight light/dark, topic preview, Explore (Us today), 320 px, Dutch.
