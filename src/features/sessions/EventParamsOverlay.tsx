import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { useAdaptiveRedTheme } from '@theme/useAdaptiveRedTheme';
import type { EventParams } from './sessionModels';
import { METEOR_COLORS, METEOR_SHOWERS } from './sessionModels';
import { startSpeechInput } from '@native/speechInput';

interface Props {
  onDone: (params: EventParams) => void;
  onCancel: () => void;
  onVolumeKey: (key: 'up' | 'down') => void;
  timeoutMs?: number;
  theme: ReturnType<typeof useAdaptiveRedTheme>;
  volumeHandlerRef?: React.MutableRefObject<((key: 'up' | 'down') => void) | null>;
}

const EXTENDED_MS = 30_000;
const COLOR_KEYS = Object.keys(METEOR_COLORS) as string[];
const SHOWERS = METEOR_SHOWERS as unknown as string[];
const UNSET = 'nenastaveno';

export function EventParamsOverlay({
  onDone,
  onCancel,
  timeoutMs = 5000,
  theme,
  volumeHandlerRef,
}: Props): React.JSX.Element {
  const [magnitude, setMagnitude] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [sound, setSound] = useState<boolean | null>(null);
  const [fragmentation, setFragmentation] = useState<boolean | null>(null);
  const [showerIndex, setShowerIndex] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [listening, setListening] = useState(false);

  const [totalMs, setTotalMs] = useState(timeoutMs);
  const [elapsed, setElapsed] = useState(0);

  const doneCalledRef = useRef(false);
  const magnitudeRef = useRef(magnitude);
  const colorRef = useRef(color);
  const soundRef = useRef(sound);
  const fragmentationRef = useRef(fragmentation);
  const showerIndexRef = useRef(showerIndex);
  const noteRef = useRef(note);
  magnitudeRef.current = magnitude;
  colorRef.current = color;
  soundRef.current = sound;
  fragmentationRef.current = fragmentation;
  showerIndexRef.current = showerIndex;
  noteRef.current = note;

  const handleDone = useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    const si = showerIndexRef.current;
    onDone({
      magnitude: magnitudeRef.current,
      color: colorRef.current,
      sound: soundRef.current,
      fragmentation: fragmentationRef.current,
      shower: si !== null ? SHOWERS[si] : null,
      note: noteRef.current,
    });
  }, [onDone]);

  const extend = useCallback(() => {
    setElapsed(0);
    setTotalMs(EXTENDED_MS);
  }, []);

  const handleVolumeKey = useCallback((key: 'up' | 'down') => {
    extend();
    if (key === 'up') {
      setMagnitude((prev) => Math.max(-4, (prev ?? 0) - 0.5));
    } else {
      setMagnitude((prev) => Math.min(8, (prev ?? 0) + 0.5));
    }
  }, [extend]);

  useEffect(() => {
    if (volumeHandlerRef) {
      volumeHandlerRef.current = handleVolumeKey;
      return () => { volumeHandlerRef.current = null; };
    }
  }, [volumeHandlerRef, handleVolumeKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 100;
        if (next >= totalMs) clearInterval(timer);
        return next;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [totalMs]);

  useEffect(() => {
    if (elapsed >= totalMs && !doneCalledRef.current) {
      handleDone();
    }
  }, [elapsed, totalMs, handleDone]);

  const handleVoice = useCallback(async () => {
    extend();
    setListening(true);
    const result = await startSpeechInput('Note about the meteor');
    setListening(false);
    if (result) {
      setNote((prev) => prev ? `${prev} ${result}` : result);
    }
  }, [extend]);

  const remaining = Math.max(0, totalMs - elapsed);
  const progress = Math.min(1, elapsed / totalMs);
  const magDisplay = magnitude === null
    ? UNSET
    : `${magnitude >= 0 ? '+' : ''}${magnitude.toFixed(1)}`;

  return (
    <ScrollView
      style={[styles.overlay, { backgroundColor: theme.surface }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.title }]}>Meteor parameters</Text>

      {/* Magnitude */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.muted }]}>Magnitude</Text>
        <View style={styles.magControls}>
          <Pressable
            onPress={() => { extend(); setMagnitude((prev) => Math.max(-4, (prev ?? 0) - 0.5)); }}
            style={({ pressed }) => [styles.magButton, { backgroundColor: theme.buttonSecondary }, pressed && styles.pressed]}
          >
            <Text style={[styles.magButtonText, { color: theme.text }]}>−</Text>
          </Pressable>
          <Text style={[
            styles.magValue,
            { color: magnitude === null ? theme.muted : theme.text },
          ]}>
            {magDisplay}
          </Text>
          <Pressable
            onPress={() => { extend(); setMagnitude((prev) => Math.min(8, (prev ?? 0) + 0.5)); }}
            style={({ pressed }) => [styles.magButton, { backgroundColor: theme.buttonSecondary }, pressed && styles.pressed]}
          >
            <Text style={[styles.magButtonText, { color: theme.text }]}>+</Text>
          </Pressable>
          <Text style={[styles.hint, { color: theme.muted }]}>vol ↕</Text>
        </View>
      </View>

      {/* Color */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.muted }]}>Color</Text>
        <View style={styles.colorSection}>
          <View style={styles.colorRow}>
            {COLOR_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => { extend(); setColor(key); }}
                style={[
                  styles.colorCircle,
                  { backgroundColor: METEOR_COLORS[key] },
                  color === key && styles.colorSelected,
                ]}
              />
            ))}
          </View>
          {color === null && (
            <Text style={[styles.unsetHint, { color: theme.muted }]}>{UNSET}</Text>
          )}
        </View>
      </View>

      {/* Sound */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.muted }]}>Sound</Text>
        <View style={styles.chipRow}>
          {([true, false] as const).map((val) => (
            <Pressable
              key={String(val)}
              onPress={() => { extend(); setSound(val); }}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: sound === val ? theme.buttonPrimary : theme.buttonSecondary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, { color: sound === val ? theme.text : theme.muted }]}>
                {val ? 'Yes' : 'No'}
              </Text>
            </Pressable>
          ))}
          {sound === null && (
            <Text style={[styles.unsetHint, { color: theme.muted }]}>{UNSET}</Text>
          )}
        </View>
      </View>

      {/* Fragmentation */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.muted }]}>Fragmentation</Text>
        <View style={styles.chipRow}>
          {([true, false] as const).map((val) => (
            <Pressable
              key={String(val)}
              onPress={() => { extend(); setFragmentation(val); }}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: fragmentation === val ? theme.buttonPrimary : theme.buttonSecondary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, { color: fragmentation === val ? theme.text : theme.muted }]}>
                {val ? 'Yes' : 'No'}
              </Text>
            </Pressable>
          ))}
          {fragmentation === null && (
            <Text style={[styles.unsetHint, { color: theme.muted }]}>{UNSET}</Text>
          )}
        </View>
      </View>

      {/* Meteor shower */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.muted }]}>Shower</Text>
        <View style={styles.cyclerRow}>
          <Pressable
            onPress={() => {
              extend();
              setShowerIndex((i) => i === null ? SHOWERS.length - 1 : (i - 1 + SHOWERS.length) % SHOWERS.length);
            }}
            style={({ pressed }) => [styles.cyclerBtn, { backgroundColor: theme.buttonSecondary }, pressed && styles.pressed]}
          >
            <Text style={[styles.cyclerArrow, { color: theme.text }]}>‹</Text>
          </Pressable>
          <Text
            style={[
              styles.cyclerValue,
              { color: showerIndex === null ? theme.muted : theme.text },
              showerIndex === null && styles.italic,
            ]}
            numberOfLines={1}
          >
            {showerIndex === null ? UNSET : SHOWERS[showerIndex]}
          </Text>
          <Pressable
            onPress={() => {
              extend();
              setShowerIndex((i) => i === null ? 0 : (i + 1) % SHOWERS.length);
            }}
            style={({ pressed }) => [styles.cyclerBtn, { backgroundColor: theme.buttonSecondary }, pressed && styles.pressed]}
          >
            <Text style={[styles.cyclerArrow, { color: theme.text }]}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Note */}
      <View style={styles.noteContainer}>
        <Text style={[styles.label, { color: theme.muted }]}>Note</Text>
        <View style={styles.noteInputRow}>
          <TextInput
            value={note}
            onChangeText={(t) => { extend(); setNote(t); }}
            style={[styles.noteInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="optional note..."
            placeholderTextColor={theme.muted}
            multiline
          />
          <Pressable
            onPress={handleVoice}
            disabled={listening}
            style={({ pressed }) => [
              styles.voiceBtn,
              { backgroundColor: listening ? theme.buttonPrimary : theme.buttonSecondary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.voiceBtnText, { color: theme.text }]}>
              {listening ? '…' : '🎤'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Countdown */}
      <View style={styles.countdownContainer}>
        <View style={[styles.countdownTrack, { backgroundColor: theme.background }]}>
          <View style={[styles.countdownBar, { backgroundColor: theme.accent, width: `${(1 - progress) * 100}%` }]} />
        </View>
        <Text style={[styles.countdownText, { color: theme.muted }]}>
          {(remaining / 1000).toFixed(1)} s
          {totalMs === EXTENDED_MS ? '' : '  (tap anything to extend to 30s)'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            { backgroundColor: theme.buttonSecondary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.actionText, { color: theme.muted }]}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.confirmButton,
            { backgroundColor: theme.buttonPrimary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.actionText, { color: theme.text }]}>Confirm</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    borderRadius: 12,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    minWidth: 90,
  },
  magControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  magButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magButtonText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  magValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 12,
  },
  colorSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#ffffff',
    borderWidth: 2.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  unsetHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  cyclerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cyclerBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyclerArrow: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  cyclerValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  italic: {
    fontStyle: 'italic',
  },
  noteContainer: {
    gap: 6,
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 40,
    maxHeight: 100,
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnText: {
    fontSize: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  countdownContainer: {
    gap: 4,
  },
  countdownTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  countdownBar: {
    height: '100%',
    borderRadius: 3,
  },
  countdownText: {
    fontSize: 11,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  confirmButton: {
    flex: 2,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
