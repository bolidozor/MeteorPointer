import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useImu } from '@native/useImu';
import { useKeepAwake } from '@native/useKeepAwake';
import { useVolumeKey } from '@native/useVolumeKey';
import { emitCue, type CueKind } from '@native/cues';
import { useSessionStore } from './useSessionStore';
import { createDetectorState, processImuSample } from './sessionDetection';
import { useSettings } from '@features/settings/useSettings';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Session'>;

type SessionPhase = 'booting' | 'sensor-missing' | 'paused' | 'armed' | 'aiming';

export function SessionScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const triggerMethod = useSettings((state) => state.triggerMethod);
  const audioEnabled = useSettings((state) => state.audioEnabled);
  const hapticEnabled = useSettings((state) => state.hapticEnabled);
  const theme = useAdaptiveRedTheme();
  const isFocused = useIsFocused();

  const imu = useImu();

  const snapshot = useSessionStore((state) => state.snapshot);
  const events = useSessionStore((state) => state.events);
  const startSession = useSessionStore((state) => state.startSession);
  const setLatestImu = useSessionStore((state) => state.setLatestImu);
  const addEvent = useSessionStore((state) => state.addEvent);
  const addManualEvent = useSessionStore((state) => state.addManualEvent);

  const [phase, setPhase] = useState<SessionPhase>('booting');
  const phaseRef = useRef<SessionPhase>('booting');
  const detectorRef = useRef(createDetectorState());

  useKeepAwake(snapshot.isRunning);

  const setNextPhase = useCallback(
    (next: SessionPhase): void => {
      if (phaseRef.current === next) {
        return;
      }

      phaseRef.current = next;
      setPhase(next);

      const cueKind: CueKind | null =
        next === 'aiming' ? 'trigger' : null;

      if (cueKind) {
        emitCue({ audioEnabled, hapticEnabled, kind: cueKind });
      }
    },
    [audioEnabled, hapticEnabled],
  );

  useEffect(() => {
    if (!snapshot.isRunning) {
      startSession();
    }
  }, [snapshot.isRunning, startSession]);

  useEffect(() => {
    setLatestImu(imu);
  }, [imu, setLatestImu]);

  useEffect(() => {
    if (!snapshot.isRunning) {
      detectorRef.current = createDetectorState();
      setNextPhase('booting');
      return;
    }

    if (!imu) {
      setNextPhase('sensor-missing');
      return;
    }

    const { nextState, detection } = processImuSample(detectorRef.current, imu);
    detectorRef.current = nextState;

    if (detection && triggerMethod === 'imu') {
      const event = addEvent({
        source: 'imu',
        timestamp: detection.timestamp,
        confidence: detection.confidence,
        peakDelta: detection.peakDelta,
      });

      setNextPhase('aiming');
      navigation.navigate('Aiming', { eventTimestamp: event.timestamp });
      return;
    }

    setNextPhase('paused');
  }, [imu, snapshot.isRunning, addEvent, navigation, setNextPhase]);

  const handleVolumeKey = useCallback(() => {
    if (triggerMethod !== 'volume') return;
    const event = addManualEvent();
    navigation.navigate('Aiming', { eventTimestamp: event.timestamp });
  }, [triggerMethod, addManualEvent, navigation]);

  useVolumeKey((_key) => handleVolumeKey(), isFocused && snapshot.isRunning && triggerMethod === 'volume');

  const sessionDuration =
    snapshot.isRunning && snapshot.startedAt
      ? `${Math.floor((Date.now() - snapshot.startedAt) / 1000)} s`
      : '0 s';

  const latestEvent = events[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.title }]}>Meteor Pointer</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Detekce: display down, then fast up</Text>

        <View
          style={[
            styles.metricsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.title }]}>Detection State</Text>
          <MetricRow label="Phase" value={phaseLabel(phase, triggerMethod)} theme={theme} />
          <MetricRow label="Style" value={`${theme.variant} (${theme.sourceLabel})`} theme={theme} />
          <MetricRow label="Session time" value={sessionDuration} theme={theme} />
          <MetricRow label="Events" value={String(events.length)} theme={theme} />
          <MetricRow
            label="Last event"
            value={latestEvent ? new Date(latestEvent.timestamp).toLocaleTimeString() : 'none'}
            theme={theme}
          />
        </View>

        <View
          style={[
            styles.metricsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.title }]}>IMU Live</Text>
          {imu ? (
            <>
              <MetricRow label="Accel X/Y/Z" value={`${imu.accel.x.toFixed(1)} / ${imu.accel.y.toFixed(1)} / ${imu.accel.z.toFixed(1)}`} theme={theme} />
              <MetricRow label="Gyro Y (twist)" value={`${imu.gyro.y.toFixed(2)} rad/s`} theme={theme} />
              <MetricRow label="|Gyro Y| peak" value={detectorRef.current.trackingSince !== null ? `${detectorRef.current.peakGyroY.toFixed(2)} — tracking` : '-'} theme={theme} />
            </>
          ) : (
            <Text style={[styles.value, { color: theme.text }]}>Sensor stream unavailable</Text>
          )}
        </View>

        <View style={styles.row}>
          <ActionButton
            label="Domů"
            onPress={() => navigation.navigate('Home')}
            bg={theme.buttonSecondary}
            color={theme.text}
          />
          <ActionButton
            label="Reports"
            onPress={() => navigation.navigate('Reports')}
            bg={theme.buttonSecondary}
            color={theme.text}
          />
          <ActionButton
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
            bg={theme.buttonPrimary}
            color={theme.text}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function phaseLabel(phase: SessionPhase, triggerMethod: 'imu' | 'volume'): string {
  if (phase === 'booting') return 'BOOTING';
  if (phase === 'sensor-missing') return 'NO SENSOR DATA';

  if (triggerMethod === 'volume') {
    return 'READY — press volume button to record event';
  }

  switch (phase) {
    case 'paused': return 'READY — twist phone around long axis';
    case 'armed':  return 'READY — twist phone around long axis';
    case 'aiming': return 'TRIGGERED — opening trajectory capture';
    default:       return 'UNKNOWN';
  }
}

function MetricRow({
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
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  bg,
  color,
}: {
  label: string;
  onPress: () => void;
  bg: string;
  color: string;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg }, pressed && styles.buttonPressed]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
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
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 108,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    fontWeight: '600',
  },
});
