import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { CalEvent } from '@/types';
import { entryLetterThumbnail, getEventCoverUri, eventDirectImageUrl } from '@/lib/eventImagery';
import { isWeb } from '@/constants/layout';

const THUMB = 48;
const THUMB_WEB = 60;
const THUMB_MODAL_WEB = 100;

const TYPE_LABEL: Record<string, string> = {
  event: 'Event',
  reminder: 'Reminder',
  appointment: 'Appointment',
};

type EventCardProps = {
  event: CalEvent;
  /** `list` = week/upcoming rows; `modal` = month day picker popup */
  variant?: 'list' | 'modal';
  /** Called before navigating (e.g. close month modal) */
  onBeforeNavigate?: () => void;
};

export default function EventCard({ event, variant = 'list', onBeforeNavigate }: EventCardProps) {
  const router = useRouter();
  const [thumbTier, setThumbTier] = useState<'direct' | 'stock' | 'gone'>('stock');

  const directUri = eventDirectImageUrl(event);
  const stockUri = getEventCoverUri(event) ?? '';

  useEffect(() => {
    setThumbTier(directUri ? 'direct' : 'stock');
  }, [event.id, directUri]);

  const thumbUri =
    thumbTier === 'gone'
      ? ''
      : thumbTier === 'direct' && directUri
        ? directUri
        : stockUri;

  const letter = entryLetterThumbnail(event.title);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const dateObj = new Date(event.date + 'T00:00:00');
  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNum = dateObj.getDate();
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

  if (event.isHoliday) {
    return (
      <View style={styles.holidayWrap}>
        <View style={styles.holidayInner}>
          <View style={styles.holidayIconWrap}>
            <Ionicons name="sparkles" size={14} color={Colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.holidayLabel}>Holiday</Text>
            <Text style={styles.holidayTitle}>{event.title}</Text>
            <Text style={styles.holidayMeta}>{weekday}, {monthShort} {dayNum}</Text>
          </View>
        </View>
      </View>
    );
  }

  const loc = [event.location, event.city].filter(Boolean).join(' · ') + (event.state ? (event.city || event.location ? ', ' : '') + event.state : '');

  const webListStyle = isWeb && variant === 'list';
  const webModalStyle = isWeb && variant === 'modal';

  return (
    <TouchableOpacity
      style={[styles.card, webListStyle && styles.cardWeb, webModalStyle && styles.cardModalWeb]}
      onPress={() => {
        onBeforeNavigate?.();
        router.push(`/event/${encodeURIComponent(String(event.id))}`);
      }}
      activeOpacity={0.72}
    >
      <View style={[styles.dateRail, webListStyle && styles.dateRailWeb, webModalStyle && styles.dateRailModalWeb]}>
        <Text style={[styles.dateMonth, webListStyle && styles.dateMonthWeb, webModalStyle && styles.dateMonthModalWeb]}>{monthShort}</Text>
        <Text style={[styles.dateDay, webListStyle && styles.dateDayWeb, webModalStyle && styles.dateDayWebModal]}>{dayNum}</Text>
        <Text style={[styles.dateWeek, webListStyle && styles.dateWeekWeb, webModalStyle && styles.dateWeekModalWeb]}>{weekday}</Text>
      </View>

      <View style={[styles.thumbWrap, webListStyle && styles.thumbWrapWeb, webModalStyle && styles.thumbWrapModalWeb]}>
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={[styles.thumb, webListStyle && styles.thumbWeb, webModalStyle && styles.thumbModalWeb]}
            contentFit="cover"
            transition={180}
            onError={() => {
              if (thumbTier === 'direct' && directUri) setThumbTier('stock');
              else setThumbTier('gone');
            }}
          />
        ) : (
          <View style={[styles.thumb, webListStyle && styles.thumbWeb, webModalStyle && styles.thumbModalWeb, { backgroundColor: letter.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.thumbLetter}>{letter.letter}</Text>
          </View>
        )}
      </View>

      <View style={[styles.body, webModalStyle && styles.bodyModalWeb]}>
        <Text style={[styles.typePill, webModalStyle && styles.typePillModalWeb]}>{TYPE_LABEL[event.type] ?? 'Event'}</Text>
        {event.club ? (
          <Text style={[styles.clubTag, webModalStyle && styles.clubTagModalWeb]} numberOfLines={1}>{event.club}</Text>
        ) : null}
        <Text style={[styles.title, webListStyle && styles.titleWeb, webModalStyle && styles.titleModalWeb]} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={webModalStyle ? 16 : 13} color={Colors.textMuted} />
          <Text style={[styles.meta, webModalStyle && styles.metaModalWeb]}>
            {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </Text>
        </View>

        {loc.trim() ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={webModalStyle ? 16 : 13} color={Colors.textMuted} />
            <Text style={[styles.meta, webModalStyle && styles.metaModalWeb]} numberOfLines={2}>{loc}</Text>
          </View>
        ) : null}
      </View>

      {variant === 'modal' ? (
        <View style={[styles.chevronWrap, webModalStyle && styles.chevronWrapModalWeb]}>
          <Ionicons name="chevron-forward" size={webModalStyle ? 22 : 18} color={Colors.subtext} />
        </View>
      ) : !isWeb ? (
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={18} color={Colors.subtext} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 10,
    paddingLeft: 0,
    gap: 10,
  },
  cardWeb: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 0,
    paddingVertical: 18,
    paddingRight: 0,
    gap: 14,
  },
  cardModalWeb: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 0,
    paddingVertical: 22,
    paddingRight: 16,
    paddingLeft: 0,
    gap: 18,
    minHeight: 120,
    overflow: 'hidden',
  },
  dateRailModalWeb: {
    width: 72,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.card,
  },
  dateMonthModalWeb: { fontSize: 12, letterSpacing: 1 },
  dateDayWebModal: { fontSize: 30, marginVertical: 4 },
  dateWeekModalWeb: { fontSize: 13 },
  thumbWrapModalWeb: { width: THUMB_MODAL_WEB, alignSelf: 'center' },
  thumbModalWeb: {
    width: THUMB_MODAL_WEB,
    height: THUMB_MODAL_WEB,
    borderRadius: 14,
  },
  typePillModalWeb: { fontSize: 11, marginBottom: 2 },
  clubTagModalWeb: { fontSize: 11 },
  titleModalWeb: { fontSize: 20, lineHeight: 26, marginTop: 2 },
  metaModalWeb: { fontSize: 15, lineHeight: 21 },
  chevronWrapModalWeb: { paddingHorizontal: 8 },
  dateRailWeb: { width: 56 },
  dateMonthWeb: { fontSize: 11 },
  dateDayWeb: { fontSize: 26 },
  dateWeekWeb: { fontSize: 12 },
  thumbWrapWeb: { width: THUMB_WEB },
  thumbWeb: {
    width: THUMB_WEB,
    height: THUMB_WEB,
    borderRadius: 12,
  },
  titleWeb: { fontSize: 18, lineHeight: 24 },
  dateRail: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    marginRight: 2,
  },
  dateMonth: { color: Colors.subtext, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  dateDay: { color: Colors.text, fontSize: 22, fontWeight: '800', marginVertical: 2 },
  dateWeek: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },

  thumbWrap: {
    width: THUMB,
    alignSelf: 'center',
    position: 'relative',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  thumbLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },

  body: { flex: 1, justifyContent: 'center', gap: 4, paddingVertical: 2 },
  bodyModalWeb: { gap: 8, paddingVertical: 4 },
  typePill: {
    alignSelf: 'flex-start',
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  clubTag: {
    color: Colors.accentLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: Colors.textMuted, fontSize: 13, flex: 1 },

  chevronWrap: { justifyContent: 'center', paddingLeft: 2 },

  holidayWrap: {
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  holidayInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  holidayIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  holidayLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  holidayTitle: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  holidayMeta: { color: Colors.subtext, fontSize: 12, marginTop: 4 },
});
