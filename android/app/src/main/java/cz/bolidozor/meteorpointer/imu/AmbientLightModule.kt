package cz.bolidozor.meteorpointer.imu

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AmbientLightModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), SensorEventListener, LifecycleEventListener {

  private val sensorManager: SensorManager =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager

  private val lightSensor: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)

  private var listenerCount = 0
  private var runningRequested = false
  private var registered = false

  private var intervalMs = 700
  private var intervalNs: Long = 700_000_000L
  private var lastEmitNs: Long = 0L

  private val bootToWallOffsetMs: Long = System.currentTimeMillis() - SystemClock.elapsedRealtime()

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = NAME

  override fun getConstants(): MutableMap<String, Any> {
    return mutableMapOf("EVENT_NAME" to EVENT_NAME)
  }

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(lightSensor != null)
  }

  @ReactMethod
  fun start(updateIntervalMs: Double) {
    val parsed = updateIntervalMs.toInt().coerceIn(100, 5000)
    intervalMs = parsed
    intervalNs = intervalMs.toLong() * 1_000_000L
    runningRequested = true
    registerIfNeeded()
  }

  @ReactMethod
  fun stop() {
    runningRequested = false
    unregisterIfNeeded()
  }

  @ReactMethod
  fun addListener(eventName: String) {
    if (eventName == EVENT_NAME) {
      listenerCount += 1
    }
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (event.sensor.type != Sensor.TYPE_LIGHT || listenerCount <= 0) {
      return
    }

    if (event.timestamp - lastEmitNs < intervalNs) {
      return
    }

    lastEmitNs = event.timestamp

    val payload = Arguments.createMap().apply {
      putDouble("lux", event.values[0].toDouble())
      putDouble("timestamp", (bootToWallOffsetMs + event.timestamp / 1_000_000L).toDouble())
    }

    emit(EVENT_NAME, payload)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // No-op
  }

  override fun onHostResume() {
    registerIfNeeded()
  }

  override fun onHostPause() {
    unregisterIfNeeded()
  }

  override fun onHostDestroy() {
    unregisterIfNeeded()
  }

  override fun invalidate() {
    unregisterIfNeeded()
    reactContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  private fun registerIfNeeded() {
    if (!runningRequested || registered) {
      return
    }

    val ok = lightSensor?.let {
      sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
    } ?: false

    registered = ok
    if (!registered) {
      sensorManager.unregisterListener(this)
      lastEmitNs = 0L
    }
  }

  private fun unregisterIfNeeded() {
    if (!registered) {
      return
    }

    sensorManager.unregisterListener(this)
    registered = false
    lastEmitNs = 0L
  }

  private fun emit(eventName: String, payload: Any) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  companion object {
    const val NAME = "AmbientLightModule"
    const val EVENT_NAME = "AmbientLightSample"
  }
}
