import { NativeModules, Vibration } from 'react-native';

// Distinct cue kinds for each step in the workflow:
//   armed   – phone is face-down, detector armed (ready)
//   trigger – flip detected, opening aiming screen
//   stable  – aim is stable during aiming
//   captureStart – START trajectory point was captured
//   captureEnd – END trajectory point was captured
//   done    – both points captured, session complete
export type CueKind = 'armed' | 'trigger' | 'stable' | 'captureStart' | 'captureEnd' | 'done';

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
  if (hapticEnabled && (kind === 'trigger' || kind === 'captureStart' || kind === 'captureEnd' || kind === 'done')) {
    vibrateSafely(kind);
  }
}

function vibrateSafely(kind: CueKind): void {
  try {
    if (kind === 'trigger') {
      Vibration.vibrate([0, 50, 40, 80]);
      return;
    }
    if (kind === 'captureStart') {
      Vibration.vibrate([0, 45]);
      return;
    }
    if (kind === 'captureEnd') {
      Vibration.vibrate([0, 45, 35, 85]);
      return;
    }
    if (kind === 'done') {
      Vibration.vibrate([0, 80, 40, 80, 40, 120]);
    }
  } catch {
    // Ignore on devices where vibration is unavailable.
  }
}

let warnedMissingModule = false;

function playSound(kind: CueKind): void {
  const sm = NativeModules.SoundManager as { playSound?: (type: string) => void } | undefined;
  if (!sm?.playSound) {
    // Surface this once — silently doing nothing is what hid the broken audio before.
    if (!warnedMissingModule) {
      warnedMissingModule = true;
      console.warn('[cues] SoundManager native module unavailable; audio cues disabled');
    }
    return;
  }
  try {
    sm.playSound(kind);
  } catch (e) {
    console.warn('[cues] playSound failed', e);
  }
}
