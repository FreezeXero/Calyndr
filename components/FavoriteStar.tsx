import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type FavoriteStarProps = {
  active: boolean;
  onPress: () => void;
  size?: number;
};

export default function FavoriteStar({ active, onPress, size = 24 }: FavoriteStarProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={active ? 'Remove from favorites' : 'Add to favorites'}
      style={active ? styles.glowWrap : undefined}
    >
      <Ionicons
        name={active ? 'star' : 'star-outline'}
        size={size}
        color={active ? Colors.text : Colors.subtext}
        style={active ? styles.starActive : undefined}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.95)) drop-shadow(0 0 14px rgba(255,255,255,0.45))',
      } as object,
      default: {
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  starActive: Platform.select({
    web: {},
    default: {},
  }),
});
