#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VoiceInboxReminders, NSObject)

RCT_EXTERN_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addReminder:(NSDictionary *)config
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
