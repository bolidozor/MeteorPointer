import type { ImuData } from '@native/useImu';

export interface OrientationPoint {
  alt: number;
  az: number;
}

type Axis = '+X' | '+Y' | '+Z';

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
