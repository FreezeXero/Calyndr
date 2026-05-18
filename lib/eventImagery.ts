import { CalEvent } from '@/types';

/** Curated urban / events imagery (Unsplash, stable CDN params) */
const COVER_POOL = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1540575467063-027a883dccb7?w=600&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&h=600&fit=crop&q=80',
];

const CITY_COVER: { match: RegExp; uri: string }[] = [
  {
    match: /seattle|capitol hill|south lake union|belltown/u,
    uri: 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=600&h=600&fit=crop&q=80',
  },
  {
    match: /bothell|uw bothell|uwb|founders hall|uwbb/u,
    uri: 'https://images.unsplash.com/photo-1564981797814-0097eedeb44e?w=600&h=600&fit=crop&q=80',
  },
  {
    match: /bellevue|redmond|microsoft|eastside/u,
    uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad4ab?w=600&h=600&fit=crop&q=80',
  },
  {
    match: /campus|university|college|hall|school/u,
    uri: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=600&fit=crop&q=80',
  },
  {
    match: /music|concert|dj|bar|club/u,
    uri: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=600&fit=crop&q=80',
  },
  {
    match: /food|dinner|brunch|cafe|restaurant/u,
    uri: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop&q=80',
  },
  {
    match: /hackathon|workshop|career\s*fair|\bfair\b|info\s*session|\bseminar\b|panel\b|networking\s*night|symposium\b|handshake/u,
    uri: 'https://images.unsplash.com/photo-1544531586-fde5298fcd40?w=600&h=600&fit=crop&q=80',
  },
];

function hashSeed(event: CalEvent): number {
  const s = `${event.id}:${event.title}:${event.city ?? ''}:${event.location ?? ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

/** Tint pairs for initials fallback [bg, ring] — grayscale only */
const AVATAR_TINTS: [string, string][] = [
  ['#1a1a1a', '#737373'],
  ['#222222', '#737373'],
  ['#181818', '#525252'],
  ['#202020', '#a3a3a3'],
  ['#141414', '#525252'],
];

export const ENTRY_LETTER_BG = ['#1a1a1a', '#222222', '#1c1c1c', '#181818', '#202020'] as const;

function hashTitleString(title: string): number {
  const s = title.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

/** 48×48-style letter tile: dark bg, white first letter */
export function entryLetterThumbnail(title: string): { bg: string; letter: string } {
  const letter = title.trim().length ? title.trim()[0].toUpperCase() : '?';
  const bg = ENTRY_LETTER_BG[hashTitleString(title) % ENTRY_LETTER_BG.length];
  return { bg, letter };
}

/** @deprecated use entryLetterThumbnail */
export function titleLetterThumbnail(title: string): { bg: string; letter: string } {
  return entryLetterThumbnail(title);
}
function isStoredEventImage(u: string): boolean {
  const t = u.trim();
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://')) return true;
  if (t.startsWith('data:image/')) return true;
  if (t.startsWith('/') && !t.startsWith('//')) return true;
  return false;
}

export function eventHasHostedImage(event: Pick<CalEvent, 'hostImage' | 'imageUrl'>): boolean {
  const i = event.imageUrl?.trim();
  const h = event.hostImage?.trim();
  return Boolean((i && isStoredEventImage(i)) || (h && isStoredEventImage(h)));
}

/** User upload, scraped og:image, or other explicit art (not city-based stock). */
export function eventDirectImageUrl(event: Pick<CalEvent, 'imageUrl' | 'hostImage'>): string {
  const i = event.imageUrl?.trim();
  if (i && isStoredEventImage(i)) return i;
  const h = event.hostImage?.trim();
  if (h && isStoredEventImage(h)) return h;
  return '';
}

export function getEventCoverUri(event: CalEvent): string | undefined {
  const direct = eventDirectImageUrl(event);
  if (direct) return direct;

  const hay = `${event.city ?? ''} ${event.location ?? ''} ${event.title ?? ''}`.toLowerCase();
  for (const { match, uri } of CITY_COVER) {
    if (match.test(hay)) return uri;
  }

  const idx = hashSeed(event) % COVER_POOL.length;
  return COVER_POOL[idx];
}

export function getAvatarTint(event: CalEvent): [string, string] {
  return AVATAR_TINTS[hashSeed(event) % AVATAR_TINTS.length];
}

export function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Home Discover carousel — city-aware thumbnails for stub rows */
export function getDiscoverThumbUri(e: { city: string; title: string; id: string }): string {
  const hay = `${e.city} ${e.title}`.toLowerCase();
  for (const { match, uri } of CITY_COVER) {
    if (match.test(hay)) return uri;
  }
  let h = 0;
  const s = `${e.id}:${e.title}:${e.city}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return COVER_POOL[Math.abs(h) % COVER_POOL.length];
}
