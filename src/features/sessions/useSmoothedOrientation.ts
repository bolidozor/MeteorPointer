import { useEffect, useMemo, useState } from 'react';
import type { ImuData } from '@native/useImu';
import { averageOrientation, orientationJitter, toOrientation } from './orientation';
import type { OrientationPoint } from './orientation';

type Axis = '+X' | '+Y' | '+Z';

export function useSmoothedOrientation(
  imu: ImuData | null,
  axis: Axis,
  windowSize = 30,
): {
  orientation: OrientationPoint | null;
  jitter: number;
  window: OrientationPoint[];
} {
  const [points, setPoints] = useState<OrientationPoint[]>([]);
  const [latest, setLatest] = useState<OrientationPoint | null>(null);

  useEffect(() => {
    if (!imu) {
      setPoints([]);
      setLatest(null);
      return;
    }
    const next = toOrientation(imu, axis);
    setLatest(next);
    setPoints((prev) => [...prev, next].slice(-windowSize));
  }, [imu, axis, windowSize]);

  const hasRotVec = imu?.rotVec != null;

  // When Android fusion is active, use the latest point directly —
  // the OS Kalman filter already smooths it. Averaging would only add lag.
  // Without rotVec (simulation / fallback), average the window instead.
  const orientation = useMemo(
    () => (hasRotVec ? latest : averageOrientation(points)),
    [hasRotVec, latest, points],
  );

  // Jitter always comes from the window — it measures positional stability,
  // not sensor noise, so it's valid regardless of orientation source.
  const jitter = useMemo(() => orientationJitter(points), [points]);

  return { orientation, jitter, window: points };
}
