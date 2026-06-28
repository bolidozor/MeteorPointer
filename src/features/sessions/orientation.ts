import type { ImuData } from '@native/useImu';

export interface OrientationPoint {
  alt: number;
  az: number;
}

type Axis = '+X' | '+Y' | '+Z';
export type AimStabilityMode = 'start' | 'end';
export type AimStabilityPhase = 'waitingForMovement' | 'moving' | 'settling' | 'stable';

export function toOrientation(sample: ImuData, axis: Axis): OrientationPoint {
  if (sample.rotVec) {
    return fromRotVec(sample.rotVec, axis);
  }
  return fromAccelMag(sample, axis);
}

// Primary path: quaternion from Android TYPE_ROTATION_VECTOR (hardware Kalman fusion).
// World frame: X = East, Y = North, Z = Up.
// Rotation maps device frame → world frame.
function fromRotVec(
  q: { x: number; y: number; z: number; w: number },
  axis: Axis,
): OrientationPoint {
  const { x: qx, y: qy, z: qz, w: qw } = q;
  const norm = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw) || 1;
  const nx = qx / norm;
  const ny = qy / norm;
  const nz = qz / norm;
  const nw = qw / norm;

  // Rotation matrix R (device → world), row-major.
  // R[row][col]: world_vec = R * device_vec
  const R = [
    1 - 2 * (ny * ny + nz * nz),  2 * (nx * ny - nw * nz),       2 * (nx * nz + nw * ny),
        2 * (nx * ny + nw * nz),  1 - 2 * (nx * nx + nz * nz),   2 * (ny * nz - nw * nx),
        2 * (nx * nz - nw * ny),      2 * (ny * nz + nw * nx),   1 - 2 * (nx * nx + ny * ny),
  ];

  // Aiming axis vector in device frame.
  const col = axis === '+X' ? 0 : axis === '+Y' ? 1 : 2;

  // World-frame components of the aiming axis.
  const wEast  = R[0 * 3 + col]; // world X = East
  const wNorth = R[1 * 3 + col]; // world Y = North
  const wUp    = R[2 * 3 + col]; // world Z = Up

  const alt = Math.asin(Math.max(-1, Math.min(1, wUp))) * (180 / Math.PI);
  const az  = normalizeAngle(Math.atan2(wEast, wNorth) * (180 / Math.PI));

  return { alt, az };
}

// Fallback: manual tilt-compensated fusion (used for simulation / devices without rotVec).
function fromAccelMag(sample: ImuData, axis: Axis): OrientationPoint {
  const { x, y, z } = sample.accel;
  const normA = Math.sqrt(x * x + y * y + z * z) || 1;
  const ax = x / normA;
  const ay = y / normA;
  const az = z / normA;

  const vx = axis === '+X' ? 1 : 0;
  const vy = axis === '+Y' ? 1 : 0;
  const vz = axis === '+Z' ? 1 : 0;

  const sinAlt = vx * ax + vy * ay + vz * az;
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);

  const { x: mx, y: my, z: mz } = sample.mag;
  const ex = my * az - mz * ay;
  const ey = mz * ax - mx * az;
  const ez = mx * ay - my * ax;
  const normE = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
  const enx = ex / normE;
  const eny = ey / normE;
  const enz = ez / normE;

  const nnx = ay * enz - az * eny;
  const nny = az * enx - ax * enz;
  const nnz = ax * eny - ay * enx;

  const az_deg = normalizeAngle(
    Math.atan2(vx * enx + vy * eny + vz * enz, vx * nnx + vy * nny + vz * nnz) * (180 / Math.PI),
  );

  return { alt, az: az_deg };
}

export function averageOrientation(points: OrientationPoint[]): OrientationPoint | null {
  if (!points.length) {
    return null;
  }

  const altMean = points.reduce((sum, p) => sum + p.alt, 0) / points.length;

  let cx = 0;
  let cy = 0;
  for (const p of points) {
    const rad = (p.az * Math.PI) / 180;
    cx += Math.cos(rad);
    cy += Math.sin(rad);
  }
  const azMean = normalizeAngle((Math.atan2(cy / points.length, cx / points.length) * 180) / Math.PI);

  return { alt: altMean, az: azMean };
}

export function orientationJitter(points: OrientationPoint[]): number {
  if (points.length <= 1) {
    return 999;
  }

  const mean = averageOrientation(points);
  if (!mean) {
    return 999;
  }

  const sum = points.reduce((acc, p) => acc + angleDistanceDeg(p, mean) ** 2, 0);
  return Math.sqrt(sum / points.length);
}

