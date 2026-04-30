/**
 * react-native-nitro-fs@0.8.2 ships pre-0.35 Nitrogen (Kotlin + Android C++/JNI).
 * Nitro 0.35 needs HybridObject.CxxPart, Promise<T>, and JHybridObject-style JNI (JavaPart/CxxPart).
 *
 * Resolves the install path, then copies vendored sources. Invoked from postinstall and
 * from Android Gradle before :react-native-nitro-fs Kotlin compile and CMake build.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, "..");
const androidDir = path.join(__dirname, "android");
const cppNitro035Dir = path.join(androidDir, "cpp-nitro035");

const require = createRequire(path.join(mobileRoot, "package.json"));

let pkgRoot;
try {
  pkgRoot = path.dirname(require.resolve("react-native-nitro-fs/package.json"));
} catch {
  console.warn(
    "[patch-nitro-fs-android-nitro035] react-native-nitro-fs not resolved, skip",
  );
  process.exit(0);
}

const copies = [
  {
    source: path.join(androidDir, "HybridNitroFSSpec.nitro035.kt"),
    target: path.join(
      pkgRoot,
      "nitrogen/generated/android/kotlin/com/margelo/nitro/nitrofs/HybridNitroFSSpec.kt",
    ),
  },
  {
    source: path.join(androidDir, "HybridNitroFS.nitro035.kt"),
    target: path.join(
      pkgRoot,
      "android/src/main/java/com/nitrofs/HybridNitroFS.kt",
    ),
  },
  {
    source: path.join(cppNitro035Dir, "JHybridNitroFSSpec.hpp"),
    target: path.join(
      pkgRoot,
      "nitrogen/generated/android/c++/JHybridNitroFSSpec.hpp",
    ),
  },
  {
    source: path.join(cppNitro035Dir, "JHybridNitroFSSpec.cpp"),
    target: path.join(
      pkgRoot,
      "nitrogen/generated/android/c++/JHybridNitroFSSpec.cpp",
    ),
  },
  {
    source: path.join(cppNitro035Dir, "NitroFSOnLoad.cpp"),
    target: path.join(pkgRoot, "nitrogen/generated/android/NitroFSOnLoad.cpp"),
  },
];

let applied = 0;
for (const { source, target } of copies) {
  if (!fs.existsSync(source)) {
    console.error(
      `[patch-nitro-fs-android-nitro035] missing source: ${source}`,
    );
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  applied += 1;
}

console.log(
  `[patch-nitro-fs-android-nitro035] applied ${applied} file(s) → ${pkgRoot}`,
);
