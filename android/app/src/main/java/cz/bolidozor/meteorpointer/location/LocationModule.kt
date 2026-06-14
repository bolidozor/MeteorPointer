package cz.bolidozor.meteorpointer.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

/**
 * Location for the observation site.
 *
 * Plain (legacy) native module — no codegen — so it builds on React Native 0.84.
 * Uses the platform LocationManager (no Google Play Services). To return a fix
 * immediately (like a maps app), it (1) reports the freshest cached location
 * from any provider — network/passive are instant — and (2) keeps a live
 * subscription on the network + GPS providers so the cached fix stays current
 * and refines to GPS accuracy.
 */
class LocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  private val lm: LocationManager? =
    reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

  @Volatile private var latest: Location? = null
  private var listening = false

  private val listener = LocationListener { loc ->
    val current = latest
    if (current == null || loc.time >= current.time) {
      latest = loc
    }
  }

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = NAME

  private fun hasPermission(): Boolean {
    val fine = reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = reactContext.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
    return fine == PackageManager.PERMISSION_GRANTED ||
      coarse == PackageManager.PERMISSION_GRANTED
  }

  private fun startUpdates() {
    val manager = lm ?: return
    if (listening || !hasPermission()) {
      return
    }
    listening = true
    for (provider in listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER)) {
      if (!manager.allProviders.contains(provider)) {
        continue
      }
      try {
        manager.requestLocationUpdates(provider, 1000L, 0f, listener, Looper.getMainLooper())
      } catch (e: SecurityException) {
        // permission revoked mid-flight — ignore
      }
    }
  }

  private fun stopUpdates() {
    if (!listening) {
      return
    }
    listening = false
    try {
      lm?.removeUpdates(listener)
    } catch (e: SecurityException) {
      // ignore
    }
  }

  /** Freshest location across the live subscription and every provider's cache. */
  private fun bestKnown(): Location? {
    val manager = lm ?: return latest
    var best = latest
    val providers = listOf(
      LocationManager.GPS_PROVIDER,
      LocationManager.NETWORK_PROVIDER,
      LocationManager.PASSIVE_PROVIDER,
    )
    for (provider in providers) {
      if (!manager.allProviders.contains(provider)) {
        continue
      }
      val loc =
        try {
          manager.getLastKnownLocation(provider)
        } catch (e: SecurityException) {
          null
        } ?: continue
      if (best == null || loc.time > best.time) {
        best = loc
      }
    }
    return best
  }

  private fun toMap(loc: Location): WritableMap =
    Arguments.createMap().apply {
      putDouble("lat", loc.latitude)
      putDouble("lon", loc.longitude)
      putDouble("accuracy", if (loc.hasAccuracy()) loc.accuracy.toDouble() else -1.0)
      putDouble("capturedAt", loc.time.toDouble())
    }

  @ReactMethod
  fun getCurrentPosition(promise: Promise) {
    if (!hasPermission()) {
      promise.reject("PERMISSION", "Location permission not granted")
      return
    }
    startUpdates()
    val best = bestKnown()
    if (best != null) {
      promise.resolve(toMap(best))
    } else {
      promise.reject("NO_FIX", "No location fix available yet")
    }
  }

  override fun onHostResume() {
    // Resubscribe only if a caller had already asked for location.
    if (latest != null) {
      startUpdates()
    }
  }

  override fun onHostPause() = stopUpdates()

  override fun onHostDestroy() = stopUpdates()

  override fun invalidate() {
    stopUpdates()
    reactContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  companion object {
    const val NAME = "MeteorLocationModule"
  }
}
