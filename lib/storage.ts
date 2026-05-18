import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { notifyEventsChanged } from '@/lib/eventsRefresh';
import { isValidDate, isValidTime, parseEventDateStrict, parseEventTimeHHMM } from '@/lib/eventFormat';
import { CalEvent, EntryType } from '@/types';

const LEGACY_KEY = 'calyndr_events';

export const generateId = () => {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
};

function isEntryType(v: unknown): v is EntryType {
  return v === 'event' || v === 'reminder' || v === 'appointment';
}

type EventRow = Record<string, unknown>;

/** Infer createdAt from legacy numeric string ids (Date.now()). */
export function eventCreatedAt(event: Pick<CalEvent, 'id' | 'createdAt'>): number {
  if (typeof event.createdAt === 'number' && !Number.isNaN(event.createdAt)) {
    return event.createdAt;
  }
  const n = Number(event.id);
  if (Number.isFinite(n) && n > 1_000_000_000_000) return n;
  return 0;
}

/** Migrate legacy stored rows to current CalEvent shape */
export function normalizeStoredEvent(raw: unknown): CalEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.date !== 'string') return null;
  const type: EntryType = isEntryType(r.type) ? r.type : 'event';
  return {
    id: r.id,
    type,
    title: r.title,
    date: r.date,
    startTime: typeof r.startTime === 'string' ? r.startTime : '09:00',
    endTime: typeof r.endTime === 'string' ? r.endTime : '10:00',
    location: typeof r.location === 'string' ? r.location : '',
    address: typeof r.address === 'string' ? r.address : undefined,
    city: typeof r.city === 'string' ? r.city : undefined,
    state: typeof r.state === 'string' ? r.state : undefined,
    club: typeof r.club === 'string' ? r.club : undefined,
    imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : undefined,
    hostImage: typeof r.hostImage === 'string' ? r.hostImage : undefined,
    description: typeof r.description === 'string' ? r.description : undefined,
    url: typeof r.url === 'string' ? r.url : undefined,
    source: typeof r.source === 'string' ? r.source : undefined,
    person: typeof r.person === 'string' ? r.person : undefined,
    isHoliday: r.isHoliday === true,
    createdAt:
      typeof r.createdAt === 'number'
        ? r.createdAt
        : (() => {
            const n = Number(r.id);
            return Number.isFinite(n) && n > 1_000_000_000_000 ? n : undefined;
          })(),
    favorite: r.favorite === true,
  };
}

/** Row shape for Supabase upsert — no timestamps; DB sets created_at/updated_at. */
const toDb = (e: CalEvent, userId: string) => ({
  id: String(e.id),
  user_id: userId,
  title: e.title,
  date: e.date,
  start_time: e.startTime,
  end_time: e.endTime,
  location: e.location || '',
  address: e.address || '',
  city: e.city || '',
  state: e.state || '',
  description: e.description || '',
  type: e.type || 'event',
  url: e.url || '',
  image_url: e.imageUrl || e.hostImage || '',
  host_image: e.hostImage || e.imageUrl || '',
  club: e.club || '',
  source: e.source || '',
  person: e.person || '',
  is_holiday: e.isHoliday || false,
  favorite: e.favorite || false,
});

const fromDb = (row: EventRow): CalEvent => ({
  id: String(row.id),
  title: String(row.title),
  date: String(row.date),
  startTime: String(row.start_time ?? '09:00'),
  endTime: String(row.end_time ?? '10:00'),
  location: typeof row.location === 'string' ? row.location : undefined,
  address: typeof row.address === 'string' ? row.address : undefined,
  city: typeof row.city === 'string' ? row.city : undefined,
  state: typeof row.state === 'string' ? row.state : undefined,
  club: typeof row.club === 'string' ? row.club : undefined,
  imageUrl: typeof row.image_url === 'string' ? row.image_url : undefined,
  hostImage: typeof row.host_image === 'string' ? row.host_image : undefined,
  description: typeof row.description === 'string' ? row.description : undefined,
  type: isEntryType(row.type) ? row.type : 'event',
  url: typeof row.url === 'string' ? row.url : undefined,
  source: typeof row.source === 'string' ? row.source : undefined,
  person: typeof row.person === 'string' ? row.person : undefined,
  isHoliday: row.is_holiday === true,
  createdAt:
    parseCreatedAt(row.created_at) ?? parseCreatedAt(row.updated_at),
  favorite: row.favorite === true,
});

function parseCreatedAt(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    if (/^\d{10,13}$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : undefined;
    }
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;
  }
  return undefined;
}

async function requireUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Fallback when Supabase is not configured (dev without env). */
async function getLegacyEvents(): Promise<CalEvent[]> {
  try {
    const data = await AsyncStorage.getItem(LEGACY_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredEvent).filter((e): e is CalEvent => e !== null);
  } catch {
    return [];
  }
}

export const getEvents = async (): Promise<CalEvent[]> => {
  const user = await requireUser();
  if (!user) {
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) return getLegacyEvents();
    return [];
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (error) {
    console.warn('getEvents:', error.message);
    return [];
  }
  return (data || []).map(fromDb);
};

export const saveEvent = async (event: CalEvent): Promise<void> => {
  const user = await requireUser();
  if (!user) {
    throw new Error('You must be signed in to save events.');
  }

  const date = parseEventDateStrict(String(event.date));
  const startTime = parseEventTimeHHMM(String(event.startTime));
  const endTime = parseEventTimeHHMM(String(event.endTime));

  if (!date || !isValidDate(date)) {
    console.error('Invalid date format:', event.date);
    return;
  }
  if (!startTime || !endTime || !isValidTime(startTime) || !isValidTime(endTime)) {
    console.error('Invalid time format:', event.startTime, event.endTime);
    return;
  }

  const row: CalEvent = {
    ...event,
    id: String(event.id),
    date,
    startTime,
    endTime,
  };

  const { error } = await supabase.from('events').upsert(toDb(row, user.id), { onConflict: 'id' });
  if (error) {
    let hint = '';
    if (error.code === '42P01') {
      hint = ' Run supabase/schema.sql in the Supabase SQL editor.';
    } else if (/column.*schema cache/i.test(error.message)) {
      hint = ' Run supabase/migrate-events-columns.sql in the Supabase SQL editor.';
    }
    throw new Error(`${error.message}${hint}`);
  }
  notifyEventsChanged();
};

export const setEventFavorite = async (id: string, favorite: boolean): Promise<boolean> => {
  const user = await requireUser();
  if (!user) return false;

  const { error } = await supabase
    .from('events')
    .update({ favorite })
    .eq('id', String(id))
    .eq('user_id', user.id);

  if (!error) notifyEventsChanged();
  return !error;
};

/** @returns true if an event with this id was removed */
export const deleteEvent = async (id: string): Promise<boolean> => {
  const user = await requireUser();
  if (!user) return false;

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', String(id))
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Could not delete event');
  }
  notifyEventsChanged();
  return true;
};
