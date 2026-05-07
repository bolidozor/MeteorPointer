import React, { useMemo } from 'react';
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
import { useLowPassImu } from '@native/useLowPassImu';
import { useSettings } from '@features/settings/useSettings';
import { toOrientation } from '@features/sessions/orientation';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import type { RedThemePalette } from '@theme/useAdaptiveRedTheme';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'SensorDebug'>;

const INSTRUMENT_SIZE = 155;
const CENTER = INSTRUMENT_SIZE / 2;

// ---------- attitude helpers ----------

function accelToRollPitch(x: number, y: number, z: number): { roll: number; pitch: number } {
  const roll = Math.atan2(x, z) * (180 / Math.PI);
  const pitch = Math.atan2(-y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
  return { roll, pitch };
}

function normalizeAz(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// ---------- Artificial Horizon ----------

const HORIZON_STRIP = INSTRUMENT_SIZE * 2.6;
const HORIZON_OFFSET = (HORIZON_STRIP - INSTRUMENT_SIZE) / 2;
const PX_PER_DEG_PITCH = INSTRUMENT_SIZE / 70; // ±35° fills the indicator

function ArtificialHorizon({
  roll,
  pitch,
  theme,
}: {
  roll: number;
  pitch: number;
  theme: RedThemePalette;
}): React.JSX.Element {
  const pitchPx = pitch * PX_PER_DEG_PITCH;

  return (
    <View style={[styles.instrument, { borderColor: theme.border }]}>
      {/* Sky + earth strip — clipped to circle by parent overflow:hidden */}
      <View
        style={{
          position: 'absolute',
          width: HORIZON_STRIP,
          height: HORIZON_STRIP,
          left: -HORIZON_OFFSET,
          top: -HORIZON_OFFSET,
          transform: [{ rotate: `${-roll}deg` }, { translateY: pitchPx }],
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#0b2540' }} />
        <View style={{ flex: 1, backgroundColor: '#2e1204' }} />
      </View>

      {/* Pitch ladder lines (fixed relative to horizon strip, move with it) */}
      <View
        style={{
          position: 'absolute',
          width: HORIZON_STRIP,
          height: HORIZON_STRIP,
          left: -HORIZON_OFFSET,
          top: -HORIZON_OFFSET,
          transform: [{ rotate: `${-roll}deg` }, { translateY: pitchPx }],
        }}
      >
        {[-20, -10, 10, 20].map((deg) => (
          <View
            key={deg}
            style={{
              position: 'absolute',
              left: HORIZON_STRIP / 2 - INSTRUMENT_SIZE * 0.2,
              top: HORIZON_STRIP / 2 - deg * PX_PER_DEG_PITCH - 1,
              width: INSTRUMENT_SIZE * 0.4,
              height: 1,
              backgroundColor: '#ffffff55',
            }}
          />
        ))}
        {/* Horizon centre line */}
        <View
          style={{
            position: 'absolute',
            left: HORIZON_STRIP / 2 - INSTRUMENT_SIZE * 0.32,
            top: HORIZON_STRIP / 2 - 1,
            width: INSTRUMENT_SIZE * 0.64,
            height: 2,
            backgroundColor: '#ffffffcc',
          }}
        />
      </View>

      {/* Fixed overlay: aircraft symbol */}
      {/* Left wing */}
      <View style={{ position: 'absolute', left: CENTER * 0.12, top: CENTER - 3, width: CENTER * 0.3, height: 4, backgroundColor: '#fff', borderRadius: 2 }} />
      {/* Right wing */}
      <View style={{ position: 'absolute', right: CENTER * 0.12, top: CENTER - 3, width: CENTER * 0.3, height: 4, backgroundColor: '#fff', borderRadius: 2 }} />
      {/* Center dot */}
      <View style={{ position: 'absolute', left: CENTER - 4, top: CENTER - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />

      {/* Roll scale at top arc — tick marks at 0, ±10, ±20, ±30, ±45, ±60 */}
      {[0, -10, 10, -20, 20, -30, 30, -45, 45, -60, 60].map((deg) => {
        const isMajor = deg % 30 === 0;
        return (
          <View
            key={deg}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              transform: [{ rotate: `${deg}deg` }],
            }}
          >
            <View
              style={{
                marginTop: 3,
                width: isMajor ? 2 : 1,
                height: isMajor ? 8 : 5,
                backgroundColor: deg === 0 ? '#fff' : '#ffffff88',
              }}
            />
          </View>
        );
      })}

      {/* Roll indicator triangle (rotates with roll) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          transform: [{ rotate: `${-roll}deg` }],
        }}
      >
        {/* Triangle pointing down into scale */}
        <View
          style={{
            marginTop: 10,
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#fff',
          }}
        />
      </View>

      {/* Label */}
      <Text style={[styles.instrumentLabel, { color: '#ffffff88' }]}>HORIZONT</Text>
    </View>
  );
}

// ---------- Compass Rose ----------

const COMPASS_LABEL_R = CENTER * 0.68;
const COMPASS_TICK_R = CENTER * 0.86;

const CARDINALS = [
  { label: 'N', angle: 0, major: true, accent: true },
  { label: 'NE', angle: 45, major: false, accent: false },
  { label: 'E', angle: 90, major: true, accent: false },
  { label: 'SE', angle: 135, major: false, accent: false },
  { label: 'S', angle: 180, major: true, accent: false },
  { label: 'SW', angle: 225, major: false, accent: false },
  { label: 'W', angle: 270, major: true, accent: false },
  { label: 'NW', angle: 315, major: false, accent: false },
];

function CompassRose({
  azimuth,
  theme,
}: {
  azimuth: number;
  theme: RedThemePalette;
}): React.JSX.Element {
  return (
    <View style={[styles.instrument, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      {/* Rotating disc */}
      <View
        style={{ position: 'absolute', inset: 0, transform: [{ rotate: `${-azimuth}deg` }] }}
      >
        {/* Tick marks — outer ring */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = i * 10;
          const isMajor = angle % 30 === 0;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                transform: [{ rotate: `${angle}deg` }],
              }}
            >
              <View
                style={{
                  marginTop: CENTER - COMPASS_TICK_R,
                  width: isMajor ? 2 : 1,
                  height: isMajor ? 8 : 4,
                  backgroundColor: isMajor ? theme.muted : '#ffffff33',
                }}
              />
            </View>
          );
        })}

        {/* Cardinal / intercardinal labels */}
        {CARDINALS.map(({ label, angle, major, accent }) => {
          const rad = (angle * Math.PI) / 180;
          const lx = CENTER + COMPASS_LABEL_R * Math.sin(rad);
          const ly = CENTER - COMPASS_LABEL_R * Math.cos(rad);
          const lw = major ? 18 : 22;
          return (
            <Text
              key={label}
              style={{
                position: 'absolute',
                left: lx - lw / 2,
                top: ly - 8,
                width: lw,
                textAlign: 'center',
                color: accent ? theme.accent : major ? theme.title : theme.muted,
                fontSize: major ? 11 : 8,
                fontWeight: '700',
              }}
            >
              {label}
            </Text>
          );
        })}
      </View>

      {/* Fixed lubber line (current heading indicator) — triangle at top */}
      <View
        style={{
          position: 'absolute',
          left: CENTER - 5,
          top: 6,
          width: 0,
          height: 0,
          borderLeftWidth: 5,
          borderRightWidth: 5,
          borderTopWidth: 9,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: theme.accent,
        }}
      />

      {/* Center cross */}
      <View style={{ position: 'absolute', left: CENTER - 1, top: CENTER - 10, width: 2, height: 20, backgroundColor: '#ffffff44' }} />
      <View style={{ position: 'absolute', left: CENTER - 10, top: CENTER - 1, width: 20, height: 2, backgroundColor: '#ffffff44' }} />
      <View style={{ position: 'absolute', left: CENTER - 3, top: CENTER - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: theme.accent }} />

      {/* Azimuth readout */}
      <Text style={[styles.instrumentLabel, { color: theme.muted }]}>KOMPAS</Text>
      <Text
        style={{
          position: 'absolute',
          bottom: 14,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: theme.title,
          fontSize: 13,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {Math.round(azimuth).toString().padStart(3, '0')}°
      </Text>
    </View>
  );
}

// ---------- Main Screen ----------

export function SensorDebugScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useAdaptiveRedTheme();
  const aimingAxis = useSettings((s) => s.aimingAxis);
  const rawImu = useImu({ intervalMs: 50 });
  const imu = useLowPassImu(rawImu);

  const { roll, pitch } = useMemo(() => {
    if (!imu) return { roll: 0, pitch: 0 };
    return accelToRollPitch(imu.accel.x, imu.accel.y, imu.accel.z);
  }, [imu]);

  const { alt, az: azimuth } = useMemo(() => {
    if (!imu) return { alt: 0, az: 0 };
    return toOrientation(imu, aimingAxis);
  }, [imu, aimingAxis]);

  const rotVecInfo = useMemo(() => {
    if (!rawImu) return null;
    const rv = rawImu.rotVec;
    if (!rv) return { active: false, accuracyDeg: null };
    const accuracyDeg = rv.accuracyRad >= 0 ? rv.accuracyRad * (180 / Math.PI) : null;
    return { active: true, accuracyDeg };
  }, [rawImu]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[styles.title, { color: theme.title }]}>Sensor Debug</Text>

        {/* Instruments row */}
        <View style={styles.instrumentsRow}>
          <ArtificialHorizon roll={roll} pitch={pitch} theme={theme} />
          <CompassRose azimuth={azimuth} theme={theme} />
        </View>

        {/* Orientation source + accuracy */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.title }]}>Orientation source</Text>
          <View style={styles.sourceRow}>
            <View style={[
              styles.sourceBadge,
              { backgroundColor: rotVecInfo?.active ? '#1a3a1a' : '#3a1a1a',
                borderColor:     rotVecInfo?.active ? '#4a9a4a' : '#9a4a4a' },
            ]}>
              <Text style={[styles.sourceBadgeText, { color: rotVecInfo?.active ? '#7aff7a' : '#ff7a7a' }]}>
                {rotVecInfo?.active ? '● Android fusion' : '○ accel + mag fallback'}
              </Text>
            </View>
            {rotVecInfo?.active && (
              <Text style={[styles.sourceDetail, { color: theme.muted }]}>
                {rotVecInfo.accuracyDeg !== null
                  ? `±${rotVecInfo.accuracyDeg.toFixed(1)}° heading accuracy`
                  : 'accuracy: n/a'}
              </Text>
            )}
          </View>
          <View style={styles.grid}>
            <DataCell label="AZ" value={`${azimuth.toFixed(1)}°`} theme={theme} />
            <DataCell label="ALT" value={`${alt.toFixed(1)}°`} theme={theme} />
            <DataCell label="Roll" value={`${roll.toFixed(1)}°`} theme={theme} />
            <DataCell label="Pitch" value={`${pitch.toFixed(1)}°`} theme={theme} />
          </View>
        </View>

        {/* Raw accelerometer */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.title }]}>Akcelerometr (m/s²)</Text>
          <View style={styles.grid}>
            <DataCell label="X" value={imu ? imu.accel.x.toFixed(2) : '—'} theme={theme} />
            <DataCell label="Y" value={imu ? imu.accel.y.toFixed(2) : '—'} theme={theme} />
            <DataCell label="Z" value={imu ? imu.accel.z.toFixed(2) : '—'} theme={theme} />
            <DataCell
              label="|a|"
              value={imu ? Math.sqrt(imu.accel.x ** 2 + imu.accel.y ** 2 + imu.accel.z ** 2).toFixed(2) : '—'}
              theme={theme}
            />
          </View>
        </View>

        {/* Raw gyroscope */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.title }]}>Gyroskop (rad/s)</Text>
          <View style={styles.grid}>
            <DataCell label="X" value={imu ? imu.gyro.x.toFixed(3) : '—'} theme={theme} />
            <DataCell label="Y" value={imu ? imu.gyro.y.toFixed(3) : '—'} theme={theme} />
            <DataCell label="Z" value={imu ? imu.gyro.z.toFixed(3) : '—'} theme={theme} />
            <DataCell
              label="|ω|"
              value={imu ? Math.sqrt(imu.gyro.x ** 2 + imu.gyro.y ** 2 + imu.gyro.z ** 2).toFixed(3) : '—'}
              theme={theme}
            />
          </View>
        </View>

        {/* Raw magnetometer */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.title }]}>Magnetometr (μT)</Text>
          <View style={styles.grid}>
            <DataCell label="X" value={imu ? imu.mag.x.toFixed(1) : '—'} theme={theme} />
            <DataCell label="Y" value={imu ? imu.mag.y.toFixed(1) : '—'} theme={theme} />
            <DataCell label="Z" value={imu ? imu.mag.z.toFixed(1) : '—'} theme={theme} />
            <DataCell
              label="|B|"
              value={imu ? Math.sqrt(imu.mag.x ** 2 + imu.mag.y ** 2 + imu.mag.z ** 2).toFixed(1) : '—'}
              theme={theme}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.buttonSecondary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={[styles.backLabel, { color: theme.text }]}>← Domů</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- helpers ----------

function DataCell({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: RedThemePalette;
}): React.JSX.Element {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.cellValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: 1 },

  instrumentsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  instrument: {
    width: INSTRUMENT_SIZE,
    height: INSTRUMENT_SIZE,
    borderRadius: INSTRUMENT_SIZE / 2,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  instrumentLabel: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 2,
  },

  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  sourceRow: { gap: 6 },
  sourceBadge: { borderRadius: 8, borderWidth: 1, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start' },
  sourceBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  sourceDetail: { fontSize: 12, paddingLeft: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '47%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cellLabel: { fontSize: 13 },
  cellValue: { fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '600' },

  backButton: { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  backLabel: { fontWeight: '700', fontSize: 14 },
});
