# Imagery for the 15 new story drafts

23 October 2026 · Editorial imagery v1 · Source questions: `STORY_LIBRARY_DRAFT.md` (English draft 0.1).

**Superseded after owner rejection:** Nick found this pack generic and repetitive, especially its cups, cutlery and similar interiors. Use [question-specific imagery, revision 2](STORY_IMAGERY_V2.md) for the current proposal. The description below records the earlier approach; sources are retained for history, not approval.

Nick asked to optimize imagery for the newly authored stories. This pack gives each story five question-specific watercolor scenes and a quiet closing. It is a separate, versioned asset pack for the S01–S15 editorial proposals, not a silent remapping of the A01–C05 runtime catalogue.

## The visual approach

Each story has a small set of recurring objects. Changes in framing, light, arrangement and setting follow the question arc. A wide scene establishes the setting; closer details give later questions their own focus. The ending gathers a few familiar objects or lets the room rest. No scene asserts that the couple answered, agreed, reconciled or made a promise.

Keep the approved adult watercolor language: translucent sage, terracotta and lavender pigment, warm plum shadows, butter-yellow light, tactile ivory paper and irregular feathered edges. Settings stay empty of people. These are fictional visual invitations, not depictions of a user's memories or a correct way their life should look. Titles, questions, nudges and buttons remain real selectable text outside the paintings.

The new 3:2 landscape frames fit a wide chapter slot with less vertical cropping than a square source. Important objects sit within the central 80% of width and upper-middle 70% of height, allowing the existing broad lower fade and narrow side feathers to work. These are composition targets reviewed visually, not pixel segmentation guarantees. Keep the existing measured eyebrow fade when integrating; do not hard-code a new image/text offset.

## Story identities

| Draft | Recurring objects / setting | Visual progression |
|---|---|---|
| S01 · Before we said hello | Lavender scarf, green café door, rust/green cups, daisies | Waiting café → getting ready → open doorway → table detail → dusk goodbye → gathered memory |
| S02 · That is so us | Wooden stacking blocks, clementine, shallow bowl | Silly tower → before the mishap → toppled blocks → fruit on a little throne → retelling → resting pieces |
| S03 · The trip that went sideways | Sage umbrella, day bag, unlettered map | Leaving → rain → sheltered pause → clearing park → story at home → gathered keepsakes |
| S04 · Our little habit | Sage kettle, two mugs, lavender-striped cloth | Familiar corner → early beginning → shared tray → worn detail → today's arrangement → resting ritual |
| S05 · What came with you | Worn enamel bowl, wooden spoon, checked cloth | Old shelf → ordinary meal scene → familiar texture → present-day kitchen → keep or change → quiet still life |
| S06 · When the day is done | Canvas bag, chair, folded throw, side lamp | Put things down → first need → quiet or company → small signal → practical help → resting evening |
| S07 · I notice that | Peeled orange, sage plate, water glass | Small gesture → one moment → careful detail → after the moment → two ways of caring → a detail kept |
| S08 · Close, in your own way | Warm sitting nook, different cushions, folded throw | Welcome comfort → when it fits → personal space → room to ask → limits → closeness and space together |
| S09 · The small thing we get stuck on | Kitchen table, different place settings, salt pot | Small snag → one view → another view → room to pause → possible small change → differences at rest |
| S10 · One small money choice | Cloth purse, grocery bag, worn tin, pear | Everyday choice → meaning → learned habit → what still fits → equal conversation → grounded ending |
| S11 · A Saturday just for us | Open window, picnic cloth, simple kite | Slow breakfast → local park → silly detour → dusk → one easy piece → gathered imagined day |
| S12 · Our first try | Clay, simple tools, two uneven little pots | Curiosity → first minutes → wonky result → welcome help → a small attempt → enjoying being beginners |
| S13 · A dream with no due date | Personal sketchbook, worn paint box, one brush | Waiting wish → a day inside it → pleasure and freedom → company available → optional step → open possibility |
| S14 · Time to be me | Reading chair, unlettered book, headphones | Something of one's own → its feeling → ordinary demands → room to ask → a pocket of time → warm personal space |
| S15 · A change we can see coming | Open box, canvas bag, potted rosemary | Coming change → imagined day → familiar thing kept → uncertainty → practical support → unfinished but resting |

