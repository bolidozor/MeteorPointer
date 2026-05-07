import { useEffect, useMemo, useState } from 'react';
import { useAmbientLight } from '@native/useAmbientLight';
import { useSettings } from '@features/settings/useSettings';

type ThemeVariant = 'crimson-day' | 'crimson-night' | 'deep-night';
type ThemeSource = 'ambient-light' | 'time-of-day' | 'manual';

export interface RedThemePalette {
  variant: ThemeVariant;
  source: ThemeSource;
  sourceLabel: string;
  background: string;
  surface: string;
  border: string;
  title: string;
  text: string;
  muted: string;
  accent: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonDanger: string;
}

const DAY_PALETTE: Omit<RedThemePalette, 'source' | 'sourceLabel'> = {
  variant: 'crimson-day',
  background: '#0a0000',
  surface: '#200608',
  border: '#5a1a1c',
  title: '#ffe8e8',
  text: '#ffd9d9',
  muted: '#cc8888',
  accent: '#ff5252',
  buttonPrimary: '#8a1a1a',
  buttonSecondary: '#4a0e0e',
  buttonDanger: '#c42828',
};

const NIGHT_PALETTE: Omit<RedThemePalette, 'source' | 'sourceLabel'> = {
  variant: 'crimson-night',
  background: '#000000',
  surface: '#160304',
  border: '#3d1012',
  title: '#ffdddd',
  text: '#ffc9c9',
  muted: '#c07070',
  accent: '#ff4343',
  buttonPrimary: '#6e1215',
  buttonSecondary: '#420b0d',
  buttonDanger: '#b01e24',
};

// Pure black background, deep red texts — maximum night-vision preservation
const DEEP_NIGHT_PALETTE: Omit<RedThemePalette, 'source' | 'sourceLabel'> = {
  variant: 'deep-night',
  background: '#000000',
  surface: '#050000',
  border: '#220000',
  title: '#ff2222',
  text: '#cc1111',
  muted: '#661111',
  accent: '#ff1111',
  buttonPrimary: '#4a0000',
  buttonSecondary: '#1a0000',
  buttonDanger: '#990000',
};

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const BRIGHT_LUX_THRESHOLD = 60;

export function useAdaptiveRedTheme(): RedThemePalette {
  const colorScheme = useSettings((s) => s.colorScheme);
  const ambientLux = useAmbientLight({ enabled: colorScheme === 'normal', intervalMs: 700 });
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (colorScheme !== 'normal') return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [colorScheme]);

  const result = useMemo(() => {
    if (colorScheme === 'deep-night') {
      return { ...DEEP_NIGHT_PALETTE, source: 'manual' as const, sourceLabel: 'Deep night' };
    }

    if (ambientLux !== null) {
      const dayByLux = ambientLux >= BRIGHT_LUX_THRESHOLD;
      const base = dayByLux ? DAY_PALETTE : NIGHT_PALETTE;
      return { ...base, source: 'ambient-light' as const, sourceLabel: `Ambient ${ambientLux.toFixed(0)} lx` };
    }

    const hour = new Date(now).getHours();
    const dayByTime = hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
    const base = dayByTime ? DAY_PALETTE : NIGHT_PALETTE;
    return { ...base, source: 'time-of-day' as const, sourceLabel: `Hour ${hour.toString().padStart(2, '0')}:00` };
  }, [colorScheme, ambientLux, now]);

  return result;
}
