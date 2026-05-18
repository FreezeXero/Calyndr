import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/Colors';
import { primaryButton } from '@/constants/primaryButton';
import AppBrand from '@/components/AppBrand';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = () =>
    run(async () => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      if (!normalizedEmail || !normalizedPassword) {
        setError('Enter your email and password.');
        return;
      }

      if (mode === 'signUp') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: name.trim() ? { data: { full_name: name.trim() } } : undefined,
        });
        if (signUpError) {
          console.error('Sign up error:', signUpError.message);
          setError(signUpError.message);
          return;
        }
        if (signUpData.session) return;

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        });
        if (signInError) {
          console.error('Sign in error:', signInError.message);
          if (signInError.message.toLowerCase().includes('invalid')) {
            setError(
              'Account created. Confirm your email in Supabase (or disable email confirmation), then sign in.',
            );
          } else {
            setError(signInError.message);
          }
        } else if (!data.session) {
          setError('Account created. Check your email to confirm, then sign in.');
        }
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });
      if (signInError) {
        console.error('Sign in error:', signInError.message);
        setError(signInError.message);
      } else if (!data.session) {
        setError('Sign-in did not return a session. Try again or confirm your email.');
      }
    });

  const handleGoogleSignIn = async () => {
    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : Linking.createURL('/auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }
      if (!data?.url) return;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(data.url);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const rawCode = parsed.queryParams?.code;
        const authCode =
          typeof rawCode === 'string' ? rawCode : Array.isArray(rawCode) ? rawCode[0] : null;
        if (!authCode) {
          setError('No auth code returned from Google.');
          return;
        }
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (sessionError) {
          console.error(sessionError);
          setError(sessionError.message);
        }
      } else if (result.type === 'cancel') {
        setError('Google sign-in was cancelled.');
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    }
  };

  const handleGoogle = () => run(handleGoogleSignIn);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AppBrand size="sidebar" />
          <Text style={styles.subtitle}>Your personal calendar</Text>
        </View>

        <View style={styles.card}>
          {mode === 'signUp' ? (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors.subtext}
                autoCapitalize="words"
                editable={!busy}
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.subtext}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!busy}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.subtext}
            secureTextEntry
            autoComplete={mode === 'signUp' ? 'new-password' : 'password'}
            editable={!busy}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={() => void handleEmailAuth()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.primaryBtnText}>{mode === 'signUp' ? 'Sign Up' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setMode(m => (m === 'signIn' ? 'signUp' : 'signIn'));
              setError('');
            }}
            disabled={busy}
          >
            <Text style={styles.secondaryBtnText}>
              {mode === 'signIn' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, busy && styles.btnDisabled]}
            onPress={() => void handleGoogle()}
            disabled={busy}
          >
            <Ionicons name="logo-google" size={20} color={Colors.text} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', marginBottom: 36, gap: 12 },
  subtitle: { color: Colors.textMuted, fontSize: 16, fontWeight: '500' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    gap: 10,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: Colors.text,
  },
  error: { color: '#f87171', fontSize: 14, marginTop: 8, lineHeight: 20 },
  primaryBtn: {
    ...primaryButton,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.65 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.subtext, fontSize: 13, fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  googleBtnText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
});
