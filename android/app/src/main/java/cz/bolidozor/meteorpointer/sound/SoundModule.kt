package cz.bolidozor.meteorpointer.sound

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.PI
import kotlin.math.sin

class SoundModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SoundManager"

    @ReactMethod
    fun playSound(type: String) {
        Thread {
            when (type) {
                // Phone armed – low single beep: "ready"
                "armed"   -> play(listOf(Note(440, 90)))

                // Flip detected – rising double beep: "meteor!"
                "trigger" -> play(listOf(Note(660, 80), Note(1000, 130)))

                // Aim stable – mid single ping: "lock"
                "stable"  -> play(listOf(Note(800, 70)))

                // Point captured – rising triple beep: "got it"
                "capture" -> play(listOf(Note(660, 70), Note(880, 70), Note(1100, 110)))

                // Both points done – ascending fanfare: "done"
                "done"    -> play(listOf(Note(880, 130), Note(1047, 130), Note(1319, 210)))
            }
        }.also { it.isDaemon = true }.start()
    }

    private data class Note(val freqHz: Int, val durationMs: Int, val gapMs: Int = 20)

    private fun play(notes: List<Note>) {
        val sampleRate = 44100
        val totalSamples = notes.sumOf { (it.durationMs + it.gapMs) * sampleRate / 1000 }
        val buffer = ShortArray(totalSamples)

        var offset = 0
        for (note in notes) {
            val noteSamples = note.durationMs * sampleRate / 1000
            val fadeSamples = minOf(noteSamples / 8, sampleRate / 100)
            for (i in 0 until noteSamples) {
                val angle = 2.0 * PI * note.freqHz * i / sampleRate
                val env = when {
                    i < fadeSamples -> i.toDouble() / fadeSamples
                    i > noteSamples - fadeSamples -> (noteSamples - i).toDouble() / fadeSamples
                    else -> 1.0
                }
                buffer[offset + i] = (sin(angle) * env * Short.MAX_VALUE * 0.55).toInt().toShort()
            }
            offset += noteSamples + note.gapMs * sampleRate / 1000
        }

        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(buffer.size * 2)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        track.write(buffer, 0, buffer.size)
        track.play()
        Thread.sleep(notes.sumOf { (it.durationMs + it.gapMs).toLong() } + 30)
        track.stop()
        track.release()
    }
}
