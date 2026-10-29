import CloudKit
import Foundation

/// On-demand asset downloads (spec 33): one record's `file` asset copied to a private path, with
/// progress events and cancel. Nothing is downloaded until the person asks for it.
enum SyncDownloads {
  private static let lock = NSLock()
  private static var active: [String: CKFetchRecordsOperation] = [:]

  static func download(recordName: String, targetPath: String, requestId: String, progress: @escaping (Double) -> Void) async -> [String: Any] {
    guard let database = SyncCloud.database else { return SyncCloud.fail("notConfigured") }
    let recordID = CKRecord.ID(recordName: recordName, zoneID: SyncCloud.zoneID)
    let operation = CKFetchRecordsOperation(recordIDs: [recordID])
    operation.desiredKeys = [SyncCloud.assetKey]
    operation.qualityOfService = .userInitiated

    let holder = RecordHolder()
    operation.perRecordProgressBlock = { _, value in progress(value) }
    operation.perRecordResultBlock = { _, result in
      switch result {
      case .success(let record): holder.set(record: record, error: nil)
      case .failure(let error): holder.set(record: nil, error: error)
      }
    }

    lock.lock(); active[requestId] = operation; lock.unlock()
    defer { lock.lock(); active[requestId] = nil; lock.unlock() }

    let outcome: [String: Any] = await withCheckedContinuation { continuation in
      operation.fetchRecordsResultBlock = { result in
        if let error = holder.error {
          continuation.resume(returning: SyncCloud.failure(error))
          return
        }
        if case .failure(let error) = result {
          continuation.resume(returning: SyncCloud.failure(error))
          return
        }
        guard let record = holder.record,
              let asset = record.object(forKey: SyncCloud.assetKey) as? CKAsset,
              let source = asset.fileURL else {
          continuation.resume(returning: SyncCloud.fail("unknownItem"))
          return
        }
        do {
          let bytes = try SyncDownloads.place(source: source, targetPath: targetPath)
          continuation.resume(returning: ["ok": true, "bytes": bytes])
        } catch {
          continuation.resume(returning: SyncCloud.fail("error"))
        }
      }
      database.add(operation)
    }
    return outcome
  }

  static func cancel(requestId: String) {
    lock.lock()
    let operation = active[requestId]
    lock.unlock()
    operation?.cancel()
  }

  /// Copies the downloaded asset into the private directory with the same protection and backup
  /// exclusion as every other private file. Writes to a temporary name first so a partial file never
  /// looks like a finished download.
  static func place(source: URL, targetPath: String) throws -> Int {
    let fileManager = FileManager.default
    let target = URL(fileURLWithPath: targetPath)
    let folder = target.deletingLastPathComponent()
    if !fileManager.fileExists(atPath: folder.path) {
      try fileManager.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: PrivateStorage.protection])
    }
    let partial = folder.appendingPathComponent(".\(target.lastPathComponent).partial")
    if fileManager.fileExists(atPath: partial.path) { try fileManager.removeItem(at: partial) }
    try fileManager.copyItem(at: source, to: partial)
    if fileManager.fileExists(atPath: target.path) { try fileManager.removeItem(at: target) }
    try fileManager.moveItem(at: partial, to: target)
    try PrivateStorage.protect(path: target.path)
    let size = (try fileManager.attributesOfItem(atPath: target.path)[.size] as? NSNumber)?.intValue ?? 0
    return size
  }
}

final class RecordHolder {
  private let lock = NSLock()
  private var _record: CKRecord?
  private var _error: Error?
  func set(record: CKRecord?, error: Error?) { lock.lock(); _record = record; _error = error; lock.unlock() }
  var record: CKRecord? { lock.lock(); defer { lock.unlock() }; return _record }
  var error: Error? { lock.lock(); defer { lock.unlock() }; return _error }
}
