import React from 'react';
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
import { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import { useTranslation } from '@i18n/useTranslation';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'HowToObserve'>;

export function HowToObserveScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useAdaptiveRedTheme();
  const t = useTranslation();
  const g = t.guide;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.title }]}>{g.title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{g.subtitle}</Text>
        </View>

        <Card theme={theme}>
          <SectionTitle title={g.sections.about.title} theme={theme} />
          {g.sections.about.paragraphs.map((p, i) => (
            <Text key={i} style={[styles.paragraph, { color: theme.text }]}>{p}</Text>
          ))}
        </Card>

        <Card theme={theme}>
          <SectionTitle title={g.sections.before.title} theme={theme} />
          {g.sections.before.items.map((item, i) => (
            <BulletRow key={i} text={item} theme={theme} />
          ))}
        </Card>

        <Card theme={theme}>
          <SectionTitle title={g.sections.during.title} theme={theme} />
          {g.sections.during.steps.map((step, i) => (
            <StepRow key={i} number={i + 1} text={step} theme={theme} />
          ))}
        </Card>

        <Card theme={theme}>
          <SectionTitle title={g.sections.tips.title} theme={theme} />
          {g.sections.tips.items.map((item, i) => (
            <BulletRow key={i} text={item} theme={theme} />
          ))}
        </Card>

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.buttonSecondary },
            pressed && styles.buttonPressed,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>← Back</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

function Card({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

function SectionTitle({
  title,
  theme,
}: {
  title: string;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <Text style={[styles.sectionTitle, { color: theme.title }]}>{title}</Text>
  );
}

function BulletRow({
  text,
  theme,
}: {
  text: string;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bullet, { color: theme.accent }]}>·</Text>
      <Text style={[styles.bulletText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

function StepRow({
  number,
  text,
  theme,
}: {
  number: number;
  text: string;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepCircle, { borderColor: theme.accent }]}>
        <Text style={[styles.stepNumber, { color: theme.accent }]}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: theme.text }]}>{text}</Text>
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
  header: {
    gap: 4,
    paddingBottom: 4,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 20,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  backButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  backButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
