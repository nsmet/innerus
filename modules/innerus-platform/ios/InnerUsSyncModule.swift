import ExpoModulesCore

/// Private CloudKit sync adapter (spec 32-34). Thin by design: record transport only.
/// The sync engine (outbox, conflicts, tombstones, visible states) lives in src/platform/sync.ts.
/// No logs; errors are codes without personal content. See SyncCloud for the container guard.
public class InnerUsSyncModule: Module {
  public func definition() -> ModuleDefinition {
    Name("InnerUsSync")

    Events("onDownloadProgress")

    /// True when this build carries the CloudKit entitlement + container marker.
    Constant("isConfigured") { SyncCloud.container != nil }

    AsyncFunction("accountStatus") { () async -> [String: Any] in
      await SyncCloud.accountStatus()
    }

    AsyncFunction("ensureZone") { () async -> [String: Any] in
      await SyncCloud.ensureZone()
    }

    AsyncFunction("deleteZone") { () async -> [String: Any] in
      await SyncCloud.deleteZone()
    }

    AsyncFunction("modifyRecords") { (save: [[String: Any]], delete: [String], overwrite: Bool, plainKeys: [String], encryptedKeys: [String]) async -> [String: Any] in
      await SyncCloud.modifyRecords(save: save, delete: delete, overwrite: overwrite, plainKeys: plainKeys, encryptedKeys: encryptedKeys)
    }

    AsyncFunction("fetchChanges") { (token: String, plainKeys: [String], encryptedKeys: [String]) async -> [String: Any] in
      await SyncCloud.fetchChanges(tokenBase64: token.isEmpty ? nil : token, plainKeys: plainKeys, encryptedKeys: encryptedKeys)
    }

    AsyncFunction("recordExists") { (recordName: String) async -> [String: Any] in
      await SyncCloud.recordExists(recordName)
    }

    AsyncFunction("downloadAsset") { (recordName: String, targetPath: String, requestId: String) async -> [String: Any] in
      await SyncDownloads.download(recordName: recordName, targetPath: targetPath, requestId: requestId) { [weak self] progress in
        self?.sendEvent("onDownloadProgress", ["requestId": requestId, "progress": progress])
      }
    }

    Function("cancelDownload") { (requestId: String) in
      SyncDownloads.cancel(requestId: requestId)
    }
  }
}
