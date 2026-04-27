/**
 * @react-native-community/netinfo's android/build.gradle calls `node` in repositories { }.
 * Android Studio's Gradle daemon often has no nvm Homebrew on PATH, so that fails.
 * The root app sets ext REACT_NATIVE_NODE_MODULES_DIR; we prefer that before invoking node.
 * Idempotent: safe to re-run; skips if the package layout changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gradlePath = path.join(
  __dirname,
  '../node_modules/@react-native-community/netinfo/android/build.gradle',
);

const MARKER = '// VOICEINBOX_NETINFO_USE_REACT_NATIVE_NODE_MODULES_DIR\n';

if (!fs.existsSync(gradlePath)) {
  process.exit(0);
}

let t = fs.readFileSync(gradlePath, 'utf8');
if (t.includes(MARKER.trim())) {
  process.exit(0);
}

const oldBlock = `repositories {
 maven {
 // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm

 // Use node resolver to locate react-native package
 def reactNativePackage = file(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim())
 if (reactNativePackage.exists()) {
 url "$reactNativePackage.parentFile/android"
 }
 // Fallback to react-native package colocated in node_modules
 else {
 url "$rootDir/../node_modules/react-native/android"
 }
 }
 google()
 mavenLocal()
 mavenCentral()
}`;

const newBlock = `repositories {
 maven {
 // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm
${MARKER} // Prefer ext REACT_NATIVE_NODE_MODULES_DIR from root android/build.gradle (Android Studio / no node on PATH).
 def rnm = getExtOrInitialValue("REACT_NATIVE_NODE_MODULES_DIR", null)
 if (rnm != null) {
  url = (new File((String)rnm, "android")).toURI()
 } else {
 def reactNativePackage = file(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim())
 if (reactNativePackage.exists()) {
 url "$reactNativePackage.parentFile/android"
 } else {
 url "$rootDir/../node_modules/react-native/android"
 }
 }
 }
 google()
 mavenLocal()
 mavenCentral()
}`;

if (!t.includes(oldBlock)) {
  console.warn(
    '[ensure-netinfo-android-gradle] Expected block not found; skip (netinfo version changed?)',
  );
  process.exit(0);
}

fs.writeFileSync(gradlePath, t.replace(oldBlock, newBlock, 1), 'utf8');
// eslint-disable-next-line no-console -- postinstall log
console.log(
  '[ensure-netinfo-android-gradle] Patched @react-native-community/netinfo/android/build.gradle',
);
