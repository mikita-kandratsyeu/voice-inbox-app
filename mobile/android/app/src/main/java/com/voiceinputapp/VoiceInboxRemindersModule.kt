package com.voiceinputapp

import android.Manifest
import android.content.ContentUris
import android.content.ContentValues
import android.content.pm.PackageManager
import android.provider.CalendarContract
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.TimeZone

class VoiceInboxRemindersModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "VoiceInboxReminders"

  @ReactMethod
  fun requestPermission(promise: Promise) {
    val granted =
      ContextCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.WRITE_CALENDAR,
      ) == PackageManager.PERMISSION_GRANTED
    promise.resolve(granted)
  }

  @ReactMethod
  fun addReminder(config: ReadableMap, promise: Promise) {
    val title = if (config.hasKey("title")) config.getString("title") else null
    val note = if (config.hasKey("note")) config.getString("note") else null
    val timestampMs =
      if (config.hasKey("timestamp")) config.getDouble("timestamp").toLong() else System.currentTimeMillis()

    if (title.isNullOrBlank()) {
      promise.reject("ERROR", "Missing reminder title")
      return
    }

    if (
      ContextCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.WRITE_CALENDAR,
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject("ERROR", "Calendar write permission denied")
      return
    }

    try {
      val values =
        ContentValues().apply {
          put(CalendarContract.Events.CALENDAR_ID, 1)
          put(CalendarContract.Events.TITLE, title)
          put(CalendarContract.Events.DESCRIPTION, note ?: "")
          put(CalendarContract.Events.DTSTART, timestampMs)
          put(CalendarContract.Events.DTEND, timestampMs + 60 * 60 * 1000)
          put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
          put(CalendarContract.Events.HAS_ALARM, 1)
        }

      val eventUri =
        reactApplicationContext.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
          ?: run {
            promise.reject("ERROR", "Failed to create calendar reminder event")
            return
          }

      val eventId = ContentUris.parseId(eventUri)
      val reminderValues =
        ContentValues().apply {
          put(CalendarContract.Reminders.EVENT_ID, eventId)
          put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT)
          put(CalendarContract.Reminders.MINUTES, 0)
        }

      reactApplicationContext.contentResolver.insert(
        CalendarContract.Reminders.CONTENT_URI,
        reminderValues,
      )

      promise.resolve(
        com.facebook.react.bridge.Arguments.createMap().apply {
          putString("id", eventId.toString())
          putString("title", title)
          putString("note", note ?: "")
        },
      )
    } catch (error: Exception) {
      promise.reject("ERROR", error.message, error)
    }
  }
}
