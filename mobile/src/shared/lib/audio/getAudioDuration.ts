import RNFS from 'react-native-fs';

const WAV_SAMPLE_RATE_OFFSET = 24;
const WAV_CHANNELS_OFFSET = 22;
const WAV_BIT_DEPTH_OFFSET = 34;
const WAV_HEADER_SIZE = 44;

const readUInt32LE = (bytes: number[], offset: number): number =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);

const readUInt16LE = (bytes: number[], offset: number): number =>
  bytes[offset] | (bytes[offset + 1] << 8);

const base64ToBytes = (base64: string): number[] => {
  const binary = atob(base64);
  const bytes: number[] = new Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const getAudioDuration = async (audioPath: string): Promise<number> => {
  const stat = await RNFS.stat(audioPath);
  const fileSizeBytes = Number(stat.size);

  if (fileSizeBytes <= WAV_HEADER_SIZE) {
    return 0;
  }

  const fileBase64 = await RNFS.readFile(audioPath, 'base64');
  const allBytes = base64ToBytes(fileBase64);

  if (allBytes.length < WAV_HEADER_SIZE) {
    return 0;
  }

  const sampleRate = readUInt32LE(allBytes, WAV_SAMPLE_RATE_OFFSET);
  const channels = readUInt16LE(allBytes, WAV_CHANNELS_OFFSET);
  const bitDepth = readUInt16LE(allBytes, WAV_BIT_DEPTH_OFFSET);

  if (sampleRate === 0 || channels === 0 || bitDepth === 0) {
    throw new Error(
      `[getAudioDuration] Некорректный WAV-заголовок: sampleRate=${sampleRate}, channels=${channels}, bitDepth=${bitDepth}`,
    );
  }

  const bytesPerSample = bitDepth / 8;
  const dataBytes = fileSizeBytes - WAV_HEADER_SIZE;
  const duration = dataBytes / (sampleRate * channels * bytesPerSample);

  return duration;
};
