import { Linking, Platform } from 'react-native';

/** Open HTTPS links in-browser (web) or system browser/app (native). */
export async function openExternalUrl(url: string): Promise<void> {
  const u = typeof url === 'string' ? url.trim() : '';
  if (!u) return;
  if (Platform.OS === 'web') {
    const win = typeof globalThis !== 'undefined' ? (globalThis as unknown as { window?: Window }).window : undefined;
    win?.open(u, '_blank');
    return;
  }
  try {
    await Linking.openURL(u);
  } catch {
    throw new Error('Cannot open URL');
  }}
