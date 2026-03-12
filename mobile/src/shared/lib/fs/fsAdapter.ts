import RNFS from 'react-native-fs';

export type NitroFileEncoding = 'utf8' | 'ascii' | 'base64';

export type NitroFile = {
  name: string;
  mimeType: string;
  path: string;
};

export type NitroFileStat = {
  size: number;
  ctime: number;
  mtime: number;
  isFile: boolean;
  isDirectory: boolean;
};

const normalizePath = (path: string): string => (path.startsWith('file://') ? path.slice(7) : path);

const FS = {
  get DOCUMENT_DIR(): string {
    return RNFS.DocumentDirectoryPath;
  },

  get CACHE_DIR(): string {
    return RNFS.CachesDirectoryPath;
  },

  get BUNDLE_DIR(): string {
    return RNFS.MainBundlePath;
  },

  get DOWNLOAD_DIR(): string {
    return RNFS.DownloadDirectoryPath;
  },

  get DCIM_DIR(): string {
    return RNFS.PicturesDirectoryPath;
  },

  get PICTURES_DIR(): string {
    return RNFS.PicturesDirectoryPath;
  },

  get MOVIES_DIR(): string {
    return RNFS.PicturesDirectoryPath;
  },

  get MUSIC_DIR(): string {
    return RNFS.PicturesDirectoryPath;
  },

  async exists(path: string): Promise<boolean> {
    return RNFS.exists(normalizePath(path));
  },

  async writeFile(path: string, data: string, encoding: NitroFileEncoding): Promise<void> {
    await RNFS.writeFile(normalizePath(path), data, encoding);
  },

  async readFile(path: string, encoding: NitroFileEncoding): Promise<string> {
    return RNFS.readFile(normalizePath(path), encoding);
  },

  async copyFile(srcPath: string, destPath: string): Promise<void> {
    await RNFS.copyFile(normalizePath(srcPath), normalizePath(destPath));
  },

  async unlink(path: string): Promise<boolean> {
    await RNFS.unlink(normalizePath(path));
    return true;
  },

  async mkdir(path: string): Promise<boolean> {
    await RNFS.mkdir(normalizePath(path));
    return true;
  },

  async stat(path: string): Promise<NitroFileStat> {
    const result = await RNFS.stat(normalizePath(path));
    const ctime =
      typeof result.ctime === 'number' ? result.ctime : (result.ctime as Date).getTime() / 1000;
    const mtime =
      typeof result.mtime === 'number' ? result.mtime : (result.mtime as Date).getTime() / 1000;
    return {
      size: Number(result.size),
      ctime,
      mtime,
      isFile: result.isFile(),
      isDirectory: result.isDirectory(),
    };
  },

  async readdir(path: string): Promise<NitroFile[]> {
    const items = await RNFS.readDir(normalizePath(path));
    return items.map((item) => ({
      name: item.name,
      mimeType: 'application/octet-stream',
      path: item.path,
    }));
  },

  async rename(oldPath: string, newPath: string): Promise<void> {
    await RNFS.moveFile(normalizePath(oldPath), normalizePath(newPath));
  },

  dirname(path: string): string {
    const parts = path.replace(/\/$/, '').split('/');
    parts.pop();
    return parts.join('/') || '/';
  },

  basename(path: string): string {
    const parts = path.replace(/\/$/, '').split('/');
    return parts[parts.length - 1] ?? '';
  },

  extname(path: string): string {
    const name = FS.basename(path);
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot) : '';
  },
};

export default FS;
