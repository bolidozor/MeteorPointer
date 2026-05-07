# Meteor Pointer

A mobile app for meteor observers to record trajectory directions of meteors using a smartphone's orientation sensors. After spotting a meteor, the observer aims the phone at the start and end of the trail; the two captured aim points are stored locally and can be synced to a backend for multi-station triangulation.

## How it works

1. Place the phone **face-down** nearby during a meteor watch. The app runs in the background with the screen dimmed to red to preserve night vision.
2. When a meteor appears, **pick up the phone** — the gyroscope detects the characteristic flip gesture and triggers a session automatically. Alternatively, press a **volume button** if you prefer manual triggering.
3. The app guides you to aim at the **start** of the trail and hold still. A haptic/audio cue confirms the capture.
4. Swing to the **end** of the trail and hold still for the second capture.
5. Optionally fill in event parameters (magnitude, colour, sound, fragmentation, shower association).
6. The report is stored locally and queued for upload.

### Gesture detection

The IMU-based trigger watches the gyroscope Y-axis (long axis of the phone). A rotation above **3.5 rad/s** peak within an **800 ms** window is classified as a valid flip. A **1.5 s** cooldown prevents double-triggers.

### Aiming

Orientation is derived from the phone's rotation vector sensor (or accelerometer fallback). The app accumulates a rolling window of samples and considers the reading **stable** when angular jitter falls below a configurable threshold (default **4.0°**). In IMU mode the capture fires automatically; in volume-button mode the user confirms manually.

---

For build instructions, project structure and settings reference see [DEVELOPMENT.md](DEVELOPMENT.md).
