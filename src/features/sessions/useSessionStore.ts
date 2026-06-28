import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImuData } from '@native/useImu';
import type { EventParams, MeteorEvent, MeteorReport, SessionSnapshot } from './sessionModels';
import { createId } from './sessionModels';

interface SessionStore {
  snapshot: SessionSnapshot;
  events: MeteorEvent[];
  reports: MeteorReport[];
  startSession: () => void;
  stopSession: () => void;
  setLatestImu: (sample: ImuData | null) => void;
  addEvent: (event: Omit<MeteorEvent, 'id'>) => MeteorEvent;
  addManualEvent: () => MeteorEvent;
  addReport: (report: Omit<MeteorReport, 'id' | 'createdAt'>) => MeteorReport;
  updateReportParams: (id: string, params: EventParams) => void;
  markSynced: (ids: string[]) => void;
  clearReports: () => void;
}

const initialSnapshot: SessionSnapshot = {
  isRunning: false,
  startedAt: null,
  latestImu: null,
  lastEventAt: null,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      snapshot: initialSnapshot,
      events: [],
      reports: [],
      startSession: () =>
        set((state) => ({
          snapshot: {
            ...state.snapshot,
            isRunning: true,
            startedAt: state.snapshot.startedAt ?? Date.now(),
          },
        })),
      stopSession: () =>
        set((state) => ({
          snapshot: {
            ...state.snapshot,
            isRunning: false,
            startedAt: null,
          },
        })),
      setLatestImu: (sample) =>
        set((state) => ({
          snapshot: {
            ...state.snapshot,
            latestImu: sample,
          },
        })),
      addEvent: (event) => {
        const enriched: MeteorEvent = { ...event, id: createId('event') };
        set((state) => ({
          events: [enriched, ...state.events].slice(0, 250),
          snapshot: {
            ...state.snapshot,
            lastEventAt: enriched.timestamp,
          },
        }));
        return enriched;
      },
      addManualEvent: () => {
        const timestamp = Date.now();
        const manual: MeteorEvent = {
          id: createId('event'),
          source: 'manual',
          timestamp,
          confidence: 1,
          peakDelta: 0,
        };
        set((state) => ({
          events: [manual, ...state.events].slice(0, 250),
          snapshot: {
            ...state.snapshot,
            lastEventAt: timestamp,
          },
        }));
        return manual;
      },
      addReport: (report) => {
        const enriched: MeteorReport = {
          ...report,
          id: createId('report'),
          createdAt: Date.now(),
        };
        set((state) => ({ reports: [enriched, ...state.reports].slice(0, 500) }));
        return enriched;
      },
      updateReportParams: (id, params) =>
        set((state) => ({
          reports: state.reports.map((r) => (r.id === id ? { ...r, params } : r)),
        })),
      markSynced: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          return {
            reports: state.reports.map((r) =>
              idSet.has(r.id) ? { ...r, synced: true } : r,
            ),
          };
        }),
      clearReports: () => set({ reports: [] }),
    }),
    {
      name: 'meteor-pointer-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        events: state.events,
        reports: state.reports,
        snapshot: {
          ...initialSnapshot,
          lastEventAt: state.snapshot.lastEventAt,
        },
      }),
    },
  ),
);
