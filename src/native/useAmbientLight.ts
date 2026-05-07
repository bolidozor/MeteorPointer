import { useEffect, useState } from 'react';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';

interface AmbientPayload {
  lux: number;
  timestamp: number;
}

interface AmbientNativeModule {
  EVENT_NAME?: string;
  start: (updateIntervalMs: number) => void;
  stop: () => void;
  isAvailable: () => Promise<boolean>;
  addListener?: (eventName: string) => void;
  removeListeners?: (count: number) => void;
}

interface UseAmbientLightOptions {
  enabled?: boolean;
  intervalMs?: number;
}

const FALLBACK_EVENT_NAME = 'AmbientLightSample';
const DEFAULT_INTERVAL_MS = 700;

const moduleRef: AmbientNativeModule | undefined =
  Platform.OS === 'android'
    ? (NativeModules.AmbientLightModule as AmbientNativeModule | undefined)
    : undefined;

const ambientEmitter =
  Platform.OS === 'android' && moduleRef
    ? new NativeEventEmitter(moduleRef as never)
    : null;

export function useAmbientLight(options?: UseAmbientLightOptions): number | null {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = options ?? {};
  const [lux, setLux] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !moduleRef || !ambientEmitter) {
      setLux(null);
      return;
    }

    let mounted = true;
    let subscription: EmitterSubscription | null = null;

    const eventName = moduleRef.EVENT_NAME ?? FALLBACK_EVENT_NAME;

    moduleRef
      .isAvailable()
      .then((available) => {
        if (!mounted || !available) {
          return;
        }

        subscription = ambientEmitter.addListener(eventName, (payload: AmbientPayload) => {
          if (typeof payload?.lux === 'number' && Number.isFinite(payload.lux)) {
            setLux(payload.lux);
          }
        });

        moduleRef.start(Math.max(100, intervalMs));
      })
      .catch(() => setLux(null));

    return () => {
      mounted = false;
      subscription?.remove();
      moduleRef.stop();
    };
  }, [enabled, intervalMs]);

  return lux;
}
