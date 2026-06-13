import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useSessionStore } from '@features/sessions/useSessionStore';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import { useTranslation } from '@i18n/useTranslation';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useAdaptiveRedTheme();
  const t = useTranslation();
  const reports = useSessionStore((state) => state.reports);
  const events = useSessionStore((state) => state.events);
  const unsyncedCount = useSessionStore(
    (state) => state.reports.filter((r) => !r.synced).length,
  );

  const lastEvent = events[0];
  const lastEventLabel = lastEvent
    ? new Date(lastEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar hidden />

      <View style={styles.header}>
        <Text style={[styles.appName, { color: theme.accent }]}>{t.home.appName}</Text>
        <Text style={[styles.appNameSub, { color: theme.title }]}>{t.home.appNameSub}</Text>
        <Text style={[styles.network, { color: theme.muted }]}>{t.home.network}</Text>
      </View>

      <View style={styles.centerArea}>
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: theme.accent, borderColor: theme.accent },
            pressed && styles.startButtonPressed,
          ]}
          onPress={() => navigation.navigate('Session')}
        >
          <Text style={styles.startIcon}>◉</Text>
          <Text style={styles.startLabel}>{t.home.startButton}</Text>
          <Text style={styles.startSub}>{t.home.startSub}</Text>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        <NavTile
          label={t.home.tiles.training}
          glyph="◎"
          onPress={() => navigation.navigate('Training')}
          theme={theme}
        />
        <NavTile
          label={t.home.tiles.results}
          glyph="≡"
          badge={reports.length > 0 ? String(reports.length) : undefined}
          onPress={() => navigation.navigate('Reports')}
          theme={theme}
        />
        <NavTile
          label={t.home.tiles.guide}
          glyph="✦"
          onPress={() => navigation.navigate('HowToObserve')}
          theme={theme}
        />
        <NavTile
          label={t.account.tile}
          glyph="☁"
          badge={unsyncedCount > 0 ? String(unsyncedCount) : undefined}
          onPress={() => navigation.navigate('Account')}
          theme={theme}
        />
        <NavTile
          label={t.home.tiles.sensors}
          glyph="⊕"
          onPress={() => navigation.navigate('SensorDebug')}
          theme={theme}
        />
        <NavTile
          label={t.home.tiles.settings}
          glyph="◈"
          onPress={() => navigation.navigate('Settings')}
          theme={theme}
        />
      </View>

      <View style={styles.footer}>
        {lastEventLabel ? (
          <Text style={[styles.footerText, { color: theme.muted }]}>
            {t.home.lastEvent(lastEventLabel)}
          </Text>
        ) : (
          <Text style={[styles.footerText, { color: theme.muted }]}>
            {t.home.noEvents}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function NavTile({
  label,
  glyph,
  badge,
  onPress,
  theme,
}: {
  label: string;
  glyph: string;
  badge?: string;
  onPress: () => void;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.tilePressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.tileGlyph, { color: theme.accent }]}>{glyph}</Text>
      <Text style={[styles.tileLabel, { color: theme.text }]}>{label}</Text>
      {badge !== undefined && (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },

  header: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 2,
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 8,
    lineHeight: 56,
  },
  appNameSub: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 14,
  },
  network: {
    marginTop: 8,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  centerArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  startButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 32,
    gap: 6,
    shadowColor: '#ff4343',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  startButtonPressed: {
    opacity: 0.82,
  },
  startIcon: {
    fontSize: 36,
    color: '#000',
    lineHeight: 40,
  },
  startLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 3,
  },
  startSub: {
    fontSize: 12,
    color: '#00000088',
    letterSpacing: 1,
  },

  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
  },
  tile: {
    width: '29%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    gap: 6,
  },
  tilePressed: {
    opacity: 0.75,
  },
  tileGlyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
