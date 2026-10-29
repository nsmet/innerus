import ExpoModulesCore
import Foundation
import UIKit

/// InnerUs platform adapter (iOS). Narrow, typed, no network access.
/// Personal content never passes through this module's logs or errors.
public class InnerUsPlatformModule: Module {
  public func definition() -> ModuleDefinition {
    Name("InnerUsPlatform")

    // Private text views never offer Apple Writing Tools (AC46). Runs once, before any text input exists.
    OnCreate {
      WritingToolsOptOut.install()
    }

    Constant("platform") { "ios" }
    Constant("osVersion") { UIDevice.current.systemVersion }
    Constant("isSimulator") { InnerUsPlatformModule.isSimulator }

    /// Creates (if needed) the private store directory and enforces protection + backup exclusion.
    /// Returns a plain filesystem path (no file:// prefix), usable as the expo-sqlite directory.
    Function("preparePrivateDirectory") { () throws -> String in
      WritingToolsOptOut.install() // idempotent; also covers a module created lazily
      return try PrivateStorage.prepare().path
    }

    /// Reports the protection class and backup flag for a path inside the app container.
    Function("inspectPath") { (path: String) throws -> [String: Any] in
      try PrivateStorage.inspect(path: path)
    }

    /// Applies the private-store rules to a file created later (attachments, drafts).
    Function("protectFile") { (path: String) throws -> [String: Any] in
      try PrivateStorage.protect(path: path)
      return try PrivateStorage.inspect(path: path)
    }

    /// Local capability probe. Checks availability only; never processes personal content.
    AsyncFunction("probeCapabilities") { (languageTags: [String]) async -> [String: Any] in
      await CapabilityProbe.run(languageTags: languageTags)
    }

    /// Prompt 2 CloudKit experiment (fictional record, development container). See CloudKitProbe.
    AsyncFunction("probeCloudKit") { () async -> [String: Any] in
      await CloudKitProbe.run()
    }
  }

  static var isSimulator: Bool {
    #if targetEnvironment(simulator)
    return true
    #else
    return false
    #endif
  }
}

enum PrivateStorage {
  static let directoryName = "InnerUsPrivate"
  /// The store must remain readable for queued work after first unlock; `.complete` would block
  /// sync/cleanup while locked. Revisit together with the optional app lock (DECISIONS D14).
  static let protection = FileProtectionType.completeUntilFirstUserAuthentication

  static func prepare() throws -> URL {
    let fileManager = FileManager.default
    let base = try fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let directory = base.appendingPathComponent(directoryName, isDirectory: true)
    if !fileManager.fileExists(atPath: directory.path) {
      try fileManager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: protection])
    }
    try protect(path: directory.path)
    return directory
  }

  static func protect(path: String) throws {
    var url = URL(fileURLWithPath: path)
    try FileManager.default.setAttributes([.protectionKey: protection], ofItemAtPath: path)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try url.setResourceValues(values)
  }

  static func inspect(path: String) throws -> [String: Any] {
    let url = URL(fileURLWithPath: path)
    let attributes = try FileManager.default.attributesOfItem(atPath: path)
    let excluded = try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup ?? false
    let protectionValue = (attributes[.protectionKey] as? FileProtectionType)?.rawValue ?? "none"
    return [
      "exists": true,
      "excludedFromBackup": excluded,
      "protection": protectionValue,
      "insideApplicationSupport": path.contains("/Library/Application Support/"),
      "insideDocuments": path.contains("/Documents/")
    ]
  }
}
