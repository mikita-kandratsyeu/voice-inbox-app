///
/// HybridNitroFSSpec.kt
/// Migrated for react-native-nitro-modules 0.35+ (Kotlin HybridObject + Promise<T>).
/// Upstream 0.8.2 ships pre-0.35 nitrogen output — applied via patch-nitro-fs-android-nitro035.mjs.
///

package com.margelo.nitro.nitrofs

import androidx.annotation.Keep
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.HybridObject
import com.margelo.nitro.core.Promise

/**
 * A Kotlin class representing the NitroFS HybridObject.
 * Implement this abstract class to create Kotlin-based instances of NitroFS.
 */
@DoNotStrip
@Keep
@Suppress(
  "KotlinJniMissingFunction",
  "unused",
  "RedundantSuppression",
  "RedundantUnitReturnType",
  "SimpleRedundantLet",
  "LocalVariableName",
  "PropertyName",
  "PrivatePropertyName",
  "FunctionName",
)
abstract class HybridNitroFSSpec : HybridObject() {

  override fun toString(): String {
    return "[HybridObject NitroFS]"
  }

  @get:DoNotStrip
  @get:Keep
  abstract val BUNDLE_DIR: String

  @get:DoNotStrip
  @get:Keep
  abstract val DOCUMENT_DIR: String

  @get:DoNotStrip
  @get:Keep
  abstract val CACHE_DIR: String

  @get:DoNotStrip
  @get:Keep
  abstract val DOWNLOAD_DIR: String

  @get:DoNotStrip
  @get:Keep
  abstract val DCIM_DIR: String

  @get:DoNotStrip
  @get:Keep
  abstract val PICTURES_DIR: String

  @get:DoNotStrip
  @get:Keep
  abstract val MOVIES_DIR: String

  @get:DoNotStrip
  @get:Keep
  abstract val MUSIC_DIR: String

  @DoNotStrip
  @Keep
  abstract fun exists(path: String): Promise<Boolean>

  @DoNotStrip
  @Keep
  abstract fun writeFile(path: String, data: String, encoding: NitroFileEncoding): Promise<Unit>

  @DoNotStrip
  @Keep
  abstract fun readFile(path: String, encoding: NitroFileEncoding): Promise<String>

  @DoNotStrip
  @Keep
  abstract fun copyFile(srcPath: String, destPath: String): Promise<Unit>

  @DoNotStrip
  @Keep
  abstract fun copy(srcPath: String, destPath: String): Promise<Unit>

  @DoNotStrip
  @Keep
  abstract fun unlink(path: String): Promise<Boolean>

  @DoNotStrip
  @Keep
  abstract fun mkdir(path: String): Promise<Boolean>

  @DoNotStrip
  @Keep
  abstract fun stat(path: String): Promise<NitroFileStat>

  @DoNotStrip
  @Keep
  abstract fun readdir(path: String): Promise<Array<NitroFile>>

  @DoNotStrip
  @Keep
  abstract fun rename(oldPath: String, newPath: String): Promise<Unit>

  @DoNotStrip
  @Keep
  abstract fun dirname(path: String): String

  @DoNotStrip
  @Keep
  abstract fun basename(path: String): String

  @DoNotStrip
  @Keep
  abstract fun extname(path: String): String

  abstract fun uploadFile(
    file: NitroFile,
    uploadOptions: NitroUploadOptions,
    onProgress: ((Double, Double) -> Unit)?,
  ): Promise<Unit>

  @DoNotStrip
  @Keep
  private fun uploadFile_cxx(
    file: NitroFile,
    uploadOptions: NitroUploadOptions,
    onProgress: Func_void_double_double?,
  ): Promise<Unit> {
    val __result = uploadFile(file, uploadOptions, onProgress?.let { it })
    return __result
  }

  abstract fun downloadFile(
    serverUrl: String,
    destinationPath: String,
    onProgress: ((Double, Double) -> Unit)?,
  ): Promise<NitroFile>

  @DoNotStrip
  @Keep
  private fun downloadFile_cxx(
    serverUrl: String,
    destinationPath: String,
    onProgress: Func_void_double_double?,
  ): Promise<NitroFile> {
    val __result = downloadFile(serverUrl, destinationPath, onProgress?.let { it })
    return __result
  }

  @DoNotStrip
  @Keep
  protected open class CxxPart(javaPart: HybridNitroFSSpec) : HybridObject.CxxPart(javaPart) {
    external override fun initHybrid(): HybridData
  }

  override fun createCxxPart(): CxxPart {
    return CxxPart(this)
  }

  companion object {
    protected const val TAG = "HybridNitroFSSpec"
  }
}
