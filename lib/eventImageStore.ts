import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  normalizeBase64Image,
  inferImageMediaType,
  type AnthropicImageMediaType,
} from '@/lib/imageMime';

const EVENT_IMAGES_DIR = `${FileSystem.documentDirectory ?? ''}calyndr-event-images/`;

function extForMime(mime: AnthropicImageMediaType): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/** Persist user-uploaded art for an event; returns a URI expo-image can load. */
export async function saveEventImageFromBase64(
  eventId: string,
  base64: string,
  mediaType?: AnthropicImageMediaType,
  uriHint = '',
): Promise<string> {
  const normalized = normalizeBase64Image(base64);
  const mime = normalized.mediaType ?? mediaType ?? inferImageMediaType(uriHint);

  if (Platform.OS === 'web') {
    return `data:${mime};base64,${normalized.data}`;
  }

  if (!FileSystem.documentDirectory) {
    return `data:${mime};base64,${normalized.data}`;
  }

  try {
    await FileSystem.makeDirectoryAsync(EVENT_IMAGES_DIR, { intermediates: true });
  } catch {
    /* already exists */
  }

  const filePath = `${EVENT_IMAGES_DIR}${eventId}.${extForMime(mime)}`;
  await FileSystem.writeAsStringAsync(filePath, normalized.data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return filePath;
}
