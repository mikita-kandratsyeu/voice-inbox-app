package com.voiceinputapp

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

object PdfExtractProgressEmitter {
  @Volatile
  private var reactContext: ReactApplicationContext? = null

  fun setReactContext(context: ReactApplicationContext) {
    reactContext = context
  }

  fun emit(current: Int, total: Int) {
    if (total <= 0) return
    val context = reactContext ?: return
    val payload = Arguments.createMap().apply {
      putInt("current", current)
      putInt("total", total)
    }
    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("pdfExtractProgress", payload)
  }
}
