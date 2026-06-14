import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@i18n/translations';

interface SettingsState {
  aimingAxis: '+X' | '+Y' | '+Z';
  stabilizationThreshold: number;
  audioEnabled: boolean;
  hapticEnabled: boolean;
  backendUrl: string;
  triggerMethod: 'imu' | 'volume';
  language: Locale;
  colorScheme: 'normal' | 'deep-night';
  setAimingAxis: (axis: SettingsState['aimingAxis']) => void;
  setStabilizationThreshold: (value: number) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setBackendUrl: (url: string) => void;
  setTriggerMethod: (method: 'imu' | 'volume') => void;
  setLanguage: (language: Locale) => void;
  setColorScheme: (scheme: 'normal' | 'deep-night') => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      aimingAxis: '+Z',
      stabilizationThreshold: 2.5,
      audioEnabled: true,
      hapticEnabled: true,
      backendUrl: '',
      triggerMethod: 'imu',
      language: 'en',
      colorScheme: 'normal',
      setAimingAxis: (aimingAxis) => set({ aimingAxis }),
      setStabilizationThreshold: (stabilizationThreshold) =>
        set({ stabilizationThreshold: Math.max(0.2, stabilizationThreshold) }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),
      setBackendUrl: (backendUrl) => set({ backendUrl }),
      setTriggerMethod: (triggerMethod) => set({ triggerMethod }),
      setLanguage: (language) => set({ language }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
    }),
    {
      name: 'meteor-pointer-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      migrate: (persisted) => {
        const state = persisted as Partial<SettingsState>;
        return {
          ...state,
          triggerMethod: state.triggerMethod ?? 'imu',
          language: state.language ?? 'en',
          colorScheme: state.colorScheme ?? 'normal',
        };
      },
    },
  ),
);
