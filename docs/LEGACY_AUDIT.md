# InnerUs v1 → v2 legacy audit

Date: 24 October 2026. Source: `old_app/kletskoppel-main/` (v1.5.0, the live app), read-only. This audit covers code only. It does not replace checking App Store Connect, RevenueCat and Firebase consoles, which only Nick can open.

## What v1 is

| Area | v1 (live, 1.5.0) | v2 (2.0.0) |
|---|---|---|
| Identity | `com.nicksmet.innerus` (iOS + Android), EAS project `4f179d7a-…`, iPhone only (`supportsTablet: false`) | Same bundle ID / package / EAS project via `APP_VARIANT=production` (D27). iPhone only (D41). |
| Accounts | Firebase Auth: email, Sign in with Apple, Google Sign-In | None. |
| Personal data | Firestore `users/{uid}`: email, createdAt, `completedQuestions{id, packId, **notes**, completedAt}`, `completedPacks` | On-device SQLite in the private directory; optional private iCloud (user's own account). |
| Local data on the phone | AsyncStorage only: `innerus@homeNotificationSchedulerShown`, `innerus@notificationEnabled` | Not read. Nothing to migrate. |
| Content | Remote: Firestore `packs`, `questions` | Bundled. |
| Purchases | RevenueCat (`react-native-purchases`), premium = any active subscription (`activeSubscriptions.length > 0`) | expo-iap / StoreKit 2 direct. One-time collection + €0 trial (D28, D37). |
| Analytics | Mixpanel, Qualli, Firebase | None. |
| Notifications | Local reminder scheduler | Local reminders (`src/features/reminders.ts`). |

## Conclusions

1. **No local migration exists or is needed.** v1 kept no personal content on the device. Everything personal lived in Firestore under the user's account. The "Legacy storage and migration" gate closes as **not applicable for on-device data**. v2 must not add a Firebase client to fetch it (no-backend constraint, spec §40: "Do not upload historical personal data to a new developer backend").
2. **v1 notes are online and will not appear in v2.** Users who typed notes per question will not see them after updating. This needs an owner decision (see below) and an honest line in What's New.
3. **Entitlements carry over without RevenueCat.** RevenueCat sells through StoreKit/Play Billing, so v2's `readStoreAccess()` sees an active v1 subscription as an active store transaction for a product that isn't the collection or trial → `legacy: true`. Since 26 Oct (D48) the full StoreKit history is read, so this access is permanent, also after cancelling. That matches the v1 rule (premium = active subscription). There's nothing in the v1 code for a lifetime product. Nick must confirm in App Store Connect / RevenueCat that no non-consumable or lifetime product was ever sold. If one was, it is also counted as legacy (non-consumables stay in current entitlements), which is the right outcome.
4. **The v1 subscription must stop renewing for new buyers.** Remove the subscription from sale in App Store Connect when v2 goes live. Existing subscriptions then run until their current period ends, unless Nick also decides to stop renewals early. That has refund and messaging consequences, so the default is to let them run out.
5. **App Privacy label must change.** v1 collects email, user ID, usage data (Mixpanel/Qualli/Firebase) and purchase history (RevenueCat). v2 collects nothing → "Data Not Collected". Update it in App Store Connect before submitting v2, or review will see a mismatch.
6. **Sign in with Apple / Google** entitlements and the URL scheme disappear in v2. That's fine for an update. The Firebase project, RevenueCat project and Google OAuth client keep running until Nick shuts them down. v1 installs that never update keep using them.
7. **Android stays on v1** until the Android build is done (owner deferred it). Android v1 keeps depending on Firebase + RevenueCat, so don't shut those down while v1 is the live Android version.

## Owner decisions still open

- **v1 notes:** (a) let them go, with a clear What's New line, or (b) offer copies by email on request (Nick exports from the Firestore console; listing has an optional bracketed sentence for this), or (c) both, plus a deletion date.
- **Firebase data retention:** pick a date to delete v1 account data (`users` collection + Auth users). The privacy policy currently says "deleted after the previous version is retired, and on request earlier" with a placeholder date.
- **Lapsed v1 subscribers / long-time payers:** decided 26 Oct (D48): everyone who paid for v1 keeps the collection for good, also after the subscription ends.
- **Stop renewals early or let them run out:** default is to let them run out.
