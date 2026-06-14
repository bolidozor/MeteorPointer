package cz.bolidozor.meteorpointer.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.CancellationSignal
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

/**
 * Minimal one-shot location fix for the observation site.
 *
 * Deliberately a plain (legacy) native module — no codegen — so it builds
 * cleanly on React Native 0.84's New Architecture via the interop layer, unlike
 * @react-native-community/geolocation whose codegen fails to build here, and
 * expo-location which has no Expo SDK compatible with RN 0.84.1 yet.
 * Uses the platform LocationManager (no Google Play Services dependency).
 */
class LocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  private fun hasPermission(): Boolean {
    val fine = reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = reactContext.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
    return fine == PackageManager.PERMISSION_GRANTED ||
      coarse == PackageManager.PERMISSION_GRANTED
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

    val lm = reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    if (lm == null) {
      promise.reject("UNAVAILABLE", "Location service unavailable")
      return
    }

    val provider = when {
      lm.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
      lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
      else -> null
    }
    if (provider == null) {
      promise.reject("UNAVAILABLE", "No location provider enabled")
      return
    }

    val lastKnown: Location? =
      try {
        lm.getLastKnownLocation(provider)
      } catch (e: SecurityException) {
        null
      }

    try {
      lm.getCurrentLocation(provider, CancellationSignal(), reactContext.mainExecutor) { loc ->
        val result = loc ?: lastKnown
        if (result != null) {
          promise.resolve(toMap(result))
        } else {
          promise.reject("NO_FIX", "Could not obtain a location fix")
        }
      }
    } catch (e: SecurityException) {
      promise.reject("PERMISSION", "Location permission not granted", e)
    } catch (e: Exception) {
      if (lastKnown != null) promise.resolve(toMap(lastKnown))
      else promise.reject("ERROR", e.message, e)
    }
  }

  companion object {
    const val NAME = "MeteorLocationModule"
  }
}
