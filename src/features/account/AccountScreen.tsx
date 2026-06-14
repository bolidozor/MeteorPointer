import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

import { type ConsentDoc, api } from '@api/client';
import { useDeviceStore } from '@auth/useDeviceStore';
import { getCurrentFix } from '@native/useLocation';
import { useSettings } from '@features/settings/useSettings';
import { useSessionStore } from '@features/sessions/useSessionStore';
import { flushOutbox, useSyncStatus } from '@sync/syncEngine';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import { useTranslation } from '@i18n/useTranslation';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Account'>;
type Theme = ReturnType<typeof useAdaptiveRedTheme>;

export function AccountScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useAdaptiveRedTheme();
  const t = useTranslation().account;

  const backendUrl = useSettings((s) => s.backendUrl);
  const setBackendUrl = useSettings((s) => s.setBackendUrl);

  const deviceId = useDeviceStore((s) => s.deviceId);
  const recoveryPhrase = useDeviceStore((s) => s.recoveryPhrase);
  const register = useDeviceStore((s) => s.register);
  const clearRecoveryPhrase = useDeviceStore((s) => s.clearRecoveryPhrase);
  const deleteData = useDeviceStore((s) => s.deleteData);
  const unregister = useDeviceStore((s) => s.unregister);

  const pending = useSessionStore((s) => s.reports.filter((r) => !r.synced).length);
  const addReport = useSessionStore((s) => s.addReport);
  const sync = useSyncStatus();

  const [consent, setConsent] = useState<ConsentDoc | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConsent = async () => {
    setError(null);
    setBusy(true);
    try {
      setConsent(await api.getConsent(useSettings.getState().language));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onConnect = async () => {
    if (!backendUrl.trim()) {
      Alert.alert(t.setServerFirst);
      return;
    }
    if (!agreed) {
      Alert.alert(t.agreeRequired);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendTestMeasurement = async () => {
    const site = await getCurrentFix(); // real GPS fix (null if denied/unavailable)
    const now = Date.now();
    addReport({
      eventTimestamp: now,
      startPoint: { alt: 45, az: 100, jitter: 0.5, capturedAt: now },
      endPoint: { alt: 50, az: 130, jitter: 0.5, capturedAt: now + 1500 },
      quality: 0.9,
      site,
    });
    flushOutbox();
  };

  const confirmDeleteData = () =>
    Alert.alert(t.deleteData, t.deleteDataConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => {
          deleteData().catch((e) => setError((e as Error).message));
        },
      },
    ]);

  const confirmDisconnect = () =>
    Alert.alert(t.disconnect, t.disconnectConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => {
          unregister().catch((e) => setError((e as Error).message));
        },
      },
    ]);

  const isRegistered = deviceId !== null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.title }]}>{t.title}</Text>

        {/* Recovery phrase — shown once right after registration */}
        {recoveryPhrase && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
            <Text style={[styles.cardTitle, { color: theme.accent }]}>{t.recoveryTitle}</Text>
            <Text selectable style={[styles.phrase, { color: theme.text }]}>
              {recoveryPhrase}
            </Text>
            <Text style={[styles.hint, { color: theme.muted }]}>{t.recoveryHint}</Text>
            <PrimaryButton label={t.recoverySaved} onPress={clearRecoveryPhrase} theme={theme} />
          </View>
        )}

        {!isRegistered ? (
          /* ---- Not connected: server URL + consent + register ---- */
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.muted }]}>{t.serverUrl}</Text>
            <TextInput
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder={t.serverPlaceholder}
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />

            {consent ? (
              <>
                <Text style={[styles.cardTitle, { color: theme.title }]}>{t.consentTitle}</Text>
                <ScrollView style={styles.consentBox} nestedScrollEnabled>
                  <Text style={[styles.consentText, { color: theme.text }]}>{consent.text}</Text>
                </ScrollView>
                <Pressable style={styles.checkboxRow} onPress={() => setAgreed((v) => !v)}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: theme.accent },
                      agreed && { backgroundColor: theme.accent },
                    ]}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>{t.agree}</Text>
                </Pressable>
                <PrimaryButton
                  label={busy ? t.registering : t.agree}
                  onPress={onConnect}
                  disabled={busy}
                  theme={theme}
                />
              </>
            ) : (
              <PrimaryButton
                label={busy ? t.registering : t.loadConsent}
                onPress={loadConsent}
                disabled={busy}
                theme={theme}
              />
            )}
          </View>
        ) : (
          /* ---- Connected: status + sync + deletion ---- */
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Row label={t.connected} value="●" theme={theme} valueColor={theme.accent} />
            <Row label={t.deviceId} value={deviceId.slice(0, 8) + '…'} theme={theme} />
            <Text style={[styles.hint, { color: theme.muted, marginTop: 8 }]}>
              {pending > 0 ? t.pending(pending) : t.allSynced}
            </Text>
            {sync.lastError && (
              <Text style={[styles.hint, { color: theme.buttonDanger }]}>
                {t.lastError(sync.lastError)}
              </Text>
            )}
            <PrimaryButton
              label={sync.syncing ? t.syncing : t.syncNow}
              onPress={() => flushOutbox()}
              disabled={sync.syncing || pending === 0}
              theme={theme}
            />
            <SecondaryButton
              label={t.testMeasurement}
              onPress={sendTestMeasurement}
              theme={theme}
            />
            <SecondaryButton label={t.deleteData} onPress={confirmDeleteData} theme={theme} />
            <DangerButton label={t.disconnect} onPress={confirmDisconnect} theme={theme} />
          </View>
        )}

        {busy && <ActivityIndicator color={theme.accent} style={{ marginTop: 12 }} />}
        {error && <Text style={[styles.error, { color: theme.buttonDanger }]}>{error}</Text>}

        <SecondaryButton
          label="←"
          onPress={() => navigation.navigate('Home')}
          theme={theme}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  theme,
  valueColor,
}: {
  label: string;
  value: string;
  theme: Theme;
  valueColor?: string;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor ?? theme.text }]}>{value}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  theme,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: Theme;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.buttonPrimary },
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.buttonSecondary },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function DangerButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.buttonDanger },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 18, gap: 14 },
  title: { fontSize: 27, fontWeight: '700' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  consentBox: { maxHeight: 260, borderRadius: 8 },
  consentText: { fontSize: 12, lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2 },
  checkboxLabel: { fontSize: 14, flex: 1 },
  phrase: { fontSize: 20, fontWeight: '700', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  button: { alignItems: 'center', borderRadius: 10, paddingVertical: 12, marginTop: 4 },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontWeight: '700' },
  error: { fontSize: 13 },
});
