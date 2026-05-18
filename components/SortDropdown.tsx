import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type SortOption<T extends string> = { key: T; label: string };

type SortDropdownProps<T extends string> = {
  value: T;
  options: SortOption<T>[];
  onChange: (key: T) => void;
  label?: string;
};

export default function SortDropdown<T extends string>({
  value,
  options,
  onChange,
  label = 'Sort by',
}: SortDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.key === value)?.label ?? options[0]?.label ?? '';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${current}`}
      >
        <Text style={styles.triggerText}>{current}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.menu} pointerEvents="box-none">
            <Text style={styles.menuTitle}>Sort by</Text>
            {options.map(opt => {
              const active = opt.key === value;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.menuItem, active && styles.menuItemActive]}
                  onPress={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{opt.label}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={Colors.text} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { color: Colors.subtext, fontSize: 13, fontWeight: '600' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 168,
  },
  triggerText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menu: {
    width: '100%',
    maxWidth: 320,
    zIndex: 2,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  menuTitle: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemActive: { backgroundColor: Colors.pillBg },
  menuItemText: { color: Colors.textMuted, fontSize: 16, fontWeight: '500', flex: 1 },
  menuItemTextActive: { color: Colors.text, fontWeight: '600' },
});
