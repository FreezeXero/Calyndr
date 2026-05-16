import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

const reminderIdentifier = (eventId: string) => `calyndr-reminder-${eventId}`;

export const scheduleEventReminder = async (event: {
  id: string;
  title: string;
  date: string;
  startTime: string;
}): Promise<void> => {
  if (Platform.OS === 'web') return;
  const [year, month, day] = event.date.split('-').map(Number);
  const [hour, minute] = event.startTime.split(':').map(Number);
  const eventDate = new Date(year, month - 1, day, hour, minute);
  const reminderDate = new Date(eventDate.getTime() - 30 * 60 * 1000);
  if (reminderDate <= new Date()) return;

  const id = reminderIdentifier(event.id);
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* ignore */
  }

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: event.title, body: 'Starting in 30 minutes' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
};

export const cancelReminder = async (id: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(id));
  } catch {
    /* ignore */
  }
};