## Delivery and reproduction

- Source sheets: `artwork/storyboards/editorial-v1/masters/S01.png` through `S15.png`. Each is a 1254×1254 two-column, three-row atlas. Row-major order is question 1 through question 5, then closing. An unselected original S01 sheet is retained separately; a targeted built-in edit removed its tiny background pedestrians.
- Frame exports: `artwork/storyboards/editorial-v1/frames/S01-01.jpg` through `S15-06.jpg`. All 90 are 570×380 landscape JPEGs, 7.80 MiB total. Export directly from source pixels with no upscaling, sRGB conversion and JPEG quality 74. Reviewed paper-gap cuts and per-frame crop rectangles prevent neighboring panels leaking into the exports. A focal override keeps the clementine at the top of S02's playful tower fully visible. Exact dimensions, byte counts and hashes are recorded in the manifest.
- Exact generation prompts, motif, scene descriptions, source provenance, chapter/question/nudge/closing mapping and frame SHA-256: `artwork/storyboards/editorial-v1/manifest.json`. Generated with built-in image_gen. No notes, recordings, personal data or external image service supplied the content.
- Local review: `artwork/storyboards/editorial-v1/review.html`. Select any of the six scenes for every story and compare the real question to its painting; includes a dark canvas toggle and optional nudges. Images and all page resources stay local. The review page does not access app sessions, purchases, storage or Moments.
- Static contact sheets: `artwork/storyboards/editorial-v1/previews/S01-S04.jpg`, `S05-S08.jpg`, `S09-S12.jpg` and `S13-S15.jpg`. Each row is one story; columns are questions 1–5 then closing. `overview.jpg` shows six representative scenes.
- Re-export on macOS: `node scripts/export-editorial-art.cjs` using the existing lockfile's pngjs and macOS sips. The exporter checks exact editorial identity, five prompts/closing, square 2×3 master geometry and 90 frame mappings. Export evidence: `docs/evidence/story-imagery/20261023/export.txt`.

## Motion and runtime use

The manifest includes the existing finite reveal roles as integration suggestions. Reveal from a still source, let it settle, cancel superseded transitions and show the exact static composition for Reduced Motion. Never wait for artwork before allowing Next, Previous, Skip, capture or Finish. Do not imply that an illustration moved because of an answer.

These are optimized flat scene frames. They do not satisfy independently separated prop layers. No runtime content, shared component, purchase mapping, Quick eligibility or saved session version changes in this imagery task. Before integrating new topics, preserve the existing exact-version session behavior, review Dutch, assign suitable identities/access and review all native crops in light/dark and large text. The original runtime artwork remains available.

## Review scope

Inspect all 15 source sheets for six distinct scenes in the right order, coherent recurring props, stray text or people, framing and tone. Inspect selected individual exports for seams, compression, size and color. Treat a dark canvas review as source-art review only; it does not establish the native mask treatment or contrast of app text. Owner approval, native/device accessibility and independent-layer evidence remain open; no acceptance row is promoted by this pack.

Completed static review: all 15 generated source sheets and all 90 corrected crops via the four contact sheets, plus individual JPEG samples and a quality comparison on the detailed rain scene. The initial equal-grid extraction exposed thin neighboring-panel strips; measured paper-gap cuts fixed them. Final crop/compression is about 22% smaller than the initial 627×418 / JPEG-80 export (10.02 MiB), with no upscaling. This comparison includes both crop size and JPEG quality changes.

The in-app browser rejected local-file navigation under its URL policy. No browser workaround was attempted. The HTML's script syntax and local image paths were checked directly; live browser behavior, including the canvas toggle, remains unverified. The image files were reviewed directly instead. No mobile build was run for this asset-only change.
