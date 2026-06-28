import type { ImuData } from '@native/useImu';

export interface MeteorEvent {
  id: string;
  timestamp: number;
  confidence: number;
  peakDelta: number;
  source: 'imu' | 'manual';
}

export interface AimPoint {
  alt: number;
  az: number;
  jitter: number;
  capturedAt: number;
}

/** Geographic location of the observation site at measurement time. */
export interface ObservationSite {
  lat: number;
  lon: number;
  accuracy: number;
  capturedAt: number;
}

export interface EventParams {
  magnitude: number | null;
  color: string | null;
  sound: boolean | null;
  fragmentation: boolean | null;
  shower: string | null;
  note: string;
}

export const METEOR_COLORS: Record<string, string> = {
  white:  '#ffffff',
  yellow: '#ffe866',
  orange: '#ff8c30',
  red:    '#ff4040',
  green:  '#44ff77',
  blue:   '#3388ff',
  violet: '#aa33ff',
};

export const METEOR_SHOWERS = [
  'autodetection',
  'Perseids',
  'Leonids',
  'Geminids',
  'Lyrids',
  'Eta Aquarids',
  'Orionids',
  'S. Taurids',
  'N. Taurids',
  'Draconids',
  'Ursids',
  'Quadrantids',
  'Delta Aquarids',
  'sporadic',
  'other',
] as const;

export const DEFAULT_EVENT_PARAMS: EventParams = {
  magnitude: null,
  color: null,
  sound: null,
  fragmentation: null,
  shower: null,
  note: '',
};

export interface MeteorReport {
  id: string;
  eventTimestamp: number;
  startPoint: AimPoint;
  endPoint: AimPoint;
  createdAt: number;
  quality: number;
  test?: boolean; // true for test/calibration reports that should not be treated as real meteors
  params?: EventParams;
  site?: ObservationSite | null; // GPS of the observation site; null if unavailable
  synced?: boolean; // true once the report has been accepted by the API
}

export interface SessionSnapshot {
  isRunning: boolean;
  startedAt: number | null;
  latestImu: ImuData | null;
  lastEventAt: number | null;
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
