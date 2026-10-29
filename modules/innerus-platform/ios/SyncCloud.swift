import CloudKit
import CryptoKit
import Foundation

/// Thin CloudKit adapter for private iCloud sync (spec 32-36). The JS engine (src/platform/sync.ts)
/// decides what to sync; this file only moves records in ONE custom zone of the user's PRIVATE
/// database of the DEVELOPMENT container. It never touches the public database or any live container.
///
/// Every call returns a dictionary: `["ok": true, ...]` or `["ok": false, "error": <code>]`.
/// Error codes carry no personal content: notConfigured, notAuthenticated, networkUnavailable,
/// retryLater, quotaExceeded, zoneNotFound, changeTokenExpired, serverRecordChanged, unknownItem,
/// limitExceeded, assetFileNotFound, cancelled, error.
enum SyncCloud {
  /// Only these containers may ever be opened by this build. The live app's container is not listed.
  static let allowedContainers: Set<String> = ["iCloud.local.innerus.development"]
  static let zoneName = "InnerUs"
  static let assetKey = "file"

  /// Nil when the build has no CloudKit entitlement (INNERUS_CLOUDKIT=0) — constructing a container
  /// without the entitlement crashes, so the Info.plist marker written by the config plugin gates it.
  static let container: CKContainer? = {
    guard let identifier = CloudKitProbe.configuredContainer, allowedContainers.contains(identifier) else { return nil }
    return CKContainer(identifier: identifier)
  }()

