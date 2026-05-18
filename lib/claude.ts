import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { CalEvent } from '@/types';
import { getEventCoverUri } from '@/lib/eventImagery';
import { getNexaSystemPrompt } from '@/lib/nexaPrompt';
import { isValidDate, isValidTime, parseEventDateStrict, parseEventTimeHHMM } from '@/lib/eventFormat';
import { generateId } from '@/lib/storage';

type AnthropicBody = {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: string; content: string | unknown[] }[];
};

export type NexaResult =
  | { kind: 'event'; event: CalEvent }
  | { kind: 'events'; events: CalEvent[] }
  | { kind: 'chat'; text: string }
  | { kind: 'error'; message: string };

import { imageBlockFromBase64, type AnthropicImageMediaType } from '@/lib/imageMime';

export type NexaImageBlock = {
  type: 'image';
  source: { type: 'base64'; media_type: AnthropicImageMediaType; data: string };
};

export type NexaTextBlock = { type: 'text'; text: string };

export type NexaUserContent = string | (NexaTextBlock | NexaImageBlock)[];

export type NexaApiMessage = {
  role: 'user' | 'assistant';
  content: NexaUserContent;
};

export type NexaChatResponse = {
  result: NexaResult;
  assistantText: string;
};

function extractAssistantText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const block of content) {
    if (
      block &&
      typeof block === 'object' &&
      (block as { type?: string }).type === 'text' &&
      typeof (block as { text?: unknown }).text === 'string'
    ) {
      parts.push((block as { text: string }).text);
    }
  }
  return parts.length ? parts.join('\n') : null;
}

function anthropicPayload(messages: AnthropicBody['messages']): AnthropicBody {
  return {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: getNexaSystemPrompt(),
    messages,
  };
}

function looksLikeApiFailure(data: unknown): boolean {
  return typeof data === 'object' && data !== null && 'error' in data;
}

export function nexaExtractError(data: unknown): string | undefined {
  if (!looksLikeApiFailure(data)) return undefined;
  const msg = (data as { error?: { message?: string } }).error?.message;
  return typeof msg === 'string' ? msg : 'Something went wrong';
}

type EventJsonPayload = {
  type?: unknown;
  title?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  location?: unknown;
  city?: unknown;
  state?: unknown;
  description?: unknown;
};

function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function eventFromJsonPayload(json: EventJsonPayload, id?: string): CalEvent | null {
  if (json.type !== 'event') return null;
  if (typeof json.title !== 'string') return null;
  if (json.date == null || (typeof json.date !== 'string' && typeof json.date !== 'number')) return null;

  const dateRaw = String(json.date).trim();
  if (dateRaw.toLowerCase() === 'unknown') return null;
  const date = parseEventDateStrict(dateRaw);
  if (!date) return null;

  const startTime =
    parseEventTimeHHMM(
      typeof json.startTime === 'string' || typeof json.startTime === 'number'
        ? String(json.startTime)
        : '12:00',
    ) ?? null;
  const endTime =
    parseEventTimeHHMM(
      typeof json.endTime === 'string' || typeof json.endTime === 'number'
        ? String(json.endTime)
        : '14:00',
    ) ?? null;
  if (!startTime || !endTime || !isValidTime(startTime) || !isValidTime(endTime)) return null;

  const eventId = id ?? generateId();
  const loc = typeof json.location === 'string' && json.location.trim() ? json.location.trim() : undefined;
  const city = typeof json.city === 'string' && json.city.trim() ? json.city.trim() : undefined;
  const state = typeof json.state === 'string' && json.state.trim() ? json.state.trim() : undefined;
  const desc = typeof json.description === 'string' && json.description.trim() ? json.description.trim() : undefined;
  const base: CalEvent = {
    id: eventId,
    type: 'event',
    title: json.title.trim(),
    date,
    startTime,
    endTime,
    isHoliday: false,
    ...(loc ? { location: loc } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(desc ? { description: desc } : {}),
  };
  const uri = getEventCoverUri(base);
  return uri ? { ...base, hostImage: uri } : base;
}

function tryParseEventPayload(clean: string): CalEvent | null {
  const t = clean.trim();
  const jsonSlice = extractFirstJsonObject(t);
  if (!jsonSlice) return null;
  try {
    const json = JSON.parse(jsonSlice) as EventJsonPayload;
    return eventFromJsonPayload(json);
  } catch {
    return null;
  }
}

function tryParseEventsPayload(clean: string): CalEvent[] | null {
  const jsonSlice = extractFirstJsonObject(clean.trim());
  if (!jsonSlice) return null;
  try {
    const json = JSON.parse(jsonSlice) as { type?: unknown; events?: unknown };
    if (json.type !== 'events' || !Array.isArray(json.events)) return null;
    const events: CalEvent[] = [];
    for (const item of json.events) {
      if (!item || typeof item !== 'object') continue;
      const ev = eventFromJsonPayload(item as EventJsonPayload, generateId());
      if (ev) events.push(ev);
    }
    return events.length ? events : null;
  } catch {
    return null;
  }
}

/** Raw assistant reply → structured result for Nexa UI */
export function parseNexaReply(text: string): NexaResult {
  const clean = text.replace(/```json|```/g, '').trim();
  const events = tryParseEventsPayload(clean);
  if (events) return { kind: 'events', events };
  const event = tryParseEventPayload(clean);
  if (event) return { kind: 'event', event };
  if (clean.length) return { kind: 'chat', text: clean };
  return { kind: 'error', message: 'Empty response — try again.' };
}

async function callAPI(messages: AnthropicBody['messages']): Promise<unknown> {
  const body = anthropicPayload(messages);

  if (Platform.OS === 'web') {
    const res = await fetch('/api/nexa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({ error: { message: 'Invalid JSON from server' } }));
  }

  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!key || key === 'your_key_here') {
    return { error: { message: 'Missing EXPO_PUBLIC_ANTHROPIC_API_KEY' } };
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ error: { message: 'Invalid response' } }));
}

