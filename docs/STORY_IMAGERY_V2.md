# Question-specific imagery — revision 2

23 October 2026 · S01–S15 English story proposal · Source questions: `STORY_LIBRARY_DRAFT.md`.

Nick rejected the first editorial artwork pack as generic and repetitive: too many cups, cutlery and variations on the same interiors. His direction is that each question needs its own recognizable visual, while the painting style stays consistent. This supersedes the previous emphasis on recurring still-life props.

## Art direction

Begin with the exact question and a visible recognition cue: getting ready, first seeing someone, an unexpected obstacle, asking for space, a learned money rule, the awkwardness of a first try. Give every question an independently written scene, action and composition. A tighter crop, different lamp or rearranged prop alone does not make a question-specific image.

Keep the medium consistent: adult editorial watercolor, transparent layered pigment, expressive pencil contours, tactile ivory paper and irregular dissolving edges. Vary light, color, scale, place and people with the subject. A railway platform, a wardrobe, a child's viewpoint, a thermostat, a kayak and a music-shop window can belong to the same visual language without looking like the same scene.

Fictional adults, natural hands and readable gestures are deliberately used when the question concerns human action. This is an editorial choice under the handoff's default preference to avoid people, not a depiction of an actual couple or their answers. Use ordinary appearances, ages and varied couples. These images show possible situations; they do not assert what the user remembers, wants or should feel. The source questions remain unchanged.

Do not use cups, mugs, cutlery, plates, kettles, flower vases, romantic symbols or decorative room scenes as fallback subjects. Do not make every setting a café or a warm European interior. No lettering, questions, UI, logos or private content inside the paintings. Natural gestures must read clearly; a request for space should look respected, without intimidation or forced affection.

## Recognition intent by story

| Story | Question-specific progression |
|---|---|
| S01 · Before we said hello | Pause before leaving → choosing a shirt → seeing the date arrive → a shared map mishap → tram-stop goodbye → a small park detail kept |
| S02 · That is so us | Shared laughter → the setup → the ridiculous detail → a private knowing gesture → retelling to someone else → a visual name for the joke |
| S03 · The trip that went sideways | Planned route → blocked footbridge → choosing a detour → reflecting afterward → telling the muddy-boot detail → a route line kept |
| S04 · Our little habit | Practiced greeting → its awkward first beginning → looking forward to it → comfort it offers → adapting it across distance → the gesture remembered |
| S05 · What came with you | Childhood house rule → ordinary action → child's-eye feeling → the adult habit → choosing what to change → childhood and adulthood together |
| S06 · When the day is done | Closing the laptop → taking shoes off → welcome company → signaling a need for quiet → practical help → a gentle check-in |
| S07 · I notice that | A small repair → a specific moment noticed → relief it brought → saying why it mattered → being acknowledged → evidence of a small caring act |
| S08 · Close, in your own way | Light chosen contact → a welcome hug → asking for space → an offered hand waiting → choosing to link arms → resting separately together |
| S09 · The small thing we get stuck on | Thermostat clash → feeling cold → the other bodily experience → asking to pause → possible practical options → leaving the difference open |
| S10 · One small money choice | Considering a book purchase → caring for a valued item → childhood saving habit → what to keep today → equal conversation → an ordinary choice held lightly |
| S11 · A Saturday just for us | Slow start in bed → local cycling → a silly sock puppet → film at home → one short park visit → a playful detail kept |
| S12 · Our first try | Considering a kayak → the first launch → a harmless beginner splash → help offered → a tiny practice loop → the option still available |
| S13 · A dream with no due date | Wishing at a music-shop window → playing in ordinary life → the feeling it adds → listening support → one first lesson → the wish can wait |
| S14 · Time to be me | Solo jog → breathing space → competing demands → explaining the need → a short local walk → a trace of personal time |
| S15 · A change we can see coming | Old and new work routines → a future commute → shared time worth keeping → an unfamiliar door → practical support → a small act of being there |

## Files and review

The versioned pack is `artwork/storyboards/editorial-v2/`. The manifest contains 90 exact question/closing contexts, visual briefs and recognition cues. Every generated master has a sibling `.source.json` with its exact built-in image_gen prompt and source path. Targeted edits have their own provenance records; original sources remain available.

After generation and inspection, run `node scripts/export-editorial-art.cjs artwork/storyboards/editorial-v2`. Reviewed paper-gap coordinates and per-frame focal crops are required before extraction. The exporter records exact editorial mappings, source crops, hashes, sRGB metadata and image sizes, and makes a local review file, four contact sheets, an overview and `question-map.md` pairing all 90 images with their questions.

The first pack remains preserved as `editorial-v1`, with the owner's rejection recorded. New artwork is not silently mapped onto production A01–C05 IDs, saved sessions, commercial access or Quick eligibility. These remain flat image frames; independent prop layers and native light/dark/accessibility review are separate requirements. No acceptance status follows from an art-generation or static check result.

## Current review status

All 15 source sheets and 90 final frames are complete: 75 question images and 15 closings. Agent visual review covered every source and crop through direct images and contact sheets. Three targeted edits tightened the meaning: S08's request for space is respected at equal eye level; S04's comfort scene uses the actual familiar greeting; S13 ends with a closed case beside an open door, leaving the wish available.

The 90 distinct exports are 552×368 sRGB JPEGs, 7,050,720 bytes / 6.72 MiB in total, with no upscaling. Static verification passed for exact question/closing mappings, 90 unique image hashes and visual briefs, 15 prompt/source records, three edit records, source/crop hashes, profiles, dimensions, local review image paths, question-map coverage and review-script syntax. Evidence: `docs/evidence/story-imagery-v2/20261023/export.txt` and `review.txt`.

The previous browser file-URL policy rejection was respected; direct image review and static checks were used without a browser workaround. Live browser interactions were not verified. Owner recognition testing and approval remain open, as do runtime integration, Dutch review, independent layers and native crop/dark/accessibility review. No app tests, mobile builds, platform capability claims or acceptance promotion follow from this asset work.
