package cz.bolidozor.meteorpointer.imu

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class VolumeKeyModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  var isActive = false
    private set

  override fun getName(): String = NAME

  override fun initialize() {
    super.initialize()
    instance = this
  }

  override fun invalidate() {
    if (instance === this) instance = null
    super.invalidate()
  }

  @ReactMethod
  fun setActive(value: Boolean) {
    isActive = value
  }

  // Required by NativeEventEmitter on the JS side.
  @ReactMethod
  fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}

  @ReactMethod
  fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Double) {}

  /** Called by MainActivity.onKeyDown. Returns true if the event was consumed. */
  fun onVolumeKey(key: String): Boolean {
    if (!isActive) return false
    val payload = Arguments.createMap().apply { putString("key", key) }
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_NAME, payload)
    return true
  }

  companion object {
    const val NAME = "VolumeKeyModule"
    const val EVENT_NAME = "VolumeKeyPress"

    @Volatile
    var instance: VolumeKeyModule? = null
  }
}
