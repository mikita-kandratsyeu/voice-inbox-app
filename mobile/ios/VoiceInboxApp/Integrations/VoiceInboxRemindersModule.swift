import EventKit
import Foundation
import React

@objc(VoiceInboxReminders)
class VoiceInboxReminders: NSObject {
  private let eventStore = EKEventStore()

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(requestPermission:rejecter:)
  func requestPermission(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    eventStore.requestAccess(to: .reminder) { granted, error in
      if let error {
        reject("ERROR", "Failed to request reminders access", error)
        return
      }
      resolve(granted)
    }
  }

  @objc(addReminder:resolve:rejecter:)
  func addReminder(
    _ config: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    let reminder = EKReminder(eventStore: eventStore)
    if let priority = config["priority"] as? NSNumber {
      reminder.priority = priority.intValue
    }
    reminder.notes = config["note"] as? String
    reminder.title = config["title"] as? String
    reminder.calendar = eventStore.defaultCalendarForNewReminders()

    guard let timestampMs = config["timestamp"] as? Double else {
      reject("ERROR", "Missing reminder timestamp", nil)
      return
    }

    let reminderDate = Date(timeIntervalSince1970: timestampMs / 1000)
    reminder.dueDateComponents = Calendar.current.dateComponents(
      [.year, .month, .day, .hour, .minute],
      from: reminderDate,
    )
    reminder.addAlarm(EKAlarm(absoluteDate: reminderDate))

    do {
      try eventStore.save(reminder, commit: true)
      resolve([
        "id": reminder.calendarItemIdentifier,
        "title": reminder.title ?? "",
        "note": reminder.notes ?? "",
      ])
    } catch {
      reject("ERROR", error.localizedDescription, error)
    }
  }
}
