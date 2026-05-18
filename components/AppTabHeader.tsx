import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  TextInput,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import AppBrand from '@/components/AppBrand';
import { supabase } from '@/lib/supabase';
import { isWeb } from '@/constants/layout';

type MenuView = 'main' | 'settings' | 'help';

function userDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): { full: string; initial: string } {
  const full =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
    user.email ||
    '';
  const first = full.includes('@') ? full.split('@')[0] : full.split(' ')[0] || '';
  const initial = (first[0] || '?').toUpperCase();
  return { full, initial };
}

export function AppHeaderLeft() {
  return (
    <View style={[styles.leftWrap, !isWeb && styles.leftWrapMobile]}>
      <AppBrand size="compact" />
    </View>
  );
}

export function AppHeaderRight() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>('main');
  const [displayName, setDisplayName] = useState('');
  const [avatarInitial, setAvatarInitial] = useState('?');
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { full, initial } = userDisplayName(user);
    setDisplayName(full);
    setAvatarInitial(initial);
    setNameDraft(full.includes('@') ? '' : full);
  };

  useEffect(() => {
    void loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });
    return () => subscription.unsubscribe();
  }, []);

  const closeMenu = () => {
    setOpen(false);
    setMenuView('main');
  };

  const openChangeName = () => {
    setNameDraft(displayName.includes('@') ? '' : displayName);
    setNameModalOpen(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    setSavingName(false);
    if (error) {
      Alert.alert('Could not update name', error.message);
      return;
    }
    setDisplayName(trimmed);
    setAvatarInitial(trimmed[0]?.toUpperCase() ?? '?');
    setNameModalOpen(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete account',
              'Contact support to delete your account: support@calyndr.app',
            );
          },
        },
      ],
    );
  };

  const dropdownPosition = Platform.OS === 'web'
    ? { bottom: 88, left: 16, right: undefined, top: undefined }
    : { top: insets.top + (Platform.OS === 'ios' ? 52 : 48), right: Math.max(insets.right, 8) };

  return (
    <View style={[styles.rightWrap, !isWeb && styles.rightWrapMobile]}>
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={() => setOpen(true)}
        accessibilityLabel="Account menu"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.avatarLetter}>{avatarInitial}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuBackdrop} onPress={closeMenu} />
        <View style={[styles.dropdown, dropdownPosition]}>
          {menuView === 'main' ? (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setMenuView('settings')}
              >
                <Text style={styles.menuText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuRow} onPress={() => setMenuView('help')}>
                <Text style={styles.menuText}>Help</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  closeMenu();
                  void supabase.auth.signOut();
                }}
              >
                <Text style={styles.menuText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {menuView === 'settings' ? (
            <ScrollView style={styles.panelScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.backRow} onPress={() => setMenuView('main')}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.panelTitle}>Settings</Text>

              <TouchableOpacity style={styles.menuRow} onPress={openChangeName}>
                <Text style={styles.menuText}>Change Name</Text>
                {displayName && !displayName.includes('@') ? (
                  <Text style={styles.menuSub}>{displayName}</Text>
                ) : null}
              </TouchableOpacity>

              <View style={[styles.menuRow, styles.rowBetween]}>
                <View style={styles.rowBody}>
                  <Text style={styles.menuText}>Notifications</Text>
                  <Text style={styles.menuSub}>Coming soon</Text>
                </View>
                <Switch value={false} disabled />
              </View>

              <View style={styles.menuRow}>
                <Text style={styles.menuText}>About Calyndr</Text>
                <Text style={styles.menuSub}>Version 1.0.0</Text>
                <Text style={styles.menuSub}>Your personal calendar, powered by Nexa.</Text>
              </View>

              <TouchableOpacity style={styles.menuRow} onPress={handleDeleteAccount}>
                <Text style={[styles.menuText, styles.dangerText]}>Delete Account</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}

          {menuView === 'help' ? (
            <ScrollView style={styles.panelScroll}>
              <TouchableOpacity style={styles.backRow} onPress={() => setMenuView('main')}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.panelTitle}>Help</Text>
              <Text style={styles.helpLine}>Add events by pasting a URL or describing it to Nexa</Text>
              <Text style={styles.helpLine}>Tap any event to see full details</Text>
              <Text style={styles.helpLine}>Long press an event to delete it</Text>
              <Text style={styles.helpLine}>Sign out from Settings</Text>
              <Text style={styles.helpContact}>support@calyndr.app</Text>
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={nameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setNameModalOpen(false)} />
        <View style={styles.nameModal}>
          <Text style={styles.panelTitle}>Change Name</Text>
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Your name"
            placeholderTextColor={Colors.subtext}
            autoCapitalize="words"
            autoFocus
          />
          <View style={styles.nameActions}>
            <TouchableOpacity
              style={styles.nameBtnSecondary}
              onPress={() => setNameModalOpen(false)}
            >
              <Text style={styles.nameBtnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nameBtnPrimary, savingName && styles.btnDisabled]}
              onPress={() => void saveName()}
              disabled={savingName}
            >
              <Text style={styles.nameBtnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  leftWrap: { marginLeft: 4 },
  leftWrapMobile: { marginLeft: 12 },

  rightWrap: { marginRight: 4 },
  rightWrapMobile: { marginRight: 12 },

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
    minWidth: 260,
    maxWidth: 320,
    maxHeight: '70%',
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
  panelScroll: { maxHeight: 400 },
  panelTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  backRow: { paddingVertical: 10, paddingHorizontal: 16 },
  backText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  menuRow: { paddingVertical: 12, paddingHorizontal: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBody: { flex: 1, paddingRight: 8 },
  menuText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  menuSub: { color: Colors.subtext, fontSize: 13, marginTop: 4, lineHeight: 18 },
  dangerText: { color: '#f87171' },
  helpLine: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  helpContact: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  nameModal: {
    alignSelf: 'center',
    marginTop: 120,
    width: '88%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: 20,
    zIndex: 20,
  },
  nameInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  nameActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  nameBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nameBtnSecondaryText: { color: Colors.textMuted, fontWeight: '600' },
  nameBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Colors.text,
  },
  nameBtnPrimaryText: { color: Colors.background, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
