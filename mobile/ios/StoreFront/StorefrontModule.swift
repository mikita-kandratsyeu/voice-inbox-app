import Foundation
import StoreKit
import UIKit

@objc(StorefrontModule)
class StorefrontModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  private static func resolveForegroundWindowScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
  }

  @objc
  func showManageSubscriptions(_ resolve: @escaping RCTPromiseResolveBlock,
                               rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 15.0, *) {
      Task { @MainActor in
        guard let scene = Self.resolveForegroundWindowScene() else {
          reject("no_window_scene", "No active UIWindowScene for subscription management", nil)
          return
        }
        do {
          try await AppStore.showManageSubscriptions(in: scene)
          resolve(true)
        } catch {
          reject("show_manage_subscriptions", error.localizedDescription, error)
        }
      }
    } else {
      reject("ios_version", "Manage subscriptions requires iOS 15 or later", nil)
    }
  }

  @objc
  func getCountryCode(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task { @MainActor in
      if let storefront = await Storefront.current {
        resolve(storefront.countryCode)
        return
      }

      if let legacy = SKPaymentQueue.default().storefront {
        resolve(legacy.countryCode)
        return
      }

      resolve(nil)
    }
  }
}
