import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useImu } from '@native/useImu';
import { useLocation, type GeoFix } from '@native/useLocation';
import { emitCue } from '@native/cues';
import { useVolumeKey } from '@native/useVolumeKey';
import { useSettings } from '@features/settings/useSettings';
import { angleDistanceDeg, averageOrientation, orientationJitter, toOrientation } from './orientation';
import type { AimPoint } from './sessionModels';
import { useSessionStore } from './useSessionStore';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import { EventParamsOverlay } from './EventParamsOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'Aiming'>;

type Step = 'start' | 'end' | 'done';

const WINDOW_SIZE = 30;
const MIN_SAMPLES = 10;
const MIN_MOVEMENT_DEG = 8; // must move at least this far from start before end can be captured

export function AimingScreen({ route, navigation }: Props): React.JSX.Element {
  const { eventTimestamp } = route.params;
  const aimingAxis = useSettings((state) => state.aimingAxis);
  const stabilizationThreshold = useSettings((state) => state.stabilizationThreshold);
  const audioEnabled = useSettings((state) => state.audioEnabled);
  const hapticEnabled = useSettings((state) => state.hapticEnabled);
  const triggerMethod = useSettings((state) => state.triggerMethod);
  const theme = useAdaptiveRedTheme();
  const isFocused = useIsFocused();

  const imu = useImu();
  const location = useLocation(isFocused);
  const locationRef = useRef<GeoFix | null>(null);
  const addReport = useSessionStore((state) => state.addReport);
  const updateReportParams = useSessionStore((state) => state.updateReportParams);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const [step, setStep] = useState<Step>('start');
  const [window, setWindow] = useState<{ alt: number; az: number }[]>([]);
  const [startPoint, setStartPoint] = useState<AimPoint | null>(null);
  const [endPoint, setEndPoint] = useState<AimPoint | null>(null);
  const [showParams, setShowParams] = useState(false);

  const stableRef = useRef(false);
  const captureLockRef = useRef(false);
  const prevMovedRef = useRef(false);
  const reportIdRef = useRef<string | null>(null);
  const overlayVolumeRef = useRef<((key: 'up' | 'down') => void) | null>(null);

  useEffect(() => {
    if (!imu || step === 'done') {
      return;
    }

    const next = toOrientation(imu, aimingAxis);
    setWindow((prev) => [...prev, next].slice(-WINDOW_SIZE));
  }, [imu, step, aimingAxis]);

  const hasRotVec = imu?.rotVec != null;
  const orientation = useMemo(
    () => hasRotVec && imu ? toOrientation(imu, aimingAxis) : averageOrientation(window),
    [hasRotVec, imu, aimingAxis, window],
  );
  const jitter = useMemo(() => orientationJitter(window), [window]);

  const stable = window.length >= MIN_SAMPLES && jitter <= stabilizationThreshold;

  // For the second point: require meaningful movement away from the start point first
  const hasMovedEnough = useMemo(() => {
    if (step !== 'end' || !startPoint || !orientation) return true; // no constraint on first point
    return angleDistanceDeg(orientation, startPoint) >= MIN_MOVEMENT_DEG;
  }, [step, startPoint, orientation]);

  useEffect(() => {
    if (step !== 'end') {
      prevMovedRef.current = false;
      return;
    }
    if (hasMovedEnough && !prevMovedRef.current) {
      setWindow([]);
      stableRef.current = false;
    }
    prevMovedRef.current = hasMovedEnough;
  }, [hasMovedEnough, step]);

  useEffect(() => {
    if (step === 'done') {
      return;
    }

    if (stable && !stableRef.current) {
      stableRef.current = true;
      emitCue({ audioEnabled, hapticEnabled, kind: 'stable' });
      return;
    }

    if (!stable && stableRef.current) {
      stableRef.current = false;
    }
  }, [stable, step, audioEnabled, hapticEnabled]);

  const capture = useCallback((point: AimPoint) => {
    emitCue({ audioEnabled, hapticEnabled, kind: 'capture' });

    if (step === 'start') {
      setStartPoint(point);
      setStep('end');
      setWindow([]);
      stableRef.current = false;
      captureLockRef.current = false;
      return;
    }

    if (step === 'end' && startPoint) {
      setEndPoint(point);
      setStep('done');

      const separation = Math.sqrt(
        (startPoint.alt - point.alt) ** 2 + angularDistance(startPoint.az, point.az) ** 2,
      );
      const quality =
        Math.max(0, Math.min(1, 1 - (startPoint.jitter + point.jitter) / 20)) *
        Math.min(1, separation / 20);

      const report = addReport({
        eventTimestamp,
        startPoint,
        endPoint: point,
        quality,
        site: locationRef.current,
      });
      reportIdRef.current = report.id;
      emitCue({ audioEnabled, hapticEnabled, kind: 'done' });
    }

    captureLockRef.current = false;
  }, [step, startPoint, audioEnabled, hapticEnabled, addReport, eventTimestamp]);

  // Auto-capture: fires when stable — only in 'imu' mode; second point also requires movement first
  useEffect(() => {
    if (triggerMethod !== 'imu') return;
    if (step === 'done' || !stable || !hasMovedEnough || !orientation || captureLockRef.current) return;
    captureLockRef.current = true;
    capture({ alt: orientation.alt, az: orientation.az, jitter, capturedAt: Date.now() });
  }, [stable, step, orientation, jitter, capture, triggerMethod, hasMovedEnough]);

  // Show params overlay when step becomes 'done'
  useEffect(() => {
    if (step === 'done') {
      setShowParams(true);
    }
  }, [step]);

  // Manual capture: volume button bypasses stabilization.
  const manualCapture = useCallback(() => {
    if (!orientation || step === 'done' || captureLockRef.current) return;
    captureLockRef.current = true;
    capture({ alt: orientation.alt, az: orientation.az, jitter, capturedAt: Date.now() });
  }, [orientation, step, jitter, capture]);

  const handleKey = useCallback((key: 'up' | 'down') => {
    if (showParams && overlayVolumeRef.current) {
      overlayVolumeRef.current(key);
    } else {
      manualCapture();
    }
  }, [showParams, manualCapture]);

  useVolumeKey(handleKey, isFocused && ((triggerMethod === 'volume' && step !== 'done') || showParams));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar hidden />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.title }]}>Aiming</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Event: {new Date(eventTimestamp).toLocaleString()}</Text>

        {showParams ? (
          <EventParamsOverlay
            theme={theme}
            onDone={(params) => {
              if (reportIdRef.current) {
                updateReportParams(reportIdRef.current, params);
              }
              navigation.goBack();
            }}
            onCancel={() => navigation.goBack()}
            onVolumeKey={(_key) => { /* forwarded via volumeHandlerRef */ }}
            volumeHandlerRef={overlayVolumeRef}
          />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.stepTitle, { color: theme.title }]}>
                {step === 'start' && (triggerMethod === 'volume'
                  ? 'Step 1: point at START — press volume'
                  : 'Step 1: aim at START — hold still to capture')}
                {step === 'end' && !hasMovedEnough && 'Step 2: move to END of trajectory'}
                {step === 'end' && hasMovedEnough && (triggerMethod === 'volume'
                  ? 'Step 2: point at END — press volume'
                  : 'Step 2: hold still — capturing END')}
                {step === 'done' && 'Capture complete'}
              </Text>
              <Metric label="Style" value={`${theme.variant} (${theme.sourceLabel})`} theme={theme} />
              <Metric label="Samples" value={String(window.length)} theme={theme} />
              <Metric
                label="Current ALT/AZ"
                value={
                  orientation
                    ? `${orientation.alt.toFixed(1)}° / ${orientation.az.toFixed(1)}°`
                    : 'waiting...'
                }
                theme={theme}
              />
              <Metric
                label="Jitter"
                value={Number.isFinite(jitter) ? `${jitter.toFixed(2)}°` : 'n/a'}
                theme={theme}
              />
              <Metric
                label="GPS"
                value={location ? `±${location.accuracy.toFixed(0)} m` : 'off (test build)'}
                theme={theme}
              />
              <Metric
                label="Stable"
                value={
                  step === 'end' && !hasMovedEnough
                    ? '— waiting for movement'
                    : stable ? 'YES' : `NO (<= ${stabilizationThreshold.toFixed(1)}°)`
                }
                theme={theme}
              />
              {step === 'end' && startPoint && orientation && (
                <Metric
                  label="Moved from START"
                  value={`${angleDistanceDeg(orientation, startPoint).toFixed(1)}° ${hasMovedEnough ? '✓' : `(min ${MIN_MOVEMENT_DEG}°)`}`}
                  theme={theme}
                />
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Metric
                label="START"
                value={
                  startPoint
                    ? `${startPoint.alt.toFixed(1)}° / ${startPoint.az.toFixed(1)}°`
                    : '-'
                }
                theme={theme}
              />
              <Metric
                label="END"
                value={
                  endPoint
                    ? `${endPoint.alt.toFixed(1)}° / ${endPoint.az.toFixed(1)}°`
                    : '-'
                }
                theme={theme}
              />
            </View>

            {step !== 'done' && (
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  { backgroundColor: theme.buttonSecondary },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.cancelText, { color: theme.muted }]}>Cancel</Text>
              </Pressable>
            )}

            {step === 'done' ? (
              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.buttonSecondary },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => navigation.navigate('Reports')}
                >
                  <Text style={[styles.buttonText, { color: theme.text }]}>Open Reports</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.buttonPrimary },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={[styles.buttonText, { color: theme.text }]}>Domů</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.info, { color: theme.muted }]}>
                {triggerMethod === 'volume'
                  ? 'Press a volume button to capture.'
                  : 'Hold still to capture automatically.'}
              </Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function angularDistance(a: number, b: number): number {
  const diff = ((a - b + 540) % 360) - 180;
  return Math.abs(diff);
}

function Metric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 18,
    gap: 14,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricLabel: {
    fontSize: 14,
  },
  metricValue: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  button: {
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: 130,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  info: {
    fontSize: 13,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
