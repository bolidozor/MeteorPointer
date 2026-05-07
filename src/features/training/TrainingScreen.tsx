import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useImu } from '@native/useImu';
import { useVolumeKey } from '@native/useVolumeKey';
import { useSettings } from '@features/settings/useSettings';
import { angleDistanceDeg } from '@features/sessions/orientation';
import { useSmoothedOrientation } from '@features/sessions/useSmoothedOrientation';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';

interface TrainingTarget {
  id: string;
  label: string;
  alt: number;
  az: number;
}

interface TrainingAttempt {
  at: number;
  error: number;
  dAlt: number;
  dAz: number;
}

const TARGETS: TrainingTarget[] = [
  { id: 'moon', label: 'Moon', alt: 37, az: 136 },
  { id: 'sun', label: 'Sun', alt: 28, az: 209 },
  { id: 'vega', label: 'Vega', alt: 62, az: 88 },
  { id: 'jupiter', label: 'Jupiter', alt: 19, az: 247 },
];

const MIN_SAMPLES = 10;
const MAX_ATTEMPTS = 20;

// Chart constants
const CHART_SIZE = 240;
const CHART_CENTER = CHART_SIZE / 2;
const MAX_DEG = 15;
const CHART_SCALE = CHART_CENTER / MAX_DEG;
const RINGS = [5, 10, 15];

function signedAzDiff(measured: number, target: number): number {
  return ((measured - target + 540) % 360) - 180;
}

function clampToChart(dAz: number, dAlt: number): { x: number; y: number } {
  const rawX = CHART_CENTER + dAz * CHART_SCALE;
  const rawY = CHART_CENTER - dAlt * CHART_SCALE;
  const dx = rawX - CHART_CENTER;
  const dy = rawY - CHART_CENTER;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = CHART_CENTER - 6;
  if (dist > maxR && dist > 0) {
    const s = maxR / dist;
    return { x: CHART_CENTER + dx * s, y: CHART_CENTER + dy * s };
  }
  return { x: rawX, y: rawY };
}

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Training'>;

