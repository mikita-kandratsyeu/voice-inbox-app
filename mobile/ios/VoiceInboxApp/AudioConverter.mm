#import "AudioConverter.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>
#import <AudioToolbox/AudioToolbox.h>
#import <PDFKit/PDFKit.h>
#import <Vision/Vision.h>
#import <UIKit/UIKit.h>
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

static const int kVadFrameMs = 30;
static const int kVadPreRollFrames = 15;
static const int kVadHangoverFrames = 15;
static const int kVadOnsetFrames = 2;

typedef struct {
  BOOL hasSpeech;
  double trimStartMs;
  double trimDurationMs;
} SpeechAnalysisResult;

static SpeechAnalysisResult analyzeMonoPcmSpeech(const int16_t *samples, size_t sampleCount, uint32_t sampleRate) {
  SpeechAnalysisResult empty = {NO, 0.0, 0.0};
  if (sampleCount == 0 || sampleRate == 0) {
    return empty;
  }

  NSUInteger frameSamples = MAX((NSUInteger)1, (sampleRate * kVadFrameMs) / 1000);
  NSUInteger frameCount = (sampleCount + frameSamples - 1) / frameSamples;
  if (frameCount == 0) {
    return empty;
  }

  NSMutableArray<NSNumber *> *rmsValues = [NSMutableArray arrayWithCapacity:frameCount];
  for (NSUInteger frame = 0; frame < frameCount; frame++) {
    NSUInteger start = frame * frameSamples;
    NSUInteger end = MIN(start + frameSamples, sampleCount);
    double sum = 0.0;
    for (NSUInteger i = start; i < end; i++) {
      double normalized = (double)samples[i] / 32768.0;
      sum += normalized * normalized;
    }
    NSUInteger count = MAX((NSUInteger)1, end - start);
    [rmsValues addObject:@(sqrt(sum / (double)count))];
  }

  NSArray<NSNumber *> *sorted = [rmsValues sortedArrayUsingSelector:@selector(compare:)];
  NSUInteger noiseIndex = (NSUInteger)floor(sorted.count * 0.2);
  if (noiseIndex >= sorted.count) noiseIndex = sorted.count - 1;
  double noiseFloor = sorted[noiseIndex].doubleValue;
  double threshold = MAX(noiseFloor * 3.5, 0.008);

  BOOL *voiceFrames = (BOOL *)calloc(frameCount, sizeof(BOOL));
  BOOL *smoothed = (BOOL *)calloc(frameCount, sizeof(BOOL));
  if (!voiceFrames || !smoothed) {
    free(voiceFrames);
    free(smoothed);
    return empty;
  }

  for (NSUInteger i = 0; i < frameCount; i++) {
    voiceFrames[i] = rmsValues[i].doubleValue >= threshold;
  }

  int hangover = 0;
  int onset = 0;
  BOOL inSpeech = NO;
  for (NSUInteger i = 0; i < frameCount; i++) {
    BOOL isVoice = voiceFrames[i];
    if (!inSpeech && isVoice) {
      onset += 1;
      if (onset >= kVadOnsetFrames) {
        inSpeech = YES;
        hangover = kVadHangoverFrames;
        onset = 0;
        NSUInteger preStart = i >= (NSUInteger)kVadPreRollFrames ? i - kVadPreRollFrames : 0;
        for (NSUInteger j = preStart; j <= i; j++) {
          smoothed[j] = YES;
        }
      }
    } else if (inSpeech && isVoice) {
      hangover = kVadHangoverFrames;
      smoothed[i] = YES;
    } else if (inSpeech && !isVoice) {
      if (hangover > 0) {
        hangover -= 1;
        smoothed[i] = YES;
      } else {
        inSpeech = NO;
      }
    } else {
      onset = 0;
    }
  }

  NSInteger firstSpeechFrame = -1;
  NSInteger lastSpeechFrame = -1;
  for (NSUInteger i = 0; i < frameCount; i++) {
    if (smoothed[i]) {
      if (firstSpeechFrame < 0) firstSpeechFrame = (NSInteger)i;
      lastSpeechFrame = (NSInteger)i;
    }
  }

  free(voiceFrames);
  free(smoothed);

  if (firstSpeechFrame < 0 || lastSpeechFrame < 0) {
    return empty;
  }

  double trimStartMs = firstSpeechFrame * kVadFrameMs;
  double trimEndMs = (lastSpeechFrame + 1) * kVadFrameMs;
  double trimDurationMs = MAX(0.0, trimEndMs - trimStartMs);
  return (SpeechAnalysisResult){ trimDurationMs > 0.0, trimStartMs, trimDurationMs };
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
  if (!buf) {
    ExtAudioFileDispose(extFile);
    [fm removeItemAtPath:tempInput error:nil];
    reject(@"E_CONVERT", @"Out of memory", nil);
    return;
  }

  ensureOutputDirectory(output);
  [fm removeItemAtPath:output error:nil];
  if (![fm createFileAtPath:output contents:nil attributes:nil]) {
    free(buf);
    ExtAudioFileDispose(extFile);
    [fm removeItemAtPath:tempInput error:nil];
    reject(@"E_CONVERT", @"Could not create output WAV", nil);
    return;
  }

  NSFileHandle *outFile = [NSFileHandle fileHandleForWritingAtPath:output];
  if (!outFile) {
    free(buf);
    ExtAudioFileDispose(extFile);
    [fm removeItemAtPath:tempInput error:nil];
    reject(@"E_CONVERT", @"Could not open output WAV", nil);
    return;
  }

  uint32_t sampleRate = (uint32_t)clientFormat.mSampleRate;
  uint16_t channels = (uint16_t)clientFormat.mChannelsPerFrame;
  uint16_t bitsPerSample = 16;
  [outFile writeData:buildWavHeader(sampleRate, channels, bitsPerSample, 0)];

  uint32_t totalDataSize = 0;
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
      [outFile closeFile];
      [fm removeItemAtPath:output error:nil];
      reject(@"E_CONVERT", osStatusDetail(err), nil);
      return;
    }
    if (numFrames == 0) break;

    NSUInteger bytesRead = numFrames * clientFormat.mBytesPerFrame;
    NSData *chunk = [NSData dataWithBytes:buf length:bytesRead];
    [outFile writeData:chunk];
    totalDataSize += (uint32_t)bytesRead;
  }

  free(buf);
  ExtAudioFileDispose(extFile);
  [fm removeItemAtPath:tempInput error:nil];

  [outFile seekToFileOffset:0];
  [outFile writeData:buildWavHeader(sampleRate, channels, bitsPerSample, totalDataSize)];
  [outFile closeFile];
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

