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
      val pcmData = mutableListOf<ByteArray>()
      var inputDone = false
      var outputDone = false
      var outFormat: MediaFormat? = null

      while (!outputDone) {
        if (!inputDone) {
          val inputBufferIndex = codec.dequeueInputBuffer(10000)
          if (inputBufferIndex >= 0) {
            val inputBuffer = codec.getInputBuffer(inputBufferIndex)!!
            val sampleSize = extractor.readSampleData(inputBuffer, 0)
            if (sampleSize < 0) {
              codec.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
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
          }
          outputBufferIndex >= 0 -> {
            val outputBuffer = codec.getOutputBuffer(outputBufferIndex)!!
            if (bufferInfo.size > 0) {
              val chunk = ByteArray(bufferInfo.size)
              outputBuffer.get(chunk)
              outputBuffer.clear()
              pcmData.add(chunk)
            }
            codec.releaseOutputBuffer(outputBufferIndex, false)
            if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
              outputDone = true
            }
          }
        }
      }

      codec.stop()
      codec.release()
      extractor.release()

      val totalBytes = pcmData.sumOf { it.size }
      if (totalBytes == 0) {
        promise.reject("E_CONVERT", "No audio data")
        return
      }

      val wavFormat = outFormat ?: format
      val sampleRate = wavFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      val channelCount = wavFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      val pcm16 = pcmData.flatMap { it.toList() }.toByteArray()

      val wavFile = File(output)
      RandomAccessFile(wavFile, "rw").use { raf ->
        raf.setLength(0)
        val dataSize = pcm16.size
        val byteRate = sampleRate * channelCount * 2
        val blockAlign = channelCount * 2
        val chunkSize = 36 + dataSize

        raf.write("RIFF".toByteArray())
        raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(chunkSize).array())
        raf.write("WAVE".toByteArray())
        raf.write("fmt ".toByteArray())
        raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(16).array())
        raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(1).array())
        raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(channelCount.toShort()).array())
        raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(sampleRate).array())
        raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(byteRate).array())
        raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(blockAlign.toShort()).array())
        raf.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(16).array())
        raf.write("data".toByteArray())
        raf.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(dataSize).array())
        raf.write(pcm16)
      }

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
