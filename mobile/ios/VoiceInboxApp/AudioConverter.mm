#import "AudioConverter.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>
#import <AudioToolbox/AudioToolbox.h>
#import <math.h>
#import <string.h>

static const int kTargetSampleRate = 16000;
static const int kTargetChannels = 1;
static const NSUInteger kWavCopyBufferSize = 64 * 1024;

static NSString *osStatusDetail(OSStatus status) {
  return [NSString stringWithFormat:@"AudioToolbox error %d", (int)status];
}

static void ensureOutputDirectory(NSString *filePath) {
  NSString *directory = [filePath stringByDeletingLastPathComponent];
  if (directory.length) {
    [[NSFileManager defaultManager] createDirectoryAtPath:directory
                              withIntermediateDirectories:YES
                                               attributes:nil
                                                    error:nil];
  }
}

static uint16_t readUInt16LE(NSData *data, NSUInteger offset) {
  const uint8_t *bytes = (const uint8_t *)data.bytes;
  return (uint16_t)(bytes[offset] | (bytes[offset + 1] << 8));
}

static uint32_t readUInt32LE(NSData *data, NSUInteger offset) {
  const uint8_t *bytes = (const uint8_t *)data.bytes;
  return (uint32_t)(bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24));
}

static void appendUInt16LE(NSMutableData *data, uint16_t value) {
  uint8_t bytes[] = {
    (uint8_t)(value & 0xff),
    (uint8_t)((value >> 8) & 0xff),
  };
  [data appendBytes:bytes length:sizeof(bytes)];
}

static void appendUInt32LE(NSMutableData *data, uint32_t value) {
  uint8_t bytes[] = {
    (uint8_t)(value & 0xff),
    (uint8_t)((value >> 8) & 0xff),
    (uint8_t)((value >> 16) & 0xff),
    (uint8_t)((value >> 24) & 0xff),
  };
  [data appendBytes:bytes length:sizeof(bytes)];
}