/**
 * Exponentially-weighted stability tracker.
 *
 * Replaces the fixed-window RMS: instead of giving every sample in a 2.4 s window
 * equal weight (which makes the jitter drop abruptly when old noise leaves the
 * window), we keep an exponential moving average of the orientation and of the
 * squared angular deviation. The result is a smoothly-decaying `jitter` whose
 * convergence time is governed by a single time constant — so stabilization takes
 * a consistent amount of time instead of "sometimes slow, sometimes instant".
 *
 * `alt` is averaged arithmetically; `az` is averaged on the unit circle (cos/sin)
 * so it wraps correctly around 0°/360°.
 */
export interface StabilityState {
  alt: number;
  cosAz: number;
  sinAz: number;
  variance: number; // EMA of squared angular deviation, deg²
  count: number;
}

export function createStabilityState(): StabilityState {
  return { alt: 0, cosAz: 1, sinAz: 0, variance: 0, count: 0 };
}

export function resetStability(state: StabilityState): void {
  state.alt = 0;
  state.cosAz = 1;
  state.sinAz = 0;
  state.variance = 0;
  state.count = 0;
}

/** Current smoothed orientation of the tracker, or null before any sample. */
export function stabilityMean(state: StabilityState): OrientationPoint | null {
  if (state.count === 0) {
    return null;
  }
  const az = normalizeAngle((Math.atan2(state.sinAz, state.cosAz) * 180) / Math.PI);
  return { alt: state.alt, az };
}

/**
 * Feed one orientation sample. `alpha` is the EMA smoothing factor in (0, 1];
 * derive it from the sample interval and a target time constant:
 * `alpha = dt / (tauMs + dt)`. Returns the running jitter (RMS deviation, deg)
 * and the smoothed orientation. Jitter is 999 until the first sample lands.
 */
export function updateStability(
  state: StabilityState,
  point: OrientationPoint,
  alpha: number,
): { jitter: number; orientation: OrientationPoint } {
  if (state.count === 0) {
    const rad = (point.az * Math.PI) / 180;
    state.alt = point.alt;
    state.cosAz = Math.cos(rad);
    state.sinAz = Math.sin(rad);
    state.variance = 0;
    state.count = 1;
    return { jitter: 999, orientation: { alt: point.alt, az: point.az } };
  }

  // Deviation of the new sample from the current mean, before updating the mean.
  const mean = stabilityMean(state)!;
  const dev = angleDistanceDeg(point, mean);

  const rad = (point.az * Math.PI) / 180;
  state.alt += alpha * (point.alt - state.alt);
  state.cosAz += alpha * (Math.cos(rad) - state.cosAz);
  state.sinAz += alpha * (Math.sin(rad) - state.sinAz);
  state.variance += alpha * (dev * dev - state.variance);
  state.count += 1;

  return { jitter: Math.sqrt(state.variance), orientation: stabilityMean(state)! };
}

export interface AimStabilityState {
  mode: AimStabilityMode;
  phase: AimStabilityPhase;
  samples: number;
  points: OrientationPoint[];
  previousOrientation: OrientationPoint | null;
  previousTimestamp: number | null;
  quietSince: number | null;
  quietMs: number;
  jitter: number;
  orientation: OrientationPoint | null;
  hasMovedEnough: boolean;
}

export interface AimStabilityOptions {
  mode: AimStabilityMode;
  stabilizationThreshold: number;
  startPoint?: OrientationPoint | null;
  minMovementDeg?: number;
  quietDurationMs?: number;
  stillSpeedDegPerSec?: number;
  stillGyroRadPerSec?: number;
  movementSpeedDegPerSec?: number;
  movementGyroRadPerSec?: number;
  jitterWindowSamples?: number;
}

export interface AimStabilityResult {
  orientation: OrientationPoint;
  jitter: number;
  stable: boolean;
  phase: AimStabilityPhase;
  samples: number;
  quietMs: number;
  hasMovedEnough: boolean;
}

const DEFAULT_MIN_MOVEMENT_DEG = 8;
const DEFAULT_QUIET_DURATION_MS = 900;
const DEFAULT_STILL_SPEED_DEG_PER_SEC = 3;
const DEFAULT_STILL_GYRO_RAD_PER_SEC = 0.08;
const DEFAULT_MOVEMENT_SPEED_DEG_PER_SEC = 12;
const DEFAULT_MOVEMENT_GYRO_RAD_PER_SEC = 0.25;
const DEFAULT_JITTER_WINDOW_SAMPLES = 10;

export function createAimStabilityState(mode: AimStabilityMode = 'start'): AimStabilityState {
  return {
    mode,
    phase: mode === 'end' ? 'waitingForMovement' : 'settling',
    samples: 0,
    points: [],
    previousOrientation: null,
    previousTimestamp: null,
    quietSince: null,
    quietMs: 0,
    jitter: 999,
    orientation: null,
    hasMovedEnough: mode === 'start',
  };
}

