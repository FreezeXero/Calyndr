import type { CalEvent } from '@/types';
import { eventCreatedAt } from '@/lib/storage';

export type UpcomingSortMode = 'eventDate' | 'dateAdded' | 'favorites';

function byEventDate(a: CalEvent, b: CalEvent) {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

export function sortUpcomingEvents(events: CalEvent[], mode: UpcomingSortMode): CalEvent[] {
  const list = events.filter(e => !e.isHoliday);
  if (mode === 'dateAdded') {
    return [...list].sort((a, b) => eventCreatedAt(b) - eventCreatedAt(a));
  }
  if (mode === 'favorites') {
    return [...list].sort((a, b) => {
      const fav = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
      if (fav !== 0) return fav;
      return byEventDate(a, b);
    });
  }
  return [...list].sort(byEventDate);
}
