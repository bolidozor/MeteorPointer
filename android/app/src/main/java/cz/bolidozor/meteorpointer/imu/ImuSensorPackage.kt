package cz.bolidozor.meteorpointer.imu

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import cz.bolidozor.meteorpointer.location.LocationModule
import cz.bolidozor.meteorpointer.sound.SoundModule
import cz.bolidozor.meteorpointer.speech.SpeechInputModule

class ImuSensorPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(
      ImuSensorModule(reactContext),
      AmbientLightModule(reactContext),
      SoundModule(reactContext),
      VolumeKeyModule(reactContext),
      SpeechInputModule(reactContext),
      LocationModule(reactContext),
    )
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> {
    return emptyList()
  }
}
