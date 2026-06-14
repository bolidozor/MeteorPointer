import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useSettings } from './useSettings';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import { useTranslation } from '@i18n/useTranslation';
import type { Locale } from '@i18n/translations';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const AXES: Array<'+X' | '+Y' | '+Z'> = ['+X', '+Y', '+Z'];

export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useAdaptiveRedTheme();

  const aimingAxis = useSettings((state) => state.aimingAxis);
  const stabilizationThreshold = useSettings((state) => state.stabilizationThreshold);
  const audioEnabled = useSettings((state) => state.audioEnabled);
  const hapticEnabled = useSettings((state) => state.hapticEnabled);
  const backendUrl = useSettings((state) => state.backendUrl);
  const triggerMethod = useSettings((state) => state.triggerMethod);

  const setAimingAxis = useSettings((state) => state.setAimingAxis);
  const setStabilizationThreshold = useSettings((state) => state.setStabilizationThreshold);
  const setAudioEnabled = useSettings((state) => state.setAudioEnabled);
  const setHapticEnabled = useSettings((state) => state.setHapticEnabled);
  const setBackendUrl = useSettings((state) => state.setBackendUrl);
  const setTriggerMethod = useSettings((state) => state.setTriggerMethod);
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const colorScheme = useSettings((state) => state.colorScheme);
  const setColorScheme = useSettings((state) => state.setColorScheme);
  const simulateSensors = useSettings((state) => state.simulateSensors);
  const setSimulateSensors = useSettings((state) => state.setSimulateSensors);

  const t = useTranslation();

  const [thresholdInput, setThresholdInput] = useState(stabilizationThreshold.toFixed(1));

  const thresholdHint = useMemo(() => {
    const threshold = Number(thresholdInput);
    if (!Number.isFinite(threshold)) {
      return 'Enter number in degrees (example: 4.0)';
    }
    return `Current: ${Math.max(0.2, threshold).toFixed(1)}°`;
  }, [thresholdInput]);

  const saveThreshold = (): void => {
    const parsed = Number(thresholdInput);
    if (Number.isFinite(parsed)) {
      setStabilizationThreshold(parsed);
      setThresholdInput(Math.max(0.2, parsed).toFixed(1));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.title }]}>Settings</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.title }]}>Color scheme</Text>
          <View style={styles.axisRow}>
            {(['normal', 'deep-night'] as const).map((scheme) => {
              const selected = colorScheme === scheme;
              return (
                <Pressable
                  key={scheme}
                  onPress={() => setColorScheme(scheme)}
                  style={({ pressed }) => [
                    styles.axisButton,
                    { backgroundColor: selected ? theme.buttonPrimary : theme.buttonSecondary },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.axisButtonText, { color: theme.text }]}>
                    {scheme === 'normal' ? 'Normal' : 'Deep night'}
                  </Text>
                  <Text style={[styles.axisSubLabel, { color: selected ? theme.accent : theme.muted }]}>
                    {scheme === 'normal' ? 'adaptive' : 'pure black'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: theme.muted }]}>Active: {theme.variant} — {theme.sourceLabel}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.title }]}>Aiming Axis</Text>
          <View style={styles.axisRow}>
            {AXES.map((axis) => {
              const selected = axis === aimingAxis;
              const color = selected ? theme.accent : theme.muted;
              return (
                <Pressable
                  key={axis}
                  onPress={() => setAimingAxis(axis)}
                  style={({ pressed }) => [
                    styles.axisButton,
                    { backgroundColor: selected ? theme.buttonPrimary : theme.buttonSecondary },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <PhoneAxisDiagram axis={axis} color={color} />
                  <Text style={[styles.axisButtonText, { color: theme.text }]}>{axis}</Text>
                  <Text style={[styles.axisSubLabel, { color }]}>{AXIS_LABELS[axis]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.title }]}>Trigger method</Text>
          <View style={styles.axisRow}>
            {(['imu', 'volume'] as const).map((method) => {
              const selected = method === triggerMethod;
              return (
                <Pressable
                  key={method}
                  onPress={() => setTriggerMethod(method)}
                  style={({ pressed }) => [
                    styles.axisButton,
                    { backgroundColor: selected ? theme.buttonPrimary : theme.buttonSecondary },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.axisButtonText, { color: theme.text }]}>
                    {method === 'imu' ? 'IMU gesture' : 'Volume button'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.title }]}>Stabilization threshold</Text>
          <TextInput
            value={thresholdInput}
            onChangeText={setThresholdInput}
            onEndEditing={saveThreshold}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="4.0"
            placeholderTextColor={theme.muted}
          />
          <Text style={[styles.hint, { color: theme.muted }]}>{thresholdHint}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.title }]}>{t.settings.language}</Text>
          <View style={styles.axisRow}>
            {(['en', 'cs'] as Locale[]).map((loc) => (
              <Pressable
                key={loc}
                onPress={() => setLanguage(loc)}
                style={({ pressed }) => [
                  styles.axisButton,
                  { backgroundColor: language === loc ? theme.buttonPrimary : theme.buttonSecondary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.axisButtonText, { color: theme.text }]}>
                  {loc === 'en' ? 'English' : 'Čeština'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingSwitch label="Audio cues" value={audioEnabled} onValueChange={setAudioEnabled} theme={theme} />
          <SettingSwitch label="Haptic cues" value={hapticEnabled} onValueChange={setHapticEnabled} theme={theme} />
          <SettingSwitch label="Simulate sensors (no compass — test)" value={simulateSensors} onValueChange={setSimulateSensors} theme={theme} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.title }]}>Backend URL</Text>
          <TextInput
            value={backendUrl}
            onChangeText={setBackendUrl}
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://api.example.com"
            placeholderTextColor={theme.muted}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.buttonPrimary },
            pressed && styles.buttonPressed,
          ]}
          onPress={() => {
            saveThreshold();
            navigation.navigate('Home');
          }}
        >
          <Text style={[styles.saveText, { color: theme.text }]}>Save and Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const AXIS_LABELS: Record<'+X' | '+Y' | '+Z', string> = {
  '+X': 'right edge',
  '+Y': 'top edge',
  '+Z': 'screen',
};

const PH_W = 20;
const PH_H = 32;

function PhoneBody({ color }: { color: string }): React.JSX.Element {
  return (
    <View style={{ width: PH_W, height: PH_H, borderRadius: 4, borderWidth: 1.5, borderColor: color, alignItems: 'center' }}>
      {/* earpiece */}
      <View style={{ width: 6, height: 2, borderRadius: 1, backgroundColor: color, opacity: 0.7, marginTop: 3 }} />
    </View>
  );
}

function ArrowRight({ color }: { color: string }): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 9, height: 1.5, backgroundColor: color }} />
      <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderTopWidth: 4, borderBottomWidth: 4, borderLeftColor: color, borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
    </View>
  );
}

