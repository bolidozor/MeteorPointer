import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

/** A geographic fix for the observation site, captured at measurement time. */
export interface GeoFix {
  lat: number;
  lon: number;
  accuracy: number; // metres
  capturedAt: number; // epoch ms
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return new Promise<boolean>((resolve) => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    );
  });
}

/**
 * Tracks the device's location while `active`, returning the latest fix.
 *
 * Watching starts when a measurement screen mounts so a fix is ready by the
 * time the report is created. Returns null until a fix (or permission) arrives.
 */
export function useLocation(active: boolean): GeoFix | null {
  const [fix, setFix] = useState<GeoFix | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }
    let mounted = true;
    let watchId: number | null = null;

    ensurePermission().then((granted) => {
      if (!mounted || !granted) {
        return;
      }
      watchId = Geolocation.watchPosition(
        (pos) => {
          setFix({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: pos.timestamp,
          });
        },
        () => {
          /* ignore transient errors; a later fix may succeed */
        },
        { enableHighAccuracy: true, distanceFilter: 0, maximumAge: 10000 },
      );
    });

    return () => {
      mounted = false;
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [active]);

  return fix;
}
