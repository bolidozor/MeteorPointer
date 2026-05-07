# Meteor Pointer

A mobile app for [Bolidozor](https://www.bolidozor.cz) observers to record meteor trajectory directions using a smartphone's orientation sensors. After spotting a meteor, the observer aims the phone at the start and end of the trail; the resulting angular segment is synced to the Bolidozor network for multi-station triangulation.

Available in **English** and **Czech**.

## How it works

1. Place the phone **face-down** nearby during a meteor watch. The app runs in the background with the screen dimmed to red to preserve night vision.
2. When a meteor appears, **pick up the phone** — the gyroscope detects the characteristic flip gesture and triggers a session automatically. Alternatively, press a **volume button** if you prefer manual triggering.
3. The app guides you to aim at the **start** of the trail and hold still. A haptic/audio cue confirms the capture.
4. Swing to the **end** of the trail and hold still for the second capture.
5. Optionally fill in event parameters (magnitude, colour, sound, fragmentation, shower association).
6. The report is stored locally and queued for upload to the Bolidozor backend.

### Gesture detection

The IMU-based trigger watches the gyroscope Y-axis (long axis of the phone). A rotation above **3.5 rad/s** peak within an **800 ms** window is classified as a valid flip. A **1.5 s** cooldown prevents double-triggers.

### Aiming

Orientation is derived from the phone's rotation vector sensor (or accelerometer fallback). The app accumulates a rolling window of samples and considers the reading **stable** when angular jitter falls below a configurable threshold (default **4.0°**). In IMU mode the capture fires automatically; in volume-button mode the user confirms manually.

## Screens

| Screen | Description |
|---|---|
| Home | Launch a session or navigate to other screens |
| Session | Live IMU feed, session state, event log |
| Aiming | Step-by-step start/end trajectory capture |
| Reports | List of saved trajectory reports with upload action |
| Training | Practice the flip-and-aim gesture without recording |
| How to Observe | In-app guide for observers |
| Sensor Debug | Raw IMU and orientation data |
| Settings | Trigger method, aiming axis, thresholds, audio/haptics, backend URL |

## Tech stack

- **React Native 0.84** · TypeScript
- **Zustand** — session and settings state
- **React Navigation** (native stack)
- **TanStack Query** — backend sync
- **AsyncStorage** — local persistence
- **Bun** — package manager

## Development setup

> Make sure you have the [React Native environment](https://reactnative.dev/docs/set-up-your-environment) configured for your target platform.

```sh
# Install dependencies
bun install

# iOS — install native pods (first time or after native dep changes)
bundle install
bundle exec pod install
```

### Run

```sh
# Start Metro bundler
bun start

# Android
bun android

# iOS
bun ios
```

### Lint & type-check

```sh
bun run lint
bun run typecheck
```

### Tests

```sh
bun test
```

## Settings reference

| Setting | Default | Description |
|---|---|---|
| Trigger method | IMU gesture | How a meteor event is triggered (`imu` or `volume`) |
| Aiming axis | `+Y` (top edge) | Which phone edge to point at the sky |
| Stabilization threshold | 4.0° | Maximum jitter (degrees) to consider orientation stable |
| Audio cues | on | Beeps on stable / capture / done |
| Haptic cues | on | Vibration on capture events |
| Color scheme | Normal | `normal` (adaptive) or `deep-night` (pure black) |
| Backend URL | — | Bolidozor API endpoint for report uploads |

## Project structure

```
src/
  features/
    home/          # Home screen
    sessions/      # Session logic, IMU detection, aiming, state store
    reports/       # Saved trajectory reports
    settings/      # Settings screen and Zustand store
    training/      # Training mode
    guide/         # In-app observer guide
    sensors/       # Raw sensor debug screen
  native/          # RN native module wrappers (IMU, brightness, volume key, …)
  navigation/      # Stack navigator and route types
  i18n/            # Translations (en / cs)
  theme/           # Adaptive red night-vision theme
```

## Related

- [Bolidozor network](https://www.bolidozor.cz)
- [React Native docs](https://reactnative.dev)