export function TrainingScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const aimingAxis = useSettings((state) => state.aimingAxis);
  const stabilizationThreshold = useSettings((state) => state.stabilizationThreshold);
  const imu = useImu();
  const theme = useAdaptiveRedTheme();
  const { orientation: currentOrientation, jitter, window: orientationWindow } = useSmoothedOrientation(imu, aimingAxis);

  const [targetId, setTargetId] = useState<string>(TARGETS[0].id);
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const target = TARGETS.find((t) => t.id === targetId) ?? TARGETS[0];

  // Clear attempts when target changes
  useEffect(() => {
    setAttempts([]);
  }, [targetId]);

  const stable = orientationWindow.length >= MIN_SAMPLES && jitter <= stabilizationThreshold;

  const currentError = useMemo(() => {
    if (!currentOrientation) return null;
    return angleDistanceDeg(currentOrientation, { alt: target.alt, az: target.az });
  }, [currentOrientation, target.alt, target.az]);

  const liveDAlt = currentOrientation ? currentOrientation.alt - target.alt : null;
  const liveDAz = currentOrientation ? signedAzDiff(currentOrientation.az, target.az) : null;

  const averageError = useMemo(() => {
    if (!attempts.length) return null;
    return attempts.reduce((acc, a) => acc + a.error, 0) / attempts.length;
  }, [attempts]);

  // Use refs to avoid stale closure in volume key callback
  const currentOrientationRef = useRef(currentOrientation);
  const targetRef = useRef(target);
  const currentErrorRef = useRef(currentError);
  currentOrientationRef.current = currentOrientation;
  targetRef.current = target;
  currentErrorRef.current = currentError;

  const recordAttempt = useCallback((): void => {
    const o = currentOrientationRef.current;
    const t = targetRef.current;
    const err = currentErrorRef.current;
    if (err === null || !o) return;
    const dAlt = o.alt - t.alt;
    const dAz = signedAzDiff(o.az, t.az);
    setAttempts((prev) => [{ at: Date.now(), error: err, dAlt, dAz }, ...prev].slice(0, MAX_ATTEMPTS));
  }, []);

  // Volume keys record the current position (always active in training)
  useVolumeKey((_key) => recordAttempt(), true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.title }]}>Training</Text>

        {/* Target selector */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.title }]}>Target</Text>
          <View style={styles.chipRow}>
            {TARGETS.map((item) => {
              const selected = targetId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setTargetId(item.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: selected ? theme.buttonPrimary : theme.buttonSecondary },
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={[styles.chipText, { color: theme.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Metric label="Expected ALT/AZ" value={`${target.alt.toFixed(1)}° / ${target.az.toFixed(1)}°`} theme={theme} />
          <Metric
            label="Measured ALT/AZ"
            value={
              currentOrientation
                ? `${currentOrientation.alt.toFixed(1)}° / ${currentOrientation.az.toFixed(1)}°`
                : 'sensor unavailable'
            }
            theme={theme}
          />
          <Metric
            label="Error"
            value={currentError === null ? '-' : `${currentError.toFixed(2)}°`}
            theme={theme}
          />
          <Metric
            label="Jitter"
            value={Number.isFinite(jitter) ? `${jitter.toFixed(2)}°` : 'n/a'}
            theme={theme}
          />
          <View style={styles.stableRow}>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Stable</Text>
            <View style={[
              styles.stableBadge,
              { backgroundColor: stable ? 'rgba(68,255,119,0.15)' : 'rgba(255,255,255,0.05)' },
            ]}>
              <Text style={[
                styles.stableBadgeText,
                { color: stable ? '#44ff77' : theme.muted },
              ]}>
                {stable ? `YES — ${jitter.toFixed(2)}°` : `NO — ${Number.isFinite(jitter) ? jitter.toFixed(2) : 'n/a'}° > ${stabilizationThreshold.toFixed(1)}°`}
              </Text>
            </View>
          </View>
        </View>

        {/* Record button */}
        <Pressable
          style={({ pressed }) => [
            styles.recordButton,
            { backgroundColor: stable ? theme.buttonPrimary : theme.buttonSecondary },
            pressed && styles.buttonPressed,
          ]}
          onPress={recordAttempt}
          disabled={currentError === null}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>
            Record  {stable ? '✓' : '(not stable)'}
          </Text>
        </Pressable>

        {/* Aim chart */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: theme.title }]}>Aim chart</Text>
            {attempts.length > 0 && (
              <Pressable
                onPress={() => setAttempts([])}
                style={({ pressed }) => [
                  styles.clearButton,
                  { backgroundColor: theme.buttonSecondary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.clearButtonText, { color: theme.muted }]}>Clear</Text>
              </Pressable>
            )}
          </View>
          <AimChart
            attempts={attempts}
            liveDAlt={liveDAlt}
            liveDAz={liveDAz}
            stable={stable}
            theme={theme}
          />
          <Text style={[styles.chartLegend, { color: theme.muted }]}>
            ↑ +ALT  ↓ −ALT  → +AZ  ← −AZ   rings: 5° / 10° / 15°
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.title }]}>Stats</Text>
          <Metric label="Attempts" value={String(attempts.length)} theme={theme} />
          <Metric
            label="Average error"
            value={averageError === null ? '-' : `${averageError.toFixed(2)}°`}
            theme={theme}
          />
          <Metric
            label="Best error"
            value={
              attempts.length
                ? `${Math.min(...attempts.map((a) => a.error)).toFixed(2)}°`
                : '-'
            }
            theme={theme}
          />
        </View>

        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.buttonSecondary },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Domů</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.buttonPrimary },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AimChart({
  attempts,
  liveDAlt,
  liveDAz,
  stable,
  theme,
}: {
  attempts: TrainingAttempt[];
  liveDAlt: number | null;
  liveDAz: number | null;
  stable: boolean;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  const liveColor = stable ? '#44ff77' : theme.muted;
  const livePos = liveDAlt !== null && liveDAz !== null
    ? clampToChart(liveDAz, liveDAlt)
    : null;

  // Render oldest first so newest draws on top
  const orderedAttempts = [...attempts].reverse();

  return (
    <View style={{ width: CHART_SIZE, height: CHART_SIZE, alignSelf: 'center' }}>
      {/* Background circle */}
      <View style={{
        position: 'absolute',
        width: CHART_SIZE,
        height: CHART_SIZE,
        borderRadius: CHART_CENTER,
        backgroundColor: 'rgba(0,0,0,0.25)',
      }} />

      {/* Concentric rings */}
      {RINGS.map((deg) => {
        const r = deg * CHART_SCALE;
        return (
          <View
            key={deg}
            style={{
              position: 'absolute',
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              top: CHART_CENTER - r,
              left: CHART_CENTER - r,
            }}
          />
        );
      })}

      {/* Ring labels */}
      {RINGS.map((deg) => {
        const r = deg * CHART_SCALE;
        return (
          <Text
            key={`lbl-${deg}`}
            style={{
              position: 'absolute',
              fontSize: 8,
              color: 'rgba(255,255,255,0.25)',
              top: CHART_CENTER - 5,
              left: CHART_CENTER + r + 2,
            }}
          >
            {deg}°
          </Text>
        );
      })}

      {/* Crosshair lines */}
      <View style={{
        position: 'absolute',
        top: CHART_CENTER - 0.5,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
      }} />
      <View style={{
        position: 'absolute',
        left: CHART_CENTER - 0.5,
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
      }} />

      {/* Attempt dots — oldest first (lowest z), newest last (top) */}
      {orderedAttempts.map((a, i) => {
        const pos = clampToChart(a.dAz, a.dAlt);
        const alpha = 0.15 + ((i + 1) / orderedAttempts.length) * 0.85;
        return (
          <View
            key={a.at}
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: `rgba(255, 110, 30, ${alpha.toFixed(2)})`,
              top: pos.y - 5,
              left: pos.x - 5,
            }}
          />
        );
      })}

      {/* Live cursor */}
      {livePos && (
        <View
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: liveColor,
            top: livePos.y - 7,
            left: livePos.x - 7,
          }}
        />
      )}

      {/* Center target dot */}
      <View style={{
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
        top: CHART_CENTER - 3,
        left: CHART_CENTER - 3,
      }} />
    </View>
  );
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
    padding: 18,
    gap: 14,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  chipPressed: {
    opacity: 0.84,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricLabel: {
    fontSize: 14,
  },
  metricValue: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  stableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stableBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stableBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartLegend: {
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flex: 1,
  },
});