async function nexaRespond(data: unknown): Promise<NexaResult> {
  const errMsg = nexaExtractError(data);
  if (errMsg) return { kind: 'error', message: errMsg };
  const raw = extractAssistantText(data);
  const text = raw ?? '';
  if (!text.trim()) return { kind: 'error', message: 'No reply from Nexa.' };
  return parseNexaReply(text);
}

/** Origin for /api/* routes: web is same-origin; native uses EXPO_PUBLIC_API_ORIGIN or Metro hostUri */
function apiSiteOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_ORIGIN?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const h = Constants.expoConfig?.hostUri;
  if (h?.startsWith('http')) return h.replace(/\/$/, '');
  if (h && Platform.OS !== 'web') return `http://${h.replace(/\/$/, '')}`;
  return '';
}

function pickMicrolinkAssetUrl(asset: unknown): string | undefined {
  if (
    typeof asset !== 'object' ||
    asset === null ||
    typeof (asset as { url?: unknown }).url !== 'string'
  )
    return undefined;
  const u = (asset as { url: string }).url.trim();
  return u.startsWith('http') ? u : undefined;
}

function resolveHttpImage(image: unknown, ogImage: string | null | undefined): string | undefined {
  if (typeof image === 'string' && image.startsWith('http')) return image;
  if (Array.isArray(image)) {
    for (const item of image) {
      const u = resolveHttpImage(item, null);
      if (u) return u;
    }
  }
  if (image && typeof image === 'object' && typeof (image as { url?: unknown }).url === 'string') {
    const u = (image as { url: string }).url.trim();
    if (u.startsWith('http')) return u;
  }
  if (ogImage && ogImage.startsWith('http')) return ogImage;
  return undefined;
}

function collectJsonLdNodes(jsonLd: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const o = value as Record<string, unknown>;
    nodes.push(o);
    if (Array.isArray(o['@graph'])) {
      for (const item of o['@graph']) visit(item);
    }
  };
  if (Array.isArray(jsonLd)) {
    for (const item of jsonLd) visit(item);
  } else {
    visit(jsonLd);
  }
  return nodes;
}

function findEventJsonLd(jsonLd: unknown): Record<string, unknown> | null {
  const nodes = collectJsonLdNodes(jsonLd);
  for (const ld of nodes) {
    const type = ld['@type'];
    const types = Array.isArray(type) ? type : type != null ? [type] : [];
    const isEvent = types.some(t => typeof t === 'string' && /Event/i.test(t));
    if (isEvent && ld.startDate) return ld;
  }
  return nodes.find(ld => ld.startDate != null) ?? null;
}

