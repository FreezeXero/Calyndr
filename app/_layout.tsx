import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { Colors } from '@/constants/Colors';
import { requestPermissions } from '@/lib/notifications';
import { isWeb } from '@/constants/layout';
import { supabase } from '@/lib/supabase';
import { migrateLocalEvents } from '@/lib/migrateLocalEvents';
import { subscribeOAuthDeepLinks } from '@/lib/oauthCallback';
import AuthScreen from '@/app/auth/index';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void requestPermissions();
  }, []);

  useEffect(() => subscribeOAuthDeepLinks(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    void migrateLocalEvents(session.user.id);
  }, [session?.user?.id]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
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
