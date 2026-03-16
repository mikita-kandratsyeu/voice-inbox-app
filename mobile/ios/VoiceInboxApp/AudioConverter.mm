#import "AudioConverter.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>
#import <AudioToolbox/AudioToolbox.h>

static const int kTargetSampleRate = 16000;
static const int kTargetChannels = 1;

static NSString *osStatusDetail(OSStatus status) {
  return [NSString stringWithFormat:@"AudioToolbox error %d", (int)status];
}

@implementation AudioConverter

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(convertToWav:(NSString *)inputPath
                  outputPath:(NSString *)outputPath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSString *output = [outputPath hasPrefix:@"file://"] ? [outputPath substringFromIndex:7] : outputPath;

  // Resolve input path: handle file:// and percent-encoding so fileExistsAtPath finds the file
  NSString *input = nil;
  if ([inputPath hasPrefix:@"file://"]) {
    NSURL *u = [NSURL URLWithString:inputPath];
    if (u.path.length) input = u.path;
  }
  if (!input.length) input = [inputPath hasPrefix:@"file://"] ? [inputPath substringFromIndex:7] : inputPath;
  // Normalize (e.g. resolve /var -> /private/var on iOS)
  NSString *resolved = [NSURL fileURLWithPath:input].path;
  if (resolved.length) input = resolved;

  NSFileManager *fm = [NSFileManager defaultManager];
  BOOL exists = [fm fileExistsAtPath:input];
  if (!exists) {
    reject(@"E_CONVERT", @"File not found", nil);
    return;
  }

  // ExtAudioFile can fail with 'what' (2003334207) on paths with Cyrillic/special chars. Copy to temp with ASCII name first.
  NSString *tempInput = [NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"conv_%u.m4a", (unsigned)arc4random()]];
  NSError *copyErr = nil;
  if (![fm copyItemAtPath:input toPath:tempInput error:&copyErr]) {
    reject(@"E_CONVERT", copyErr.localizedDescription ?: @"Could not copy file", nil);
    return;
  }
  NSURL *inputURL = [NSURL fileURLWithPath:tempInput];

  ExtAudioFileRef extFile = NULL;
  OSStatus err = ExtAudioFileOpenURL((__bridge CFURLRef)inputURL, &extFile);
  if (err != noErr || !extFile) {
    [fm removeItemAtPath:tempInput error:nil];
    reject(@"E_CONVERT", osStatusDetail(err), nil);
    return;
  }

  // Request output as 16-bit PCM, 16kHz, mono (conversion done by ExtAudioFile)
  AudioStreamBasicDescription clientFormat = {0};
  clientFormat.mSampleRate = kTargetSampleRate;
  clientFormat.mFormatID = kAudioFormatLinearPCM;
  clientFormat.mFormatFlags = kLinearPCMFormatFlagIsPacked | kLinearPCMFormatFlagIsSignedInteger;
  clientFormat.mBitsPerChannel = 16;
  clientFormat.mChannelsPerFrame = kTargetChannels;
  clientFormat.mBytesPerFrame = clientFormat.mChannelsPerFrame * (clientFormat.mBitsPerChannel / 8);
  clientFormat.mFramesPerPacket = 1;
  clientFormat.mBytesPerPacket = clientFormat.mBytesPerFrame * clientFormat.mFramesPerPacket;

  err = ExtAudioFileSetProperty(extFile, kExtAudioFileProperty_ClientDataFormat, sizeof(clientFormat), &clientFormat);
  if (err != noErr) {
    ExtAudioFileDispose(extFile);
    reject(@"E_CONVERT", osStatusDetail(err), nil);
    return;
  }

  UInt32 frameSize = 4096;
  UInt32 numChannels = clientFormat.mChannelsPerFrame;
  UInt32 bufSize = frameSize * clientFormat.mBytesPerFrame;
  char *buf = (char *)malloc(bufSize);
  NSMutableData *pcmData = [NSMutableData data];

  while (1) {
    AudioBufferList bufList;
    bufList.mNumberBuffers = 1;
    bufList.mBuffers[0].mNumberChannels = numChannels;
    bufList.mBuffers[0].mDataByteSize = bufSize;
    bufList.mBuffers[0].mData = buf;

    UInt32 numFrames = frameSize;
    err = ExtAudioFileRead(extFile, &numFrames, &bufList);
    if (err != noErr) {
      free(buf);
      ExtAudioFileDispose(extFile);
      [fm removeItemAtPath:tempInput error:nil];
      reject(@"E_CONVERT", osStatusDetail(err), nil);
      return;
    }
    if (numFrames == 0) break;
    [pcmData appendBytes:buf length:numFrames * clientFormat.mBytesPerFrame];
  }

  free(buf);
  ExtAudioFileDispose(extFile);
  [fm removeItemAtPath:tempInput error:nil];

  uint32_t sampleRate = (uint32_t)clientFormat.mSampleRate;
  uint16_t channels = (uint16_t)clientFormat.mChannelsPerFrame;
  uint16_t bitsPerSample = 16;
  uint32_t dataSize = (uint32_t)pcmData.length;
  uint32_t byteRate = sampleRate * channels * (bitsPerSample / 8);
  uint32_t blockAlign = channels * (bitsPerSample / 8);
  uint32_t chunkSize = 36 + dataSize;

  NSMutableData *wav = [NSMutableData dataWithCapacity:44 + dataSize];
  [wav appendBytes:"RIFF" length:4];
  [wav appendBytes:&chunkSize length:4];
  [wav appendBytes:"WAVE" length:4];
  [wav appendBytes:"fmt " length:4];
  uint32_t fmtChunkSize = 16;
  [wav appendBytes:&fmtChunkSize length:4];
  uint16_t audioFormat = 1;
  [wav appendBytes:&audioFormat length:2];
  [wav appendBytes:&channels length:2];
  [wav appendBytes:&sampleRate length:4];
  [wav appendBytes:&byteRate length:4];
  [wav appendBytes:&blockAlign length:2];
  [wav appendBytes:&bitsPerSample length:2];
  [wav appendBytes:"data" length:4];
  [wav appendBytes:&dataSize length:4];
  [wav appendData:pcmData];

  if (![wav writeToFile:output atomically:YES]) {
    reject(@"E_CONVERT", @"Failed to write WAV file", nil);
    return;
  }
  resolve(output);
}


@end
