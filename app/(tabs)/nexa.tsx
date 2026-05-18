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
import {
  sendNexaChat,
  parseEventFromUrl,
  type NexaApiMessage,
  type NexaResult,
  type NexaUserContent,
} from '@/lib/claude';
import {
  imageBlockFromBase64,
  inferImageMediaType,
  normalizeBase64Image,
  type AnthropicImageMediaType,
} from '@/lib/imageMime';
import { saveEventImageFromBase64 } from '@/lib/eventImageStore';
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
  localImageUri?: string;
}

type PendingImage = { base64: string; uri: string; mediaType: AnthropicImageMediaType };

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
        : "Hey! I'm Nexa. Paste an event URL, describe an event, or ask me anything about scheduling.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const listRef = useRef<FlatList>(null);
  const apiHistoryRef = useRef<NexaApiMessage[]>([]);
  /** Last photo the user sent — reused when they confirm "add both" in a later message. */
  const lastUploadImageRef = useRef<PendingImage | null>(null);

  const sourceImageForTurn = (explicit?: PendingImage | null) => explicit ?? lastUploadImageRef.current;

  const scrollEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  const push = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    scrollEnd();
  };

  const attachUploadImage = async (event: CalEvent, source?: PendingImage | null): Promise<CalEvent> => {
    if (!source) return event;
    const uri = await saveEventImageFromBase64(
      event.id,
      source.base64,
      source.mediaType,
      source.uri,
    );
    return { ...event, imageUrl: uri, hostImage: uri };
  };

  const persistEvent = async (event: CalEvent, sourceImage?: PendingImage | null) => {
    const stored = await attachUploadImage(event, sourceImage);
    await saveEvent(stored);
    await scheduleEventReminder({
      id: stored.id,
      title: stored.title,
      date: stored.date,
      startTime: stored.startTime,
    });
    return stored;
  };

  const recordApiTurn = (userContent: NexaUserContent, assistantText: string) => {
    if (!assistantText.trim()) return;
    const turn: NexaApiMessage[] = [
      { role: 'user', content: userContent },
      { role: 'assistant', content: assistantText },
    ];
    apiHistoryRef.current = [...apiHistoryRef.current, ...turn].slice(-24);
  };

  const applyNexaResult = async (result: NexaResult, sourceImage?: PendingImage | null) => {
    try {
      if (result.kind === 'event') {
        const stored = await persistEvent(result.event, sourceImage);
        push({
          id: `${Date.now()}-ok`,
          role: 'nexa',
          text: `Added "${stored.title}" on ${stored.date} at ${formatTime(stored.startTime)}${stored.location ? ` · ${stored.location}` : ''}.`,
          success: true,
          imageUrl: stored.imageUrl,
        });
        return;
      }
      if (result.kind === 'events') {
        let firstThumb: string | undefined;
        for (const ev of result.events) {
          const stored = await persistEvent(ev, sourceImage);
          if (!firstThumb && stored.imageUrl) firstThumb = stored.imageUrl;
        }
        const names = result.events.map(e => `"${e.title}"`).join(', ');
        push({
          id: `${Date.now()}-multi`,
          role: 'nexa',
          text: `Added ${result.events.length} events: ${names}.`,
          success: true,
          imageUrl: firstThumb,
        });
        return;
      }
    } catch (e) {
      push({
        id: `${Date.now()}-save-err`,
        role: 'nexa',
        text: e instanceof Error ? e.message : 'Could not save to your calendar.',
      });
      return;
    }
    if (result.kind === 'chat') {
      push({ id: `${Date.now()}-c`, role: 'nexa', text: result.text });
      return;
    }
    push({ id: `${Date.now()}-e`, role: 'nexa', text: result.message });
  };

  const runNexaChat = async (userContent: NexaUserContent, sourceImage?: PendingImage | null) => {
    const messages: NexaApiMessage[] = [...apiHistoryRef.current, { role: 'user', content: userContent }];
    const { result, assistantText } = await sendNexaChat(messages);

    const historyReply =
      assistantText ||
      (result.kind === 'chat'
        ? result.text
        : result.kind === 'error'
          ? result.message
          : result.kind === 'event'
            ? `{"type":"event","title":"${result.event.title}","date":"${result.event.date}"}`
            : result.kind === 'events'
              ? `Added ${result.events.length} events.`
              : '');

    recordApiTurn(userContent, historyReply);
    await applyNexaResult(result, sourceImageForTurn(sourceImage));
  };

  const handleSendText = async (textRaw: string) => {
    const text = textRaw.trim();
    if ((!text && !pendingImage) || loading) return;

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
          const stored = await persistEvent(imported);
          const okText = `Done! Added "${stored.title}" on ${stored.date} at ${formatTime(stored.startTime)}${stored.location ? ` · ${stored.location}` : ''}.`;
          push({
            id: `${Date.now()}-ok`,
            role: 'nexa',
            text: okText,
            success: true,
            imageUrl: stored.imageUrl,
          });
          recordApiTurn(text, okText);
        } else {
          const failText = "Couldn't read that page — it might require a login. Try pasting the event details instead.";
          push({ id: `${Date.now()}-fail`, role: 'nexa', text: failText });
          recordApiTurn(text, failText);
        }
      } catch (e) {
        const errText = e instanceof Error ? e.message : 'Could not save to your calendar.';
        push({ id: `${Date.now()}-save-err`, role: 'nexa', text: errText });
        recordApiTurn(text, errText);
      } finally {
        setLoading(false);
      }
      scrollEnd();
      return;
    }

    if (KEY_MISSING) return;

    const image = pendingImage;
    if (image) lastUploadImageRef.current = image;
    const caption = text;
    const userLabel = image
      ? caption || 'Sent a photo'
      : text;

    push({
      id: `${Date.now()}-u`,
      role: 'user',
      text: userLabel,
      ...(image ? { localImageUri: image.uri } : {}),
    });
    setInput('');
    setPendingImage(null);
    setLoading(true);

    const userContent: NexaUserContent = image
      ? [
          imageBlockFromBase64(image.base64, image.uri, image.mediaType),
          {
            type: 'text',
            text:
              caption ||
              'What events do you see in this image? List each with title, date, and time. Ask before adding to my calendar.',
          },
        ]
      : text;

    try {
      await runNexaChat(userContent, sourceImageForTurn(image));
    } finally {
      setLoading(false);
    }
    scrollEnd();
  };

  const canSend = Boolean((input.trim() || pendingImage) && !KEY_MISSING && !loading);

  const handleSend = async () => {
    const text = input.trim();
    if (pendingImage) {
      await handleSendText(text);
      return;
    }
    if (text) await handleSendText(text);
  };

  const handleImage = async () => {
    if (KEY_MISSING || loading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) return;
    const uri = asset.uri ?? '';
    const pickerMime =
      'mimeType' in asset && typeof asset.mimeType === 'string' ? asset.mimeType : null;
    const normalized = normalizeBase64Image(asset.base64);
    setPendingImage({
      base64: normalized.data,
      uri,
      mediaType: normalized.mediaType ?? inferImageMediaType(uri, pickerMime),
    });
  };

  const handleComposerKeyPress = (
    e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void },
  ) => {
    if (!isWeb) return;
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      if (canSend) void handleSend();
    }
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
            {item.localImageUri ? (
              <Image source={{ uri: item.localImageUri }} style={styles.userAttachThumb} contentFit="cover" transition={180} />
            ) : null}
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
            {pendingImage ? (
              <View style={styles.attachPreview}>
                <Image source={{ uri: pendingImage.uri }} style={styles.attachPreviewImg} contentFit="cover" />
                <View style={styles.attachPreviewMeta}>
                  <Text style={styles.attachPreviewLabel}>Image attached</Text>
                  <Text style={styles.attachPreviewSub}>Add a message, then send</Text>
                </View>
                <TouchableOpacity
                  style={styles.attachRemove}
                  onPress={() => setPendingImage(null)}
                  hitSlop={8}
                  accessibilityLabel="Remove image"
                >
                  <Ionicons name="close" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}
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
                placeholder={
                  KEY_MISSING
                    ? 'Add API key to .env.local first…'
                    : pendingImage
                      ? 'Add a note (optional)…'
                      : 'Message Nexa or paste an event link…'
                }
                placeholderTextColor={Colors.subtext}
                multiline
                editable={!KEY_MISSING && !loading}
                blurOnSubmit={false}
                onKeyPress={handleComposerKeyPress}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                onPress={() => void handleSend()}
                disabled={!canSend}
              >
                <Ionicons
                  name="arrow-up"
                  size={24}
                  color={canSend ? Colors.background : Colors.subtext}
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
  userAttachThumb: {
    width: '100%',
    maxWidth: 220,
    height: 140,
    borderRadius: 12,
    backgroundColor: Colors.card,
    marginBottom: 6,
  },
  successThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  attachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attachPreviewImg: { width: 52, height: 52, borderRadius: 10 },
  attachPreviewMeta: { flex: 1, gap: 2 },
  attachPreviewLabel: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  attachPreviewSub: { color: Colors.subtext, fontSize: 12 },
  attachRemove: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
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
