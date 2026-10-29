import AVFoundation
import CoreMedia
import Foundation
import Speech

/// On-device speech to text for one recorded clip (handoff §25).
///
/// Routes, in order of preference:
/// 1. iOS 26+: SpeechAnalyzer + SpeechTranscriber with an installed on-device model.
/// 2. Any iOS: SFSpeechRecognizer, only when `supportsOnDeviceRecognition` is true, and then with
///    `requiresOnDeviceRecognition = true`.
/// There is no other route. Never a server recognizer, Private Cloud Compute or third party.
/// Model downloads (route 1) may use the network; audio never leaves the device.
enum LocalAISpeech {
  struct Status: Sendable {
    /// ready | needs-download | downloading | unsupported-language | unsupported-device
    var state: String
    /// "analyzer" | "legacy" | nil when nothing can run
    var route: String?
    /// True when an on-device model for this language can be installed by the person.
    var canDownload: Bool
    var detail: String

    var dictionary: [String: Any] {
      var out: [String: Any] = ["state": state, "canDownload": canDownload, "detail": detail]
      if let route { out["route"] = route }
      return out
    }
  }

  // MARK: Availability (shared with CapabilityProbe so both report the same truth)

  static func status(languageTag: String) async -> Status {
    let locale = Locale(identifier: languageTag)
    let legacyReady = legacyOnDevice(locale)

    if #available(iOS 26.0, *) {
      if SpeechTranscriber.isAvailable, let supported = await SpeechTranscriber.supportedLocale(equivalentTo: locale) {
        let wanted = supported.identifier(.bcp47)
        let installed = await SpeechTranscriber.installedLocales.contains { $0.identifier(.bcp47) == wanted }
        if installed {
          return Status(state: "ready", route: "analyzer", canDownload: false, detail: "SpeechTranscriber, model installed")
        }
        let downloading = await AssetInventory.status(forModules: [makeTranscriber(supported)]) == .downloading
        if legacyReady {
          return Status(state: "ready", route: "legacy", canDownload: !downloading,
                        detail: "SFSpeechRecognizer on-device; SpeechTranscriber model not installed")
        }
        return Status(state: downloading ? "downloading" : "needs-download", route: nil, canDownload: !downloading,
                      detail: "SpeechTranscriber model not installed")
      }
    }

