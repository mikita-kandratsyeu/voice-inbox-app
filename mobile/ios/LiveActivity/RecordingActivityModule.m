#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RecordingActivityModule, NSObject)

RCT_EXTERN_METHOD(start:(NSString *)sessionId
                  title:(NSString *)title
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(update:(BOOL)isRecording
                  elapsedSeconds:(nonnull NSNumber *)elapsedSeconds
                  title:(NSString *)title
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
