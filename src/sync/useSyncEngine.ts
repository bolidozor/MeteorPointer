/**
 * Wires the sync triggers: on mount, when a device registers, after each new
 * measurement, and whenever the network connection is (re)gained.
 *
 * Mounted once near the app root.
 */
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { useDeviceStore } from '@auth/useDeviceStore';
import { useSessionStore } from '@features/sessions/useSessionStore';

import { flushOutbox } from './syncEngine';

export function useSyncEngine(): void {
  const deviceId = useDeviceStore((s) => s.deviceId);
  const reportCount = useSessionStore((s) => s.reports.length);

  // Flush on mount, after registration, and after each new report.
  useEffect(() => {
    flushOutbox();
  }, [deviceId, reportCount]);

  // Flush whenever connectivity is (re)gained.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushOutbox();
      }
    });
    return unsubscribe;
  }, []);
}
