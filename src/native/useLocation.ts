import { useEffect, useState } from 'react';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

/** A geographic fix for the observation site, captured at measurement time. */
export interface GeoFix {
  lat: number;
  lon: number;
  accuracy: number; // metres (-1 if unknown)
  capturedAt: number; // epoch ms
}

interface LocationNative {
  getCurrentPosition(): Promise<GeoFix>;
}

// App-local native module (see android .../location/LocationModule.kt). Plain
// (legacy) module — chosen because @react-native-community/geolocation's codegen
// doesn't build on RN 0.84 and Expo has no SDK for RN 0.84.1 yet. iOS module is
// not implemented yet, so location is Android-only for now.
const native: LocationNative | undefined =
  Platform.OS === 'android'
    ? (NativeModules.MeteorLocationModule as LocationNative | undefined)
    : undefined;

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** One-shot location fix (requests permission). Returns null if unavailable. */
export async function getCurrentFix(): Promise<GeoFix | null> {
  if (!native) {
    return null;
  }
  if (!(await ensurePermission())) {
    return null;
  }
  try {
    return await native.getCurrentPosition();
  } catch {
    return null;
  }
}

/**
 * Polls the device location while `active`, returning the latest fix.
 *
 * Starts when a measurement screen mounts so a fix is ready by the time the
 * report is created. Returns null until a fix (or permission) arrives.
 */
export function useLocation(active: boolean): GeoFix | null {
  const [fix, setFix] = useState<GeoFix | null>(null);

  useEffect(() => {
    if (!active || !native) {
      return;
    }
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const next = await native.getCurrentPosition();
        if (mounted) {
          setFix(next);
        }
      } catch {
        // keep the last fix; a later poll may succeed
      }
    };

    ensurePermission().then((granted) => {
      if (!mounted || !granted) {
        return;
      }
      poll();
      timer = setInterval(poll, 5000);
    });

    return () => {
      mounted = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [active]);

  return fix;
}
