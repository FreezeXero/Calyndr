import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { saveEvent } from '@/lib/storage';
import { sendNexaTextMessage, sendNexaImageMessage, parseEventFromUrl } from '@/lib/claude';
import { scheduleEventReminder } from '@/lib/notifications';
import type { CalEvent } from '@/types';
import WebPage from '@/components/WebPage';
import { isWeb } from '@/constants/layout';

interface Message {
  id: string;
  role: 'user' | 'nexa';
  text: string;
  success?: boolean;
  imageUrl?: string;
}

const SUGGESTIONS = [
  { label: 'Add an event', icon: 'calendar-outline' as const },
  { label: 'Paste an event link', icon: 'link-outline' as const },
  { label: 'Networking tips', icon: 'people-outline' as const },
  { label: 'Career fair prep', icon: 'school-outline' as const },
];

const SUCCESS_GREEN = '#4ade80';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const KEY_MISSING = Platform.OS !== 'web' && (!API_KEY || API_KEY === 'your_key_here');

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function NexaHeader() {
  return (
    <View style={[styles.header, isWeb && styles.headerWeb]}>
      <View style={[styles.headerIcon, isWeb && styles.headerIconWeb]}>
        <Ionicons name="sparkles" size={isWeb ? 22 : 18} color={Colors.background} />
      </View>
      <View style={styles.headerText}>
        <Text style={[styles.headerTitle, isWeb && styles.headerTitleWeb]}>Nexa</Text>
        <Text style={[styles.headerSub, isWeb && styles.headerSubWeb]}>
          Import events from links, schedule plans, or ask for career & networking advice.
        </Text>
      </View>
    </View>
  );
}

