# Content releases

Owner decision 23 Oct 2026 (D35). New conversations arrive over time in small packs, so couples have a reason to come back without being rushed through everything at once.

## Rule

A pack is available on this device when

    today >= max(pack.releaseDate, journeyStart + pack.weekOffset × 7 days)

- Days are **local calendar days** (`YYYY-MM-DD`), so a pack arrives in the morning, not at an odd hour.
- `releaseDate`: nobody gets a pack before it is published, whatever their start date.
- `journeyStart`: the first launch of v2 on this device, also for people upgrading from v1. Stored as the `releases.start` preference.
- Pack conversations are **free for everyone** and are not part of the paid collection. The launch offer stays 3 free + 12 in the collection (`topics`).
- Everything is bundled. There is no server, remote flag or download (AGENTS.md constraints). One app update can carry several future packs, and each appears on its date.
- Released conversations stay released. `releases.*` preferences survive "Delete all private content", just like `access.*`.

## Where it lives

| Piece | File |
|---|---|
| Pack topics + schedule (edit this to release) | `src/content/packs.ts` |
| Pure rule (`packStates`, day maths) | `src/content/releases.ts` |
| Hook for screens (`catalogue`, `arrival`, `newTopicIds`, `markSeen`) | `src/state/useReleases.ts` |
| Preferences `releases.start`, `releases.seen`, dev keys | `src/state/AppStore.tsx` |
| Dev panel | `src/dev/ReleasesScreen.tsx` |

## What couples see

- **Tonight:** a newly released conversation takes the featured spot for up to 7 days or until it is opened. Its eyebrow reads "Just arrived" / "Net binnen". There is no extra card, badge or count.
- **Explore:** released conversations sit in their theme with a quiet terracotta "New" / "Nieuw" mark until opened. While more packs are scheduled for this couple, the unfiltered list ends with "New conversations arrive from time to time." It shows no dates or countdown (spec: no countdowns or scores).
- **Topic detail:** opening a conversation marks it as seen.
- **Upcoming packs** are never shown as locked items.
- **Notifications:** none added. The existing weekly reminder stays neutral and never names a topic (spec 36).

## Adding a pack

1. Add the conversation to `packTopics` (stable new ID, `access: 'free'`, EN + NL, `quickEligible: false` unless reviewed).
2. Add a `packs` entry with `releaseDate` and `weekOffset`.
3. Optional art: without `storyFrames`, the conversation uses its art family's scene.
4. Ship the app update before the earliest `releaseDate`.

## Development mode

Dev builds only. Open it with `npm run start:releases`, or Tonight wordmark long-press → Gallery → "Releases →". From there you can:

- move the journey start (±1 day or week, or back to today);
- simulate "today" (±1 day or week, jump to a pack's unlock day, or go back to the real date);
- release a pack by hand, or undo that;
- mark every pack unseen, or reset all release settings.

Release builds ignore `releases.devToday` and `releases.devForced`. The screen is `__DEV__`-required like the gallery.

## Current schedule

| Pack | Conversation | releaseDate | weekOffset |
|---|---|---|---|
| P01 | C06 Our next chapter | 2026-11-02 | 1 |
| P02 | A06 A season we got through | 2026-11-09 | 2 |
| P03 | B06 What money means to us | 2026-11-16 | 3 |

The dates are placeholders. These three are the handoff's backlog drafts (§92/§98/§104), still in the original v1.0 voice and still awaiting the editorial review the handoff asks for (see RELEASE_GATES). Move the dates if review is not done in time.
