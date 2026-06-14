import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { Camera, CameraType } from 'react-native-camera-kit';

import { api } from '@api/client';
import { useDeviceStore } from '@auth/useDeviceStore';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import { useTranslation } from '@i18n/useTranslation';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'WebLogin'>;

/** A scanned QR may be the bare code or a deep link; pull the code out of both. */
function extractCode(scanned: string): string {
  const match = scanned.match(/code=([A-Za-z0-9-]+)/);
  return (match ? match[1] : scanned).trim().toUpperCase();
}

export function WebLoginScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useAdaptiveRedTheme();
  const t = useTranslation().account;
  const getAccessToken = useDeviceStore((s) => s.getAccessToken);
  const route = useRoute<RouteProp<RootStackParamList, 'WebLogin'>>();

  const [code, setCode] = useState(route.params?.code ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannedRef = useRef(false);

  const approve = async (codeArg?: string) => {
    const value = (codeArg ?? code).trim().toUpperCase();
    if (value.length < 4) {
      return;
    }
    setError(null);
    setDone(false);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Device is not connected');
      }
      await api.approveWebLogin(token, value);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startScan = async () => {
    setError(null);
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      scannedRef.current = false;
      setScanning(true);
    } else {
      setError('Camera permission denied');
    }
  };

  const onReadCode = (event: { nativeEvent: { codeStringValue: string } }) => {
    if (scannedRef.current) {
      return;
    }
    scannedRef.current = true;
    const value = extractCode(event.nativeEvent.codeStringValue);
    setScanning(false);
    setCode(value);
    approve(value);
  };

  if (scanning) {
    return (
      <View style={styles.cameraRoot}>
        <StatusBar hidden />
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode
          onReadCode={onReadCode}
        />
        <Pressable
          style={[styles.cancelScan, { backgroundColor: theme.buttonSecondary }]}
          onPress={() => setScanning(false)}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>{t.cancel}</Text>
        </Pressable>
      </View>
    );
  }

  const canSubmit = code.trim().length >= 4 && !busy;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar hidden />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.title }]}>{t.webLogin}</Text>
        <Text style={[styles.hint, { color: theme.muted }]}>{t.webLoginHint}</Text>

        <Pressable
          onPress={startScan}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.buttonPrimary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>⊡ {t.scanQr}</Text>
        </Pressable>

        <Text style={[styles.label, { color: theme.muted }]}>{t.code}</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="XXXX-XXXX"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />

        <Pressable
          onPress={() => approve()}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.buttonSecondary },
            !canSubmit && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>
            {busy ? t.approving : t.approve}
          </Text>
        </Pressable>

        {busy && <ActivityIndicator color={theme.accent} style={styles.spin} />}
        {done && <Text style={[styles.ok, { color: theme.accent }]}>{t.approved}</Text>}
        {error && <Text style={[styles.err, { color: theme.buttonDanger }]}>{error}</Text>}

        <Pressable
          onPress={() => navigation.navigate('Home')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.buttonSecondary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>←</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 18, gap: 12 },
  title: { fontSize: 27, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 22,
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  button: { alignItems: 'center', borderRadius: 10, paddingVertical: 12, marginTop: 6 },
  buttonText: { fontWeight: '700' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.4 },
  spin: { marginTop: 8 },
  ok: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  err: { fontSize: 13, marginTop: 8 },
  cameraRoot: { flex: 1, backgroundColor: '#000' },
  cancelScan: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
});
