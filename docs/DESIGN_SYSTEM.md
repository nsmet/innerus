# InnerUs design system — usage guide

Source of requirements: handoff v1.3 sections 41–61 (tokens §54–55, components DS01–DS24 §56–58, art/motion contracts §59, gallery §60, acceptance AC49–AC56 §61). This guide records what exists in code and how to extend it. It does not duplicate the handoff.

## Current story contract — 23 October 2026

DS10 now includes `src/design/StoryArt.tsx`, backed by `src/content/storyArt.ts`: one individual bundled 512×512 painting per question plus a closing for each of the 15 v1.1 topics. At Nick’s explicit follow-up, paintings use the full-width cover slot with page bleed, radial and rectangular feathering, and the existing warm-paper treatment in dark mode. Do not constrain chapter art to a square whose width equals its height. The source frame is cropped to fill the artwork area; text remains separate. Shared 500–550 ms reveal roles move 0–5 dp and end at rest. Reduced Motion uses the exact static scene. Keyed replacement cancels stale animations, and unknown/legacy mappings retain the neutral family fallback.

`src/design/StoryChapter.tsx` now composes DS10/11 for Conversation, Quick and story previews. Its absolute painting extends to the measured top of the eyebrow; a broad vertical mask is transparent at that anchor and progressively reveals pigment upward. Text stays in normal flow. The anchor remeasures when layout changes, such as opening a nudge; art resizing cannot move the text. The chapter paper itself fades into the current canvas, avoiding a hard backing edge.

Chapter mode now uses narrow 2.5% horizontal feathers, a wider 90% radial mask and 2.5% source overscan to trim its unpainted border. The broad vertical fade and measured eyebrow anchor stay independent of that side treatment. Other artwork slots retain their earlier mask.

Screens pass topic/version/position only; no storage, listening or personal-content processing is owned by DS10. Add a topic's editorial data, six image entries and reveal roles without rewriting screen controls. Conversation, Quick, saved closing and the dev-only `StoryGallery` share this implementation. Gallery supports all fifteen topics, navigation, static and fallback previews. See `STORYTELLING.md` for the complete arc table, asset/provenance/export contract and remaining production gates. Earlier baseline tables below are historical, not a statement that the current component system is still Prompt 1 only.

## Where things live

| Layer | File | Notes |
|---|---|---|
| Tokens | `src/design/tokens.ts` | Semantic colors (light/dark), spacing 4–48, geometry, text variants, motion durations. Single source; screens never hard-code colors. |
| Theme | `src/design/ThemeProvider.tsx` | Resolves appearance (system/light/dark) and language (device → in-app choice). In memory until Prompt 4 persists device preferences. |
| Primitives | `src/design/primitives.tsx` | DS01 `ScreenFrame`, DS03 `TextBlock`, DS04 `ActionButton`, DS05 `IconAction`, DS20 `EmptyState`. |
| Navigation | `src/design/Navigation.tsx` | DS02 `AppTabBar`, `BackHeader`. |
| Topic | `src/design/patterns.tsx` | DS08 feature card / compact row, DS11/12 `PromptPreview`, `topicMetadata()`. |
| Artwork | `src/design/Art.tsx` | DS10 initial static slot using temporary atlas crops. |
| Icons | `src/design/Icon.tsx` | Stroke icons at 20/24 dp, always inside a ≥48 dp target with a label on the action. |
| Gallery | `src/dev/GalleryScreen.tsx` | Development builds only (`__DEV__`). Same implementations as the app; fictional fixtures. |

## Naming rules

- Components carry their DS identity in a doc comment (`/** DS04 … */`). One component may implement more than one DS entry while the product is small; split it when a real variant need appears.
- Text uses `TextBlock variant="display|title|prompt|body|control|supporting"`. The prop is `variant`, not `role`, because React Native already defines an ARIA `role` prop.
- Colors are requested by semantic role from `useDesign().palette`. Pigments (lavender, terracotta, sage, butter) belong to artwork only and are not text colors.
- Contrast (token level, `src/design/__tests__/tokens.test.ts`): every text/background pairing in use is ≥4.5:1 in both appearances. Light `secondary` on `selected` is 4.01:1, so never put secondary text on a selected fill; use `text`.
- Components receive content, state and callbacks. They never import storage, AI, purchases, network or navigation (screens do that). AC55.

## Component status (Prompt 1)

