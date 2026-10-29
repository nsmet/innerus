# Authored story direction — 23 October 2026

Nick asked for each conversation to build as a continuous story, with an individual image and motion for each question, preserving the app's design and watercolor identity. This explicit direction takes precedence over the starter library's verbatim wording and the earlier milestone order for this change. Five prompts and a closing, all bundled and authored, remain the product format.

## Editorial direction

`src/content/storytelling.ts` contains the new English/Dutch v1.1 revision for all fifteen launch topics. Each stays with one subject or scene and follows it forward. Questions can still be skipped; no bridge claims someone answered, agreed or felt a particular emotion. Nudges help recall details without requiring perfect memory. The first-home prerequisite remains visible. IDs, 3 free / 12 collection access, and seven Quick-eligible positions remain unchanged.

| Topic | Continuous arc |
|---|---|
| A01 · Our first date | Anticipation → getting ready → first glimpse → a moment during the date → goodbye |
| A02 · A place we would go back to | Choose a place → arrive → relive a moment → another perspective → come home |
| A03 · Our first home | Open the door → make it ours → ordinary routine → favourite corner → what comes with us |
| A04 · A trip we still talk about | Set off → unexpected turn → pause → hidden highlight → journey home |
| A05 · Our little rituals | Find a ritual → first time → familiarity → what we would miss → its place now |
| B01 · An ordinary Tuesday | Recall a day → small moment together → helpful gesture → tiring part → easier tomorrow |
| B02 · Unwinding | Day ends → first exhale → quiet or company → different rhythms → easier evening |
| B03 · Appreciation | Small gesture → enter the scene → why it matters → how we each notice → carry it on |
| B04 · Laughter | Recall a laugh → just before it → why it was ours → room to play → another opening |
| B05 · Time for us | Recall connection → attention → interruptions → time we miss → a small opening |
| C01 · Our Saturday | Free morning → day opens → detour → last light → one piece for real |
| C02 · A postponed dream | One wish → a scene inside it → sharing it → hesitation → comfortable first step |
| C03 · More of this | One good moment → its detail → two views → make room → enjoy it once more |
| C04 · Something new | Curiosity → imagine trying → beginners → version for both → simplest first try |
| C05 · Home feeling | Picture feeling at home → existing detail → more welcome → different comforts → small change |

Original v1.0 content is retained in `catalogue.ts`. `getTopic(id, savedVersion)` resolves an existing session exactly, including its original family-art fallback. An unknown content version is never silently substituted. Typed saves, draft resolution and recorded review retain the source version; pre-revision recording drafts without a version resolve to v1.0. Previously saved question snapshots are untouched.

## Visual direction and delivery

Each topic has six original watercolor compositions: five individual question illustrations and a gathered closing. Recurring fictional objects link adjacent scenes; palettes, paper and light stay coherent. These are illustrative invitations, never reconstructions generated from recordings or notes.

- Runtime frames: `assets/art/stories/<topic>-01.jpg` through `-06.jpg`, 90 individual 512×512 sRGB JPEGs, 9.48 MiB total.
- Preserved 1536×1024 PNG storyboard masters: `artwork/storyboards/v2/`, one six-cell sheet per topic. Masters are not imported into the app bundle.
- Exact generation prompt set, per-story subjects, source dimensions/identity and review status: `artwork/storyboards/v2/manifest.json`. Generated with the built-in image_gen tool; no personal content supplied.
- Reproducible exports: `node scripts/export-story-art.cjs` on macOS using the lockfile's pngjs and Apple's sips for JPEG encoding. Cells are extracted directly by pixel coordinates; sips centered cropping is not used. Static checks reject missing exports or accidental full-size atlases.
- `src/content/storyArt.ts` maps each authored `sceneState` to a bundled image and a deliberate reveal role. No screen has positional crop logic for the revised content.
- `src/design/StoryArt.tsx` composes DS10 with a finite 500–550 ms pigment fade and a small authored 0–5 dp movement. Arrive / unfold / glow / gather / settle / rise / open share motion tokens and end at rest. There are no loops, timers or answer-driven visuals.
- At Nick’s follow-up request, the individual paintings fill the full-width chapter area with page bleed and cover cropping. Radial and horizontal/vertical feather masks dissolve the edges into the page; fixed square containment is not used. The shared StoryChapter layout extends the question painting to the measured top of the eyebrow, with a broad lower fade that becomes fully transparent there and reveals the image progressively upward. The same anchor adapts when a nudge expands; the text stays in normal flow. At Nick’s next refinement, side feathers narrowed to 2.5%, the radial mask widened to 90%, and 2.5% source overscan trims paper margins for an almost full-width painting. The vertical fade remains unchanged. Dark appearance retains its deliberate warm-paper ground. Art stays decorative and outside text/actions.
- Reduced Motion displays the mapped static painting, including when the preference changes while a scene is open. Keyed scene replacement stops the old animation. Next/Previous/Skip and capture controls never wait for art.
- Conversation, Quick and the saved closing use the same scene contract. Main discovery screens retain their existing approved covers/layout.
- The development gallery includes all fifteen stories, previous/next scenes, static preview, bilingual content and family fallback without creating sessions or reading personal Moments.

These deliverable images are flat authored frames. Independent transparent prop layers, a device/accessibility matrix, dark/native review across every topic, native-language editorial review and Nick's approval remain production-art/release gates. This change does not close AC47 or declare every story a finished approved masterpiece.

## Evidence

`docs/evidence/storytelling/20261023/` contains the command logs and native screenshots. The iPhone 16 Pro / iOS 18.0 Simulator used an already installed development build and the running Metro server; no new native build or release was produced. JavaScript checks do not prove device storage, cloud, AI or store behavior. Android remains deferred by the owner.
