import { useEffect, useRef, useState } from 'react';
import type { ImuData } from './useImu';

type Vec3 = { x: number; y: number; z: number };

function emaVec(prev: Vec3, next: Vec3, alpha: number): Vec3 {
  return {
    x: alpha * next.x + (1 - alpha) * prev.x,
    y: alpha * next.y + (1 - alpha) * prev.y,
    z: alpha * next.z + (1 - alpha) * prev.z,
  };
}

export function useLowPassImu(imu: ImuData | null, alpha = 0.1): ImuData | null {
  const stateRef = useRef<ImuData | null>(null);
  const [output, setOutput] = useState<ImuData | null>(null);

  useEffect(() => {
    if (!imu) {
      stateRef.current = null;
      setOutput(null);
      return;
    }

    const prev = stateRef.current;
    const next: ImuData = prev
      ? {
          accel:  emaVec(prev.accel, imu.accel, alpha),
          gyro:   emaVec(prev.gyro,  imu.gyro,  alpha),
          mag:    emaVec(prev.mag,   imu.mag,   alpha),
          rotVec: imu.rotVec,
          timestamp: imu.timestamp,
        }
      : imu;

    stateRef.current = next;
    setOutput(next);
  }, [imu, alpha]);

  return output;
}
