import RNFS from 'react-native-fs';

export async function readAsciiBytes(
  path: string,
  length: number,
  position: number,
): Promise<string> {
  return RNFS.read(path, length, position, 'ascii');
}