  static var database: CKDatabase? { container?.privateCloudDatabase }
  static var zoneID: CKRecordZone.ID { CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName) }

  // MARK: Account

  static func accountStatus() async -> [String: Any] {
    guard let container = container else { return ["ok": true, "status": "notConfigured"] }
    let status: CKAccountStatus
    do { status = try await container.accountStatus() } catch { return failure(error) }
    var result: [String: Any] = ["ok": true, "status": CloudKitProbe.describe(status)]
    if status == .available {
      // A salted hash of the user record name: enough to notice an Apple Account change, never shown.
      if let recordID = try? await container.userRecordID() {
        let digest = SHA256.hash(data: Data("innerus-account:\(recordID.recordName)".utf8))
        result["accountHash"] = digest.map { String(format: "%02x", $0) }.joined().prefix(24).description
      }
    }
    return result
  }

  // MARK: Zone

  static func ensureZone() async -> [String: Any] {
    guard let database = database else { return fail("notConfigured") }
    do {
      let results = try await database.modifyRecordZones(saving: [CKRecordZone(zoneID: zoneID)], deleting: [])
      if let saved = results.saveResults[zoneID], case .failure(let error) = saved { return failure(error) }
      return ["ok": true]
    } catch { return failure(error) }
  }

  /// "Delete iCloud copies": removes the whole InnerUs zone (every synced record and asset).
  static func deleteZone() async -> [String: Any] {
    guard let database = database else { return fail("notConfigured") }
    do {
      let results = try await database.modifyRecordZones(saving: [], deleting: [zoneID])
      if let deleted = results.deleteResults[zoneID], case .failure(let error) = deleted {
        let code = errorCode(error)
        if code == "zoneNotFound" || code == "unknownItem" { return ["ok": true] }
        return failure(error)
      }
      return ["ok": true]
    } catch {
      let code = errorCode(error)
      if code == "zoneNotFound" { return ["ok": true] }
      return failure(error)
    }
  }

  // MARK: Records

  /// Saves and deletes in one non-atomic batch with per-record results.
  /// `overwrite` = last writer wins (tombstones, bookmarks, preferences, immutable attachments);
  /// otherwise the save is rejected when the server copy changed (Moments → conflict handling in JS).
  static func modifyRecords(save: [[String: Any]], delete: [String], overwrite: Bool, plainKeys: [String], encryptedKeys: [String]) async -> [String: Any] {
    guard let database = database else { return fail("notConfigured") }
    var records: [CKRecord] = []
    for item in save {
      guard let record = makeRecord(item) else { return fail("error") }
      records.append(record)
    }
    let deleteIDs = delete.map { CKRecord.ID(recordName: $0, zoneID: zoneID) }
    do {
      let results = try await database.modifyRecords(
        saving: records, deleting: deleteIDs,
        savePolicy: overwrite ? .allKeys : .ifServerRecordUnchanged, atomically: false)
      var saved: [[String: Any]] = []
      var failed: [[String: Any]] = []
      for (recordID, result) in results.saveResults {
        switch result {
        case .success(let record):
          saved.append(["recordName": recordID.recordName, "changeTag": record.recordChangeTag ?? "", "systemFields": encodeSystemFields(record)])
        case .failure(let error):
          var entry: [String: Any] = ["recordName": recordID.recordName, "error": errorCode(error)]
          if let ckError = error as? CKError, ckError.code == .serverRecordChanged, let server = ckError.serverRecord {
            entry["serverRecord"] = describe(server, plainKeys: plainKeys, encryptedKeys: encryptedKeys)
          }
          failed.append(entry)
        }
      }
      var deleted: [String] = []
      for (recordID, result) in results.deleteResults {
        switch result {
        case .success:
          deleted.append(recordID.recordName)
        case .failure(let error):
          // Already gone counts as deleted.
          if errorCode(error) == "unknownItem" { deleted.append(recordID.recordName) }
          else { failed.append(["recordName": recordID.recordName, "error": errorCode(error)]) }
        }
      }
      return ["ok": true, "saved": saved, "deleted": deleted, "failed": failed]
    } catch {
      return failure(error)
    }
  }

  /// All changes in the zone since `tokenBase64` (nil = everything). Assets are NOT downloaded here:
  /// only `plainKeys` + `encryptedKeys` are requested, so restore is text first (spec 33).
  static func fetchChanges(tokenBase64: String?, plainKeys: [String], encryptedKeys: [String]) async -> [String: Any] {
    guard let database = database else { return fail("notConfigured") }
    let previous = tokenBase64.flatMap { decodeToken($0) }
    let zone = zoneID
    let configuration = CKFetchRecordZoneChangesOperation.ZoneConfiguration(
      previousServerChangeToken: previous, resultsLimit: nil, desiredKeys: plainKeys + encryptedKeys)
    let operation = CKFetchRecordZoneChangesOperation(recordZoneIDs: [zone], configurationsByRecordZoneID: [zone: configuration])
    operation.fetchAllChanges = true
    operation.qualityOfService = .utility

    let collector = ChangeCollector()
    operation.recordWasChangedBlock = { _, result in
      if case .success(let record) = result {
        collector.addRecord(SyncCloud.describe(record, plainKeys: plainKeys, encryptedKeys: encryptedKeys))
      }
    }
    operation.recordWithIDWasDeletedBlock = { recordID, recordType in
      collector.addDeletion(["recordName": recordID.recordName, "recordType": recordType])
    }
    operation.recordZoneFetchResultBlock = { _, result in
      switch result {
      case .success(let value): collector.finish(token: value.serverChangeToken, error: nil)
      case .failure(let error): collector.finish(token: nil, error: error)
      }
    }

    return await withCheckedContinuation { continuation in
      operation.fetchRecordZoneChangesResultBlock = { result in
        if case .failure(let error) = result, collector.zoneError == nil {
          continuation.resume(returning: SyncCloud.failure(error))
          return
        }
        if let zoneError = collector.zoneError {
          continuation.resume(returning: SyncCloud.failure(zoneError))
          return
        }
        guard let token = collector.token else {
          continuation.resume(returning: SyncCloud.fail("error"))
          return
        }
        continuation.resume(returning: [
          "ok": true,
          "records": collector.records,
          "deleted": collector.deletions,
          "token": SyncCloud.encodeToken(token),
        ])
      }
      database.add(operation)
    }
  }

  /// Confirms a record (and so its asset) still exists in iCloud before a local download is removed.
  static func recordExists(_ recordName: String) async -> [String: Any] {
    guard let database = database else { return fail("notConfigured") }
    let recordID = CKRecord.ID(recordName: recordName, zoneID: zoneID)
    do {
      let results = try await database.records(for: [recordID], desiredKeys: [])
      guard let result = results[recordID] else { return ["ok": true, "exists": false] }
      switch result {
      case .success: return ["ok": true, "exists": true]
      case .failure(let error):
        if errorCode(error) == "unknownItem" { return ["ok": true, "exists": false] }
        return failure(error)
      }
    } catch {
      if errorCode(error) == "unknownItem" { return ["ok": true, "exists": false] }
      return failure(error)
    }
  }

  // MARK: Record <-> dictionary

  /// JS shape: { recordType, recordName, systemFields?, fields: {k: string|number}, encrypted: {k: string}, assetPath? }
  static func makeRecord(_ item: [String: Any]) -> CKRecord? {
    guard let recordType = item["recordType"] as? String, let recordName = item["recordName"] as? String else { return nil }
    let record: CKRecord
    if let base64 = item["systemFields"] as? String, !base64.isEmpty, let decoded = decodeSystemFields(base64),
       decoded.recordID.recordName == recordName {
      record = decoded
    } else {
      record = CKRecord(recordType: recordType, recordID: CKRecord.ID(recordName: recordName, zoneID: zoneID))
    }
    if let fields = item["fields"] as? [String: Any] {
      for (key, value) in fields {
        if let text = value as? String {
          record.setObject(text as NSString, forKey: key)
        } else if let number = value as? NSNumber {
          record.setObject(number, forKey: key)
        }
      }
    }
    if let encrypted = item["encrypted"] as? [String: Any] {
      for (key, value) in encrypted {
        if let text = value as? String {
          record.encryptedValues.setObject(text as NSString, forKey: key)
        }
      }
    }
    if let assetPath = item["assetPath"] as? String, !assetPath.isEmpty {
      record.setObject(CKAsset(fileURL: URL(fileURLWithPath: assetPath)), forKey: assetKey)
    }
    return record
  }

  static func describe(_ record: CKRecord, plainKeys: [String], encryptedKeys: [String]) -> [String: Any] {
    var fields: [String: Any] = [:]
    for key in plainKeys {
      guard let value = record.object(forKey: key) else { continue }
      if let text = value as? String { fields[key] = text }
      else if let number = value as? NSNumber { fields[key] = number.doubleValue }
      else if let date = value as? Date { fields[key] = date.timeIntervalSince1970 * 1000 }
    }
    var encrypted: [String: Any] = [:]
    for key in encryptedKeys {
      if let text = record.encryptedValues.object(forKey: key) as? String { encrypted[key] = text }
    }
    return [
      "recordType": record.recordType,
      "recordName": record.recordID.recordName,
      "changeTag": record.recordChangeTag ?? "",
      "systemFields": encodeSystemFields(record),
      "fields": fields,
      "encrypted": encrypted,
    ]
  }

  // MARK: Coding

  static func encodeSystemFields(_ record: CKRecord) -> String {
    let coder = NSKeyedArchiver(requiringSecureCoding: true)
    record.encodeSystemFields(with: coder)
    coder.finishEncoding()
    return coder.encodedData.base64EncodedString()
  }

  static func decodeSystemFields(_ base64: String) -> CKRecord? {
    guard let data = Data(base64Encoded: base64), let coder = try? NSKeyedUnarchiver(forReadingFrom: data) else { return nil }
    coder.requiresSecureCoding = true
    let record = CKRecord(coder: coder)
    coder.finishDecoding()
    return record
  }

  static func encodeToken(_ token: CKServerChangeToken) -> String {
    (try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true))?.base64EncodedString() ?? ""
  }

  static func decodeToken(_ base64: String) -> CKServerChangeToken? {
    guard !base64.isEmpty, let data = Data(base64Encoded: base64) else { return nil }
    return try? NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: data)
  }

  // MARK: Errors (codes only; never content)

  static func errorCode(_ error: Error) -> String {
    guard let ckError = error as? CKError else { return "error" }
    switch ckError.code {
    case .networkUnavailable, .networkFailure: return "networkUnavailable"
    case .serviceUnavailable, .requestRateLimited, .zoneBusy: return "retryLater"
    case .notAuthenticated, .accountTemporarilyUnavailable: return "notAuthenticated"
    case .quotaExceeded: return "quotaExceeded"
    case .zoneNotFound, .userDeletedZone: return "zoneNotFound"
    case .changeTokenExpired: return "changeTokenExpired"
    case .serverRecordChanged: return "serverRecordChanged"
    case .unknownItem: return "unknownItem"
    case .limitExceeded: return "limitExceeded"
    case .assetFileNotFound, .assetFileModified: return "assetFileNotFound"
    case .operationCancelled: return "cancelled"
    case .partialFailure:
      if let first = ckError.partialErrorsByItemID?.values.first { return errorCode(first) }
      return "error"
    default: return "error"
    }
  }

  static func failure(_ error: Error) -> [String: Any] {
    var result: [String: Any] = ["ok": false, "error": errorCode(error)]
    if let retry = (error as? CKError)?.retryAfterSeconds { result["retryAfter"] = retry }
    return result
  }

  static func fail(_ code: String) -> [String: Any] { ["ok": false, "error": code] }
}

/// Collects fetch callbacks (CloudKit may call them on its own queues).
final class ChangeCollector {
  private let lock = NSLock()
  private var _records: [[String: Any]] = []
  private var _deletions: [[String: Any]] = []
  private var _token: CKServerChangeToken?
  private var _zoneError: Error?

  func addRecord(_ record: [String: Any]) { lock.lock(); _records.append(record); lock.unlock() }
  func addDeletion(_ deletion: [String: Any]) { lock.lock(); _deletions.append(deletion); lock.unlock() }
  func finish(token: CKServerChangeToken?, error: Error?) {
    lock.lock()
    if let token = token { _token = token }
    if let error = error { _zoneError = error }
    lock.unlock()
  }
  var records: [[String: Any]] { lock.lock(); defer { lock.unlock() }; return _records }
  var deletions: [[String: Any]] { lock.lock(); defer { lock.unlock() }; return _deletions }
  var token: CKServerChangeToken? { lock.lock(); defer { lock.unlock() }; return _token }
  var zoneError: Error? { lock.lock(); defer { lock.unlock() }; return _zoneError }
}
