import Foundation
import Speech
import React

@objc(AppleSpeechModule)
class AppleSpeechModule: NSObject {
  private var recognitionTask: SFSpeechRecognitionTask?
  private let lock = NSLock()

  @objc static func requiresMainQueueSetup() -> Bool { false }

  private func authStatusString(_ status: SFSpeechRecognizerAuthorizationStatus) -> String {
    switch status {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "notDetermined"
    @unknown default: return "notDetermined"
    }
  }

  private func formatTimestamp(_ seconds: TimeInterval) -> String {
    let totalSeconds = max(0, Int(seconds.rounded(.down)))
    let minutes = totalSeconds / 60
    let secs = totalSeconds % 60
    return String(format: "%02d:%02d", minutes, secs)
  }

  @objc(getAuthorizationStatus:rejecter:)
  func getAuthorizationStatus(
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    resolver(authStatusString(SFSpeechRecognizer.authorizationStatus()))
  }

  @objc(requestAuthorization:rejecter:)
  func requestAuthorization(
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    SFSpeechRecognizer.requestAuthorization { status in
      resolver(self.authStatusString(status))
    }
  }

  @objc(isOnDeviceAvailable:rejecter:)
  func isOnDeviceAvailable(
    localeIdentifier: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier)) else {
      resolver(false)
      return
    }
    if #available(iOS 13, *) {
      resolver(recognizer.supportsOnDeviceRecognition)
    } else {
      resolver(false)
    }
  }

  @objc(cancel:rejecter:)
  func cancel(
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    lock.lock()
    recognitionTask?.cancel()
    recognitionTask = nil
    lock.unlock()
    resolver(nil)
  }

  @objc(transcribeFile:onDevice:locale:resolver:rejecter:)
  func transcribeFile(
    path: String,
    onDevice: Bool,
    locale: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    lock.lock()
    recognitionTask?.cancel()
    recognitionTask = nil
    lock.unlock()

    let cleanPath: String
    if path.hasPrefix("file://") {
      cleanPath = String(path.dropFirst(7))
    } else {
      cleanPath = path
    }

    let fileURL = URL(fileURLWithPath: cleanPath)
    guard FileManager.default.fileExists(atPath: cleanPath) else {
      rejecter("FILE_NOT_FOUND", "Audio file not found", nil)
      return
    }

    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)) else {
      rejecter("LOCALE_UNSUPPORTED", "Speech locale is not supported", nil)
      return
    }

    guard recognizer.isAvailable else {
      rejecter("RECOGNIZER_UNAVAILABLE", "Speech recognizer is not available", nil)
      return
    }

    let request = SFSpeechURLRecognitionRequest(url: fileURL)
    request.shouldReportPartialResults = false

    if #available(iOS 13, *) {
      if onDevice {
        guard recognizer.supportsOnDeviceRecognition else {
          rejecter(
            "ON_DEVICE_UNAVAILABLE",
            "On-device speech recognition is not available for this language. Download the language in iOS Settings or use Whisper.",
            nil
          )
          return
        }
        request.requiresOnDeviceRecognition = true
      }
    } else if onDevice {
      rejecter("ON_DEVICE_UNAVAILABLE", "On-device speech recognition requires iOS 13 or later", nil)
      return
    }

    lock.lock()
    recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self = self else { return }

      if let error = error as NSError? {
        if error.domain == "kAFAssistantErrorDomain" && error.code == 216 {
          return
        }
        if error.domain == "kLSRErrorDomain" && error.code == 301 {
          return
        }
        rejecter("TRANSCRIBE_ERROR", error.localizedDescription, error)
        self.lock.lock()
        self.recognitionTask = nil
        self.lock.unlock()
        return
      }

      guard let result = result, result.isFinal else { return }

      let transcription = result.bestTranscription
      let fullText = transcription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)

      var segments: [[String: Any]] = []
      for (index, segment) in transcription.segments.enumerated() {
        let startMs = Int((segment.timestamp * 1000).rounded())
        let endMs = Int(((segment.timestamp + segment.duration) * 1000).rounded())
        segments.append([
          "id": String(index),
          "text": segment.substring.trimmingCharacters(in: .whitespacesAndNewlines),
          "startMs": startMs,
          "endMs": endMs,
          "startTime": self.formatTimestamp(segment.timestamp),
        ])
      }

      resolver([
        "fullText": fullText,
        "segments": segments,
      ])

      self.lock.lock()
      self.recognitionTask = nil
      self.lock.unlock()
    }
    lock.unlock()
  }
}
