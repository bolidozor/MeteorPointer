import type { ImuData } from '../src/native/useImu';
import {
  angleDistanceDeg,
  createAimStabilityState,
  updateAimStability,
  type AimStabilityMode,
  type OrientationPoint,
} from '../src/features/sessions/orientation';

const BASE_TIME = 1_800_000_000_000;
const AXIS = '+Z' as const;

function sampleAt(
  timestamp: number,
  point: OrientationPoint,
  gyro = { x: 0, y: 0, z: 0 },
): ImuData {
  const q = quatFromDeviceZToPoint(point);
  return {
    accel: { x: 0, y: 0, z: 9.81 },
    gyro,
    mag: { x: 0, y: 1, z: 0 },
    rotVec: { x: q.x, y: q.y, z: q.z, w: q.w, accuracyRad: 0 },
    timestamp,
  };
}

function run(
  mode: AimStabilityMode,
  points: OrientationPoint[],
  options: {
    startPoint?: OrientationPoint;
    stabilizationThreshold?: number;
    quietDurationMs?: number;
    minMovementDeg?: number;
    gyroAt?: Record<number, { x: number; y: number; z: number }>;
  } = {},
) {
  const state = createAimStabilityState(mode);
  return points.map((point, index) =>
    updateAimStability(
      state,
      sampleAt(BASE_TIME + index * 100, point, options.gyroAt?.[index]),
      AXIS,
      {
        mode,
        stabilizationThreshold: options.stabilizationThreshold ?? 2.5,
        quietDurationMs: options.quietDurationMs ?? 900,
        minMovementDeg: options.minMovementDeg ?? 8,
        startPoint: options.startPoint,
      },
    ),
  );
}

describe('aim stability tracker', () => {
  test('captures START only after the requested quiet duration', () => {
    const point = { alt: 30, az: 140 };
    const results = run('start', Array.from({ length: 12 }, () => point));

    expect(results[9].stable).toBe(false);
    expect(results[10].stable).toBe(true);
    expect(results[10].quietMs).toBe(900);
  });

  test('keeps END waiting until the phone moves far enough from START', () => {
    const startPoint = { alt: 20, az: 100 };
    const nearEnd = { alt: 23, az: 103 };
    const results = run('end', Array.from({ length: 12 }, () => nearEnd), { startPoint });

    expect(results[11].hasMovedEnough).toBe(false);
    expect(results[11].phase).toBe('waitingForMovement');
    expect(results[11].stable).toBe(false);
  });

  test('does not capture END immediately after reaching the minimum movement', () => {
    const startPoint = { alt: 20, az: 100 };
    const endPoint = { alt: 31, az: 100 };
    const results = run('end', Array.from({ length: 12 }, () => endPoint), { startPoint });

    expect(results[0].hasMovedEnough).toBe(true);
    expect(results[1].stable).toBe(false);
    expect(results[10].stable).toBe(true);
  });

  test('resets quiet timing when a gyro burst happens while settling', () => {
    const point = { alt: 30, az: 140 };
    const results = run('start', Array.from({ length: 18 }, () => point), {
      gyroAt: { 6: { x: 0.4, y: 0, z: 0 } },
    });

    expect(results[6].phase).toBe('moving');
    expect(results[10].stable).toBe(false);
    expect(results[16].stable).toBe(true);
  });

  test('computes angular distance across azimuth wrap', () => {
    expect(angleDistanceDeg({ alt: 10, az: 359 }, { alt: 10, az: 1 })).toBeCloseTo(2);
  });
});

function quatFromDeviceZToPoint(point: OrientationPoint): { x: number; y: number; z: number; w: number } {
  const alt = (point.alt * Math.PI) / 180;
  const az = (point.az * Math.PI) / 180;
  const target = {
    x: Math.cos(alt) * Math.sin(az),
    y: Math.cos(alt) * Math.cos(az),
    z: Math.sin(alt),
  };
  const source = { x: 0, y: 0, z: 1 };
  const cross = {
    x: source.y * target.z - source.z * target.y,
    y: source.z * target.x - source.x * target.z,
    z: source.x * target.y - source.y * target.x,
  };
  const dot = source.x * target.x + source.y * target.y + source.z * target.z;

  if (dot < -0.999999) {
    return { x: 1, y: 0, z: 0, w: 0 };
  }

  const w = Math.sqrt((1 + dot) * 2) / 2;
  const scale = 1 / (2 * w);
  return {
    x: cross.x * scale,
    y: cross.y * scale,
    z: cross.z * scale,
    w,
  };
}
