export type EntryType = 'event' | 'reminder' | 'appointment';

export interface CalEvent {
  id: string;
  type: EntryType;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  club?: string;
  /** Open Graph or scraped page cover image */
  imageUrl?: string;
  hostImage?: string;
  description?: string;
  url?: string;
  source?: string;
  /** For appointments */
  person?: string;
  isHoliday?: boolean;
}
