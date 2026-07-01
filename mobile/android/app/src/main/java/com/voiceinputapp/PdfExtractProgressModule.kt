package com.voiceinputapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class PdfExtractProgressModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  init {
    PdfExtractProgressEmitter.setReactContext(reactContext)
  }

  override fun getName(): String = "PdfExtractProgressModule"
}
