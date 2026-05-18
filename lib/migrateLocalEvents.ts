import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalEvent } from '@/types';
import { normalizeStoredEvent, saveEvent } from '@/lib/storage';

const MIGRATED_KEY = 'calyndr_migrated';
export const LEGACY_EVENTS_KEY = 'calyndr_events';

/** One-time upload of AsyncStorage events after first sign-in. */
export async function migrateLocalEvents(_userId: string): Promise<void> {
  const migrated = await AsyncStorage.getItem(MIGRATED_KEY);
  if (migrated) return;

  const raw = await AsyncStorage.getItem(LEGACY_EVENTS_KEY);
  if (!raw) {
    await AsyncStorage.setItem(MIGRATED_KEY, 'true');
    return;
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (Array.isArray(parsed)) {
      for (const row of parsed) {
        const event = normalizeStoredEvent(row);
        if (event && !event.isHoliday) {
          await saveEvent(event);
        }
      }
    }
  } catch {
    /* ignore corrupt local cache */
  }

  await AsyncStorage.setItem(MIGRATED_KEY, 'true');
}
