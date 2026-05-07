import { NativeModules, Vibration } from 'react-native';

// Distinct cue kinds for each step in the workflow:
//   armed   – phone is face-down, detector armed (ready)
//   trigger – flip detected, opening aiming screen
//   stable  – aim is stable during aiming
//   capture – a trajectory point was captured
//   done    – both points captured, session complete
export type CueKind = 'armed' | 'trigger' | 'stable' | 'capture' | 'done';

interface CueOptions {
  audioEnabled: boolean;
  hapticEnabled: boolean;
  kind: CueKind;
}

export function emitCue({ audioEnabled, hapticEnabled, kind }: CueOptions): void {
  if (audioEnabled) {
    playSound(kind);
  }

  // Vibrate only on meaningful step completions, not on state readiness cues.
  if (hapticEnabled && (kind === 'trigger' || kind === 'capture' || kind === 'done')) {
    vibrateSafely(kind);
  }
}

function vibrateSafely(kind: CueKind): void {
  try {
    if (kind === 'trigger') {
      Vibration.vibrate([0, 50, 40, 80]);
      return;
    }
    if (kind === 'capture') {
      Vibration.vibrate([0, 60, 40, 100]);
      return;
    }
    if (kind === 'done') {
      Vibration.vibrate([0, 80, 40, 80, 40, 120]);
    }
  } catch {
    // Ignore on devices where vibration is unavailable.
  }
}

function playSound(kind: CueKind): void {
  try {
    const sm = NativeModules.SoundManager as { playSound?: (type: string) => void } | undefined;
    sm?.playSound?.(kind);
  } catch {
    // Ignore on platforms where the module is unavailable.
  }
}