RCT_EXPORT_METHOD(analyzeWavSpeech:(NSString *)inputPath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
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
    reject(@"E_VAD", @"File not found", nil);
    return;
  }

  NSFileHandle *inFile = [NSFileHandle fileHandleForReadingAtPath:input];
  if (!inFile) {
    reject(@"E_VAD", @"Could not open input WAV", nil);
    return;
  }

  @try {
    NSData *riffHeader = [inFile readDataOfLength:12];
    if (riffHeader.length < 12 ||
        memcmp(riffHeader.bytes, "RIFF", 4) != 0 ||
        memcmp((const uint8_t *)riffHeader.bytes + 8, "WAVE", 4) != 0) {
      reject(@"E_VAD", @"Unsupported WAV header", nil);
      [inFile closeFile];
      return;
    }

    uint16_t audioFormat = 0;
    uint16_t channels = 0;
    uint32_t sampleRate = 0;
    uint16_t bitsPerSample = 0;
    uint64_t dataOffset = 0;

    while (true) {
      NSData *chunkHeader = [inFile readDataOfLength:8];
      if (chunkHeader.length < 8) break;

      const char *chunkId = (const char *)chunkHeader.bytes;
      uint32_t chunkSize = readUInt32LE(chunkHeader, 4);
      uint64_t chunkDataOffset = inFile.offsetInFile;

      if (memcmp(chunkId, "fmt ", 4) == 0) {
        NSData *fmt = [inFile readDataOfLength:chunkSize];
        if (fmt.length < 16) {
          reject(@"E_VAD", @"Invalid WAV fmt chunk", nil);
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
        break;
      } else {
        [inFile seekToFileOffset:chunkDataOffset + chunkSize + (chunkSize % 2)];
      }
    }

    if (audioFormat != 1 || channels == 0 || sampleRate == 0 || bitsPerSample != 16 || dataOffset == 0) {
      reject(@"E_VAD", @"Only PCM WAV speech analysis is supported", nil);
      [inFile closeFile];
      return;
    }

    NSDictionary *fileAttrs = [fm attributesOfItemAtPath:input error:nil];
    uint64_t fileSize = fileAttrs ? [fileAttrs fileSize] : 0;
    uint64_t availableBytes = fileSize > dataOffset ? fileSize - dataOffset : 0;
    uint32_t bytesPerFrame = channels * (bitsPerSample / 8);
    uint64_t frameCount = bytesPerFrame > 0 ? availableBytes / bytesPerFrame : 0;
    if (frameCount == 0) {
      reject(@"E_VAD", @"No audio data", nil);
      [inFile closeFile];
      return;
    }

    [inFile seekToFileOffset:dataOffset];
    NSData *pcmData = [inFile readDataOfLength:(NSUInteger)MIN(availableBytes, (uint64_t)NSUIntegerMax)];
    [inFile closeFile];

    const int16_t *pcmSamples = (const int16_t *)pcmData.bytes;
    size_t pcmSampleCount = pcmData.length / 2;
    NSMutableData *monoData = [NSMutableData dataWithLength:(pcmSampleCount / channels) * sizeof(int16_t)];
    int16_t *monoSamples = (int16_t *)monoData.mutableBytes;
    size_t monoCount = 0;
    for (size_t frame = 0; frame < pcmSampleCount / channels; frame++) {
      int32_t sum = 0;
      for (uint16_t ch = 0; ch < channels; ch++) {
        sum += pcmSamples[frame * channels + ch];
      }
      monoSamples[monoCount++] = (int16_t)(sum / (int32_t)channels);
    }

    SpeechAnalysisResult analysis = analyzeMonoPcmSpeech(monoSamples, monoCount, sampleRate);
    resolve(@{
      @"hasSpeech": @(analysis.hasSpeech),
      @"trimStartMs": @(analysis.trimStartMs),
      @"trimDurationMs": @(analysis.trimDurationMs),
    });
  } @catch (NSException *exception) {
    [inFile closeFile];
    reject(@"E_VAD", exception.reason ?: @"Speech analysis failed", nil);
  }
}

