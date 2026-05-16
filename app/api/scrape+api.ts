export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false });
  }

  const urlRaw = (body as { url?: unknown })?.url;
  if (typeof urlRaw !== 'string' || !urlRaw.trim()) {
    return Response.json({ ok: false });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlRaw.trim());
  } catch {
    return Response.json({ ok: false });
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return Response.json({ ok: false });
  }

  const url = parsedUrl.href;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });
    const html = await res.text();

    const jsonLdMatch = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
    );
    let jsonLd: unknown = null;
    if (jsonLdMatch) {
      try {
        jsonLd = JSON.parse(jsonLdMatch[1]);
      } catch {
        /* ignore invalid JSON-LD */
      }
    }

    const ogImage =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1] ||
      null;

    const ogDesc =
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      null;

    return Response.json({ ok: true, jsonLd, ogImage, ogDesc, html: html.slice(0, 5000) });
  } catch {
    try {
      const ml = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      const mlData = (await ml.json()) as { status?: string; data?: unknown };
      if (mlData.status === 'success' && mlData.data != null) {
        return Response.json({ ok: true, microlink: mlData.data });
      }
    } catch {
      /* Microlink fallback failed */
    }
    return Response.json({ ok: false });
  }
}
