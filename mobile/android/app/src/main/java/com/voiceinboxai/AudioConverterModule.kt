package com.voiceinboxai

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
}
