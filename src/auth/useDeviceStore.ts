/**
 * Device account state: registration, consent, and short-lived access tokens.
 *
 * Passwordless and e-mail-free — the device's Ed25519 key (in the Keychain) is
 * the only credential. Tokens are minted on demand by signing a challenge.
 */
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, type ConsentPayload } from '@api/client';
import { useSettings } from '@features/settings/useSettings';

import { clearKeypair, ensureKeypair, sign } from './identity';

const APP_VERSION = '0.0.1';

function deviceLabel(): string {
  return `MeteorPointer ${Platform.OS}`;
}

interface DeviceStore {
  deviceId: string | null;
  consentVersion: string | null;
  registeredAt: number | null;

  // Transient (not persisted)
  token: string | null;
  tokenExpiresAt: number | null;
  recoveryPhrase: string | null; // shown once after registration

  register: () => Promise<string>; // returns the recovery phrase
  getAccessToken: () => Promise<string | null>;
  deleteData: () => Promise<number>;
  unregister: () => Promise<void>;
  clearRecoveryPhrase: () => void;
}

export const useDeviceStore = create<DeviceStore>()(
  persist(
    (set, get) => ({
      deviceId: null,
      consentVersion: null,
      registeredAt: null,
      token: null,
      tokenExpiresAt: null,
      recoveryPhrase: null,

      register: async () => {
        const language = useSettings.getState().language;
        const publicKey = await ensureKeypair();
        const doc = await api.getConsent(language);
        const consent: ConsentPayload = {
          version: doc.version,
          license: doc.license,
          document_sha256: doc.sha256,
          locale: doc.locale,
          app_version: APP_VERSION,
          accepted_at: new Date().toISOString(),
        };
        const result = await api.registerDevice({
          public_key: publicKey,
          label: deviceLabel(),
          consent,
        });
        set({
          deviceId: result.device_id,
          consentVersion: doc.version,
          registeredAt: Date.now(),
          recoveryPhrase: result.recovery_phrase,
        });
        return result.recovery_phrase;
      },

      getAccessToken: async () => {
        const { deviceId, token, tokenExpiresAt } = get();
        if (!deviceId) {
          return null;
        }
        if (token && tokenExpiresAt && Date.now() < tokenExpiresAt - 5000) {
          return token;
        }
        const challenge = await api.getChallenge(deviceId);
        const signature = await sign(challenge.nonce);
        if (!signature) {
          return null;
        }
        const minted = await api.getToken({
          device_id: deviceId,
          nonce: challenge.nonce,
          signature,
        });
        set({
          token: minted.access_token,
          tokenExpiresAt: Date.now() + minted.expires_in * 1000,
        });
        return minted.access_token;
      },

      deleteData: async () => {
        const { deviceId } = get();
        if (!deviceId) {
          return 0;
        }
        const token = await get().getAccessToken();
        if (!token) {
          throw new Error('Could not authenticate device');
        }
        const res = await api.deleteDeviceData(token, deviceId);
        return res.deleted;
      },

      unregister: async () => {
        const { deviceId } = get();
        if (deviceId) {
          try {
            const token = await get().getAccessToken();
            if (token) {
              await api.deleteDevice(token, deviceId);
            }
          } catch {
            // best effort — local identity is cleared regardless
          }
        }
        await clearKeypair();
        set({
          deviceId: null,
          consentVersion: null,
          registeredAt: null,
          token: null,
          tokenExpiresAt: null,
          recoveryPhrase: null,
        });
      },

      clearRecoveryPhrase: () => set({ recoveryPhrase: null }),
    }),
    {
      name: 'meteor-pointer-device',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        deviceId: state.deviceId,
        consentVersion: state.consentVersion,
        registeredAt: state.registeredAt,
      }),
    },
  ),
);
