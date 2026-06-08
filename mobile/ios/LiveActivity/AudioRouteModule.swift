import AVFoundation
import Foundation
import React

@objc(AudioRouteModule)
class AudioRouteModule: RCTEventEmitter {
  private var routeObserver: NSObjectProtocol?

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["audioRouteChanged"]
  }

  override func startObserving() {
    let session = AVAudioSession.sharedInstance()
    routeObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: session,
      queue: .main
    ) { [weak self] notification in
      self?.handleRouteChange(notification)
    }
  }

  override func stopObserving() {
    if let routeObserver {
      NotificationCenter.default.removeObserver(routeObserver)
      self.routeObserver = nil
    }
  }

  private func handleRouteChange(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
          let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue)
    else {
      return
    }

    switch reason {
    case .newDeviceAvailable, .oldDeviceUnavailable:
      sendEvent(withName: "audioRouteChanged", body: nil)
    default:
      break
    }
  }
}
