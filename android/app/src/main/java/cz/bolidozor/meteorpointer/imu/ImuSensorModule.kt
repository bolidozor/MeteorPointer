package cz.bolidozor.meteorpointer.imu

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.LifecycleEventListener
import kotlin.math.sqrt

class ImuSensorModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), SensorEventListener, LifecycleEventListener {

  private val sensorManager: SensorManager =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager

  private val accelSensor: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
  private val gyroSensor:  Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
  private val magSensor:   Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
  // Fused orientation sensor — available on all modern Android devices.
  // Uses hardware sensor hub Kalman filter (accel + gyro + mag).
  private val rotVecSensor: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)

  private var accel:  FloatArray? = null
  private var gyro:   FloatArray? = null
  private var mag:    FloatArray? = null
  private var rotVec: FloatArray? = null

  private var intervalMs: Int  = 80
  private var intervalNs: Long = 80_000_000L
  private var lastEmitNs: Long = 0L

  private var startCount = 0   // reference-counted — sensor stays on while any caller holds a start
  private var registered = false
  private var listenerCount = 0
  // TEST ONLY: when true, emit IMU even without a magnetometer/gyroscope,
  // substituting zeros for the missing sensor so devices without a compass can
  // still run the measurement flow (azimuth will read 0).
  private var simulate = false

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
    val real = accelSensor != null && gyroSensor != null && magSensor != null
    // In simulate mode the accelerometer alone is enough; missing sensors are zeroed.
    promise.resolve(real || (simulate && accelSensor != null))
  }

  @ReactMethod
  fun setSimulate(enabled: Boolean) {
    simulate = enabled
  }

  @ReactMethod
  fun start(updateIntervalMs: Double) {
    val parsed = updateIntervalMs.toInt().coerceIn(20, 1000)
    intervalMs = parsed
    intervalNs = intervalMs.toLong() * 1_000_000L
    startCount++
    registerIfNeeded()
  }

  @ReactMethod
  fun stop() {
    startCount = (startCount - 1).coerceAtLeast(0)
    if (startCount == 0) unregisterIfNeeded()
  }

  @ReactMethod
  fun addListener(eventName: String) {
    if (eventName == EVENT_NAME) listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
  }

  override fun onSensorChanged(event: SensorEvent) {
    when (event.sensor.type) {
      Sensor.TYPE_ACCELEROMETER    -> accel  = event.values.clone()
      Sensor.TYPE_GYROSCOPE        -> gyro   = event.values.clone()
      Sensor.TYPE_MAGNETIC_FIELD   -> mag    = event.values.clone()
      Sensor.TYPE_ROTATION_VECTOR  -> rotVec = event.values.clone()
      else -> return
    }

    if (listenerCount <= 0) return
    if (event.timestamp - lastEmitNs < intervalNs) return

    val accelNow = accel ?: return
    val gyroNow  = gyro  ?: if (simulate) ZERO_VEC else return
    val magNow   = mag   ?: if (simulate) ZERO_VEC else return
    // rotVec may still be null on the very first tick — that is fine.

    lastEmitNs = event.timestamp

    val payload = Arguments.createMap().apply {
      putMap("accel", vectorToMap(accelNow))
      putMap("gyro",  vectorToMap(gyroNow))
      putMap("mag",   vectorToMap(magNow))

      val rv = rotVec
      if (rv != null) {
        // values: [qx, qy, qz, qw?, headingAccuracyRad?]
        val qx = rv[0].toDouble()
        val qy = rv[1].toDouble()
        val qz = rv[2].toDouble()
        val qw = if (rv.size >= 4) rv[3].toDouble()
                 else sqrt(maxOf(0.0, 1.0 - qx*qx - qy*qy - qz*qz))
        // values[4] = estimated heading accuracy in radians; -1 if unavailable
        val accuracyRad = if (rv.size >= 5) rv[4].toDouble() else -1.0
        putMap("rotVec", Arguments.createMap().apply {
          putDouble("x", qx)
          putDouble("y", qy)
          putDouble("z", qz)
          putDouble("w", qw)
          putDouble("accuracyRad", accuracyRad)
        })
      } else {
        putNull("rotVec")
      }

      putDouble("timestamp", (bootToWallOffsetMs + event.timestamp / 1_000_000L).toDouble())
    }

    emit(EVENT_NAME, payload)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  override fun onHostResume()  { registerIfNeeded() }
  override fun onHostPause()   { unregisterIfNeeded() }
  override fun onHostDestroy() { unregisterIfNeeded() }

  override fun invalidate() {
    unregisterIfNeeded()
    reactContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  private fun registerIfNeeded() {
    if (startCount <= 0 || registered) return

    val accelOk  = accelSensor?.let  { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) } ?: false
    val gyroOk   = gyroSensor?.let   { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) } ?: false
    val magOk    = magSensor?.let    { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) } ?: false
    // Best-effort — rotation vector may not be present on all devices.
    rotVecSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }

    // In simulate mode the accelerometer alone is enough (missing sensors zeroed).
    registered = if (simulate) accelOk else (accelOk && gyroOk && magOk)
    if (!registered) {
      sensorManager.unregisterListener(this)
      lastEmitNs = 0L
    }
  }

  private fun unregisterIfNeeded() {
    if (!registered) return
    sensorManager.unregisterListener(this)
    registered = false
    lastEmitNs = 0L
  }

  private fun emit(eventName: String, payload: Any) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  private fun vectorToMap(values: FloatArray) = Arguments.createMap().apply {
    putDouble("x", values[0].toDouble())
    putDouble("y", values[1].toDouble())
    putDouble("z", values[2].toDouble())
  }

  companion object {
    const val NAME = "ImuSensorModule"
    const val EVENT_NAME = "ImuSensorSample"
    private val ZERO_VEC = FloatArray(3) // [0,0,0] — substituted for missing sensors in simulate mode
  }
}