function jsonLdLocation(ld: Record<string, unknown>): {
  location?: string;
  city?: string;
  state?: string;
} {
  const loc = ld.location;
  if (typeof loc === 'string' && loc.trim()) return { location: loc.trim() };
  if (!loc || typeof loc !== 'object') return {};
  const l = loc as Record<string, unknown>;
  const name = typeof l.name === 'string' ? l.name.trim() : '';
  const addr = l.address;
  if (addr && typeof addr === 'object') {
    const a = addr as Record<string, unknown>;
    const street = typeof a.streetAddress === 'string' ? a.streetAddress.trim() : '';
    return {
      location: name || street || undefined,
      city: typeof a.addressLocality === 'string' ? a.addressLocality.trim() : undefined,
      state: typeof a.addressRegion === 'string' ? a.addressRegion.trim() : undefined,
    };
  }
  return name ? { location: name } : {};
}

function eventFromJsonLd(
  ld: Record<string, unknown>,
  pageUrl: string,
  ogImage: string | null | undefined,
  ogDesc: string | null | undefined
): (CalEvent & { imageUrl?: string }) | null {
  const startRaw = ld.startDate;
  if (typeof startRaw !== 'string' && typeof startRaw !== 'number') return null;
  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) return null;

  const endRaw = ld.endDate;
  const end =
    endRaw != null && !Number.isNaN(new Date(endRaw as string | number).getTime())
      ? new Date(endRaw as string | number)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const imageUrl = resolveHttpImage(ld.image, ogImage);
  const locFields = jsonLdLocation(ld);
  const desc =
    (typeof ld.description === 'string' ? ld.description : '') ||
    (ogDesc ?? '') ||
    '';

  let source = new URL(pageUrl).hostname.replace(/^www\./, '');
  if (/joinhandshake\.com|\.handshake/u.test(new URL(pageUrl).hostname)) {
    source = 'Handshake';
  }

  const out: CalEvent & { imageUrl?: string } = {
    id: generateId(),
    type: 'event',
    title: typeof ld.name === 'string' ? ld.name.trim() : '',
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    isHoliday: false,
    url: pageUrl,
    source,
    ...(desc ? { description: desc } : {}),
    ...locFields,
    ...(imageUrl ? { imageUrl, hostImage: imageUrl } : {}),
  };

  if (!out.title) return null;
  if (!isValidDate(out.date) || !isValidTime(out.startTime) || !isValidTime(out.endTime)) return null;
  return out;
}

function sourceFromUrl(pageUrl: string): string {
  let source = new URL(pageUrl).hostname.replace(/^www\./, '');
  if (/joinhandshake\.com|\.handshake/u.test(new URL(pageUrl).hostname)) {
    source = 'Handshake';
  }
  return source;
}

/** Scrape via `/api/scrape` (JSON-LD first, then Claude + Microlink fallback). */
export async function parseEventFromUrl(url: string): Promise<(CalEvent & { imageUrl?: string }) | null> {
  let validated: URL;
  try {
    validated = new URL(url.trim());
  } catch {
    return null;
  }
  if (validated.protocol !== 'http:' && validated.protocol !== 'https:') {
    return null;
  }

  const origin = Platform.OS === 'web' ? '' : apiSiteOrigin();
  if (Platform.OS !== 'web' && !origin) {
    return null;
  }

  const scrapeUrl = Platform.OS === 'web' ? '/api/scrape' : `${origin}/api/scrape`;

  try {
    const scrapeRes = await fetch(scrapeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: validated.href }),
    });
    const result = (await scrapeRes.json().catch(() => null)) as {
      ok?: unknown;
      jsonLd?: unknown;
      ogImage?: string | null;
      ogDesc?: string | null;
      microlink?: Record<string, unknown>;
    } | null;

    if (!result?.ok) return null;

    if (result.jsonLd) {
      const ld = findEventJsonLd(result.jsonLd);
      if (ld) {
        const fromLd = eventFromJsonLd(ld, validated.href, result.ogImage, result.ogDesc);
        if (fromLd) return fromLd;
      }
    }

    const mlData = result.microlink;
    const imageUrl =
      pickMicrolinkAssetUrl(mlData?.image) ??
      pickMicrolinkAssetUrl(mlData?.logo) ??
      (result.ogImage?.startsWith('http') ? result.ogImage : undefined);

    const mlTitle = typeof mlData?.title === 'string' ? mlData.title : '';
    const mlDesc =
      (typeof mlData?.description === 'string' ? mlData.description : '') ||
      (result.ogDesc ?? '');

    const content = `
Event URL: ${validated.href}
Title: ${mlTitle}
Full Description: ${mlDesc}

DO NOT guess the date. Only extract the date if it is explicitly stated in the title or description text. If you cannot find a clear date, set date to "unknown".

Extract all event details. For the description field in your JSON response, include the COMPLETE full description text exactly as provided above — do not summarize, shorten, or truncate it. Include every sentence.
`.trim();

    const apiData = await callAPI([{ role: 'user', content }]);
    const parsed = await nexaRespond(apiData);
    if (parsed.kind !== 'event') return null;

    const ev = parsed.event;
    return {
      ...ev,
      type: 'event',
      url: validated.href,
      source: sourceFromUrl(validated.href),
      ...(imageUrl ? { imageUrl, hostImage: imageUrl } : {}),
    };
  } catch (e) {
    console.error('parseEventFromUrl error:', e);
    return null;
  }
}

