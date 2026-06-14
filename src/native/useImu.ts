import { useEffect, useMemo, useState } from 'react';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import { useSettings } from '@features/settings/useSettings';

export interface ImuData {
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
  mag: { x: number; y: number; z: number };
  rotVec: { x: number; y: number; z: number; w: number; accuracyRad: number } | null;
  timestamp: number;
}

interface UseImuOptions {
  intervalMs?: number;
}

interface ImuNativeModule {
  EVENT_NAME?: string;
  start: (updateIntervalMs: number) => void;
  stop: () => void;
  isAvailable: () => Promise<boolean>;
  setSimulate?: (enabled: boolean) => void;
  addListener?: (eventName: string) => void;
  removeListeners?: (count: number) => void;
}

const DEFAULT_INTERVAL_MS = 80;
const FALLBACK_EVENT_NAME = 'ImuSensorSample';

const imuNative: ImuNativeModule | undefined =
  Platform.OS === 'android' ? (NativeModules.ImuSensorModule as ImuNativeModule | undefined) : undefined;

const imuEmitter =
  Platform.OS === 'android' && imuNative ? new NativeEventEmitter(imuNative as never) : null;

export function useImu(options?: UseImuOptions): ImuData | null {
  const { intervalMs = DEFAULT_INTERVAL_MS } = options ?? {};
  const [sample, setSample] = useState<ImuData | null>(null);
  const simulate = useSettings((state) => state.simulateSensors);

  const interval = useMemo(() => Math.max(20, intervalMs), [intervalMs]);

  useEffect(() => {
    if (!imuNative || !imuEmitter) {
      setSample(null);
      return;
    }

    let mounted = true;
    let subscription: EmitterSubscription | null = null;

    const eventName = imuNative.EVENT_NAME ?? FALLBACK_EVENT_NAME;

    imuNative.setSimulate?.(simulate);
    imuNative
      .isAvailable()
      .then((available) => {
        if (!mounted || !available) {
          return;
        }

        subscription = imuEmitter.addListener(eventName, (payload: unknown) => {
          const parsed = parseImuPayload(payload);
          if (parsed) {
            setSample(parsed);
          }
        });

        imuNative.start(interval);
      })
      .catch(() => {
        setSample(null);
      });

    return () => {
      mounted = false;
      subscription?.remove();
      imuNative.stop();
    };
  }, [interval, simulate]);

  return sample;
}

function parseImuPayload(payload: unknown): ImuData | null {
  if (!isRecord(payload)) {
    return null;
  }

  const accel = parseVector(payload.accel);
  const gyro = parseVector(payload.gyro);
  const mag = parseVector(payload.mag);
  const timestamp = toNumber(payload.timestamp);

  if (!accel || !gyro || !mag || timestamp === null) {
    return null;
  }

  const rotVec = parseRotVec(payload.rotVec);

  return {
    accel,
    gyro,
    mag,
    rotVec,
    timestamp,
  };
}

function parseRotVec(
  payload: unknown,
): { x: number; y: number; z: number; w: number; accuracyRad: number } | null {
  if (!isRecord(payload)) return null;
  const x = toNumber(payload.x);
  const y = toNumber(payload.y);
  const z = toNumber(payload.z);
  const w = toNumber(payload.w);
  if (x === null || y === null || z === null || w === null) return null;
  const accuracyRad = toNumber(payload.accuracyRad) ?? -1;
  return { x, y, z, w, accuracyRad };
}

function parseVector(payload: unknown): { x: number; y: number; z: number } | null {
  if (!isRecord(payload)) {
    return null;
  }

  const x = toNumber(payload.x);
  const y = toNumber(payload.y);
  const z = toNumber(payload.z);

  if (x === null || y === null || z === null) {
    return null;
  }

  return { x, y, z };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
