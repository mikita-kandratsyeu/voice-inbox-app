#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DownloadActivityModule, NSObject)

RCT_EXTERN_METHOD(start:(NSString *)sessionId
                  modelId:(NSString *)modelId
                  title:(NSString *)title
                  label:(NSString *)label
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(update:(nonnull NSNumber *)progress
                  title:(NSString *)title
                  label:(NSString *)label
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