static const NSInteger kMaxPdfOcrPages = 100;
static NSString * const kVoiceInboxPdfExtractProgressNotification = @"VoiceInboxPdfExtractProgress";

static void emitPdfExtractProgress(NSInteger current, NSInteger total) {
  if (total <= 0) return;
  dispatch_async(dispatch_get_main_queue(), ^{
    [[NSNotificationCenter defaultCenter] postNotificationName:kVoiceInboxPdfExtractProgressNotification
                                                        object:nil
                                                      userInfo:@{@"current": @(current), @"total": @(total)}];
  });
}
static const CGFloat kPdfOcrRenderScale = 2.0;
static const CGFloat kMaxPdfOcrLongestSide = 2048.0;

static CGFloat effectivePdfOcrScale(PDFPage *page) {
  CGRect bounds = [page boundsForBox:kPDFDisplayBoxMediaBox];
  CGFloat maxDim = MAX(bounds.size.width, bounds.size.height);
  if (maxDim <= 0) return kPdfOcrRenderScale;
  CGFloat scale = kPdfOcrRenderScale;
  CGFloat longest = maxDim * scale;
  if (longest > kMaxPdfOcrLongestSide) {
    scale = kMaxPdfOcrLongestSide / maxDim;
  }
  return MAX(scale, 0.5);
}

