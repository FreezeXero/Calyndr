import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

/** True when the URL is our OAuth return (Expo Go, dev client, or custom scheme). */
export function isOAuthCallbackUrl(url: string): boolean {
  return /auth\/callback/i.test(url) || /[?&#]code=/i.test(url);
}

function parseAuthCodeFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;
    if (typeof code === 'string') return code;
    if (Array.isArray(code) && code[0]) return String(code[0]);
  } catch {
    /* fall through */
  }
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const code = new URLSearchParams(q).get('code');
  return code;
}

/** Exchange PKCE code from redirect URL and persist session. */
export async function handleOAuthCallbackUrl(url: string): Promise<boolean> {
  if (!isOAuthCallbackUrl(url)) return false;
  const code = parseAuthCodeFromUrl(url);
  if (!code) {
    console.warn('OAuth callback: no code in URL');
    return false;
  }
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn('OAuth callback:', error.message);
    return false;
  }
  return Boolean(data.session);
}

/** Listen for deep links while logged out (callback route may not be mounted). */
export function subscribeOAuthDeepLinks(): () => void {
  const onUrl = (url: string | null) => {
    if (url) void handleOAuthCallbackUrl(url);
  };

  void Linking.getInitialURL().then(onUrl);
  const sub = Linking.addEventListener('url', ({ url }) => onUrl(url));
  return () => sub.remove();
}
