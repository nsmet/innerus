# Story refinement evidence — 23 October 2026

Environment: Nick's Mac, Node 22.22.0. Native review: iPhone 16 Pro Simulator, iOS 18.0, already-installed InnerUs development app served by the existing Metro session in Xcode Device Hub. This session did not rebuild native code or publish anything. No real notes/recordings entered the review.

- `check.log`: final `npm run check`, TypeScript clean, 49 static checks, 3 Jest suites / 16 tests passing. Coverage includes all 15 bilingual arcs, access and Quick counts, 90 frame mappings, old v1.0 wording, cancellation of replaced animations and live Reduced Motion.
- `ios-export.log`: `npm run export:ios` with final source, JS/asset export only. This is not a native build or offline-device test.
- `A01-01-en-light.png` through `A01-05-en-light.png`, plus `A01-closing-en-light.png`: native visual review of five distinct paintings/questions and the gathered closing. The fourth screenshot includes the expanded nudge; it preserved the question and scene. Prompt 5 offered Take this with us; closing exposed Finish independently of Keep a moment.
- Native Previous from closing returned to the goodbye prompt; continued backward navigation returned to the opening with the correct scenes. A development reload preserved the active session and Tonight offered Continue. The app was left at the first prompt for Nick's review; no test Moment or completion was saved.
- The Expo tools button overlaps some text in screenshots; it is development-only. It was left enabled rather than changing the developer's settings.
- Native review caught centered atlas crop contamination; all 90 exports were corrected using direct pixel extraction. Final static JPEG-header checks enforce 512×512 dimensions. The final scenes use full-image containment and feathered paper edges.

Not established here: Android/native rebuilds, physical-device behavior, all-topic dark/large-text/screen-reader/motion matrix, native old-version update/capture flows, independent transparent prop animation, owner artwork approval or native Dutch editorial review. Corresponding acceptance rows remain implemented-unverified. No platform privacy/AI/store/sync capability is promoted by this UI work.
