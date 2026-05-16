import { Alert, Platform } from 'react-native';
import { CalEvent } from '@/types';
import { deleteEvent } from '@/lib/storage';
import { cancelReminder } from '@/lib/notifications';

function confirmRemove(title: string, message: string, onConfirm: () => void | Promise<void>) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      void onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => void onConfirm() },
  ]);
}

function showRemoved() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert('Successfully removed');
    return;
  }
  Alert.alert('Removed', 'Successfully removed');
}

function showError(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
    return;
  }
  Alert.alert('Error', message);
}

/** Delete from storage, cancel notification, show feedback. Returns true if an event was removed. */
export async function removeCalendarEvent(event: CalEvent): Promise<boolean> {
  await cancelReminder(String(event.id));
  const removed = await deleteEvent(String(event.id));
  return removed;
}

/** Confirm → remove → success callback (e.g. refresh list or go back). */
export function promptRemoveEvent(event: CalEvent, onSuccess?: () => void) {
  if (event.isHoliday) return;

  confirmRemove('Remove event', `Remove "${event.title}" from your calendar?`, async () => {
    try {
      const removed = await removeCalendarEvent(event);
      if (!removed) {
        showError('Could not find this event to remove.');
        return;
      }
      onSuccess?.();
      showRemoved();
    } catch {
      showError('Could not remove this event. Try again.');
    }
  });
}