/**
 * Validates URL and parses via scrape API (JSON-LD / Microlink + Claude).
 */
export async function sendNexaEventFromUrl(pageUrl: string): Promise<NexaResult> {
  let validated: URL;
  try {
    validated = new URL(pageUrl.trim());
  } catch {
    return { kind: 'error', message: 'That link doesn’t look valid.' };
  }
  if (validated.protocol !== 'http:' && validated.protocol !== 'https:') {
    return { kind: 'error', message: 'Only http(s) links are supported.' };
  }

  if (Platform.OS !== 'web' && !apiSiteOrigin()) {
    return {
      kind: 'error',
      message:
        'Link import needs EXPO_PUBLIC_API_ORIGIN (your computer’s IP + port, e.g. http://192.168.1.5:8081) when testing on a phone—or use Calyndr on web.',
    };
  }

  const parsed = await parseEventFromUrl(validated.href);
  if (!parsed) {
    return {
      kind: 'error',
      message: "Couldn't read that page — it might require a login. Try pasting the event details instead.",
    };
  }
  return { kind: 'event', event: parsed };
}

const MAX_HISTORY_MESSAGES = 24;

/** Send full conversation (user + assistant turns) to Nexa. */
export async function sendNexaChat(history: NexaApiMessage[]): Promise<NexaChatResponse> {
  const trimmed =
    history.length > MAX_HISTORY_MESSAGES ? history.slice(-MAX_HISTORY_MESSAGES) : history;
  try {
    const data = await callAPI(trimmed);
    const result = await nexaRespond(data);
    const assistantText = extractAssistantText(data)?.trim() ?? '';
    if (result.kind === 'chat' && !assistantText) {
      return { result, assistantText: result.text };
    }
    return { result, assistantText: assistantText || (result.kind === 'chat' ? result.text : '') };
  } catch {
    return { result: { kind: 'error', message: 'Network error.' }, assistantText: '' };
  }
}

export async function sendNexaTextMessage(userText: string): Promise<NexaResult> {
  const { result } = await sendNexaChat([{ role: 'user', content: userText }]);
  return result;
}

export async function sendNexaImageMessage(
  base64: string,
  prompt?: string,
  mediaType?: AnthropicImageMediaType,
): Promise<NexaResult> {
  const textPrompt =
    typeof prompt === 'string' && prompt.trim()
      ? prompt.trim()
      : 'What events do you see in this image? List each with title, date, and time. Ask before adding to the calendar.';
  const { result } = await sendNexaChat([
    {
      role: 'user',
      content: [
        imageBlockFromBase64(base64, '', mediaType),
        { type: 'text', text: textPrompt },
      ],
    },
  ]);
  return result;
}

/** @deprecated Prefer sendNexaTextMessage — returns calendar event only when model emits event JSON */
export const parseEventFromText = async (text: string): Promise<CalEvent | null> => {
  const r = await sendNexaTextMessage(text);
  return r.kind === 'event' ? r.event : null;
};

/** @deprecated Prefer sendNexaImageMessage */
export const parseEventFromImage = async (base64: string): Promise<CalEvent | null> => {
  const r = await sendNexaImageMessage(base64);
  return r.kind === 'event' ? r.event : null;
};
