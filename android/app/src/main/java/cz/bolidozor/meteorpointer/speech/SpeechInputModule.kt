package cz.bolidozor.meteorpointer.speech

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SpeechInputModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  companion object {
    private const val REQUEST_CODE = 9001
  }

  private var pendingPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = "SpeechInputModule"

  @ReactMethod
  fun startListening(prompt: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No activity available")
      return
    }

    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
    }

    try {
      pendingPromise = promise
      activity.startActivityForResult(intent, REQUEST_CODE)
    } catch (e: Exception) {
      pendingPromise = null
      promise.reject("UNAVAILABLE", e.message ?: "Speech recognition unavailable")
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) return
    val promise = pendingPromise ?: return
    pendingPromise = null

    if (resultCode == Activity.RESULT_OK) {
      val results = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
      promise.resolve(results?.firstOrNull() ?: "")
    } else {
      promise.resolve("")
    }
  }

  override fun onNewIntent(intent: Intent) {}
}
