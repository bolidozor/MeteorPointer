import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@i18n/translations';

/** Default backend base URL. API endpoints live under `${DEFAULT_BACKEND_URL}/api/v1/...`. */
export const DEFAULT_BACKEND_URL = 'https://meteorpointer.astro.cz';

interface SettingsState {
  aimingAxis: '+X' | '+Y' | '+Z';
  stabilizationThreshold: number;
  audioEnabled: boolean;
  hapticEnabled: boolean;
  backendUrl: string;
  triggerMethod: 'imu' | 'volume';
  language: Locale;
  colorScheme: 'normal' | 'deep-night';
  testMode: boolean;
  /** Observer nickname; used as the device label on the server. Empty = use the default. */
  observerLabel: string;
  setAimingAxis: (axis: SettingsState['aimingAxis']) => void;
  setStabilizationThreshold: (value: number) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setBackendUrl: (url: string) => void;
  setTriggerMethod: (method: 'imu' | 'volume') => void;
  setLanguage: (language: Locale) => void;
  setColorScheme: (scheme: 'normal' | 'deep-night') => void;
  setTestMode: (enabled: boolean) => void;
  setObserverLabel: (label: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      aimingAxis: '+Z',
      stabilizationThreshold: 2.5,
      audioEnabled: true,
      hapticEnabled: true,
      backendUrl: DEFAULT_BACKEND_URL,
      triggerMethod: 'imu',
      language: 'en',
      colorScheme: 'normal',
      testMode: false,
      observerLabel: '',
      setAimingAxis: (aimingAxis) => set({ aimingAxis }),
      setStabilizationThreshold: (stabilizationThreshold) =>
        set({ stabilizationThreshold: Math.max(0.2, stabilizationThreshold) }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),
      setBackendUrl: (backendUrl) => set({ backendUrl }),
      setTriggerMethod: (triggerMethod) => set({ triggerMethod }),
      setLanguage: (language) => set({ language }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setTestMode: (testMode) => set({ testMode }),
      setObserverLabel: (observerLabel) => set({ observerLabel }),
    }),
    {
      name: 'meteor-pointer-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 7,
      migrate: (persisted) => {
        const state = persisted as Partial<SettingsState>;
        return {
          ...state,
          triggerMethod: state.triggerMethod ?? 'imu',
          language: state.language ?? 'en',
          colorScheme: state.colorScheme ?? 'normal',
          testMode: state.testMode ?? false,
          observerLabel: state.observerLabel ?? '',
          // Default existing installs (empty/missing URL) to the astro backend,
          // but keep any custom URL the user set.
          backendUrl:
            state.backendUrl && state.backendUrl.trim() ? state.backendUrl : DEFAULT_BACKEND_URL,
        };
      },
    },
  ),
);
