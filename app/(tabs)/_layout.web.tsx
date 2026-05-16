import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Colors } from '@/constants/Colors';
import AppBrand from '@/components/AppBrand';
import { AppHeaderRight } from '@/components/AppTabHeader';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const NAV: { href: string; label: string; icon: IoniconName }[] = [
  { href: '/', label: 'Calendar', icon: 'calendar-outline' },
  { href: '/upcoming', label: 'Upcoming', icon: 'time-outline' },
  { href: '/nexa', label: 'Nexa', icon: 'sparkles-outline' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname === '/index' || pathname === '';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function WebTabLayout() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.shell}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarBrand}>
          <AppBrand size="sidebar" />
        </View>

        <View style={styles.nav}>
          {NAV.map(item => {
            const active = isActive(pathname, item.href);
            return (
              <Pressable
                key={item.href}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => router.push(item.href as never)}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? Colors.text : Colors.subtext}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sidebarFooter}>
          <AppHeaderRight />
        </View>
      </View>

      <View style={styles.main}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
    minHeight: '100%',
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  sidebarBrand: {
    paddingHorizontal: 4,
    marginBottom: 28,
  },
  nav: {
    flex: 1,
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navLabel: {
    color: Colors.subtext,
    fontSize: 15,
    fontWeight: '600',
  },
  navLabelActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  sidebarFooter: {
    alignItems: 'flex-start',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  main: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.background,
  },
});
