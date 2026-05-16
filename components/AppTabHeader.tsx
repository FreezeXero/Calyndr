import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import AppBrand from '@/components/AppBrand';

export function AppHeaderLeft() {
  return (
    <View style={styles.leftWrap}>
      <AppBrand size="compact" />
    </View>
  );
}

export function AppHeaderRight() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.rightWrap}>
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={() => setOpen(true)}
        accessibilityLabel="Account menu"
        hitSlop={8}
      >
        <Text style={styles.avatarLetter}>R</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.dropdown,
            Platform.OS === 'web'
              ? { bottom: 88, left: 16, right: undefined, top: undefined }
              : { top: insets.top + (Platform.OS === 'ios' ? 52 : 48), right: Math.max(insets.right, 8) },
          ]}
        >
          <TouchableOpacity style={styles.menuRow} onPress={() => setOpen(false)}>
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => setOpen(false)}>
            <Text style={styles.menuText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => setOpen(false)}>
            <Text style={styles.menuText}>Help</Text>
          </TouchableOpacity>
          <View style={[styles.menuRow, styles.menuRowDisabled]}>
            <Text style={styles.menuTextMuted}>Sign Out</Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  leftWrap: { marginLeft: 4 },

  rightWrap: { marginRight: 4 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: Colors.background, fontSize: 16, fontWeight: '700' },

  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  dropdown: {
    position: 'absolute',
    minWidth: 200,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingVertical: 6,
    zIndex: 10,
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(0,0,0,0.5)' },
      default: { elevation: 20 },
    }),
  },
  menuRow: { paddingVertical: 12, paddingHorizontal: 16 },
  menuRowDisabled: { opacity: 0.55 },
  menuText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  menuTextMuted: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  comingSoon: { color: Colors.subtext, fontSize: 11, marginTop: 4 },
});
