import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type AppBrandProps = {
  size?: 'compact' | 'sidebar';
};

export default function AppBrand({ size = 'compact' }: AppBrandProps) {
  const large = size === 'sidebar';
  const iconSize = large ? 22 : 18;

  return (
    <View style={styles.lockup}>
      <View style={[styles.mark, large && styles.markLarge]}>
        <Ionicons name="calendar" size={iconSize} color={Colors.background} />
      </View>
      <View style={styles.wordmark}>
        <Text style={[styles.brand, large && styles.brandLarge]}>Calyndr</Text>
        {large ? <Text style={styles.tagline}>Your calendar</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  markLarge: {
    width: 42,
    height: 42,
    borderRadius: 11,
  },
  wordmark: {
    gap: 2,
  },
  brand: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  brandLarge: {
    fontSize: 23,
    letterSpacing: -0.7,
  },
  tagline: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
