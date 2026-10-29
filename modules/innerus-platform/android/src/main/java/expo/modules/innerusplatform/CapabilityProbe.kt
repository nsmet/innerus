package expo.modules.innerusplatform

import android.content.Context
import android.content.Intent
import android.os.Build
import android.speech.RecognitionSupport
import android.speech.RecognitionSupportCallback
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * Availability checks only. Never records, transcribes or summarises personal content and never
 * falls back to a network recogniser, remote Gemini or any third-party service (handoff §26, A16/A17).
 */
object CapabilityProbe {
  suspend fun run(context: Context, languageTags: List<String>): Map<String, Any> = mapOf(
    "platform" to "android",
    "osVersion" to Build.VERSION.SDK_INT.toString(),
    "isSimulator" to InnerUsPlatformModule.isEmulator(),
    "transcription" to transcription(context, languageTags),
    // ML Kit GenAI Summarization documents English, Japanese and Korean only; Dutch is not
    // supported. No local summary route is selected yet, so the honest state is "unproven".
    "summary" to mapOf("state" to "unproven", "detail" to "no proven local summary route; manual note available")
  )

  private suspend fun transcription(context: Context, tags: List<String>): Map<String, Any> {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return mapOf("state" to "unsupported-device", "detail" to "on-device recogniser API needs Android 12+")
    }
    if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
      return mapOf("state" to "unsupported-device", "detail" to "isOnDeviceRecognitionAvailable is false")
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return mapOf("state" to "unproven", "detail" to "on-device recogniser present; recorded-file input needs Android 13+")
    }
    val languages = mutableMapOf<String, String>()
    for (tag in tags) languages[tag] = checkLanguage(context, tag)
    val state = when {
      languages.values.contains("ready") -> "ready"
      languages.values.contains("needs-download") -> "needs-download"
      else -> "unsupported-language"
    }
    return mapOf(
      "state" to state,
      "detail" to "createOnDeviceSpeechRecognizer + checkRecognitionSupport; recorded-file input not yet exercised",
      "languages" to languages
    )
  }

  /** SpeechRecognizer must be created and used on the main thread. */
  private suspend fun checkLanguage(context: Context, tag: String): String = withContext(Dispatchers.Main) {
    val recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
    try {
      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE, tag)
      withTimeoutOrNull(5_000) {
        suspendCancellableCoroutine<String> { continuation ->
          recognizer.checkRecognitionSupport(intent, context.mainExecutor, object : RecognitionSupportCallback {
            override fun onSupportResult(support: RecognitionSupport) {
              val state = when {
                support.installedOnDeviceLanguages.any { it.equals(tag, ignoreCase = true) } -> "ready"
                support.pendingOnDeviceLanguages.any { it.equals(tag, ignoreCase = true) } -> "downloading"
                support.supportedOnDeviceLanguages.any { it.equals(tag, ignoreCase = true) } -> "needs-download"
                else -> "unsupported-language"
              }
              if (continuation.isActive) continuation.resume(state)
            }
            override fun onError(error: Int) {
              if (continuation.isActive) continuation.resume("unavailable")
            }
          })
        }
      } ?: "unavailable"
    } finally {
      recognizer.destroy()
    }
  }
}
