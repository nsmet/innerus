# App Review notes — InnerUs 2.0.0 (com.nicksmet.innerus)

Paste the block below into App Store Connect › App Review Information › Notes. Sign-in information: leave "Sign-in required" unchecked. Contact first name / last name / phone / email go in the fields above the notes (email: info@innerus.app).

---

Thank you for reviewing InnerUs 2.0. This version is a complete rebuild of the existing app.

NO ACCOUNT
The app has no account, sign-in or registration of any kind. Earlier versions (1.x) used Firebase sign-in with Google/Apple; that is removed. There is no backend: no analytics, no tracking, no ads. All content (18 conversations, English and Dutch) is bundled in the app.

PURCHASES (StoreKit, no subscription)
- Six conversations are always free, including Our first date, An ordinary Tuesday and A Saturday of our own.
- com.nicksmet.innerus.trial7 "InnerUs 7-day free trial" is a €0.00 non-consumable (guideline 3.1.1 free-trial pattern). It opens the 12 other conversations for 7 days, counted from the purchase date of this item. Nothing is charged and nothing renews; after 7 days those 12 conversations lock again.
- com.nicksmet.innerus.collection "InnerUs Full Collection" is a €9.99 non-consumable that keeps all conversations permanently.
- "Restore purchases" is on the offer screen and in Settings.
- Customers who paid for the 1.x subscription with the same Apple Account get the full collection permanently at no extra cost. The app reads this from the device's own StoreKit transaction history; there is no server. The app no longer offers the 1.x subscription.

How to test:
1. Open the app. Tonight shows "Our first date" (free) ready to start; start it to see a full five-question conversation.
2. Open a locked conversation in Explore (for example "A place we would go back to"), or tap the offer card on Tonight. The offer screen explains the free week before it starts.
3. Tap "Start your free week" and confirm the €0.00 purchase with a sandbox account. All conversations open.
4. Or tap "Or buy once for €9.99" to test the one-time purchase. "Restore purchases" restores either item.

RECORDING, ON-DEVICE SPEECH AND SUMMARIES
- The microphone is used only after the user explicitly taps Record while keeping a Moment. There is no background or automatic listening.
- Speech-to-text runs on the device only: SpeechAnalyzer/SpeechTranscriber on iOS 26 and later, otherwise SFSpeechRecognizer with requiresOnDeviceRecognition = true when the device supports on-device recognition for the chosen language. The draft summary uses Apple's on-device Foundation Models framework (SystemLanguageModel; iOS 26+, Apple Intelligence turned on). Private Cloud Compute is never used. Audio and text are never sent to a server. The user reviews the draft before anything is saved.
- Minimum for the draft summary: an Apple Intelligence iPhone (iPhone 15 Pro or later) on iOS 26 or later with Apple Intelligence on. On other devices, or with Apple Intelligence off, the app shows a manual path: the recording is kept as a voice note and the user types the note.
- Apple Writing Tools are turned off in the app's text fields, so private notes are not offered to system text tools.

iCLOUD (OPTIONAL)
Moments are stored locally. Users can optionally turn on sync to their own private iCloud (CloudKit private database). The app works fully with iCloud off or signed out.

OTHER
- Face ID is used only for the optional app lock.
- Export and delete-all are in Settings. Privacy policy and support are linked in Settings (innerus.app).
- iPhone only in this release.

Contact: Nick Smet, info@innerus.app
