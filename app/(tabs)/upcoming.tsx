import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { CalEvent } from '@/types';
import { getEvents } from '@/lib/storage';
import { entryLetterThumbnail, getEventCoverUri, eventDirectImageUrl } from '@/lib/eventImagery';
import { promptRemoveEvent } from '@/lib/removeEvent';
import WebPage from '@/components/WebPage';
import { isWeb } from '@/constants/layout';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function UpcomingRow({
  event,
  onPress,
  onRemove,
  web,
}: {
  event: CalEvent;
  onPress: () => void;
  onRemove: () => void;
  web?: boolean;
}) {
  const d = new Date(event.date + 'T00:00:00');
  const month = SHORT_MONTHS[d.getMonth()];
  const dayNum = d.getDate();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const [thumbTier, setThumbTier] = useState<'direct' | 'stock' | 'gone'>('stock');
  const directUri = eventDirectImageUrl(event);
  const stockUri = getEventCoverUri(event) ?? '';

  useEffect(() => {
    setThumbTier(directUri ? 'direct' : 'stock');
  }, [event.id, directUri]);

  const uri =
    thumbTier === 'gone'
      ? ''
      : thumbTier === 'direct' && directUri
        ? directUri
        : stockUri;
  const letter = entryLetterThumbnail(event.title);
  const loc = [event.location, event.city].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, web && styles.rowWeb]}>
      <TouchableOpacity style={styles.rowMain} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.dateCol}>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateDay}>{dayNum}</Text>
          <Text style={styles.dateWeek}>{weekday}</Text>
        </View>
        <View style={styles.thumbWrap}>
          {uri ? (
            <Image
              source={{ uri }}
              style={[styles.thumb, web && styles.thumbWeb]}
              contentFit="cover"
              transition={160}
              onError={() => {
                if (thumbTier === 'direct' && directUri) setThumbTier('stock');
                else setThumbTier('gone');
              }}
            />
          ) : (
            <View style={[styles.thumb, web && styles.thumbWeb, { backgroundColor: letter.bg, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.thumbLetter}>{letter.letter}</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, web && styles.titleWeb]} numberOfLines={2}>{event.title}</Text>
          <View style={styles.metaLine}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.meta}>{formatTime(event.startTime)} – {formatTime(event.endTime)}</Text>
          </View>
          {loc ? (
            <View style={styles.metaLine}>
              <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.meta} numberOfLines={1}>{loc}</Text>
            </View>
          ) : null}
        </View>
        {!web ? (
          <Ionicons name="chevron-forward" size={18} color={Colors.subtext} style={{ alignSelf: 'center' }} />
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Remove event"
      >
        <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default function UpcomingScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<CalEvent[]>([]);

  const loadEvents = useCallback(() => {
    getEvents().then(data => {
      const sorted = data
        .filter(e => !e.isHoliday)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      setEvents(sorted);
    });
  }, []);

  useFocusEffect(useCallback(() => {
    loadEvents();
  }, [loadEvents]));

  const handleRemove = (event: CalEvent) => {
    promptRemoveEvent(event, loadEvents);
  };

  return (
    <View style={styles.container}>
      <WebPage>
      {events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nothing upcoming</Text>
          <Text style={styles.emptySub}>Add an entry from the calendar tab</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => String(e.id)}
          contentContainerStyle={[styles.list, isWeb && styles.listWeb]}
          renderItem={({ item }) => (
            <UpcomingRow
              web={isWeb}
              event={item}
              onPress={() => router.push(`/event/${encodeURIComponent(String(item.id))}`)}
              onRemove={() => handleRemove(item)}
            />
          )}
        />
      )}
      </WebPage>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 0 },
  listWeb: { paddingHorizontal: 0 },
  rowWeb: { minHeight: 76 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingRight: 8,
  },
  removeBtn: {
    paddingVertical: 16,
    paddingLeft: 4,
    paddingRight: 2,
    justifyContent: 'center',
  },
  dateCol: { width: 52, alignItems: 'center' },
  dateMonth: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  dateDay: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  dateWeek: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  thumbWrap: {},
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.surface },
  thumbWeb: { width: 64, height: 64, borderRadius: 10 },
  titleWeb: { fontSize: 19, lineHeight: 24 },
  thumbLetter: { color: '#fff', fontSize: 28, fontWeight: '800' },
  body: { flex: 1, gap: 6 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { color: Colors.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  emptyText: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  emptySub: { color: Colors.subtext, fontSize: 14, textAlign: 'center' },
});
