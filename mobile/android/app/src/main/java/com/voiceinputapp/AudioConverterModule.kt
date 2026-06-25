package com.voiceinputapp

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.min
import kotlin.math.roundToLong

private const val TARGET_SAMPLE_RATE = 16000
private const val TARGET_CHANNELS = 1
private const val VAD_FRAME_MS = 30
private const val VAD_PRE_ROLL_FRAMES = 15
private const val VAD_HANGOVER_FRAMES = 15
private const val VAD_ONSET_FRAMES = 2

private class StreamingLinearResampler(
  private val inputRate: Int,
  private val outputRate: Int,
) {
  private val ratio = inputRate.toDouble() / outputRate
  private var srcPos = 0.0
  private var pending = ShortArray(0)

  fun append(input: ShortArray): ByteArray {
    if (inputRate == outputRate) {
      return shortsToPcm16LE(input)
    }
    if (input.isEmpty()) {
      return ByteArray(0)
    }

    pending = pending + input
    val out = java.io.ByteArrayOutputStream()
    while (srcPos + 1 < pending.size) {
      val idx = srcPos.toInt()
      val frac = srcPos - idx
      val sample0 = pending[idx].toInt()
      val sample1 = pending[idx + 1].toInt()
      val value = (sample0 + (sample1 - sample0) * frac).toInt().toShort()
      out.write(value.toInt() and 0xff)
      out.write((value.toInt() shr 8) and 0xff)
      srcPos += ratio
    }

    val drop = srcPos.toInt()
    if (drop > 0) {
      pending = pending.copyOfRange(drop, pending.size)
      srcPos -= drop
    }

    return out.toByteArray()
  }

  fun flush(): ByteArray {
    if (inputRate == outputRate || pending.isEmpty()) {
      return ByteArray(0)
    }

    val out = java.io.ByteArrayOutputStream()
    while (srcPos < pending.size) {
      val idx = srcPos.toInt().coerceAtMost(pending.lastIndex)
      val nextIdx = (idx + 1).coerceAtMost(pending.lastIndex)
      val frac = srcPos - idx
      val sample0 = pending[idx].toInt()
      val sample1 = pending[nextIdx].toInt()
      val value = (sample0 + (sample1 - sample0) * frac).toInt().toShort()
      out.write(value.toInt() and 0xff)
      out.write((value.toInt() shr 8) and 0xff)
      srcPos += ratio
    }

    pending = ShortArray(0)
    srcPos = 0.0
    return out.toByteArray()
  }
}

private fun shortsToPcm16LE(samples: ShortArray): ByteArray {
  val bytes = ByteArray(samples.size * 2)
  for (i in samples.indices) {
    val value = samples[i].toInt()
    bytes[i * 2] = (value and 0xff).toByte()
    bytes[i * 2 + 1] = ((value shr 8) and 0xff).toByte()
  }
  return bytes
}

class AudioConverterModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AudioConverter"

  @ReactMethod
  fun convertToWav(inputPath: String, outputPath: String, promise: Promise) {
    try {
      val input = if (inputPath.startsWith("file://")) inputPath.removePrefix("file://") else inputPath
      val output = if (outputPath.startsWith("file://")) outputPath.removePrefix("file://") else outputPath

      val extractor = MediaExtractor()
      extractor.setDataSource(input)

      var trackIndex = -1
      var format: MediaFormat? = null
      for (i in 0 until extractor.trackCount) {
        val f = extractor.getTrackFormat(i)
        val mime = f.getString(MediaFormat.KEY_MIME) ?: ""
        if (mime.startsWith("audio/")) {
          trackIndex = i
          format = f
          break
        }
      }
      if (trackIndex < 0 || format == null) {
        promise.reject("E_CONVERT", "No audio track")
        return
      }

      extractor.selectTrack(trackIndex)
      val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
      val codec = MediaCodec.createDecoderByType(mime)
      codec.configure(format, null, null, 0)
      codec.start()

      val bufferInfo = MediaCodec.BufferInfo()
      val tempPcm = File("$output.pcm.tmp")
      tempPcm.parentFile?.mkdirs()
      var sourceSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var sourceChannelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      var pcmBytesWritten = 0
      var inputDone = false
      var outputDone = false
      var outFormat: MediaFormat? = null

      RandomAccessFile(tempPcm, "rw").use { tempPcmFile ->
        tempPcmFile.setLength(0)
        while (!outputDone) {
          if (!inputDone) {
            val inputBufferIndex = codec.dequeueInputBuffer(10000)
            if (inputBufferIndex >= 0) {
              val inputBuffer = codec.getInputBuffer(inputBufferIndex)!!
              val sampleSize = extractor.readSampleData(inputBuffer, 0)
              if (sampleSize < 0) {
                codec.queueInputBuffer(
                  inputBufferIndex,
                  0,
                  0,
                  0,
                  MediaCodec.BUFFER_FLAG_END_OF_STREAM,
                )
                inputDone = true
              } else {
                codec.queueInputBuffer(inputBufferIndex, 0, sampleSize, extractor.sampleTime, 0)
                extractor.advance()
              }
            }
          }

          val outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, 10000)
          when {
            outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
              outFormat = codec.outputFormat
              sourceSampleRate = outFormat!!.getInteger(MediaFormat.KEY_SAMPLE_RATE)
              sourceChannelCount = outFormat!!.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            }
            outputBufferIndex >= 0 -> {
              val outputBuffer = codec.getOutputBuffer(outputBufferIndex)!!
              if (bufferInfo.size > 0) {
                val chunk = ByteArray(bufferInfo.size)
                outputBuffer.get(chunk)
                outputBuffer.clear()
                val mono = pcmBytesToMono16Bit(chunk, sourceChannelCount)
                val pcmBytes = shortsToPcm16LE(mono)
                tempPcmFile.write(pcmBytes)
                pcmBytesWritten += pcmBytes.size
              }
              codec.releaseOutputBuffer(outputBufferIndex, false)
              if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                outputDone = true
              }
            }
          }
        }
      }

      codec.stop()
      codec.release()
      extractor.release()

      if (pcmBytesWritten == 0) {
        tempPcm.delete()
        promise.reject("E_CONVERT", "No audio data")
        return
      }

      val wavFile = File(output)
      wavFile.parentFile?.mkdirs()
      RandomAccessFile(wavFile, "rw").use { raf ->
        raf.setLength(0)
        writeWavHeader(raf, TARGET_SAMPLE_RATE, TARGET_CHANNELS, 16, 0)
        val dataSize = streamResamplePcmFileToWav(tempPcm, sourceSampleRate, raf)
        raf.seek(0)
        writeWavHeader(raf, TARGET_SAMPLE_RATE, TARGET_CHANNELS, 16, dataSize)
      }
      tempPcm.delete()

      promise.resolve(output)
    } catch (e: Exception) {
      promise.reject("E_CONVERT", e.message ?: "Conversion failed", e)
    }
  }

  @ReactMethod
  fun createWavChunk(
    inputPath: String,
    outputPath: String,
    startMs: Double,
    durationMs: Double,
    promise: Promise
  ) {
    try {
      val input = if (inputPath.startsWith("file://")) inputPath.removePrefix("file://") else inputPath
      val output = if (outputPath.startsWith("file://")) outputPath.removePrefix("file://") else outputPath

      val outFile = File(output)
      outFile.parentFile?.mkdirs()

      RandomAccessFile(input, "r").use { inputFile ->
        val riffHeader = ByteArray(12)
        if (inputFile.read(riffHeader) != riffHeader.size ||
          String(riffHeader, 0, 4, Charsets.US_ASCII) != "RIFF" ||
          String(riffHeader, 8, 4, Charsets.US_ASCII) != "WAVE"
        ) {
          promise.reject("E_WAV_CHUNK", "Unsupported WAV header")
          return
        }

        var audioFormat = 0
        var channelCount = 0
        var sampleRate = 0
        var bitsPerSample = 0
        var dataOffset = 0L
        var dataSize = 0L

        chunkLoop@ while (inputFile.filePointer + 8 <= inputFile.length()) {
          val chunkHeader = ByteArray(8)
          if (inputFile.read(chunkHeader) != chunkHeader.size) break
          val chunkId = String(chunkHeader, 0, 4, Charsets.US_ASCII)
          val chunkSize = readUInt32LE(chunkHeader, 4).toLong()
          val chunkDataOffset = inputFile.filePointer

          when (chunkId) {
            "fmt " -> {
              val fmt = ByteArray(chunkSize.toInt())
              if (inputFile.read(fmt) != fmt.size || fmt.size < 16) {
                promise.reject("E_WAV_CHUNK", "Invalid WAV fmt chunk")
                return
              }
              audioFormat = readUInt16LE(fmt, 0)
              channelCount = readUInt16LE(fmt, 2)
              sampleRate = readUInt32LE(fmt, 4)
              bitsPerSample = readUInt16LE(fmt, 14)
              if (chunkSize % 2 != 0L) {
                inputFile.seek(chunkDataOffset + chunkSize + 1)
              }
            }
            "data" -> {
              dataOffset = chunkDataOffset
              dataSize = chunkSize
              break@chunkLoop
            }
            else -> {
              inputFile.seek(chunkDataOffset + chunkSize + (chunkSize % 2))
            }
          }
        }

        if (audioFormat != 1 || channelCount <= 0 || sampleRate <= 0 || bitsPerSample <= 0 || dataOffset <= 0) {
          promise.reject("E_WAV_CHUNK", "Only PCM WAV chunks are supported")
          return
        }

        val bytesPerFrame = channelCount * (bitsPerSample / 8)
        // Use on-disk PCM length; WAV headers may under-report data chunk size for long recordings.
        val availableBytes =
          if (inputFile.length() > dataOffset) inputFile.length() - dataOffset else 0L
        val availableFrames = availableBytes / bytesPerFrame
        val startFrame = (startMs * sampleRate / 1000.0).roundToLong()
        val requestedFrames = (durationMs * sampleRate / 1000.0).roundToLong()
        if (startFrame >= availableFrames || requestedFrames <= 0) {
          promise.reject("E_WAV_CHUNK", "Chunk is outside WAV data")
          return
        }

        val framesToCopy = min(requestedFrames, availableFrames - startFrame)
        val bytesToCopy = framesToCopy * bytesPerFrame
        val readOffset = dataOffset + startFrame * bytesPerFrame

        RandomAccessFile(outFile, "rw").use { outputFile ->
          outputFile.setLength(0)
          writeWavHeader(outputFile, sampleRate, channelCount, bitsPerSample, bytesToCopy.toInt())

          inputFile.seek(readOffset)
          val buffer = ByteArray(64 * 1024)
          var remaining = bytesToCopy
          while (remaining > 0) {
            val read = inputFile.read(buffer, 0, min(buffer.size.toLong(), remaining).toInt())
            if (read <= 0) break
            outputFile.write(buffer, 0, read)
            remaining -= read.toLong()
          }
        }
      }

      promise.resolve(output)
    } catch (e: Exception) {
      promise.reject("E_WAV_CHUNK", e.message ?: "Failed to create WAV chunk", e)
    }
  }

  private fun readUInt16LE(bytes: ByteArray, offset: Int): Int =
    (bytes[offset].toInt() and 0xff) or ((bytes[offset + 1].toInt() and 0xff) shl 8)

  private fun readUInt32LE(bytes: ByteArray, offset: Int): Int =
    (bytes[offset].toInt() and 0xff) or
      ((bytes[offset + 1].toInt() and 0xff) shl 8) or
      ((bytes[offset + 2].toInt() and 0xff) shl 16) or
      ((bytes[offset + 3].toInt() and 0xff) shl 24)

  @ReactMethod
  fun analyzeWavSpeech(inputPath: String, promise: Promise) {
    try {
      val input = if (inputPath.startsWith("file://")) inputPath.removePrefix("file://") else inputPath
      val pcmInfo = readPcmWavFile(input)
        ?: run {
          promise.reject("E_VAD", "Only PCM WAV speech analysis is supported")
          return
        }

      val analysis = analyzeMonoPcmSpeech(
        pcmInfo.samples,
        pcmInfo.sampleRate,
      )
      val result = com.facebook.react.bridge.Arguments.createMap()
      result.putBoolean("hasSpeech", analysis.hasSpeech)
      result.putDouble("trimStartMs", analysis.trimStartMs)
      result.putDouble("trimDurationMs", analysis.trimDurationMs)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("E_VAD", e.message ?: "Speech analysis failed", e)
    }
  }

  private data class PcmWavData(val samples: ShortArray, val sampleRate: Int)

  private data class SpeechAnalysis(
    val hasSpeech: Boolean,
    val trimStartMs: Double,
    val trimDurationMs: Double,
  )

  private fun readPcmWavFile(path: String): PcmWavData? {
    RandomAccessFile(path, "r").use { inputFile ->
      val riffHeader = ByteArray(12)
      if (inputFile.read(riffHeader) != riffHeader.size ||
        String(riffHeader, 0, 4, Charsets.US_ASCII) != "RIFF" ||
        String(riffHeader, 8, 4, Charsets.US_ASCII) != "WAVE"
      ) {
        return null
      }

      var audioFormat = 0
      var channelCount = 0
      var sampleRate = 0
      var bitsPerSample = 0
      var dataOffset = 0L

      while (inputFile.filePointer + 8 <= inputFile.length()) {
        val chunkHeader = ByteArray(8)
        if (inputFile.read(chunkHeader) != chunkHeader.size) break
        val chunkId = String(chunkHeader, 0, 4, Charsets.US_ASCII)
        val chunkSize = readUInt32LE(chunkHeader, 4).toLong()
        val chunkDataOffset = inputFile.filePointer

        when (chunkId) {
          "fmt " -> {
            val fmt = ByteArray(chunkSize.toInt())
            if (inputFile.read(fmt) != fmt.size || fmt.size < 16) return null
            audioFormat = readUInt16LE(fmt, 0)
            channelCount = readUInt16LE(fmt, 2)
            sampleRate = readUInt32LE(fmt, 4)
            bitsPerSample = readUInt16LE(fmt, 14)
            if (chunkSize % 2 != 0L) {
              inputFile.seek(chunkDataOffset + chunkSize + 1)
            }
          }
          "data" -> {
            dataOffset = chunkDataOffset
            break
          }
          else -> {
            inputFile.seek(chunkDataOffset + chunkSize + (chunkSize % 2))
          }
        }
      }

      if (audioFormat != 1 || channelCount <= 0 || sampleRate <= 0 || bitsPerSample != 16 || dataOffset <= 0) {
        return null
      }

      val availableBytes =
        if (inputFile.length() > dataOffset) inputFile.length() - dataOffset else 0L
      val bytesPerFrame = channelCount * 2
      val frameCount = (availableBytes / bytesPerFrame).toInt()
      if (frameCount <= 0) return null

      inputFile.seek(dataOffset)
      val pcmBytes = ByteArray(frameCount * bytesPerFrame)
      val read = inputFile.read(pcmBytes)
      if (read <= 0) return null

      val mono = pcmBytesToMono16Bit(pcmBytes.copyOf(read), channelCount)
      val resampled = if (sampleRate == TARGET_SAMPLE_RATE) {
        mono
      } else {
        resampleLinear(mono, sampleRate, TARGET_SAMPLE_RATE)
      }
      return PcmWavData(resampled, TARGET_SAMPLE_RATE)
    }
  }

  private fun analyzeMonoPcmSpeech(samples: ShortArray, sampleRate: Int): SpeechAnalysis {
    if (samples.isEmpty()) {
      return SpeechAnalysis(false, 0.0, 0.0)
    }

    val frameSamples = (sampleRate * VAD_FRAME_MS / 1000).coerceAtLeast(1)
    val frameCount = (samples.size + frameSamples - 1) / frameSamples
    if (frameCount == 0) {
      return SpeechAnalysis(false, 0.0, 0.0)
    }

    val rmsValues = DoubleArray(frameCount)
    for (frame in 0 until frameCount) {
      val start = frame * frameSamples
      val end = min(start + frameSamples, samples.size)
      var sum = 0.0
      for (i in start until end) {
        val normalized = samples[i].toDouble() / Short.MAX_VALUE
        sum += normalized * normalized
      }
      val count = (end - start).coerceAtLeast(1)
      rmsValues[frame] = kotlin.math.sqrt(sum / count)
    }

    val sorted = rmsValues.sorted()
    val noiseFloor = sorted[(sorted.size * 0.2).toInt().coerceIn(0, sorted.lastIndex)]
    val threshold = (noiseFloor * 3.5).coerceAtLeast(0.008)

    val voiceFrames = BooleanArray(frameCount)
    for (i in 0 until frameCount) {
      voiceFrames[i] = rmsValues[i] >= threshold
    }

    val smoothed = BooleanArray(frameCount)
    var hangover = 0
    var onset = 0
    var inSpeech = false
    for (i in 0 until frameCount) {
      val isVoice = voiceFrames[i]
      when {
        !inSpeech && isVoice -> {
          onset += 1
          if (onset >= VAD_ONSET_FRAMES) {
            inSpeech = true
            hangover = VAD_HANGOVER_FRAMES
            onset = 0
            val preStart = (i - VAD_PRE_ROLL_FRAMES + 1).coerceAtLeast(0)
            for (j in preStart..i) {
              smoothed[j] = true
            }
          }
        }
        inSpeech && isVoice -> {
          hangover = VAD_HANGOVER_FRAMES
          smoothed[i] = true
        }
        inSpeech && !isVoice -> {
          if (hangover > 0) {
            hangover -= 1
            smoothed[i] = true
          } else {
            inSpeech = false
          }
        }
        else -> {
          onset = 0
        }
      }
    }

    var firstSpeechFrame: Int? = null
    var lastSpeechFrame: Int? = null
    for (i in smoothed.indices) {
      if (smoothed[i]) {
        if (firstSpeechFrame == null) firstSpeechFrame = i
        lastSpeechFrame = i
      }
    }

    if (firstSpeechFrame == null || lastSpeechFrame == null) {
      return SpeechAnalysis(false, 0.0, 0.0)
    }

    val trimStartMs = firstSpeechFrame * VAD_FRAME_MS.toDouble()
    val trimEndMs = (lastSpeechFrame + 1) * VAD_FRAME_MS.toDouble()
    val trimDurationMs = (trimEndMs - trimStartMs).coerceAtLeast(0.0)
    return SpeechAnalysis(trimDurationMs > 0, trimStartMs, trimDurationMs)
  }

  private fun pcmBytesToMono16Bit(pcm16: ByteArray, channelCount: Int): ShortArray {
    val sampleCount = pcm16.size / 2
    val frameCount = sampleCount / channelCount
    val mono = ShortArray(frameCount)
    for (frame in 0 until frameCount) {
      var sum = 0L
      for (channel in 0 until channelCount) {
        val idx = (frame * channelCount + channel) * 2
        if (idx + 1 >= pcm16.size) continue
        val low = pcm16[idx].toInt() and 0xff
        val high = pcm16[idx + 1].toInt() shl 8
        sum += (low or high).toShort().toInt()
      }
      mono[frame] = (sum / channelCount.coerceAtLeast(1)).toInt().toShort()
    }
    return mono
  }

  private fun streamResamplePcmFileToWav(
    pcmFile: File,
    inputRate: Int,
    outputRaf: RandomAccessFile,
  ): Int {
    if (inputRate == TARGET_SAMPLE_RATE) {
      RandomAccessFile(pcmFile, "r").use { input ->
        val buffer = ByteArray(64 * 1024)
        var total = 0
        while (true) {
          val read = input.read(buffer)
          if (read <= 0) break
          outputRaf.write(buffer, 0, read)
          total += read
        }
        return total
      }
    }

    val resampler = StreamingLinearResampler(inputRate, TARGET_SAMPLE_RATE)
    var totalBytes = 0
    RandomAccessFile(pcmFile, "r").use { input ->
      val byteBuffer = ByteArray(64 * 1024)
      while (true) {
        val read = input.read(byteBuffer)
        if (read <= 0) break
        val sampleCount = read / 2
        val samples = ShortArray(sampleCount)
        for (i in 0 until sampleCount) {
          val low = byteBuffer[i * 2].toInt() and 0xff
          val high = byteBuffer[i * 2 + 1].toInt() shl 8
          samples[i] = (low or high).toShort()
        }
        val out = resampler.append(samples)
        if (out.isNotEmpty()) {
          outputRaf.write(out)
          totalBytes += out.size
        }
      }
      val tail = resampler.flush()
      if (tail.isNotEmpty()) {
        outputRaf.write(tail)
        totalBytes += tail.size
      }
    }
    return totalBytes
  }

  private fun resampleLinear(input: ShortArray, inputRate: Int, outputRate: Int): ShortArray {
    if (inputRate == outputRate || input.isEmpty()) return input
    val ratio = inputRate.toDouble() / outputRate
    val outputLen = (input.size / ratio).toInt().coerceAtLeast(1)
    val output = ShortArray(outputLen)
    for (i in 0 until outputLen) {
      val srcPos = i * ratio
      val idx = srcPos.toInt().coerceIn(0, input.lastIndex)
      val nextIdx = (idx + 1).coerceAtMost(input.lastIndex)
      val frac = srcPos - idx
      val sample0 = input[idx].toInt()
      val sample1 = input[nextIdx].toInt()
      output[i] = (sample0 + (sample1 - sample0) * frac).toInt().toShort()
    }
    return output
  }

  private fun writeWavHeader(
    raf: RandomAccessFile,
    sampleRate: Int,
    channelCount: Int,
    bitsPerSample: Int,
    dataSize: Int
  ) {
    val byteRate = sampleRate * channelCount * (bitsPerSample / 8)
    val blockAlign = channelCount * (bitsPerSample / 8)
    val chunkSize = 36 + dataSize

    raf.write("RIFF".toByteArray(Charsets.US_ASCII))
    raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(chunkSize).array())
    raf.write("WAVE".toByteArray(Charsets.US_ASCII))
    raf.write("fmt ".toByteArray(Charsets.US_ASCII))
    raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(16).array())
    raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(1).array())
    raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(channelCount.toShort()).array())
    raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(sampleRate).array())
    raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(byteRate).array())
    raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(blockAlign.toShort()).array())
    raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(bitsPerSample.toShort()).array())
    raf.write("data".toByteArray(Charsets.US_ASCII))
    raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(dataSize).array())
  }
}