static UIImage *renderPdfPageImageWithDraw(PDFPage *page, CGFloat scale) {
  CGRect bounds = [page boundsForBox:kPDFDisplayBoxMediaBox];
  CGSize size = CGSizeMake(MAX(bounds.size.width * scale, 1.0), MAX(bounds.size.height * scale, 1.0));
  UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:size];
  return [renderer imageWithActions:^(UIGraphicsImageRendererContext *ctx) {
    [[UIColor whiteColor] setFill];
    [ctx fillRect:CGRectMake(0, 0, size.width, size.height)];
    CGContextRef cg = ctx.CGContext;
    CGContextTranslateCTM(cg, 0, size.height);
    CGContextScaleCTM(cg, scale, -scale);
    [page drawWithBox:kPDFDisplayBoxMediaBox toContext:cg];
  }];
}

static NSString *resolvePdfInputPath(NSString *inputPath) {
  NSString *input = nil;
  if ([inputPath hasPrefix:@"file://"]) {
    NSURL *u = [NSURL URLWithString:inputPath];
    if (u.path.length) input = u.path;
  }
  if (!input.length) {
    input = [inputPath hasPrefix:@"file://"] ? [inputPath substringFromIndex:7] : inputPath;
  }
  NSString *resolved = [NSURL fileURLWithPath:input].path;
  if (resolved.length) input = resolved;
  return input;
}

static NSArray<NSString *> *visionLanguagesForHint(NSString *language) {
  NSString *normalized = language.length ? [[language lowercaseString] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] : @"";
  if ([normalized hasPrefix:@"ru"]) {
    return @[@"ru-RU", @"en-US"];
  }
  return @[@"en-US", @"ru-RU"];
}

static UIImage *renderPdfPageImage(PDFPage *page, CGFloat scale) {
  UIImage *drawn = renderPdfPageImageWithDraw(page, scale);
  if (drawn) {
    return drawn;
  }

  CGRect bounds = [page boundsForBox:kPDFDisplayBoxMediaBox];
  CGSize size = CGSizeMake(MAX(bounds.size.width * scale, 1.0), MAX(bounds.size.height * scale, 1.0));
  UIImage *thumbnail = [page thumbnailOfSize:size forBox:kPDFDisplayBoxMediaBox];
  if (!thumbnail) {
    return nil;
  }

  UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:size];
  return [renderer imageWithActions:^(UIGraphicsImageRendererContext *ctx) {
    [[UIColor whiteColor] setFill];
    [ctx fillRect:CGRectMake(0, 0, size.width, size.height)];
    [thumbnail drawInRect:CGRectMake(0, 0, size.width, size.height)];
  }];
}

static UIImage *renderPdfPageImageOnMainThread(PDFPage *page) {
  CGFloat scale = effectivePdfOcrScale(page);
  if ([NSThread isMainThread]) {
    return renderPdfPageImage(page, scale);
  }
  __block UIImage *image = nil;
  dispatch_sync(dispatch_get_main_queue(), ^{
    image = renderPdfPageImage(page, scale);
  });
  return image;
}

