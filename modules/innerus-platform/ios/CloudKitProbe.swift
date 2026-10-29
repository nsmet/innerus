import CloudKit
import Foundation

/// Prompt 2 CloudKit experiment (development probe screen only). Uses ONE fictional record in a
/// dedicated probe zone of the user's PRIVATE database, development container only. Never touches the
/// public database or production. The config plugin adds the CloudKit entitlements and the
/// `InnerUsCloudKitContainer` Info.plist marker by default on iOS (opt out: INNERUS_CLOUDKIT=0).
/// Without the marker we never construct a CKContainer, because an unentitled container identifier
/// crashes the app. Real sync uses the same guard (SyncCloud) in its own zone "InnerUs".
enum CloudKitProbe {
  static var configuredContainer: String? {
    Bundle.main.object(forInfoDictionaryKey: "InnerUsCloudKitContainer") as? String
  }

  static func run() async -> [String: Any] {
    guard let identifier = configuredContainer, SyncCloud.allowedContainers.contains(identifier) else {
      return ["state": "not-configured", "detail": "build without the CloudKit entitlement (INNERUS_CLOUDKIT=0)"]
    }
    let container = CKContainer(identifier: identifier)
    var result: [String: Any] = ["container": identifier]

    let status: CKAccountStatus
    do { status = try await container.accountStatus() } catch {
      result["state"] = "unavailable"; result["detail"] = "accountStatus error \((error as NSError).code)"
      return result
    }
    result["accountStatus"] = describe(status)
    guard status == .available else {
      // Product rule: work locally and explain that cross-device sync is unavailable (handoff §32).
      result["state"] = "icloud-unavailable"
      return result
    }

    let database = container.privateCloudDatabase
    let zone = CKRecordZone(zoneName: "InnerUsProbe")
    let recordID = CKRecord.ID(recordName: "probe-fictional-record", zoneID: zone.zoneID)
    let started = Date()
    do {
      _ = try await database.modifyRecordZones(saving: [zone], deleting: [])
      let record = CKRecord(recordType: "ProbeRecord", recordID: recordID)
      record.encryptedValues["note"] = "Fictional probe text" as NSString
      record["schemaVersion"] = 1 as NSNumber
      let saveResults = try await database.modifyRecords(saving: [record], deleting: [], savePolicy: .allKeys)
      if case .failure(let error) = saveResults.saveResults[recordID] { throw error }
      let fetched = try await database.record(for: recordID)
      let roundTripOK = (fetched.encryptedValues["note"] as? String) == "Fictional probe text"
      _ = try await database.modifyRecords(saving: [], deleting: [recordID])
      result["state"] = roundTripOK ? "ready" : "mismatch"
      result["detail"] = "private DB save → fetch → delete in zone InnerUsProbe (encrypted field)"
      result["roundTripMs"] = Int(Date().timeIntervalSince(started) * 1000)
    } catch {
      let ckError = error as? CKError
      result["state"] = ckError?.code == .quotaExceeded ? "quota-full" : (ckError?.code == .networkUnavailable || ckError?.code == .networkFailure ? "offline" : "error")
      // Error codes only; never record content.
      result["detail"] = "CKError \(ckError?.code.rawValue ?? (error as NSError).code)"
    }
    return result
  }

  static func describe(_ status: CKAccountStatus) -> String {
    switch status {
    case .available: return "available"
    case .noAccount: return "noAccount"
    case .restricted: return "restricted"
    case .couldNotDetermine: return "couldNotDetermine"
    case .temporarilyUnavailable: return "temporarilyUnavailable"
    @unknown default: return "unknown"
    }
  }
}