function ArrowUp({ color }: { color: string }): React.JSX.Element {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 0, height: 0, borderBottomWidth: 6, borderLeftWidth: 4, borderRightWidth: 4, borderBottomColor: color, borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
      <View style={{ width: 1.5, height: 8, backgroundColor: color }} />
    </View>
  );
}

function PhoneAxisDiagram({ axis, color }: { axis: '+X' | '+Y' | '+Z'; color: string }): React.JSX.Element {
  if (axis === '+Y') {
    return (
      <View style={{ alignItems: 'center', gap: 0 }}>
        <ArrowUp color={color} />
        <PhoneBody color={color} />
      </View>
    );
  }

  if (axis === '+X') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PhoneBody color={color} />
        <ArrowRight color={color} />
      </View>
    );
  }

  // +Z: phone shown edge-on (side view), screen face on the right, arrow pointing right
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {/* phone body — side view */}
      <View style={{ width: 6, height: PH_H, borderRadius: 2, borderWidth: 1.5, borderColor: color }}>
        {/* screen face highlight: inner right stripe */}
        <View style={{ position: 'absolute', right: 0, top: 3, bottom: 3, width: 2, borderRadius: 1, backgroundColor: color, opacity: 0.6 }} />
      </View>
      <ArrowRight color={color} />
    </View>
  );
}

function SettingSwitch({
  label,
  value,
  onValueChange,
  theme,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.switchLabel, { color: theme.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  axisRow: {
    flexDirection: 'row',
    gap: 8,
  },
  axisButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  axisButtonText: {
    fontWeight: '700',
  },
  axisSubLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  hint: {
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 13,
  },
  saveText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
