import { getNexaSystemPrompt } from '@/lib/nexaPrompt';

function stripHtml(html: string, maxChars: number): string {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]{1,800}>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}\n...[truncated]`;
}

function extractAnthropicAssistantText(data: unknown): string | null {
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

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Anthropic API key not configured.' }, { status: 501 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const urlRaw = (body as { url?: unknown })?.url;
  if (typeof urlRaw !== 'string' || !urlRaw.trim()) {
    return Response.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlRaw.trim());
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return Response.json({ error: 'Only HTTP(S) URLs' }, { status: 400 });
  }

  const controller = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(16000)
    : undefined;

  let pageRes: Response;
  try {
    pageRes = await fetch(parsedUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CalyndrImporter/1.0; calendar event extraction)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
      },
      redirect: 'follow',
      ...(controller ? { signal: controller } : {}),
    });
  } catch {
    return Response.json({ error: 'Could not download that page.' }, { status: 502 });
  }

  if (!pageRes.ok) {
    return Response.json({ error: `Page returned HTTP ${pageRes.status}` }, { status: 502 });
  }

  let html = await pageRes.text();
  html = stripHtml(html, 14000);
  if (html.length < 40) {
    return Response.json({ error: 'Not enough readable text on the page (might require login).' }, { status: 422 });
  }

  const userBlock = [
    `The user wants to import this listing URL into a calendar: ${parsedUrl.href}`,
    '',
    'Plain text extracted from the HTML (messy markup removed):',
    '',
    html,
  ].join('\n');

  const anthropicPayload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: getNexaSystemPrompt(),
    messages: [{ role: 'user', content: userBlock }],
  };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicPayload),
    });
    const data = await res.json().catch(() => null);
    const errMsg =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: { message?: string } }).error?.message === 'string'
        ? (data as { error: { message: string } }).error.message
        : undefined;
    const text = extractAnthropicAssistantText(data);
    if (!text?.trim()) {
      return Response.json(
        { error: errMsg ?? 'Could not analyze this page.' },
        { status: 502 }
      );
    }
    return Response.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed';
    return Response.json({ error: msg }, { status: 500 });
  }
}
