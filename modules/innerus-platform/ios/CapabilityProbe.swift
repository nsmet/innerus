import Foundation
import Speech
import UIKit
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Availability checks only. Nothing here records, transcribes or summarises personal content,
/// and no fallback ever routes to a server, Private Cloud Compute or a third-party service.
enum CapabilityProbe {
  static func run(languageTags: [String]) async -> [String: Any] {
    return [
      "platform": "ios",
      "osVersion": UIDevice.current.systemVersion,
      "isSimulator": InnerUsPlatformModule.isSimulator,
      "transcription": await transcription(languageTags),
      "summary": summary(languageTags)
    ]
  }

  // MARK: Speech to text (handoff §25, A4–A6). Same route selection the adapter uses.

  static func transcription(_ tags: [String]) async -> [String: Any] {
    var languages: [String: String] = [:]
    var details: [String] = []
    for tag in tags {
      let status = await LocalAISpeech.status(languageTag: tag)
      languages[tag] = status.state
      details.append("\(tag): \(status.route ?? "none")")
    }
    return [
      "state": aggregate(languages, fallback: "unsupported-device"),
      "detail": "On-device only (SpeechTranscriber on iOS 26+, else SFSpeechRecognizer on-device). " + details.joined(separator: ", "),
      "languages": languages
    ]
  }

  // MARK: Local summary (handoff §27, A3, A11). SystemLanguageModel only; never the separate cloud model type.

  static func summary(_ tags: [String]) -> [String: Any] {
    var languages: [String: String] = [:]
    var detail = ""
    for tag in tags {
      let status = LocalAISummary.status(languageTag: tag)
      languages[tag] = status.state
      detail = status.detail
    }
    return [
      "state": aggregate(languages, fallback: LocalAISummary.status(languageTag: "en-US").state),
      "detail": detail,
      "languages": languages
    ]
  }

  /// Overall state: the best state any requested language reaches.
  private static func aggregate(_ languages: [String: String], fallback: String) -> String {
    for state in ["ready", "downloading", "needs-download", "unsupported-language", "disabled-by-user", "not-ready", "unsupported-device", "unavailable"] {
      if languages.values.contains(state) { return state }
    }
    return fallback
  }
}
