package com.voiceinputapp

import android.content.Context
import java.io.File

object TessDataPreparer {
  private const val TESS_ROOT = "tesseract"
  private val TRAINED_DATA_FILES = listOf("eng.traineddata", "rus.traineddata")

  fun ensureTessDataPath(context: Context): String? {
    val tessRoot = File(context.filesDir, TESS_ROOT)
    val tessDataDir = File(tessRoot, "tessdata")
    if (!tessDataDir.exists() && !tessDataDir.mkdirs()) {
      return null
    }

    for (assetName in TRAINED_DATA_FILES) {
      val outFile = File(tessDataDir, assetName)
      if (outFile.exists() && outFile.length() > 0L) {
        continue
      }
      try {
        context.assets.open("tessdata/$assetName").use { input ->
          outFile.outputStream().use { output -> input.copyTo(output) }
        }
      } catch (_: Exception) {
        return null
      }
    }

    return tessRoot.absolutePath
  }
}