export function resetAimStability(state: AimStabilityState, mode: AimStabilityMode = state.mode): void {
  state.mode = mode;
  state.phase = mode === 'end' ? 'waitingForMovement' : 'settling';
  state.samples = 0;
  state.points = [];
  state.previousOrientation = null;
  state.previousTimestamp = null;
  state.quietSince = null;
  state.quietMs = 0;
  state.jitter = 999;
  state.orientation = null;
  state.hasMovedEnough = mode === 'start';
}

export function updateAimStability(
  state: AimStabilityState,
  sample: ImuData,
  axis: Axis,
  options: AimStabilityOptions,
): AimStabilityResult {
  if (state.mode !== options.mode) {
    resetAimStability(state, options.mode);
  }

  const point = toOrientation(sample, axis);
  const timestamp = sample.timestamp;
  const minMovementDeg = options.minMovementDeg ?? DEFAULT_MIN_MOVEMENT_DEG;
  const quietDurationMs = options.quietDurationMs ?? DEFAULT_QUIET_DURATION_MS;
  const stillSpeedDegPerSec = options.stillSpeedDegPerSec ?? DEFAULT_STILL_SPEED_DEG_PER_SEC;
  const stillGyroRadPerSec = options.stillGyroRadPerSec ?? DEFAULT_STILL_GYRO_RAD_PER_SEC;
  const movementSpeedDegPerSec = options.movementSpeedDegPerSec ?? DEFAULT_MOVEMENT_SPEED_DEG_PER_SEC;
  const movementGyroRadPerSec = options.movementGyroRadPerSec ?? DEFAULT_MOVEMENT_GYRO_RAD_PER_SEC;
  const jitterWindowSamples = options.jitterWindowSamples ?? DEFAULT_JITTER_WINDOW_SAMPLES;

  const dtSec =
    state.previousTimestamp !== null
      ? Math.max(0.001, (timestamp - state.previousTimestamp) / 1000)
      : 0;
  const angularSpeed =
    state.previousOrientation && dtSec > 0
      ? angleDistanceDeg(point, state.previousOrientation) / dtSec
      : 0;
  const gyroNorm = Math.sqrt(sample.gyro.x ** 2 + sample.gyro.y ** 2 + sample.gyro.z ** 2);

  const hadMovedEnough = state.hasMovedEnough;
  const hasMovedEnough =
    options.mode === 'start' ||
    (options.startPoint ? angleDistanceDeg(point, options.startPoint) >= minMovementDeg : false);

  state.samples += 1;
  state.orientation = point;
  state.points =
    !hadMovedEnough && hasMovedEnough
      ? [point]
      : [...state.points, point].slice(-jitterWindowSamples);
  state.jitter = orientationJitter(state.points);
  state.hasMovedEnough = hasMovedEnough;

  if (!hasMovedEnough) {
    state.phase = 'waitingForMovement';
    state.quietSince = null;
    state.quietMs = 0;
  } else {
    const moving = angularSpeed >= movementSpeedDegPerSec || gyroNorm >= movementGyroRadPerSec;
    const still =
      angularSpeed <= stillSpeedDegPerSec &&
      gyroNorm <= stillGyroRadPerSec &&
      state.jitter <= options.stabilizationThreshold;

    if (moving) {
      state.phase = 'moving';
      state.points = [point];
      state.jitter = 999;
      state.quietSince = null;
      state.quietMs = 0;
    } else if (still) {
      state.quietSince = state.quietSince ?? timestamp;
      state.quietMs = timestamp - state.quietSince;
      state.phase = state.quietMs >= quietDurationMs ? 'stable' : 'settling';
    } else {
      state.phase = 'settling';
      state.quietSince = null;
      state.quietMs = 0;
    }
  }

  state.previousOrientation = point;
  state.previousTimestamp = timestamp;

  return {
    orientation: point,
    jitter: state.jitter,
    stable: state.phase === 'stable',
    phase: state.phase,
    samples: state.samples,
    quietMs: state.quietMs,
    hasMovedEnough: state.hasMovedEnough,
  };
}

export function angleDistanceDeg(a: OrientationPoint, b: OrientationPoint): number {
  const altDiff = a.alt - b.alt;
  const azDiff = shortestAngularDistance(a.az, b.az);
  return Math.sqrt(altDiff * altDiff + azDiff * azDiff);
}

function shortestAngularDistance(a: number, b: number): number {
  const diff = normalizeAngle(a - b);
  return diff > 180 ? diff - 360 : diff;
}

function normalizeAngle(degrees: number): number {
  const angle = degrees % 360;
  return angle < 0 ? angle + 360 : angle;
}
