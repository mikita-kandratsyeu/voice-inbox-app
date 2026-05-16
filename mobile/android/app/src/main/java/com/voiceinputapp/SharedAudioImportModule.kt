package com.voiceinputapp

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SharedAudioImportModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SharedAudioImport"

  @ReactMethod
  fun getPendingImportPath(promise: Promise) {
    try {
      val path = PendingAudioStore.getAndClearPath(reactApplicationContext)
      if (path != null) {
        promise.resolve(path)
      } else {
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject("E_SHARED_AUDIO", e.message, e)
    }
  }
}
