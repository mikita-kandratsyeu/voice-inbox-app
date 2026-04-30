/**
 * react-native-document-picker@9.x still uses GuardedResultAsyncTask, removed in newer React Native.
 * Copy a small Android-only replacement (no package.json / iOS dependency changes).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const patchedSource = path.join(__dirname, "android", "RNDocumentPickerModule.patched.java");
const target = path.join(
  root,
  "node_modules/react-native-document-picker/android/src/main/java/com/reactnativedocumentpicker/RNDocumentPickerModule.java",
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const current = fs.readFileSync(target, "utf8");
if (!current.includes("GuardedResultAsyncTask")) {
  process.exit(0);
}

if (!fs.existsSync(patchedSource)) {
  console.warn("[patch-document-picker-android] missing patched source, skip");
  process.exit(0);
}

fs.copyFileSync(patchedSource, target);
console.log("[patch-document-picker-android] replaced RNDocumentPickerModule.java (RN without GuardedResultAsyncTask)");