export default function NexaScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'nexa',
      text: KEY_MISSING
        ? "Hey! I'm Nexa. Add your Anthropic API key to .env.local to get started."
        : "Hi — I'm Nexa. Paste an event URL to import it, describe something to add to your calendar, or ask me anything about networking and career events.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const scrollEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  const push = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    scrollEnd();
  };

  const persistEvent = async (event: CalEvent) => {
    await saveEvent(event);
    await scheduleEventReminder({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
    });
  };

  const handleSendText = async (textRaw: string) => {
    const text = textRaw.trim();
    if (!text || loading) return;

    const URL_RE = /https?:\/\/[^\s]+/;
    const urlMatch = text.match(URL_RE);
    if (urlMatch) {
      if (KEY_MISSING) return;
      const pageUrl = urlMatch[0].replace(/[)\].,;:'"»]+$/u, '');

      push({ id: `${Date.now()}-u`, role: 'user', text });
      setInput('');
      setLoading(true);
      push({
        id: `${Date.now()}-fetch`,
        role: 'nexa',
        text: 'Fetching event from that link…',
      });

      try {
        const imported = await parseEventFromUrl(pageUrl);

        if (imported) {
          await persistEvent(imported);
          push({
            id: `${Date.now()}-ok`,
            role: 'nexa',
            text: `Done! Added "${imported.title}" on ${imported.date} at ${formatTime(imported.startTime)}${imported.location ? ` · ${imported.location}` : ''}.`,
            success: true,
            imageUrl: imported.imageUrl,
          });
        } else {
          push({
            id: `${Date.now()}-fail`,
            role: 'nexa',
            text: "Couldn't read that page — it might require a login. Try pasting the event details instead.",
          });
        }
      } finally {
        setLoading(false);
      }
      scrollEnd();
      return;
    }

    if (KEY_MISSING) return;

    push({ id: `${Date.now()}-u`, role: 'user', text });
    setInput('');
    setLoading(true);

    const result = await sendNexaTextMessage(text);
    setLoading(false);

    if (result.kind === 'event') {
      await persistEvent(result.event);
      push({
        id: `${Date.now()}-ok`,
        role: 'nexa',
        text: `Added "${result.event.title}" on ${result.event.date} at ${formatTime(result.event.startTime)}${result.event.location ? ` · ${result.event.location}` : ''}.`,
        success: true,
        imageUrl: result.event.imageUrl,
      });
      scrollEnd();
      return;
    }
    if (result.kind === 'chat') {
      push({ id: `${Date.now()}-c`, role: 'nexa', text: result.text });
      scrollEnd();
      return;
    }
    push({ id: `${Date.now()}-e`, role: 'nexa', text: result.message });
    scrollEnd();
  };

  const handleSend = async () => handleSendText(input);

  const handleImage = async () => {
    if (KEY_MISSING || loading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });
    if (result.canceled || !result.assets[0].base64) return;

    push({ id: `${Date.now()}-img`, role: 'user', text: '📸 Uploaded an image' });
    setLoading(true);

    const reply = await sendNexaImageMessage(result.assets[0].base64);
    setLoading(false);

    if (reply.kind === 'event') {
      await persistEvent(reply.event);
      push({
        id: `${Date.now()}-img-ok`,
        role: 'nexa',
        text: `Added "${reply.event.title}" on ${reply.event.date} at ${formatTime(reply.event.startTime)}${reply.event.location ? ` · ${reply.event.location}` : ''}.`,
        success: true,
      });
      scrollEnd();
      return;
    }
    if (reply.kind === 'chat') {
      push({ id: `${Date.now()}-img-c`, role: 'nexa', text: reply.text });
      scrollEnd();
      return;
    }
    push({ id: `${Date.now()}-img-e`, role: 'nexa', text: reply.message });
    scrollEnd();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const showChips = index === 0 && item.role === 'nexa' && !KEY_MISSING;

    return (
      <View style={styles.threadBlock}>
        <View style={[styles.bubbleCol, isUser && styles.bubbleColUser]}>
          {item.role === 'nexa' ? (
            <View style={styles.nexaLabelRow}>
              <View style={styles.nexaAvatar}>
                <Ionicons name="sparkles" size={12} color={Colors.background} />
              </View>
              <Text style={styles.nexaLabel}>Nexa</Text>
            </View>
          ) : null}
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.nexaBubble]}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.successThumb} contentFit="cover" transition={180} />
            ) : null}
            {item.success ? (
              <View style={styles.successRow}>
                <Ionicons name="checkmark-circle" size={18} color={SUCCESS_GREEN} />
                <Text style={styles.successLabel}>Added to Calyndr</Text>
              </View>
            ) : null}
            <Text style={[styles.bubbleText, isUser && styles.userText]}>{item.text}</Text>
          </View>
        </View>

        {showChips ? (
          <View style={styles.chipsRow}>
            {SUGGESTIONS.map(chip => (
              <TouchableOpacity
                key={chip.label}
                style={styles.chip}
                onPress={() => void handleSendText(chip.label)}
                activeOpacity={0.82}
                disabled={loading}
              >
                <Ionicons name={chip.icon} size={16} color={Colors.textMuted} />
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={isWeb ? 0 : 90}
    >
      <WebPage contentStyle={styles.pageFill}>
        <View style={[styles.chatShell, isWeb && styles.chatShellWeb]}>
          <NexaHeader />

          <FlatList
            ref={listRef}
            style={styles.messageList}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={isWeb}
            ListFooterComponent={<View style={{ height: 12 }} />}
            renderItem={renderMessage}
          />

          {loading ? (
            <View style={styles.thinkingRow}>
              <View style={styles.thinkingDots}>
                <View style={styles.thinkingDot} />
                <View style={[styles.thinkingDot, styles.thinkingDotMid]} />
                <View style={styles.thinkingDot} />
              </View>
              <Text style={styles.thinking}>Nexa is thinking…</Text>
            </View>
          ) : null}

          <View style={styles.composer}>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => void handleImage()}
                disabled={KEY_MISSING || loading}
              >
                <Ionicons name="image-outline" size={22} color={KEY_MISSING ? Colors.border : Colors.textMuted} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={KEY_MISSING ? 'Add API key to .env.local first…' : 'Message Nexa or paste an event link…'}
                placeholderTextColor={Colors.subtext}
                multiline
                editable={!KEY_MISSING && !loading}
                onSubmitEditing={isWeb ? () => void handleSend() : undefined}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || KEY_MISSING || loading) && styles.sendBtnDisabled]}
                onPress={() => void handleSend()}
                disabled={!input.trim() || KEY_MISSING || loading}
              >
                <Ionicons
                  name="arrow-up"
                  size={24}
                  color={input.trim() && !KEY_MISSING && !loading ? Colors.background : Colors.subtext}
                />
              </TouchableOpacity>
            </View>
            {isWeb ? (
              <Text style={styles.composerHint}>Press Enter to send · Shift+Enter for a new line</Text>
            ) : null}
          </View>
        </View>
      </WebPage>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pageFill: { flex: 1, width: '100%' },

  chatShell: { flex: 1 },
  chatShellWeb: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerWeb: {
    paddingVertical: 28,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWeb: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  headerText: { flex: 1, gap: 4 },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerTitleWeb: { fontSize: 28, letterSpacing: -0.5 },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  headerSubWeb: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 560,
  },

  messageList: { flex: 1 },
  messages: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },

  threadBlock: { marginBottom: 18 },

  bubbleCol: { gap: 6, maxWidth: '88%', alignSelf: 'flex-start' },
  bubbleColUser: { maxWidth: '80%', alignSelf: 'flex-end', alignItems: 'flex-end' },

  nexaLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 },
  nexaAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nexaLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nexaBubble: {
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.text,
    borderBottomRightRadius: 6,
    borderColor: Colors.text,
  },

  bubbleText: { color: Colors.text, fontSize: 16, lineHeight: 23 },
  userText: { color: Colors.background },

  successRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  successThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  successLabel: { color: SUCCESS_GREEN, fontSize: 13, fontWeight: '600' },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    maxWidth: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { color: Colors.text, fontSize: 14, fontWeight: '600' },

  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  thinkingDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.subtext,
    opacity: 0.5,
  },
  thinkingDotMid: { opacity: 0.85 },
  thinking: { color: Colors.textMuted, fontSize: 14, fontStyle: 'italic' },

  composer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text,
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 4,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.card,
    opacity: 0.7,
  },
  composerHint: {
    color: Colors.subtext,
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
});
