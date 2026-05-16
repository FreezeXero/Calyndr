/** First plausible http(s) URL in free text */
export function extractPrimaryUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!m?.[0]) return null;
  try {
    const url = new URL(m[0].replace(/[),.;]+$/, ''));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}
