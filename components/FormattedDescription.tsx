import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

function stripUrls(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.endsWith(':')) return true;
  if (t.length < 3) return false;
  const letters = t.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 2) return false;
  return t === t.toUpperCase() && /[A-Z]/.test(t);
}

function isBulletLine(line: string): boolean {
  return /^\s*[-•]\s+/.test(line);
}

function bulletText(line: string): string {
  return stripUrls(line.replace(/^\s*[-•]\s+/, '').trim());
}

type LineKind = 'empty' | 'header' | 'bullet' | 'paragraph';

function classifyLine(line: string): { kind: LineKind; text: string } {
  if (!line.trim()) return { kind: 'empty', text: '' };
  if (isSectionHeader(line)) return { kind: 'header', text: stripUrls(line.trim()) };
  if (isBulletLine(line)) return { kind: 'bullet', text: bulletText(line) };
  return { kind: 'paragraph', text: stripUrls(line.trim()) };
}

export default function FormattedDescription({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <View style={styles.wrap}>
      {lines.map((raw, index) => {
        const { kind, text: lineText } = classifyLine(raw);
        const key = `desc-${index}`;

        if (kind === 'empty') {
          return <View key={key} style={styles.emptySpacer} />;
        }
        if (kind === 'header') {
          return (
            <Text key={key} style={styles.header}>
              {lineText}
            </Text>
          );
        }
        if (kind === 'bullet') {
          return (
            <View key={key} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>·</Text>
              <Text style={styles.bulletText}>{lineText}</Text>
            </View>
          );
        }
        return (
          <Text key={key} style={styles.paragraph}>
            {lineText}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  paragraph: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  header: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 8,
    marginBottom: 4,
  },
  bulletDot: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    width: 12,
  },
  bulletText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  emptySpacer: { marginBottom: 8 },
});
