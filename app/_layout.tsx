import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { requestPermissions } from '@/lib/notifications';
import { isWeb } from '@/constants/layout';

export default function RootLayout() {
  useEffect(() => {
    void requestPermissions();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="event/[id]"
          options={{
            title: 'Event',
            presentation: isWeb ? 'card' : 'modal',
            headerShown: isWeb,
            headerBackTitle: Platform.OS === 'ios' ? 'Back' : undefined,
          }}
        />
        <Stack.Screen
          name="new-event"
          options={{
            title: 'New Event',
            presentation: isWeb ? 'card' : 'modal',
            headerShown: isWeb,
          }}
        />
      </Stack>
    </>
  );
}