static NSMutableData *buildWavHeader(uint32_t sampleRate, uint16_t channels, uint16_t bitsPerSample, uint32_t dataSize) {
  uint32_t byteRate = sampleRate * channels * (bitsPerSample / 8);
  uint32_t blockAlign = channels * (bitsPerSample / 8);
  uint32_t chunkSize = 36 + dataSize;

  NSMutableData *wav = [NSMutableData dataWithCapacity:44];
  [wav appendBytes:"RIFF" length:4];
  appendUInt32LE(wav, chunkSize);
  [wav appendBytes:"WAVE" length:4];
  [wav appendBytes:"fmt " length:4];
  appendUInt32LE(wav, 16);
  appendUInt16LE(wav, 1);
  appendUInt16LE(wav, channels);
  appendUInt32LE(wav, sampleRate);
  appendUInt32LE(wav, byteRate);
  appendUInt16LE(wav, (uint16_t)blockAlign);
  appendUInt16LE(wav, bitsPerSample);
  [wav appendBytes:"data" length:4];
  appendUInt32LE(wav, dataSize);
  return wav;
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

RCT_EXPORT_METHOD(createWavChunk:(NSString *)inputPath
                  outputPath:(NSString *)outputPath
                  startMs:(nonnull NSNumber *)startMs
                  durationMs:(nonnull NSNumber *)durationMs
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSString *output = [outputPath hasPrefix:@"file://"] ? [outputPath substringFromIndex:7] : outputPath;

  NSString *input = nil;
  if ([inputPath hasPrefix:@"file://"]) {
    NSURL *u = [NSURL URLWithString:inputPath];
    if (u.path.length) input = u.path;
  }
  if (!input.length) input = [inputPath hasPrefix:@"file://"] ? [inputPath substringFromIndex:7] : inputPath;
  NSString *resolved = [NSURL fileURLWithPath:input].path;
  if (resolved.length) input = resolved;

  NSFileManager *fm = [NSFileManager defaultManager];
  if (![fm fileExistsAtPath:input]) {
    reject(@"E_WAV_CHUNK", @"File not found", nil);
    return;
  }

  NSFileHandle *inFile = [NSFileHandle fileHandleForReadingAtPath:input];
  if (!inFile) {
    reject(@"E_WAV_CHUNK", @"Could not open input WAV", nil);
    return;
  }

  @try {
    NSData *riffHeader = [inFile readDataOfLength:12];
    if (riffHeader.length < 12 ||
        memcmp(riffHeader.bytes, "RIFF", 4) != 0 ||
        memcmp((const uint8_t *)riffHeader.bytes + 8, "WAVE", 4) != 0) {
      reject(@"E_WAV_CHUNK", @"Unsupported WAV header", nil);
      [inFile closeFile];
      return;
    }

    uint16_t audioFormat = 0;
    uint16_t channels = 0;
    uint32_t sampleRate = 0;
    uint16_t bitsPerSample = 0;
    uint64_t dataOffset = 0;
    uint32_t dataSize = 0;

    while (true) {
      NSData *chunkHeader = [inFile readDataOfLength:8];
      if (chunkHeader.length < 8) break;

      const char *chunkId = (const char *)chunkHeader.bytes;
      uint32_t chunkSize = readUInt32LE(chunkHeader, 4);
      uint64_t chunkDataOffset = inFile.offsetInFile;

      if (memcmp(chunkId, "fmt ", 4) == 0) {
        NSData *fmt = [inFile readDataOfLength:chunkSize];
        if (fmt.length < 16) {
          reject(@"E_WAV_CHUNK", @"Invalid WAV fmt chunk", nil);
          [inFile closeFile];
          return;
        }
        audioFormat = readUInt16LE(fmt, 0);
        channels = readUInt16LE(fmt, 2);
        sampleRate = readUInt32LE(fmt, 4);
        bitsPerSample = readUInt16LE(fmt, 14);
        if (chunkSize % 2 != 0) {
          [inFile seekToFileOffset:chunkDataOffset + chunkSize + 1];
        }
      } else if (memcmp(chunkId, "data", 4) == 0) {
        dataOffset = chunkDataOffset;
        dataSize = chunkSize;
        break;
      } else {
        [inFile seekToFileOffset:chunkDataOffset + chunkSize + (chunkSize % 2)];
      }
    }

    if (audioFormat != 1 || channels == 0 || sampleRate == 0 || bitsPerSample == 0 || dataOffset == 0) {
      reject(@"E_WAV_CHUNK", @"Only PCM WAV chunks are supported", nil);
      [inFile closeFile];
      return;
    }

    uint32_t bytesPerFrame = channels * (bitsPerSample / 8);
    uint64_t fileSize = 0;
    NSDictionary *fileAttrs = [fm attributesOfItemAtPath:input error:nil];
    if (fileAttrs) {
      fileSize = [fileAttrs fileSize];
    }
    // Use on-disk PCM length; WAV headers may under-report data chunk size for long recordings.
    uint64_t availableBytes = fileSize > dataOffset ? fileSize - dataOffset : 0;
    uint64_t availableFrames = availableBytes / bytesPerFrame;
    uint64_t startFrame = (uint64_t)llround((startMs.doubleValue * sampleRate) / 1000.0);
    uint64_t requestedFrames = (uint64_t)llround((durationMs.doubleValue * sampleRate) / 1000.0);
    if (startFrame >= availableFrames || requestedFrames == 0) {
      reject(@"E_WAV_CHUNK", @"Chunk is outside WAV data", nil);
      [inFile closeFile];
      return;
    }

    uint64_t framesToCopy = MIN(requestedFrames, availableFrames - startFrame);
    uint32_t bytesToCopy = (uint32_t)(framesToCopy * bytesPerFrame);
    uint64_t readOffset = dataOffset + startFrame * bytesPerFrame;

    ensureOutputDirectory(output);
    [fm removeItemAtPath:output error:nil];
    if (![fm createFileAtPath:output contents:nil attributes:nil]) {
      reject(@"E_WAV_CHUNK", @"Could not create output WAV", nil);
      [inFile closeFile];
      return;
    }

    NSFileHandle *outFile = [NSFileHandle fileHandleForWritingAtPath:output];
    if (!outFile) {
      reject(@"E_WAV_CHUNK", @"Could not open output WAV", nil);
      [inFile closeFile];
      return;
    }

    [outFile writeData:buildWavHeader(sampleRate, channels, bitsPerSample, bytesToCopy)];
    [inFile seekToFileOffset:readOffset];

    uint32_t remaining = bytesToCopy;
    while (remaining > 0) {
      NSUInteger toRead = MIN((NSUInteger)remaining, kWavCopyBufferSize);
      NSData *buffer = [inFile readDataOfLength:toRead];
      if (buffer.length == 0) break;
      [outFile writeData:buffer];
      remaining -= (uint32_t)buffer.length;
    }

    [outFile closeFile];
    [inFile closeFile];
    resolve(output);
  } @catch (NSException *exception) {
    [inFile closeFile];
    reject(@"E_WAV_CHUNK", exception.reason ?: @"Failed to create WAV chunk", nil);
  }
}

@end