| ID | Component | State in code | Gallery |
|---|---|---|---|
| DS01 | Screen frame | Safe area, scroll, compact 16-dp inset under 360 dp width, keyboard-persist taps. Private-background treatment not yet. | indirect (every screen) |
| DS02 | App navigation | Tonight/Explore/Moments tabs, Settings from Tonight, back header. Focus restoration unverified. | no dedicated entry |
| DS03 | Text block | Six variants, platform font scaling (no max scale), header role for display/title. | yes |
| DS04 | Action button | primary/secondary/quiet; pressed, loading (no duplicate press), disabled with reason. Destructive intent not yet. | yes |
| DS05 | Icon action | settings, close, back. Selected/disabled not yet. (Bookmarks removed, D36.) | yes |
| DS06 | Text field / search | Search field lives inline in Explore; not yet a shared component. | no |
| DS07 | Theme filters | Theme selection with text checkmark (not color alone). Duration/intensity filters not yet. | yes |
| DS08 | Topic row / feature card | Feature card and compact row with data-driven metadata. Locked/owned/missing-art not yet. No bookmark control (D36). | yes |
| DS09 | Topic detail header | Uses DS08 card; locked/resume context not yet. | via DS08 |
| DS10 | Illustration scene | Static slots cover/compact/chapter/closing from a **temporary flat atlas**. No layers, props, motion or dark-safe variants. | yes |
| DS11 | Prompt chapter | Chapter label + serif prompt preview. Next/Previous/Skip belong to Prompt 3. | yes |
| DS12 | Nudge disclosure | Collapsed/expanded toggle; does not advance. | yes |
| DS13–DS19, DS21–DS24 | Closing, Moments, editor, recorder, playback, review, status, preference row, confirmation, offer, retention | Not started. | no |
| DS20 | Empty state | Title, detail, one action. | yes |

## Historical Prompt 1 artwork slot contract (superseded for v1.1 stories)

Four slots, defined in `artworkSlots` (`src/design/Art.tsx`): `cover` (aspect 1.35), `compact` (1.0), `chapter` (1.8), `closing` (1.35), each with a vertical focus. `atlasCrop()` scales one square scene to cover the frame and keeps the window inside that scene (tested in `illustration.test.ts`). Each slot is decorative (`accessible={false}`, hidden from screen readers) and sized by layout width so text never sits inside the art. The atlas `assets/art/reference-scene-atlas.png` is a byte-identical copy of `references/watercolor-scene-atlas.png`, cropped by family cell: row 1 café, kitchen, window; row 2 travel, notebook, garden. It is a reference crop, labeled temporary; production layered assets are a Prompt 3/8 deliverable (AC47).

## Adding a topic

Current S01–S15 editorial direction: `artwork/storyboards/editorial-v2/` / `STORY_IMAGERY_V2.md`, replacing the owner-rejected v1 pack below. Each exact question has its own visible action/idea and independent brief; medium, paper and pencil unify varied settings, scales and fictional people. Reframing a repeated decorative prop is insufficient. The 90 552×368 sRGB frames and question-map are editorial assets, not DS10 runtime inputs. Preserve StoryChapter's measured fade, text separation, decorative accessibility and static Reduced Motion contract during deliberate integration; native crop/dark/large-text review remains open.

New S01–S15 draft imagery (23 Oct) is prepared in `artwork/storyboards/editorial-v1/`, documented by `STORY_IMAGERY.md`. The 90 570×380 landscape frames have reviewed source crops and the existing finite reveal roles as integration suggestions. They are not yet inputs to shared DS10 or the production gallery. When integrating, retain StoryChapter's measured eyebrow fade, narrow side feather, decorative accessibility treatment and static Reduced Motion behavior. Real text stays outside the image. Source/contact-sheet checks do not replace native crop review.

For new editorial drafts, see `STORY_LIBRARY_DRAFT.md`: short, ordinary adult language, one main ask per question, concrete subjects, optional nudges and an optional ending. The 23 Oct proposal's main questions are 8–16 words; that is a drafting aid, not a UI truncation limit or a verified reading grade. Keep expectations on the topic preview and keep skip/stop available. Draft labels S01–S15 are not runtime mappings; English proposals do not replace the bilingual gallery fixtures or prove native large-text fit.

Add editorial data to `src/content/catalogue.ts` (stable `id`, `version`, five prompts with stable prompt IDs `<topic>-0n`, `sceneState` prefixed by the art family, `quickEligible` from the handoff). No screen changes are needed; the Jest catalogue tests enforce the structure.

## Reviewing a system change

1. Change the token or component once.
2. Run `npm run check` and open the gallery (`npm run start:gallery`, or long-press the InnerUs wordmark on Tonight in a development build).
3. Check Tonight, the topic preview and Moments in light/dark, English/Dutch and large text.
4. Record the change below and migrate all consumers in the same change.

