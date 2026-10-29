# InnerUs 2.0 — release runbook (iOS)

Written 24 October 2026. This is the step-by-step path from this folder to InnerUs 2.0 live in the App Store, as an update of the existing app (`com.nicksmet.innerus`). Steps marked **[Nick]** need your Apple accounts, your Mac or a real iPhone. Everything else is already done in the code.

Store assets and listing text: `store/` (screenshots, icons, `store/metadata/`) and the "App Store" page of the **InnerUs – App Design** canvas. Privacy and support pages: `store/web/`. Legacy findings: `docs/LEGACY_AUDIT.md`.

---

## 0. Decisions to make first [Nick]

| # | Decision | Default if you don't choose |
|---|---|---|
| 1 | Support email address | **Done (26 Oct): info@innerus.app** — make sure the mailbox exists |
| 2 | Hosting of `store/web/privacy.html` and `support.html` | **Done (26 Oct): your domain** — publish them as https://innerus.app/privacy.html and https://innerus.app/support.html (the app links to exactly these) |
| 3 | v1 notes: offer copies by email, or let them go | **Copies on request** — GDPR gives people that right anyway; the pages and What's New now say so |
| 4 | Date to delete v1 Firebase account data | Written as a criterion (deleted once v1 is retired on iPhone and Android); add a date to the privacy page if you prefer one |
| 5 | Which 15 conversations ship: the current v1.1 runtime library, or (some of) the S01–S15 proposal with the editorial-v2 paintings | Ship the current v1.1 library; S01–S15 needs Dutch and reader review first |
| 6 | Sign-off of C06/A06/B06 text (free and available from the first launch, D46) | — required (A06 "a season we got through" and B06 money are the handoff's sensitive-topic drafts) |
| 7 | Final approval of store text EN/NL, screenshots and the new logo | — required |
| 8 | v1 subscribers | **Done (26 Oct, D48): they keep the collection for good** |

All store placeholders are filled; `npm run check:project` fails if one comes back.

## 1. Apple Developer portal [Nick]

1. Certificates, Identifiers & Profiles → Identifiers → `com.nicksmet.innerus`:
   - enable **iCloud** (CloudKit) and assign a container **`iCloud.com.nicksmet.innerus`** (create it if it doesn't exist);
   - In-App Purchase stays on. Sign in with Apple may stay enabled; v2 just doesn't use it.
   - EAS usually syncs capabilities during `eas build`. Checking by hand avoids a failed first build.
2. `eas credentials -p ios` → check that the distribution certificate and provisioning profile for `com.nicksmet.innerus` are valid (they are the v1 ones, same EAS project).

## 2. App Store Connect — products [Nick]

Create two **non-consumable** in-app purchases (Features → In-App Purchases). The IDs must match `src/platform/store.ts` exactly:

| Reference name | Product ID | Price | Display name / description |
|---|---|---|---|
| InnerUs Collection | `com.nicksmet.innerus.collection` | €9.99 (base storefront Belgium; let Apple derive the others) | from `store/metadata/listing.json` (EN + NL) |
| InnerUs 7-day free trial | `com.nicksmet.innerus.trial7` | Free (tier 0) | from `store/metadata/listing.json`; name must make clear it's a free trial (guideline 3.1.1) |

For each: add a review screenshot (the paywall screen works), add EN + NL localizations, and leave them "Ready to Submit". **The first in-app purchases must be submitted together with the app version** (step 6), so don't submit them separately.

The v1 subscription(s): **don't touch them yet.** On release day (step 8) you take them off sale.

## 3. CloudKit production schema [Nick, Mac + simulator or iPhone signed in to iCloud]

Development builds use a separate container (`iCloud.local.innerus.development`), so the live container has no record types yet. Create them once, then deploy:

```sh
cd ~/Documents/work/personal/innerus
npm ci
APP_VARIANT=production INNERUS_CLOUDKIT_ENV=Development npx expo prebuild --clean --platform ios
APP_VARIANT=production INNERUS_CLOUDKIT_ENV=Development npx expo run:ios --configuration Debug
```

In the app: turn on iCloud sync, keep one fictional moment with a short recording, change one setting, delete a second fictional moment. That creates the four record types `Moment`, `Attachment`, `Preference`, `Tombstone` in the container's Development environment. Then open https://icloud.developer.apple.com → `iCloud.com.nicksmet.innerus` → Schema → **Deploy Schema Changes to Production**. Afterwards run `npx expo prebuild --clean` again (without the variables) so the Development setting doesn't stick around.

## 4. App Store Connect — the 2.0 listing [Nick, copy from `store/metadata/`]

- **App Information:** name, subtitle (EN + Dutch localization), primary category, content rights ("does not contain third-party content"), age rating questionnaire (answers in `store/metadata/`).
- **App Privacy:** edit the existing answers → **"Data Not Collected"** (v1 declared email, identifiers, usage data and purchases; v2 collects none). Privacy Policy URL = your hosted `privacy.html`.
- **Pricing and availability:** app stays free to download. Keep the same storefronts as v1.
- **Version 2.0.0** (create with "+ Version"): screenshots (6.9" set from `store/ios/en` and `store/ios/nl`; App Store Connect scales them for smaller iPhones), promotional text, description, keywords, What's New, support URL, copyright `2026 Nick Smet`.
- **App Review information:** no sign-in required; paste the review notes from `store/metadata/review-notes.md`; contact details.
- **Phased release:** turn on "Release update over 7-day period". You can pause if something's wrong.

## 5. Build and upload [Nick, Mac]

```sh
cd ~/Documents/work/personal/innerus
nvm use               # Node 22.22.0
npm ci                # required once: expo-splash-screen was added on 26 Oct
npm run check         # TypeScript + static checks + Jest
npm run ios           # optional local smoke test first: the Swift Writing Tools hook compiles for the first time here
npm run build:ios     # = EAS_NO_VCS=1 eas build -p ios --profile production (the folder is not a git repo; .easignore decides the upload)
npm run submit:ios    # = EAS_NO_VCS=1 eas submit -p ios --latest; asks for the App Store Connect app once, then uploads to TestFlight
```

The production profile sets `APP_VARIANT=production` and `EXPO_PUBLIC_INNERUS_VARIANT=production`: live bundle ID, live product IDs, Production CloudKit, no local StoreKit file. A local `expo run:ios` keeps the development identity. The version comes from `package.json` (2.0.0, above v1's 1.5.0); EAS auto-increments the build number. EAS may ask about push notification credentials (expo-notifications adds the entitlement); answer no, InnerUs only schedules local reminders.

## 6. TestFlight on a real iPhone [Nick]

Install from TestFlight (internal testing, no review needed). Use an App Store **sandbox** account for purchases (Settings › App Store › Sandbox Account). Tick each:

**Update path (most important)**
- [ ] Install v1 from the App Store, turn its reminders on, then install the TestFlight build over it: the app opens, there's no sign-in, and v1's daily reminder no longer arrives the next day.
- [ ] A sandbox account that bought the v1 subscription shows "Yours, from the earlier InnerUs" — also after the subscription expired, and after delete + reinstall + Restore purchases. Settings shows "Earlier subscription". A refunded v1 purchase does not unlock.

**Offer**
- [ ] New: six free conversations open (A01, B01, C01, A06, B06, C06), the others show the offer. "Start your free week" → Apple sheet shows €0 → all conversations open, the pill shows days left.
- [ ] Buy the collection (€9.99 shown from the store, not hard-coded) → "It's yours."
- [ ] Delete the app, reinstall → Restore purchases → access back; the trial isn't offered again.
- [ ] Sandbox: Ask to Buy / interrupted purchase → pending state, free content still works.
- [ ] Airplane mode at launch while owned → access stays.

**Core**
- [ ] First date conversation start → five questions → closing → Finish; keep a moment; find it in Moments; edit; delete.
- [ ] Record an answer; deny the mic once (honest state); on a supported iPhone (Apple Intelligence on), transcription and the draft memory work in airplane mode.
- [ ] iCloud sync with a second iPhone on the same Apple Account: a moment appears there; delete it, and it disappears on both.
- [ ] Export all (zip opens in Files); Delete all private app content.
- [ ] App lock with Face ID; the app switcher shows no content.
- [ ] Writing Tools: select text in a note (Keep a moment, Review, Moment edit) on an Apple Intelligence iPhone: no Writing Tools button or menu item.
- [ ] Launch: cup mark on ivory (dark mode: on plum), fades into Tonight; no white flash.
- [ ] Settings › Privacy policy opens innerus.app in Safari (Dutch half when the app is Dutch); Email us opens Mail to info@innerus.app; the footer says Version 2.0.0.
- [ ] Dutch (phone language Dutch), dark mode, largest text size, VoiceOver on Tonight and in a conversation.
- [ ] Force-quit mid-conversation → it resumes on relaunch.

Anything failing: note it, fix, rebuild (`eas build` again). Don't submit with a known failure in the update path or the offer.

## 7. Submit for review [Nick]

Version 2.0.0 → select the TestFlight build → tick both in-app purchases under "In-App Purchases and Subscriptions" → Add for Review → Submit. Typical review: 1–2 days. Likely questions: the €0 trial item (covered in the review notes), and the no-account change.

## 8. Release day [Nick]

1. Release the approved version (phased).
2. **Take the v1 subscription(s) off sale:** Subscriptions → each product → Availability → remove from sale (or "Remove from Sale" for all storefronts). Apple's documentation says this stops sign-ups and renewals, but developers report renewals continuing; check Sales and Trends after a month. Either way v1 payers keep the collection (D48), and What's New tells them they can cancel. Do the same in RevenueCat (archive the offering) so nothing re-offers it.
3. Publish the privacy and support pages (if not done yet) and check both URLs open on a phone.
4. Keep Firebase, RevenueCat and Google sign-in running: Android is still on v1.
5. Watch App Store Connect → Ratings & Reviews, and Xcode → Organizer → Crashes (Apple's own opt-in crash reports; no SDK needed).

## 9. Android (deferred, not part of this release)

Still needed before Android 2.0: a first Android build (`npm run android` / `eas build -p android`), the Play Console in-app product `com.nicksmet.innerus.collection` (no trial product; Android counts the week locally), the Play Data safety form ("no data collected"), the Play listing (`store/play/`, `store/metadata/`), an internal testing track, and the device tests above. Until then Play keeps v1, which still needs Firebase/RevenueCat.

---

### What changed in the code for release (24 Oct)

- Live product IDs per build variant (`src/platform/store.ts`, `eas.json` → `EXPO_PUBLIC_INNERUS_VARIANT`). D39.
- Root crash fallback with "Try again", no logging (`src/features/ErrorBoundary.tsx`). D40.
- iPhone only (`supportsTablet: false`, as v1). D41.
- Explicit privacy manifest in `app.json` (no tracking, no collected data, required-reason APIs incl. disk space). D42.
- Leftover v1 daily reminders are cleared at launch when v2 reminders are off (`src/state/AppStore.tsx`). D43.
- `INNERUS_CLOUDKIT_ENV=Development` switch for the one-time schema step (`app.config.js`). D44.
- New icon (light/dark/tinted) and Android adaptive icon (`assets/brand/`, `app.json`). D45. The logo isn't final yet: B/C variations are on the canvas, and switching means re-exporting `assets/brand/` from the same build script.

### What changed on 26 Oct

- `.easignore` + `npm run build:ios` / `submit:ios` (EAS_NO_VCS) so the first EAS build works and uploads ≈17 MB without `old_app/` keys. D52.
- v1 payers keep the collection for good, from StoreKit history. D48.
- Privacy policy + Email us in Settings; Help names info@innerus.app; version 2.0.0 everywhere. D49.
- Writing Tools off in every text field (native). D50.
- Launch screen with the cup mark (expo-splash-screen), held until the app is ready. D51.
- Store text, review notes, web pages and screenshots 06/09 updated to 18 conversations / 6 free.
