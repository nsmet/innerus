# Eyebrow-anchored watercolor fade — 23 October 2026

Nick requested a fade beginning at the top of the eyebrow and moving upward, because the short full-width crop looked cut off at the bottom.

Implementation: shared `StoryChapter` measures the eyebrow’s position and extends an absolute `StoryArt` backdrop to that boundary. The lower opacity ramp begins above the label and reaches zero at its top; native text/actions remain in normal flow. The art’s warm paper fades too. Conversation, Quick and the development gallery use this layout; content, state persistence and motion rules are unchanged.

Native evidence: existing InnerUs development app, Metro, iPhone 16 Pro Simulator / iOS 18.0 in Device Hub. `A01-03-eyebrow-fade.png` shows the first-glimpse painting fading into the label; `A01-03-nudge-eyebrow-fade.png` shows the anchor following the label after the nudge expands. No new native build, saved Moment or completion.

`check.log`: Node 22.22.0, TypeScript clean, 49 static checks, 3 Jest suites / 16 tests passing. No tests were added for this visual change. Broader dark/large-text/Android and artwork-production reviews remain unverified; no acceptance row was promoted.
