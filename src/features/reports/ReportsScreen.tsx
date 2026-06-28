import React, { useMemo, useState } from 'react';
import {
  FlatList,
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
import type { MeteorReport } from '@features/sessions/sessionModels';
import { flushOutbox } from '@sync/syncEngine';
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';

type Filter = 'all' | 'today' | 'week';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Reports'>;

export function ReportsScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const reports = useSessionStore((state) => state.reports);
  const events = useSessionStore((state) => state.events);
  const clearReports = useSessionStore((state) => state.clearReports);
  const theme = useAdaptiveRedTheme();

  const [filter, setFilter] = useState<Filter>('all');

  const filteredReports = useMemo(() => {
    const now = Date.now();
    if (filter === 'today') {
      return reports.filter((report) => now - report.createdAt <= 24 * 60 * 60 * 1000);
    }
    if (filter === 'week') {
      return reports.filter((report) => now - report.createdAt <= 7 * 24 * 60 * 60 * 1000);
    }
    return reports;
  }, [reports, filter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <StatusBar hidden />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.title }]}>Reports</Text>

        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Metric label="Style" value={`${theme.variant} (${theme.sourceLabel})`} theme={theme} />
          <Metric label="Meteor Events" value={String(events.length)} theme={theme} />
          <Metric label="Trajectory Reports" value={String(reports.length)} theme={theme} />
        </View>

        <View style={styles.filters}>
          {(['all', 'today', 'week'] as const).map((item) => {
            const active = filter === item;
            return (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={({ pressed }) => [
                  styles.filterButton,
                  { backgroundColor: active ? theme.buttonPrimary : theme.buttonSecondary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.filterText, { color: theme.text }]}>{item.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ReportRow report={item} theme={theme} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>No reports for this filter.</Text>}
        />

        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.buttonSecondary },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Domů</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.buttonDanger },
              pressed && styles.buttonPressed,
            ]}
            onPress={clearReports}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Clear Reports</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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

function ReportRow({
  report,
  theme,
}: {
  report: MeteorReport;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <View style={[styles.reportCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.reportHeader}>
        <Text style={[styles.reportTitle, { color: theme.title }]}>{new Date(report.createdAt).toLocaleString()}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.uploadButton,
            { backgroundColor: report.synced ? theme.surface : theme.buttonSecondary },
            pressed && styles.buttonPressed,
          ]}
          disabled={report.synced}
          onPress={() => flushOutbox()}
        >
          <Text style={[styles.uploadText, { color: theme.muted }]}>
            {report.synced ? 'Synced' : 'Upload'}
          </Text>
        </Pressable>
      </View>
      <Metric
        label="Start (ALT/AZ)"
        value={`${report.startPoint.alt.toFixed(1)}° / ${report.startPoint.az.toFixed(1)}°`}
        theme={theme}
      />
      <Metric
        label="End (ALT/AZ)"
        value={`${report.endPoint.alt.toFixed(1)}° / ${report.endPoint.az.toFixed(1)}°`}
        theme={theme}
      />
      <Metric label="Quality" value={`${(report.quality * 100).toFixed(0)} %`} theme={theme} />
      <Metric label="Event" value={new Date(report.eventTimestamp).toLocaleTimeString()} theme={theme} />
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
    gap: 12,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricLabel: {
    fontSize: 13,
  },
  metricValue: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  listContent: {
    gap: 10,
    paddingBottom: 10,
  },
  reportCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 5,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  reportTitle: {
    fontWeight: '700',
    flex: 1,
  },
  uploadButton: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  buttonText: {
    fontWeight: '700',
  },
});