## Change history

- 2026-10-23 — Paper grain removed (owner decision): on device the repeated tile rendered as a visible square in the top-left rather than a texture. Screens are plain canvas colour. `PaperGrain` and `assets/art/paper-grain.png` are gone (the file sits in `_to_delete/`).
- 2026-10-23 — DS10 chapter transition (owner feedback: the image fade between questions felt harsh). The previous painting now stays underneath while the next one blooms over it: nine feathered pigment blots (deterministic per frame id) spread across the paper, then a final wash completes it, 1.5 s (`motion.bloom`), ease-in-out. The authored drift gesture plays over the same time. The old layer fades out over the second half of the bloom, driven by the same value (its feathered edges otherwise showed through the new painting and vanished in one frame at the end), and is unmounted once fully transparent; at most two paintings are mounted. Reduced Motion: static, no layering. The bloom animates SVG mask geometry, so it runs on the JS driver.
- 2026-10-23 — DS11 conversation actions (owner feedback: the Previous/Skip/Keep row read as a tab bar). `Toolbar` replaced by `PromptPager`: quiet "‹ Previous" and "Skip ›" links either side of five progress dots (current = terracotta pill), placed above the primary button; "Keep a moment" moves under it as a quiet link, as on Quick. No divider, no stacked icon-over-label buttons. Previous absent on prompt 1 (its slot stays so the dots never shift).
- 2026-10-22 — Visual match to the approved design canvas (Foundations, Tonight, Explore, Moments, Topic, Quick, Settings boards), compared screen by screen against web renders of the same code:
  - Paper grain: `assets/art/paper-grain.png` regenerated from the design's own filter (feTurbulence fractalNoise, baseFrequency .85, 2 octaves, ink at 7.5 % alpha, 256 px stitched tile). The previous tile was about five times stronger and read as speckle, not paper.
  - DS10 `FeatheredArt`: the radial mask now reproduces `ellipse 74% 80%, #000 56% → transparent` with user-space units and a vertically scaled group. The old `rx`/`ry` percentages collapsed to an inscribed oval on some renderers, which cut the painting into a lozenge. New `width` prop for centred vignettes (Explore empty 220×180, Moments empty 260×220).
  - The one shadow (`shadow()` in tokens) is the design's exact `0 1px 2px` ink/6 % + `0 14px 34px -16px` ink/28 % via `boxShadow` (new architecture, iOS/Android/web); it sits under the object instead of haloing it.
  - `ArtTile` no longer floats by default; `lifted` is used only for Tonight's theme entrances. Catalogue crops are 76 pt, Moment thumbs 56×72.
  - DS08 topic row, DS14 Moment row, DS21 preference rows (74 pt, 14 pt icon gap, 15 pt value + chevron, group eyebrows 22 pt above / indented 4 pt) and the Tonight resume card follow the design measurements.
  - Tonight privacy note: one paragraph with the inline "How this works" link; iOS names the optional private iCloud sync (spec §11).
  - Kept deliberately: conversation/Quick prompts stay regular weight. The bold in the screen mockups is the browser default for `<h1>`; Foundations defines Prompt as regular 32/40 (Quick 34/42).
- 2026-10-22 — Prompt 1 continuation (visual pass): fixed atlas crop bleed (fixed offsets pushed square thumbnails into the neighbouring scene and bottom-row scenes past the image); Tonight greeting centred and theme labels regular weight, matching the reference.
- 2026-10-22 — Prompt 1 continuation: `TextBlock` prop renamed `role` → `variant` (TypeScript clash with React Native `role`); DS08 metadata now derived from topic data (duration · intensity · access) with clock icon; feature card action defaults to "Start this conversation"; gallery entry moved from the removed `expo-dev-menu` hook to `start:gallery` / development-only long press.
- 2026-10-22 — Prompt 1 baseline: initial tokens from handoff §54–55 and primitives listed above.

## Typewriter question reveal (23 Oct 2026, Nick's request)

`src/design/Typewriter.tsx` strikes conversation questions, the closing line and the Quick question onto the page character by character. Timing lives in `typewriter` in `tokens.ts` (uneven ~34 ms strokes, breaths after spaces/commas/full stops, 260 ms lead after the chapter fade). The full text is laid out from frame one (untyped characters transparent), so height and line breaks never move. The newest four characters land in `accent` ink and settle into `text`. Tap the question to reveal it at once. Reduced Motion shows it immediately; screen readers always get the full text via `accessibilityLabel`. Pure JS, no new dependencies.
