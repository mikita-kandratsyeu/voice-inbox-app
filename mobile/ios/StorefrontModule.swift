import Foundation
import StoreKit

@objc(StorefrontModule)
class StorefrontModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
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