static NSString *pdfPagePlainText(PDFPage *page) {
  NSString *text = [page string];
  if (!text.length) {
    NSAttributedString *attr = [page attributedString];
    if (attr.string.length) {
      text = attr.string;
    }
  }
  if (!text.length) {
    CGRect pageRect = [page boundsForBox:kPDFDisplayBoxMediaBox];
    PDFSelection *selection = [page selectionForRect:pageRect];
    NSString *selectionText = selection.string;
    if (selectionText.length) {
      text = selectionText;
    }
  }
  return [text stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
}

static NSString *visionRecognizeTextFromImage(UIImage *image, NSArray<NSString *> *languages, BOOL *visionFailed) {
  if (visionFailed) *visionFailed = NO;
  if (!image.CGImage) {
    if (visionFailed) *visionFailed = YES;
    return @"";
  }

  __block NSString *text = @"";
  __block BOOL failed = NO;
  dispatch_semaphore_t sem = dispatch_semaphore_create(0);
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    @autoreleasepool {
      VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
      request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
      request.usesLanguageCorrection = YES;
      request.recognitionLanguages = languages;
      if (@available(iOS 16.0, *)) {
        request.automaticallyDetectsLanguage = YES;
      }

      VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:image.CGImage options:@{}];
      NSError *error = nil;
      if (![handler performRequests:@[request] error:&error]) {
        failed = YES;
      } else {
        NSMutableArray<NSString *> *lines = [NSMutableArray array];
        for (VNRecognizedTextObservation *observation in request.results) {
          VNRecognizedText *candidate = [[observation topCandidates:1] firstObject];
          if (candidate.string.length) {
            [lines addObject:candidate.string];
          }
        }
        text = [lines componentsJoinedByString:@"\n"];
      }
    }
    dispatch_semaphore_signal(sem);
  });
  dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
  if (visionFailed) *visionFailed = failed;
  return text;
}

static NSString *ocrPdfPageWithVision(PDFPage *page, NSArray<NSString *> *languages, BOOL *thumbnailFailed, BOOL *visionFailed) {
  if (thumbnailFailed) *thumbnailFailed = NO;
  if (visionFailed) *visionFailed = NO;

  UIImage *image = renderPdfPageImageOnMainThread(page);
  if (!image || !image.CGImage) {
    if (thumbnailFailed) *thumbnailFailed = YES;
    return @"";
  }

  return visionRecognizeTextFromImage(image, languages, visionFailed);
}

