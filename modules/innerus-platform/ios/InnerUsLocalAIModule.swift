import ExpoModulesCore
import Foundation

/// On-device transcription and draft memory adapter (handoff §25–29).
///
/// Every call is started by an explicit action in the app. Audio and text are processed on this
/// device only; there is no network code and no cloud fallback. Results carry fixed reason codes,
/// never personal content in errors or events. Progress events contain only a job id and a fraction.
public class InnerUsLocalAIModule: Module {
  private let jobs = LocalAIJobs()

  public func definition() -> ModuleDefinition {
    Name("InnerUsLocalAI")

    Events("onProgress")

    /// Current speech-recognition permission without asking: authorized | denied | restricted | not-determined.
    Function("speechAuthorization") { () -> String in
      LocalAISpeech.authorizationName()
    }

    /// Asks for speech-recognition permission. Only called after the person taps to transcribe.
    AsyncFunction("requestSpeechAuthorization") { () async -> String in
      await LocalAISpeech.requestAuthorization()
    }

    /// Transcription and summary readiness for one recording language (same truth as the probe).
    AsyncFunction("status") { (languageTag: String) async -> [String: Any] in
      let speech = await LocalAISpeech.status(languageTag: languageTag)
      let summary = LocalAISummary.status(languageTag: languageTag)
      return [
        "transcription": speech.dictionary,
        "summary": ["state": summary.state, "detail": summary.detail],
        "authorization": LocalAISpeech.authorizationName()
      ]
    }

    /// Person-initiated download of the on-device speech model (iOS 26+). May use the network; no audio is involved.
    AsyncFunction("installSpeechModel") { (jobId: String, languageTag: String) async -> String in
      await self.run(jobId) { [weak self] in
        await LocalAISpeech.installModel(languageTag: languageTag) { fraction in
          self?.report(jobId, kind: "install", fraction: fraction)
        }
      }
    }

    /// Transcribes one recorded file on this device. Returns { ok, text } or { ok: false, reason }.
    AsyncFunction("transcribe") { (jobId: String, fileUri: String, languageTag: String) async -> [String: Any] in
      let result = await self.run(jobId) { [weak self] in
        await LocalAISpeech.transcribe(fileUri: fileUri, languageTag: languageTag) { fraction in
          self?.report(jobId, kind: "transcribe", fraction: fraction)
        }
      }
      return result.dictionary
    }

    /// Drafts a short memory from the reviewed transcript, its question and the conversation title only.
    AsyncFunction("summarize") { (jobId: String, transcript: String, question: String?, topicTitle: String, languageTag: String) async -> [String: Any] in
      let result = await self.run(jobId) {
        await LocalAISummary.summarize(transcript: transcript, question: question, topicTitle: topicTitle, languageTag: languageTag)
      }
      return result.dictionary
    }

    /// Cancels a running job. Safe to call for a job that already finished.
    Function("cancel") { (jobId: String) in
      self.jobs.cancel(jobId)
    }
  }

  private func run<T: Sendable>(_ jobId: String, _ work: @escaping @Sendable () async -> T) async -> T {
    let task = Task { await work() }
    jobs.add(jobId) { task.cancel() }
    defer { jobs.remove(jobId) }
    return await task.value
  }

  private func report(_ jobId: String, kind: String, fraction: Double) {
    let bounded = fraction.isFinite ? min(1, max(0, fraction)) : 0
    sendEvent("onProgress", ["jobId": jobId, "kind": kind, "fraction": bounded])
  }
}
