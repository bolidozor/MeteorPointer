/**
 * Offline-first synchronisation of measurements to the API.
 *
 * Reports live in the local store (persisted to AsyncStorage) and act as an
 * outbox. `flushOutbox` uploads everything not yet `synced` in one idempotent
 * batch; the API dedupes on the report id, so retrying after a dropped
 * connection is safe. Nothing is ever lost — unsynced reports stay queued
 * until a flush succeeds.
 */
import { create } from 'zustand';

import { ApiError, api, type ReportItem } from '@api/client';
import { useDeviceStore } from '@auth/useDeviceStore';
import { useSettings } from '@features/settings/useSettings';
import { useSessionStore } from '@features/sessions/useSessionStore';

interface SyncState {
  syncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
  set: (partial: Partial<SyncState>) => void;
}

export const useSyncStatus = create<SyncState>((set) => ({
  syncing: false,
  lastSyncAt: null,
  lastError: null,
  set: (partial) => set(partial),
}));

let inFlight = false;

/** Number of reports waiting to be uploaded. */
export function pendingCount(): number {
  return useSessionStore.getState().reports.filter((r) => !r.synced).length;
}

/** Upload all not-yet-synced reports. Safe to call often; no-ops when idle. */
export async function flushOutbox(): Promise<void> {
  if (inFlight) {
    return;
  }
  const backendUrl = useSettings.getState().backendUrl.trim();
  const deviceId = useDeviceStore.getState().deviceId;
  if (!backendUrl || !deviceId) {
    return; // not connected / not registered
  }

  const pending = useSessionStore.getState().reports.filter((r) => !r.synced);
  if (pending.length === 0) {
    return;
  }

  inFlight = true;
  useSyncStatus.getState().set({ syncing: true, lastError: null });
  try {
    const token = await useDeviceStore.getState().getAccessToken();
    if (!token) {
      throw new Error('Authentication failed');
    }
    const items: ReportItem[] = pending.map((r) => ({
      client_key: r.id,
      payload: r as unknown as Record<string, unknown>,
    }));
    const result = await api.uploadReports(token, items);
    const done = result.results
      .filter((x) => x.status === 'accepted' || x.status === 'duplicate')
      .map((x) => x.client_key);
    useSessionStore.getState().markSynced(done);
    useSyncStatus.getState().set({ syncing: false, lastSyncAt: Date.now(), lastError: null });
  } catch (e) {
    const msg = e instanceof ApiError ? `${e.status} ${e.message}` : (e as Error).message;
    useSyncStatus.getState().set({ syncing: false, lastError: msg });
    // Leave reports unsynced — they are retried on the next trigger.
  } finally {
    inFlight = false;
  }
}
