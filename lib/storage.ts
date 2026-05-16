import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalEvent, EntryType } from '@/types';

const KEY = 'calyndr_events';

function isEntryType(v: unknown): v is EntryType {
  return v === 'event' || v === 'reminder' || v === 'appointment';
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
  };
}

export const getEvents = async (): Promise<CalEvent[]> => {
  try {
    const data = await AsyncStorage.getItem(KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredEvent).filter((e): e is CalEvent => e !== null);
  } catch {
    return [];
  }
};

export const saveEvent = async (event: CalEvent): Promise<void> => {
  const events = await getEvents();
  events.push(event);
  await AsyncStorage.setItem(KEY, JSON.stringify(events));
};

/** @returns true if an event with this id was removed */
export const deleteEvent = async (id: string): Promise<boolean> => {
  try {
    const target = String(id);
    const events = await getEvents();
    const filtered = events.filter(e => String(e.id) !== target);
    if (filtered.length === events.length) return false;
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
    return true;
  } catch {
    throw new Error('Could not delete event');
  }
};