static NSString *extractPdfTextHybrid(PDFDocument *doc, NSArray<NSString *> *languages, NSMutableDictionary *stats) {
  NSInteger pageCount = MIN(doc.pageCount, kMaxPdfOcrPages);
  if (pageCount <= 0) return @"";

  NSInteger pagesTextLayer = 0;
  NSInteger pagesOcr = 0;
  NSInteger pagesEmpty = 0;
  NSInteger pagesThumbnailFailed = 0;
  NSInteger pagesVisionFailed = 0;

  NSMutableString *result = [NSMutableString string];
  for (NSInteger i = 0; i < pageCount; i++) {
    emitPdfExtractProgress(i + 1, pageCount);
    PDFPage *page = [doc pageAtIndex:i];
    NSString *pageText = pdfPagePlainText(page);
    if (pageText.length) {
      pagesTextLayer++;
    } else {
      BOOL thumbnailFailed = NO;
      BOOL visionFailed = NO;
      pageText = ocrPdfPageWithVision(page, languages, &thumbnailFailed, &visionFailed);
      pageText = [pageText stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
      if (thumbnailFailed) pagesThumbnailFailed++;
      if (visionFailed) pagesVisionFailed++;
      if (pageText.length) {
        pagesOcr++;
      } else {
        pagesEmpty++;
      }
    }
    if (pageText.length) {
      if (result.length) [result appendString:@"\n\n"];
      [result appendString:pageText];
    }
  }

  if (stats) {
    stats[@"docPageCount"] = @(doc.pageCount);
    stats[@"pageCount"] = @(pageCount);
    stats[@"pagesTextLayer"] = @(pagesTextLayer);
    stats[@"pagesOcr"] = @(pagesOcr);
    stats[@"pagesEmpty"] = @(pagesEmpty);
    stats[@"pagesThumbnailFailed"] = @(pagesThumbnailFailed);
    stats[@"pagesVisionFailed"] = @(pagesVisionFailed);
    stats[@"totalChars"] = @(result.length);
  }

  return [result stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
}

RCT_EXPORT_METHOD(extractPdfText:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSString *inputPath = [options[@"path"] isKindOfClass:[NSString class]] ? options[@"path"] : @"";
  NSString *language = [options[@"language"] isKindOfClass:[NSString class]] ? options[@"language"] : nil;
  NSString *input = resolvePdfInputPath(inputPath);
  BOOL fileExists = input.length && [[NSFileManager defaultManager] fileExistsAtPath:input];
  if (!input.length || !fileExists) {
    reject(@"E_PDF", @"File not found", nil);
    return;
  }

  NSArray<NSString *> *languages = visionLanguagesForHint(language);

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    @autoreleasepool {
      NSError *readError = nil;
      NSData *pdfData = [NSData dataWithContentsOfFile:input options:NSDataReadingMappedIfSafe error:&readError];
      __block PDFDocument *doc = nil;
      __block NSMutableDictionary *stats = [NSMutableDictionary dictionaryWithDictionary:@{
        @"fileBytes": @(pdfData.length),
      }];
      __block NSString *trimmed = @"";
      dispatch_sync(dispatch_get_main_queue(), ^{
        if (pdfData.length) {
          doc = [[PDFDocument alloc] initWithData:pdfData];
        }
        if (!doc) {
          doc = [[PDFDocument alloc] initWithURL:[NSURL fileURLWithPath:input]];
        }
        if (doc && doc.pageCount > 0) {
          trimmed = extractPdfTextHybrid(doc, languages, stats);
        }
      });
      if (!doc || doc.pageCount == 0) {
        dispatch_async(dispatch_get_main_queue(), ^{
          reject(@"E_PDF", @"Could not open PDF", nil);
        });
        return;
      }

      dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{
          @"apiVersion": @2,
          @"text": trimmed ?: @"",
          @"stats": stats ?: @{},
        });
      });
    }
  });
}

RCT_EXPORT_METHOD(extractPdfTextV2:(NSString *)inputPath
                  language:(NSString *)language
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSString *input = resolvePdfInputPath(inputPath);
  BOOL fileExists = input.length && [[NSFileManager defaultManager] fileExistsAtPath:input];
  if (!input.length || !fileExists) {
    reject(@"E_PDF", @"File not found", nil);
    return;
  }

  NSArray<NSString *> *languages = visionLanguagesForHint(language);

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    @autoreleasepool {
      NSError *readError = nil;
      NSData *pdfData = [NSData dataWithContentsOfFile:input options:NSDataReadingMappedIfSafe error:&readError];
      __block PDFDocument *doc = nil;
      __block NSMutableDictionary *stats = [NSMutableDictionary dictionaryWithDictionary:@{
        @"fileBytes": @(pdfData.length),
      }];
      __block NSString *trimmed = @"";
      dispatch_sync(dispatch_get_main_queue(), ^{
        if (pdfData.length) {
          doc = [[PDFDocument alloc] initWithData:pdfData];
        }
        if (!doc) {
          doc = [[PDFDocument alloc] initWithURL:[NSURL fileURLWithPath:input]];
        }
        if (doc && doc.pageCount > 0) {
          trimmed = extractPdfTextHybrid(doc, languages, stats);
        }
        stats[@"docPageCount"] = doc ? @(doc.pageCount) : @0;
      });
      if (!doc || doc.pageCount == 0) {
        dispatch_async(dispatch_get_main_queue(), ^{
          reject(@"E_PDF", @"Could not open PDF", nil);
        });
        return;
      }

      dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{
          @"apiVersion": @2,
          @"text": trimmed ?: @"",
          @"stats": stats ?: @{},
        });
      });
    }
  });
}

@end
