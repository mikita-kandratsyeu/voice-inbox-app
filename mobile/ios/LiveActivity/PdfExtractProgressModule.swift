import Foundation
import React

@objc(PdfExtractProgressModule)
class PdfExtractProgressModule: RCTEventEmitter {
  private var progressObserver: NSObjectProtocol?

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["progress"]
  }

  override func startObserving() {
    progressObserver = NotificationCenter.default.addObserver(
      forName: Notification.Name("VoiceInboxPdfExtractProgress"),
      object: nil,
      queue: .main
    ) { [weak self] notification in
      guard let userInfo = notification.userInfo else { return }
      let current = (userInfo["current"] as? NSNumber)?.intValue
      let total = (userInfo["total"] as? NSNumber)?.intValue
      guard let current, let total, total > 0 else { return }
      self?.sendEvent(withName: "progress", body: ["current": current, "total": total])
    }
  }

  override func stopObserving() {
    if let progressObserver {
      NotificationCenter.default.removeObserver(progressObserver)
      self.progressObserver = nil
    }
  }
}
