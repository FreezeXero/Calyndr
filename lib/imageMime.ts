/** Media types supported by Anthropic vision (base64 image blocks). */
export type AnthropicImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const SUPPORTED: AnthropicImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const EXT_MAP: Record<string, AnthropicImageMediaType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

function isSupportedMime(mime: string): mime is AnthropicImageMediaType {
  return (SUPPORTED as string[]).includes(mime.toLowerCase());
}

/** Guess MIME from asset URI / file name / optional picker hint. */
export function inferImageMediaType(uri: string, mimeHint?: string | null): AnthropicImageMediaType {
  if (mimeHint && isSupportedMime(mimeHint)) return mimeHint.toLowerCase() as AnthropicImageMediaType;

  const path = uri.split('?')[0].toLowerCase();
  const ext = path.includes('.') ? path.split('.').pop() : '';
  if (ext && EXT_MAP[ext]) return EXT_MAP[ext];

  return 'image/jpeg';
}

/** Strip `data:image/...;base64,` prefix if present; return raw base64 + optional MIME. */
export function normalizeBase64Image(base64: string): {
  data: string;
  mediaType?: AnthropicImageMediaType;
} {
  const trimmed = base64.trim();
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(trimmed);
  if (!match) return { data: trimmed };

  const mime = match[1].toLowerCase();
  return {
    data: match[2],
    ...(isSupportedMime(mime) ? { mediaType: mime as AnthropicImageMediaType } : {}),
  };
}

export function imageBlockFromBase64(
  base64: string,
  uri: string,
  mimeHint?: string | null,
): { type: 'image'; source: { type: 'base64'; media_type: AnthropicImageMediaType; data: string } } {
  const normalized = normalizeBase64Image(base64);
  const media_type =
    normalized.mediaType ?? inferImageMediaType(uri, mimeHint);
  return {
    type: 'image',
    source: { type: 'base64', media_type, data: normalized.data },
  };
}
