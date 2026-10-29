package expo.modules.innerusplatform

import android.content.Context
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * InnerUs platform adapter (Android). Narrow, typed, no network access.
 * Personal content never passes through this module's logs or errors.
 */
class InnerUsPlatformModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("InnerUsPlatform")

    Constant("platform") { "android" }
    Constant("osVersion") { Build.VERSION.SDK_INT.toString() }
    Constant("isSimulator") { isEmulator() }

    // noBackupFilesDir is excluded from Auto Backup. The manifest rules from the
    // InnerUs config plugin additionally exclude all domains from cloud backup and
    // device-to-device transfer (Android 12+), so a single flag is not relied upon.
    Function("preparePrivateDirectory") {
      val directory = File(context.noBackupFilesDir, PRIVATE_DIRECTORY)
      if (!directory.exists() && !directory.mkdirs()) throw IllegalStateException("Private directory unavailable")
      directory.canonicalPath
    }

    Function("inspectPath") { path: String ->
      val file = File(path)
      val noBackupRoot = context.noBackupFilesDir.canonicalPath
      mapOf(
        "exists" to file.exists(),
        "excludedFromBackup" to file.canonicalPath.startsWith(noBackupRoot),
        "protection" to "android-app-private",
        "insideApplicationSupport" to false,
        "insideDocuments" to false
      )
    }

    Function("protectFile") { path: String ->
      val file = File(path)
      val noBackupRoot = context.noBackupFilesDir.canonicalPath
      if (!file.canonicalPath.startsWith(noBackupRoot)) throw IllegalArgumentException("File must live in the private directory")
      mapOf(
        "exists" to file.exists(),
        "excludedFromBackup" to true,
        "protection" to "android-app-private",
        "insideApplicationSupport" to false,
        "insideDocuments" to false
      )
    }

    // Android has no personal cloud sync in this release (handoff §7); no substitute service exists.
    AsyncFunction("probeCloudKit") Coroutine { ->
      mapOf("state" to "not-applicable", "detail" to "Android is local-only with deliberate export")
    }

    AsyncFunction("probeCapabilities") Coroutine { languageTags: List<String> ->
      CapabilityProbe.run(context, languageTags)
    }
  }

  companion object {
    const val PRIVATE_DIRECTORY = "InnerUsPrivate"
    fun isEmulator() = Build.FINGERPRINT.contains("generic") || Build.PRODUCT.contains("sdk")
  }
}
