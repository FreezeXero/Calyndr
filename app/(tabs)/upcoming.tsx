import React, { useCallback, useEffect, useState } from 'react';
import { subscribeEventsChanged } from '@/lib/eventsRefresh';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { CalEvent } from '@/types';
import { getEvents, setEventFavorite } from '@/lib/storage';
import { sortUpcomingEvents, type UpcomingSortMode } from '@/lib/upcomingSort';
import { entryLetterThumbnail, getEventCoverUri, eventDirectImageUrl } from '@/lib/eventImagery';
import { promptRemoveEvent } from '@/lib/removeEvent';
import WebPage from '@/components/WebPage';
import SortDropdown from '@/components/SortDropdown';
import FavoriteStar from '@/components/FavoriteStar';
import { isWeb } from '@/constants/layout';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SORT_OPTIONS: { key: UpcomingSortMode; label: string }[] = [
  { key: 'eventDate', label: 'Event date' },
  { key: 'dateAdded', label: 'Date added' },
  { key: 'favorites', label: 'Favorites' },
];

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function UpcomingRow({
  event,
  onPress,
  onRemove,
  onToggleFavorite,
  web,
}: {
  event: CalEvent;
  onPress: () => void;
  onRemove: () => void;
  onToggleFavorite: () => void;
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
    <View style={[styles.row, web && styles.rowWeb, event.favorite && web && styles.rowFavWeb]}>
      <TouchableOpacity style={[styles.rowMain, web && styles.rowMainWeb]} onPress={onPress} activeOpacity={0.75}>
        <View style={[styles.dateCol, web && styles.dateColWeb]}>
          <Text style={[styles.dateMonth, web && styles.dateMonthWeb]}>{month}</Text>
          <Text style={[styles.dateDay, web && styles.dateDayWeb]}>{dayNum}</Text>
          <Text style={[styles.dateWeek, web && styles.dateWeekWeb]}>{weekday}</Text>
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
              <Text style={[styles.thumbLetter, web && styles.thumbLetterWeb]}>{letter.letter}</Text>
            </View>
          )}
        </View>
        <View style={[styles.body, web && styles.bodyWeb]}>
          <Text style={[styles.title, web && styles.titleWeb]} numberOfLines={2}>{event.title}</Text>
          <View style={styles.metaLine}>
            <Ionicons name="time-outline" size={web ? 15 : 13} color={Colors.textMuted} />
            <Text style={[styles.meta, web && styles.metaWeb]}>{formatTime(event.startTime)} – {formatTime(event.endTime)}</Text>
          </View>
          {loc ? (
            <View style={styles.metaLine}>
              <Ionicons name="location-outline" size={web ? 15 : 13} color={Colors.textMuted} />
              <Text style={[styles.meta, web && styles.metaWeb]} numberOfLines={1}>{loc}</Text>
            </View>
          ) : null}
        </View>
        {!web ? (
          <Ionicons name="chevron-forward" size={18} color={Colors.subtext} style={{ alignSelf: 'center' }} />
        ) : null}
      </TouchableOpacity>
      <View style={styles.actions}>
        <FavoriteStar active={Boolean(event.favorite)} onPress={onToggleFavorite} size={web ? 26 : 22} />
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Remove event"
        >
          <Ionicons name="trash-outline" size={web ? 22 : 20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function UpcomingScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [sortMode, setSortMode] = useState<UpcomingSortMode>('eventDate');

  const loadEvents = useCallback(() => {
    getEvents().then(data => {
      setEvents(sortUpcomingEvents(data, sortMode));
    });
  }, [sortMode]);

  useFocusEffect(useCallback(() => {
    loadEvents();
  }, [loadEvents]));

  useEffect(() => subscribeEventsChanged(loadEvents), [loadEvents]);

  const handleRemove = (event: CalEvent) => {
    promptRemoveEvent(event, loadEvents);
  };

  const handleToggleFavorite = async (event: CalEvent) => {
    await setEventFavorite(String(event.id), !event.favorite);
    loadEvents();
  };

  return (
    <View style={styles.container}>
      <WebPage>
        <View style={[styles.toolbar, isWeb && styles.toolbarWeb]}>
          <SortDropdown value={sortMode} options={SORT_OPTIONS} onChange={setSortMode} />
        </View>

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
                onToggleFavorite={() => void handleToggleFavorite(item)}
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
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  toolbarWeb: { paddingHorizontal: 0, paddingTop: 10, paddingBottom: 16 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  listWeb: { paddingHorizontal: 0, paddingTop: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowWeb: { minHeight: 108, paddingVertical: 4 },
  rowFavWeb: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingRight: 8,
  },
  rowMainWeb: { gap: 18, paddingVertical: 20 },
  actions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingRight: 4,
    paddingLeft: 8,
  },
  removeBtn: { padding: 4 },
  dateCol: { width: 52, alignItems: 'center' },
  dateColWeb: { width: 62 },
  dateMonth: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  dateMonthWeb: { fontSize: 12 },
  dateDay: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  dateDayWeb: { fontSize: 28 },
  dateWeek: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  dateWeekWeb: { fontSize: 12 },
  thumbWrap: {},
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.surface },
  thumbWeb: { width: 88, height: 88, borderRadius: 14 },
  thumbLetter: { color: '#fff', fontSize: 28, fontWeight: '800' },
  thumbLetterWeb: { fontSize: 34 },
  body: { flex: 1, gap: 6 },
  bodyWeb: { gap: 8 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  titleWeb: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { color: Colors.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  metaWeb: { fontSize: 15, lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  emptyText: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  emptySub: { color: Colors.subtext, fontSize: 14, textAlign: 'center' },
});
