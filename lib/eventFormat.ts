export const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
export const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t);

/** Reject Unix timestamps; accept only YYYY-MM-DD. */
export function parseEventDateStrict(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{10,13}$/.test(s)) return null;
  return isValidDate(s) ? s : null;
}

/** Normalize to HH:MM (e.g. "9:00" → "09:00"); reject invalid values. */
export function parseEventTimeHHMM(raw: string): string | null {
  const t = raw.trim();
  if (isValidTime(t)) return t;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
