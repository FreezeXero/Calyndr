import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { CalEvent } from '@/types';
import { openMapsFromCalEvent } from '@/lib/maps';
import { getEvents } from '@/lib/storage';
import { HOLIDAYS_2026 } from '@/constants/Holidays';
import { getEventCoverUri, entryLetterThumbnail, eventDirectImageUrl } from '@/lib/eventImagery';
import { openExternalUrl } from '@/lib/openExternal';
import { promptRemoveEvent } from '@/lib/removeEvent';
import FormattedDescription from '@/components/FormattedDescription';
import WebPage from '@/components/WebPage';
import { isWeb } from '@/constants/layout';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TYPE_LABEL: Record<string, string> = {
  event: 'Event',
  reminder: 'Reminder',
  appointment: 'Appointment',
};

export default function EventDetail() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' ? decodeURIComponent(raw) : raw;
  const router = useRouter();
  const navigation = useNavigation();
  const [event, setEvent] = useState<CalEvent | null>(null);
  const [coverTier, setCoverTier] = useState<'direct' | 'stock' | 'none'>('stock');

  useEffect(() => {
    const load = async () => {
      if (id == null || id === '') {
        setEvent(null);
        return;
      }
      const stored = await getEvents();
      const all = [...stored, ...HOLIDAYS_2026];
      setEvent(all.find(e => String(e.id) === String(id)) ?? null);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!event || event.isHoliday) return;
    setCoverTier(eventDirectImageUrl(event) ? 'direct' : 'stock');
  }, [event?.id, event?.imageUrl, event?.hostImage, event?.isHoliday]);

  useEffect(() => {
    if (isWeb && event?.title) {
      navigation.setOptions({ title: event.title });
    }
  }, [event?.title, navigation]);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const handleDelete = () => {
    if (!event || event.isHoliday) return;
    promptRemoveEvent(event, () => {
      if (router.canGoBack()) router.back();
      else router.dismiss();
    });
  };

  const handleOpenMaps = () => {
    if (!event) return;
    openMapsFromCalEvent(event);
  };

  const openEventUrl = async () => {
    if (!event?.url?.trim()) return;
    try {
      await openExternalUrl(event.url);
    } catch {
      Alert.alert('Could not open link', 'Try copying it from registration email or your browser.');
    }
  };

  const registrationBtnLabel = (ev: CalEvent) => {
    const raw = ev.source?.trim().toLowerCase() ?? '';
    if (ev.url?.trim()) {
      if (raw.includes('handshake')) return 'RSVP / register on Handshake';
      if (raw.includes('eventbrite')) return 'Tickets on Eventbrite';
      if (raw.includes('meetup')) return 'Meetup listing';
      if (raw.includes('luma')) return 'Listing on Luma';
    }
    return `Register / view on ${ev.source?.trim() || 'web'}`;
  };

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Event not found.</Text>
      </View>
    );
  }

  const dateObj = new Date(event.date + 'T00:00:00');
  const formattedDate = `${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}, ${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
  const directUri = eventDirectImageUrl(event);
  const stockUri = getEventCoverUri(event) ?? '';
  const heroShowUri =
    coverTier === 'none' ? '' : coverTier === 'direct' && directUri ? directUri : stockUri;
  const letterThumb = !event.isHoliday && !heroShowUri ? entryLetterThumbnail(event.title) : null;
  const venueName = event.location?.trim() || event.city?.trim() || '';
  const cityLine = [event.city?.trim(), event.state?.trim()].filter(Boolean).join(', ');
  const showLocationCard = Boolean(venueName || cityLine);
  const shortDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeRange = `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`;
  const locationPill = venueName || cityLine;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <WebPage variant="detail" contentStyle={isWeb ? styles.webDetailPad : undefined}>
        {!event.isHoliday ? (
          <>
            <View style={[styles.imageContainer, isWeb && styles.imageContainerWeb]}>
              {heroShowUri ? (
                <Image
                  source={{ uri: heroShowUri }}
                  style={styles.coverImage}
                  contentFit="cover"
                  transition={220}
                  onError={() => {
                    if (coverTier === 'direct') setCoverTier('stock');
                    else setCoverTier('none');
                  }}
                />
              ) : letterThumb ? (
                <View style={[styles.coverImage, styles.coverLetter, { backgroundColor: letterThumb.bg }]}>
                  <Text style={styles.coverLetterText}>{letterThumb.letter}</Text>
                </View>
              ) : (
                <View style={[styles.coverImage, styles.coverLetter, { backgroundColor: Colors.surface }]} />
              )}
              {Platform.OS === 'web' ? (
                <View style={[styles.heroGradient, styles.heroGradientWeb]} pointerEvents="none" />
              ) : (
                <View style={styles.heroGradientNative} pointerEvents="none" />
              )}
              {!isWeb ? (
                <View style={styles.heroTextBlock}>
                  <Text style={styles.typeEyebrow}>{TYPE_LABEL[event.type] ?? 'Event'}</Text>
                  {event.club ? <Text style={styles.heroEyebrow}>{event.club}</Text> : null}
                  <Text style={styles.heroTitle}>{event.title}</Text>
                </View>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickPillsScroll}
              contentContainerStyle={styles.quickPillsContent}
            >
              <View style={styles.quickPill}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.quickPillText}>{shortDate}</Text>
              </View>
              <View style={styles.quickPill}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.quickPillText}>{timeRange}</Text>
              </View>
              {locationPill ? (
                <View style={styles.quickPill}>
                  <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.quickPillText} numberOfLines={1}>
                    {locationPill}
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            {isWeb ? (
              <View style={styles.webTitleBlock}>
                <Text style={styles.webTypeLabel}>{TYPE_LABEL[event.type] ?? 'Event'}</Text>
                <Text style={styles.webPageTitle}>{event.title}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.holidayHero}>
            <View style={styles.holidayHeroIcon}>
              <Ionicons name="sparkles" size={28} color={Colors.holiday} />
            </View>
            <Text style={styles.holidayHeroLabel}>Holiday</Text>
            <Text style={styles.holidayHeroTitle}>{event.title}</Text>
            <Text style={styles.holidayHeroDate}>{formattedDate}</Text>
          </View>
        )}

          <View style={styles.sheet}>
        {event.person?.trim() ? (
          <View style={[styles.personCard, isWeb && styles.webBlock]}>
            <Ionicons name="person-outline" size={20} color={Colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.personLabel}>Person / Contact</Text>
              <Text style={styles.personName}>{event.person.trim()}</Text>
            </View>
          </View>
        ) : null}

        {event.description ? (
          <View style={[styles.descBlock, isWeb && styles.webBlock]}>
            <Text style={styles.descLabel}>About</Text>
            <FormattedDescription text={event.description} />
          </View>
        ) : null}

        {showLocationCard ? (
          <TouchableOpacity style={[styles.locationCard, isWeb && styles.webBlockFlat]} onPress={handleOpenMaps} activeOpacity={0.85}>
            <View style={styles.locationCardLeft}>
              <Text style={styles.locationCardLabel}>VENUE</Text>
              <Text style={styles.locationCardName}>{venueName}</Text>
              {cityLine ? <Text style={styles.locationCardCity}>{cityLine}</Text> : null}
            </View>
            <View style={styles.locationCardRight}>
              <Ionicons name="navigate-outline" size={20} color={Colors.text} />
              <Text style={styles.locationCardOpen}>Open in Maps</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {event.url?.trim() ? (
          <TouchableOpacity style={styles.linkBtn} onPress={openEventUrl} activeOpacity={0.88}>
            <Ionicons name="open-outline" size={18} color={Colors.accentLight} />
            <Text style={styles.linkBtnText}>{registrationBtnLabel(event)}</Text>
          </TouchableOpacity>
        ) : null}

        {!event.isHoliday ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.deleteText}>Remove from calendar</Text>
          </TouchableOpacity>
        ) : null}
          </View>
      </WebPage>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 48 },
  notFound: { color: Colors.subtext, textAlign: 'center', marginTop: 48 },
  webDetailPad: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  webTitleBlock: {
    paddingTop: 20,
    paddingBottom: 4,
    gap: 6,
  },
  webTypeLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  webPageTitle: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },

  imageContainer: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  imageContainerWeb: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverLetter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLetterText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  heroGradientWeb: {
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 55%)',
  } as ViewStyle,
  heroGradientNative: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroTextBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    gap: 6,
    zIndex: 2,
  },
  typeEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  quickPillsScroll: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickPillsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 280,
  },
  quickPillText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  } as TextStyle,

  holidayHero: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  holidayHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  holidayHeroLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  holidayHeroTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  holidayHeroDate: { color: Colors.textMuted, fontSize: 15 },

  sheet: {
    paddingHorizontal: isWeb ? 0 : 20,
    paddingTop: isWeb ? 8 : 20,
    gap: isWeb ? 0 : 18,
  },
  webBlock: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 0,
    paddingVertical: 22,
    marginBottom: 0,
  },
  webBlockFlat: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 0,
    paddingVertical: 20,
    marginBottom: 0,
  },

  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personLabel: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  personName: { color: Colors.text, fontSize: 17, fontWeight: '700' },

  locationCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  locationCardLeft: { flex: 1, gap: 3 },
  locationCardLabel: {
    color: Colors.subtext,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationCardName: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  locationCardCity: { color: Colors.subtext, fontSize: 13 },
  locationCardRight: { alignItems: 'center', gap: 4 },
  locationCardOpen: { color: Colors.subtext, fontSize: 10 },

  descBlock: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  descLabel: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  linkBtnText: { color: Colors.accentLight, fontSize: 15, fontWeight: '700' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginTop: 8,
  },
  deleteText: { color: Colors.textMuted, fontSize: 15, fontWeight: '700' },
});
