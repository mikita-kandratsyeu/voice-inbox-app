import FirebaseAppCheck
import FirebaseCore
import FirebaseMessaging
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import RNBootSplash
import UIKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private enum HomeScreenQuickAction: CaseIterable {
    case startRecording
    case newTextNote
    case allTasks

    var type: String {
      let bid = Bundle.main.bundleIdentifier ?? ""
      switch self {
      case .startRecording: return "\(bid).quickAction.startRecording"
      case .newTextNote: return "\(bid).quickAction.newTextNote"
      case .allTasks: return "\(bid).quickAction.allTasks"
      }
    }

    var url: URL? {
      switch self {
      case .startRecording: return URL(string: "voiceinbox://record/start")
      case .newTextNote: return URL(string: "voiceinbox://note/text")
      case .allTasks: return URL(string: "voiceinbox://tasks")
      }
    }

    static func url(forShortcutType shortcutType: String) -> URL? {
      allCases.first { $0.type == shortcutType }?.url
    }
  }

  private func handleQuickAction(_ shortcutItem: UIApplicationShortcutItem, application: UIApplication) -> Bool {
    guard let url = HomeScreenQuickAction.url(forShortcutType: shortcutItem.type) else { return false }
    return RCTLinkingManager.application(application, open: url, options: [:])
  }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let appCheckProvider = AppCheckDebugProviderFactory()
    #if DEBUG
    AppCheck.setAppCheckProviderFactory(appCheckProvider)
    #else
    AppCheck.setAppCheckProviderFactory(DeviceCheckProviderFactory())
    #endif

    FirebaseApp.configure()

    let center = UNUserNotificationCenter.current()
    center.delegate = self
    application.registerForRemoteNotifications()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    var mergedLaunchOptions = launchOptions ?? [:]
    if let shortcutItem = mergedLaunchOptions[UIApplication.LaunchOptionsKey.shortcutItem] as? UIApplicationShortcutItem,
       mergedLaunchOptions[UIApplication.LaunchOptionsKey.url] == nil,
       let fromShortcut = HomeScreenQuickAction.url(forShortcutType: shortcutItem.type) {
      mergedLaunchOptions[UIApplication.LaunchOptionsKey.url] = fromShortcut
    }

    factory.startReactNative(
      withModuleName: "VoiceInboxApp",
      in: window,
      launchOptions: mergedLaunchOptions.isEmpty ? nil : mergedLaunchOptions
    )

    if #available(iOS 16.2, *) {
      RecordingLiveActivityManager.shared.endAllActivities()
    }

    return true
  }

  func applicationWillTerminate(_ application: UIApplication) {
    if #available(iOS 16.2, *) {
      RecordingLiveActivityManager.shared.endAllActivities()
    }
  }

  func application(
    _ application: UIApplication,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    completionHandler(handleQuickAction(shortcutItem, application: application))
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
  }

  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    completionHandler(.noData)
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    // Firebase will retry when network is available
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.alert, .badge, .sound])
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }
}
