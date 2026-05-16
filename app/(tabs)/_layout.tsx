import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { AppHeaderLeft, AppHeaderRight } from '@/components/AppTabHeader';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.subtext,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitle: '',
        headerLeft: () => <AppHeaderLeft />,
        headerRight: () => <AppHeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Upcoming',
          tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nexa"
        options={{
          title: 'Nexa',
          tabBarIcon: ({ color }) => <Ionicons name="sparkles-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
