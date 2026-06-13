/** A geographic fix for the observation site, captured at measurement time. */
export interface GeoFix {
  lat: number;
  lon: number;
  accuracy: number; // metres
  capturedAt: number; // epoch ms
}

/**
 * GPS capture is temporarily DISABLED.
 *
 * `@react-native-community/geolocation` does not build against React Native
 * 0.84's New Architecture (its codegen JNI / RNCGeolocationSpec is not
 * generated, breaking the native build). This stub keeps the hook's API stable
 * so the rest of the app builds and runs; reports are uploaded with
 * `site = null` until GPS is re-enabled with a New-Architecture-compatible
 * geolocation library.
 */
export function useLocation(_active: boolean): GeoFix | null {
  return null;
}
