package com.voiceinputapp

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.googlecode.tesseract.android.TessBaseAPI
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.File
import kotlin.math.max
import kotlin.math.min

object PdfTextExtractor {
  private const val MAX_OCR_PAGES = 100
  private const val RENDER_SCALE = 2

  fun extract(file: File, context: Context, languageHint: String?): String {
    val pageCount = pageCount(file)
    if (pageCount <= 0) return ""

    val pageTexts = Array(pageCount) { "" }
    var needsOcr = false

    PDDocument.load(file).use { document ->
      val stripper = PDFTextStripper()
      val limit = min(document.numberOfPages, MAX_OCR_PAGES)
      for (pageIndex in 0 until limit) {
        PdfExtractProgressEmitter.emit(pageIndex + 1, limit)
        stripper.startPage = pageIndex + 1
        stripper.endPage = pageIndex + 1
        val pageText = stripper.getText(document).trim()
        if (pageText.isNotEmpty()) {
          pageTexts[pageIndex] = pageText
        } else {
          needsOcr = true
        }
      }
    }

    if (!needsOcr) {
      return pageTexts.filter { it.isNotBlank() }.joinToString("\n\n").trim()
    }

    val tessDataPath = TessDataPreparer.ensureTessDataPath(context) ?: return ""
    val tessLanguage = tessLanguageForHint(languageHint)

    ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
      PdfRenderer(descriptor).use { renderer ->
        val limit = min(renderer.pageCount, MAX_OCR_PAGES)
        for (pageIndex in 0 until limit) {
          if (pageTexts[pageIndex].isNotBlank()) continue

          PdfExtractProgressEmitter.emit(pageIndex + 1, limit)
          renderer.openPage(pageIndex).use { page ->
            val width = max(page.width * RENDER_SCALE, 1)
            val height = max(page.height * RENDER_SCALE, 1)
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            pageTexts[pageIndex] = ocrBitmap(bitmap, tessDataPath, tessLanguage)
            bitmap.recycle()
          }
        }
      }
    }

    return pageTexts.filter { it.isNotBlank() }.joinToString("\n\n").trim()
  }

  private fun pageCount(file: File): Int {
    return try {
      PDDocument.load(file).use { document -> min(document.numberOfPages, MAX_OCR_PAGES) }
    } catch (_: Exception) {
      0
    }
  }

  private fun ocrBitmap(bitmap: Bitmap, tessDataPath: String, tessLanguage: String): String {
    val tess = TessBaseAPI()
    return try {
      if (!tess.init(tessDataPath, tessLanguage)) {
        return ""
      }
      tess.setImage(bitmap)
      tess.utF8Text?.trim().orEmpty()
    } finally {
      tess.end()
    }
  }

  private fun tessLanguageForHint(languageHint: String?): String {
    val normalized = languageHint?.lowercase().orEmpty()
    return if (normalized.startsWith("ru")) {
      "rus+eng"
    } else {
      "eng+rus"
    }
  }
}
