import type { ImuData } from '@native/useImu';

export interface DetectorConfig {
  /** rad/s — crossing this starts a gesture window */
  gyroYStartThreshold: number;
  /** rad/s — peak must reach this within the window */
  gyroYPeakThreshold: number;
  /** ms — gesture must complete (gyroY fall back) within this window */
  maxGestureDurationMs: number;
  /** ms — ignore further input after a trigger */
  cooldownMs: number;
}

export interface DetectorState {
  lastSample: ImuData | null;
  trackingSince: number | null;
  peakGyroY: number;
  cooldownUntil: number;
}

export interface FlipDetection {
  timestamp: number;
  confidence: number;
  peakDelta: number;
}

export const defaultDetectorConfig: DetectorConfig = {
  gyroYStartThreshold: 2.5,
  gyroYPeakThreshold: 3.5,
  maxGestureDurationMs: 800,
  cooldownMs: 1500,
};

export function createDetectorState(): DetectorState {
  return {
    lastSample: null,
    trackingSince: null,
    peakGyroY: 0,
    cooldownUntil: 0,
  };
}

export function processImuSample(
  state: DetectorState,
  sample: ImuData,
  config: DetectorConfig = defaultDetectorConfig,
): { nextState: DetectorState; detection: FlipDetection | null } {
  if (sample.timestamp < state.cooldownUntil) {
    return { nextState: { ...state, lastSample: sample }, detection: null };
  }

  const absGyroY = Math.abs(sample.gyro.y);
  let { trackingSince, peakGyroY } = state;
  let detection: FlipDetection | null = null;

  if (trackingSince === null) {
    if (absGyroY >= config.gyroYStartThreshold) {
      trackingSince = sample.timestamp;
      peakGyroY = absGyroY;
    }
  } else {
    peakGyroY = Math.max(peakGyroY, absGyroY);
    const elapsed = sample.timestamp - trackingSince;

    if (absGyroY < config.gyroYStartThreshold) {
      // Gyro fell back — gesture complete
      if (peakGyroY >= config.gyroYPeakThreshold && elapsed <= config.maxGestureDurationMs) {
        detection = {
          timestamp: sample.timestamp,
          confidence: Math.min(1, peakGyroY / (config.gyroYPeakThreshold * 1.5)),
          peakDelta: peakGyroY,
        };
      }
      trackingSince = null;
      peakGyroY = 0;
    } else if (elapsed > config.maxGestureDurationMs) {
      // Held too long — not a valid gesture
      trackingSince = null;
      peakGyroY = 0;
    }
  }

  return {
    nextState: {
      lastSample: sample,
      trackingSince,
      peakGyroY,
      cooldownUntil: detection ? sample.timestamp + config.cooldownMs : state.cooldownUntil,
    },
    detection,
  };
}
