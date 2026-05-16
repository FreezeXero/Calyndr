import { Alert, Linking, Platform } from 'react-native';
import { CalEvent } from '@/types';

/**
 * Open maps: web uses Google in a new tab; native shows Apple / Google choices.
 * `location` is typically the venue; city/state are optional.
 */
export function openMaps(location: string, city?: string, state?: string): void {
  const parts = [location?.trim(), city?.trim(), state?.trim()].filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  );
  const plain = parts.join(', ') || 'Event';
  const query = encodeURIComponent(plain);

  if (Platform.OS === 'web') {
    const win = typeof globalThis !== 'undefined' ? (globalThis as unknown as { window?: Window }).window : undefined;
    win?.open(`https://maps.google.com/?q=${query}`, '_blank');
    return;
  }

  Alert.alert('Open in Maps', '', [
    { text: 'Apple Maps', onPress: () => void Linking.openURL(`maps://?q=${query}`).catch(() => {}) },
    { text: 'Google Maps', onPress: () => void Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {}) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/** Convenience for saved calendar events (uses venue or address + city/state). */
export function openMapsFromCalEvent(event: Pick<CalEvent, 'location' | 'address' | 'city' | 'state'>): void {
  const loc =
    (typeof event.location === 'string' && event.location.trim()) ||
    (typeof event.address === 'string' && event.address.trim()) ||
    '';
  openMaps(loc, typeof event.city === 'string' ? event.city : undefined, typeof event.state === 'string' ? event.state : undefined);
}
