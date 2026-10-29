import Foundation

/// Typed outcome returned to JavaScript. `reason` is a fixed code, never personal content.
struct LocalAIResult: Sendable {
  var ok: Bool
  var reason: String? = nil
  var text: String? = nil
  var title: String? = nil
  var paragraph: String? = nil
  var quote: String? = nil
  var nextStep: String? = nil

  static func failure(_ reason: String) -> LocalAIResult {
    LocalAIResult(ok: false, reason: reason)
  }

  var dictionary: [String: Any] {
    var out: [String: Any] = ["ok": ok]
    if let reason { out["reason"] = reason }
    if let text { out["text"] = text }
    if let title { out["title"] = title }
    if let paragraph { out["paragraph"] = paragraph }
    if let quote { out["quote"] = quote }
    if let nextStep { out["nextStep"] = nextStep }
    return out
  }
}

enum LocalAIError: Error {
  case unavailable
  case timeout
  case unreadable
}

/// Running jobs by id, so JavaScript can cancel one. Thread-safe; holds no personal content.
final class LocalAIJobs: @unchecked Sendable {
  private let lock = NSLock()
  private var cancels: [String: () -> Void] = [:]
  private var cancelledEarly: Set<String> = []

  func add(_ jobId: String, cancel: @escaping () -> Void) {
    lock.lock()
    let early = cancelledEarly.remove(jobId) != nil
    if !early { cancels[jobId] = cancel }
    lock.unlock()
    if early { cancel() }
  }

  func remove(_ jobId: String) {
    lock.lock()
    cancels[jobId] = nil
    lock.unlock()
  }

  func cancel(_ jobId: String) {
    lock.lock()
    let cancel = cancels.removeValue(forKey: jobId)
    if cancel == nil { cancelledEarly.insert(jobId) }
    lock.unlock()
    cancel?()
  }
}

/// Runs `operation`, throwing `LocalAIError.timeout` when it takes longer than `seconds`.
func localAIWithTimeout<T: Sendable>(seconds: Double, _ operation: @escaping @Sendable () async throws -> T) async throws -> T {
  try await withThrowingTaskGroup(of: T.self) { group in
    group.addTask { try await operation() }
    group.addTask {
      try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
      throw LocalAIError.timeout
    }
    defer { group.cancelAll() }
    guard let first = try await group.next() else { throw LocalAIError.timeout }
    return first
  }
}

/// Accepts `file:///…` URIs from JavaScript as well as plain paths.
func localAIFileURL(_ value: String) -> URL? {
  if value.hasPrefix("file://") { return URL(string: value) }
  if value.hasPrefix("/") { return URL(fileURLWithPath: value) }
  return nil
}
