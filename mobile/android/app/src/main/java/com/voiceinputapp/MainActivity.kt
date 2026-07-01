package com.voiceinputapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import com.zoontek.rnbootsplash.RNBootSplash
import java.io.File
import java.io.FileOutputStream

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "VoiceInboxApp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(savedInstanceState)
    handleShareIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    if (intent != null) {
      setIntent(intent)
    }
    handleShareIntent(intent)
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.action ?: return
    try {
      when (action) {
        Intent.ACTION_SEND -> {
          if (!isSupportedImportType(intent.type)) return
          val stream = getSendStreamUri(intent) ?: return
          copyStreamToPending(stream, intent.type)
        }
        Intent.ACTION_VIEW -> {
          val data = intent.data ?: return
          val type = intent.type ?: contentResolver.getType(data)
          if (isSupportedImportType(type) || looksLikeImportPath(data)) {
            copyStreamToPending(data, type)
          }
        }
        else -> return
      }
    } catch (e: Exception) {
      Log.w("MainActivity", "handleShareIntent failed", e)
    }
  }

  private fun isSupportedImportType(type: String?): Boolean {
    val normalized = type?.lowercase() ?: return false
    return normalized.startsWith("audio/") ||
      normalized.startsWith("text/") ||
      normalized == "application/pdf" ||
      normalized == "application/x-subrip" ||
      normalized == "application/octet-stream"
  }

  private fun looksLikeImportPath(uri: Uri): Boolean {
    val path = uri.path?.lowercase() ?: return false
    return path.endsWith(".m4a") ||
      path.endsWith(".mp3") ||
      path.endsWith(".wav") ||
      path.endsWith(".aac") ||
      path.endsWith(".ogg") ||
      path.endsWith(".opus") ||
      path.endsWith(".flac") ||
      path.endsWith(".caf") ||
      path.endsWith(".3gp") ||
      path.endsWith(".md") ||
      path.endsWith(".markdown") ||
      path.endsWith(".pdf") ||
      path.endsWith(".srt") ||
      path.endsWith(".vtt") ||
      path.endsWith(".sbv") ||
      path.endsWith(".sub") ||
      path.endsWith(".txt")
  }

  @Suppress("DEPRECATION")
  private fun getSendStreamUri(intent: Intent): Uri? {
    return if (android.os.Build.VERSION.SDK_INT >= 33) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      intent.getParcelableExtra(Intent.EXTRA_STREAM)
    }
  }

  private fun copyStreamToPending(uri: Uri, mimeType: String?) {
    contentResolver.openInputStream(uri)?.use { input ->
      val ext = guessExtension(uri, mimeType)
      val outFile = File(cacheDir, "shared-import-${System.currentTimeMillis()}$ext")
      FileOutputStream(outFile).use { output -> input.copyTo(output) }
      PendingAudioStore.setPendingPath(this, outFile.absolutePath)
    }
      ?: Log.w("MainActivity", "Could not open stream for $uri")
  }

  private fun guessExtension(uri: Uri, mimeType: String?): String {
    val path = uri.path?.lowercase() ?: ""
    return when {
      path.endsWith(".mp3") -> ".mp3"
      path.endsWith(".wav") -> ".wav"
      path.endsWith(".aac") -> ".aac"
      path.endsWith(".ogg") -> ".ogg"
      path.endsWith(".opus") -> ".opus"
      path.endsWith(".flac") -> ".flac"
      path.endsWith(".caf") -> ".caf"
      path.endsWith(".md") -> ".md"
      path.endsWith(".markdown") -> ".markdown"
      path.endsWith(".pdf") -> ".pdf"
      path.endsWith(".3gp") || path.endsWith(".amr") -> ".m4a"
      path.endsWith(".srt") -> ".srt"
      path.endsWith(".vtt") -> ".vtt"
      path.endsWith(".sbv") -> ".sbv"
      path.endsWith(".sub") -> ".sub"
      path.endsWith(".txt") -> ".txt"
      mimeType?.lowercase() == "application/x-subrip" -> ".srt"
      mimeType?.lowercase() == "application/pdf" -> ".pdf"
      mimeType?.lowercase() == "text/markdown" || mimeType?.lowercase() == "text/x-markdown" -> ".md"
      mimeType?.lowercase() == "text/vtt" || mimeType?.lowercase() == "text/webvtt" -> ".vtt"
      mimeType?.lowercase()?.startsWith("text/") == true -> ".txt"
      else -> ".m4a"
    }
  }
}
