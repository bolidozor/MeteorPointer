# Development

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

## Setup

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
| Backend URL | — | API endpoint for report uploads |

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
