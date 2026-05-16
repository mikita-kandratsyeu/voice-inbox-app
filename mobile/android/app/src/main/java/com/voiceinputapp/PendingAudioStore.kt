package com.voiceinputapp

import android.content.Context

object PendingAudioStore {
  private const val PREFS = "vi_shared_audio_import"
  private const val KEY_PATH = "pending_absolute_path"

  fun setPendingPath(context: Context, absolutePath: String) {
    context
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_PATH, absolutePath)
      .apply()
  }

  fun getAndClearPath(context: Context): String? {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val value = prefs.getString(KEY_PATH, null)?.trim().takeUnless { it.isNullOrEmpty() }
    prefs.edit().remove(KEY_PATH).apply()
    return value
  }
}