    if legacyReady {
      return Status(state: "ready", route: "legacy", canDownload: false, detail: "SFSpeechRecognizer with requiresOnDeviceRecognition")
    }
    let anyLanguage = ["en-US", "nl-NL", "nl-BE"].contains { legacyOnDevice(Locale(identifier: $0)) }
    return Status(state: anyLanguage ? "unsupported-language" : "unsupported-device", route: nil, canDownload: false,
                  detail: "No on-device recognizer for this language")
  }

  static func legacyOnDevice(_ locale: Locale) -> Bool {
    guard let recognizer = SFSpeechRecognizer(locale: locale) else { return false }
    return recognizer.supportsOnDeviceRecognition
  }

  @available(iOS 26.0, *)
  static func makeTranscriber(_ locale: Locale) -> SpeechTranscriber {
    SpeechTranscriber(locale: locale, transcriptionOptions: [], reportingOptions: [.volatileResults], attributeOptions: [])
  }

  // MARK: Authorization (asked only when the person taps to transcribe)

  static func authorizationName(_ status: SFSpeechRecognizerAuthorizationStatus = SFSpeechRecognizer.authorizationStatus()) -> String {
    switch status {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "not-determined"
    @unknown default: return "denied"
    }
  }

  static func requestAuthorization() async -> String {
    if SFSpeechRecognizer.authorizationStatus() != .notDetermined { return authorizationName() }
    return await withCheckedContinuation { (continuation: CheckedContinuation<String, Never>) in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: LocalAISpeech.authorizationName(status))
      }
    }
  }

  // MARK: Model installation (explicit, person-initiated)

  /// Returns installed | unsupported | cancelled | failed.
  static func installModel(languageTag: String, progress: @escaping @Sendable (Double) -> Void) async -> String {
    guard #available(iOS 26.0, *) else { return "unsupported" }
    guard SpeechTranscriber.isAvailable,
          let locale = await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: languageTag)) else {
      return "unsupported"
    }
    do {
      guard let request = try await AssetInventory.assetInstallationRequest(supporting: [makeTranscriber(locale)]) else {
        progress(1)
        return "installed"
      }
      let poller = Task {
        while !Task.isCancelled {
          progress(request.progress.fractionCompleted)
          try? await Task.sleep(nanoseconds: 300_000_000)
        }
      }
      defer { poller.cancel() }
      try await withTaskCancellationHandler {
        try await request.downloadAndInstall()
      } onCancel: {
        request.progress.cancel()
      }
      if Task.isCancelled { return "cancelled" }
      progress(1)
      return "installed"
    } catch {
      return Task.isCancelled ? "cancelled" : "failed"
    }
  }

  // MARK: Transcription

  static func transcribe(fileUri: String, languageTag: String, progress: @escaping @Sendable (Double) -> Void) async -> LocalAIResult {
    guard let url = localAIFileURL(fileUri), FileManager.default.fileExists(atPath: url.path) else {
      return .failure("failed")
    }
    let permission = await Self.requestAuthorization()
    guard permission == "authorized" else { return .failure("denied") }

    let current = await Self.status(languageTag: languageTag)
    guard current.state == "ready", let route = current.route else { return .failure("not-available") }

    let duration = audioDuration(url)
    let locale = Locale(identifier: languageTag)
    do {
      var text = ""
      if route == "analyzer" {
        if #available(iOS 26.0, *) {
          guard let supported = await SpeechTranscriber.supportedLocale(equivalentTo: locale) else { return .failure("not-available") }
          text = try await transcribeWithAnalyzer(url: url, locale: supported, duration: duration, progress: progress)
        } else {
          return .failure("not-available")
        }
      } else {
        text = try await transcribeLegacy(url: url, locale: locale, duration: duration, progress: progress)
      }
      if Task.isCancelled { return .failure("cancelled") }
      let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
      if clean.isEmpty { return .failure("no-speech") }
      progress(1)
      return LocalAIResult(ok: true, text: clean)
    } catch {
      if Task.isCancelled || error is CancellationError { return .failure("cancelled") }
      let code = (error as NSError).code
      // 1110: "No speech detected" from the on-device recognizer.
      if (error as? LocalAIError) == .unavailable { return .failure("not-available") }
      if code == 1110 { return .failure("no-speech") }
      return .failure("failed")
    }
  }

  static func audioDuration(_ url: URL) -> Double {
    guard let file = try? AVAudioFile(forReading: url) else { return 0 }
    let rate = file.processingFormat.sampleRate
    return rate > 0 ? Double(file.length) / rate : 0
  }

  @available(iOS 26.0, *)
  static func transcribeWithAnalyzer(url: URL, locale: Locale, duration: Double, progress: @escaping @Sendable (Double) -> Void) async throws -> String {
    let transcriber = makeTranscriber(locale)
    let analyzer = SpeechAnalyzer(modules: [transcriber])
    let file = try AVAudioFile(forReading: url)

    let collector = Task { () async throws -> [String] in
      var parts: [String] = []
      for try await result in transcriber.results {
        let end = CMTimeGetSeconds(result.range.end)
        if duration > 0, end.isFinite { progress(min(0.99, max(0, end / duration))) }
        if result.isFinal {
          let part = String(result.text.characters).trimmingCharacters(in: .whitespacesAndNewlines)
          if !part.isEmpty { parts.append(part) }
        }
      }
      return parts
    }

    return try await withTaskCancellationHandler {
      do {
        if let lastSample = try await analyzer.analyzeSequence(from: file) {
          try await analyzer.finalizeAndFinish(through: lastSample)
        } else {
          await analyzer.cancelAndFinishNow()
        }
      } catch {
        await analyzer.cancelAndFinishNow()
        collector.cancel()
        throw error
      }
      return try await collector.value.joined(separator: " ")
    } onCancel: {
      collector.cancel()
      Task { await analyzer.cancelAndFinishNow() }
    }
  }

  static func transcribeLegacy(url: URL, locale: Locale, duration: Double, progress: @escaping @Sendable (Double) -> Void) async throws -> String {
    guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else {
      throw LocalAIError.unavailable
    }
    let request = SFSpeechURLRecognitionRequest(url: url)
    request.requiresOnDeviceRecognition = true // enforced: never the server recognizer
    request.shouldReportPartialResults = true
    request.addsPunctuation = true
    request.taskHint = .dictation

    let holder = LegacyTaskHolder()
    return try await withTaskCancellationHandler {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
        let once = LegacyOnce()
        let task = recognizer.recognitionTask(with: request) { result, error in
          if let result {
            if duration > 0, let last = result.bestTranscription.segments.last {
              progress(min(0.99, max(0, (last.timestamp + last.duration) / duration)))
            }
            if result.isFinal {
              if once.claim() { continuation.resume(returning: result.bestTranscription.formattedString) }
              return
            }
          }
          if let error, once.claim() { continuation.resume(throwing: error) }
        }
        holder.set(task)
      }
    } onCancel: {
      holder.cancel()
    }
  }
}

/// Holds the legacy recognition task so cancellation can reach it from another thread.
private final class LegacyTaskHolder: @unchecked Sendable {
  private let lock = NSLock()
  private var task: SFSpeechRecognitionTask?
  private var cancelled = false

  func set(_ task: SFSpeechRecognitionTask) {
    lock.lock()
    self.task = task
    let cancelNow = cancelled
    lock.unlock()
    if cancelNow { task.cancel() }
  }

  func cancel() {
    lock.lock()
    cancelled = true
    let current = task
    lock.unlock()
    current?.cancel()
  }
}

/// Guarantees a continuation is resumed exactly once.
private final class LegacyOnce: @unchecked Sendable {
  private let lock = NSLock()
  private var done = false

  func claim() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    if done { return false }
    done = true
    return true
  }
}
