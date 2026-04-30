import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Alert,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { colors, text } from '../theme';

const NAME_RE = /^[\p{L}\s'\-.]{2,60}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AU_PHONE_RE = /^(\+?61|0)(4\d{8}|[2378]\d{8})$/;
const PASS_RULES = [
  { label: '8+ chars', test: (p) => p.length >= 8 },
  { label: 'A letter', test: (p) => /[A-Za-z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
];

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  // Step 1 form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2 OTP state
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [pending, setPending] = useState(null); // { pending_id, target, channel, dev_mode }
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const codeRef = useRef(null);

  const passOk = PASS_RULES.every((r) => r.test(password));
  const formOk = useMemo(() => {
    if (!NAME_RE.test(name.trim())) return false;
    if (!EMAIL_RE.test(email.trim())) return false;
    if (!passOk) return false;
    if (phone && !AU_PHONE_RE.test(phone.replace(/[\s\-()]/g, ''))) return false;
    return true;
  }, [name, email, phone, password, passOk]);

  // Auto-submit once 6 digits are entered.
  useEffect(() => {
    if (step === 'verify' && code.length === 6 && !verifying) {
      verify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const startSignup = async () => {
    if (!formOk) {
      Alert.alert('Check your details', 'Please fix the highlighted fields and try again.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup/start', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || null,
        channel: 'email',
      });
      setPending(data);
      setStep('verify');
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (e) {
      Alert.alert('Sign up failed', e?.response?.data?.detail || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.length < 6 || verifying) return;
    setVerifying(true);
    try {
      // Verify the OTP — server creates the user and sets a cookie (ignored on mobile).
      await api.post('/auth/signup/verify', {
        pending_id: pending.pending_id,
        code,
      });
      // Exchange for a Bearer token the mobile client can store.
      await login(email.trim().toLowerCase(), password);
      navigation.goBack();
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Incorrect code. Try again.';
      Alert.alert('Verification failed', msg);
      setCode('');
      codeRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (!pending || resending) return;
    setResending(true);
    try {
      await api.post('/auth/signup/resend', { pending_id: pending.pending_id });
      Alert.alert('Code resent', `A new code was sent to ${pending.target}.`);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  // --- OTP verification screen ---
  if (step === 'verify' && pending) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.cream }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
          <Pressable
            onPress={() => { setStep('form'); setCode(''); }}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <Text style={styles.backText}>← Edit details</Text>
          </Pressable>

          <Text style={text.h2}>Check your inbox</Text>
          <Text style={[text.bodyDim, { marginTop: 6, marginBottom: 24 }]}>
            We sent a 6-digit code to{' '}
            <Text style={{ color: colors.teal, fontWeight: '600' }}>{pending.target}</Text>.
            It expires in 10 minutes.
          </Text>

          <TextInput
            testID="signup-otp-code"
            ref={codeRef}
            style={styles.otpInput}
            placeholder="······"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholderTextColor={colors.tealMute}
          />

          {pending.dev_mode && (
            <Text style={styles.devHint}>Dev mode — check server logs for the code.</Text>
          )}

          <Pressable
            testID="signup-otp-verify"
            onPress={verify}
            disabled={verifying || code.length < 6}
            style={[styles.cta, (verifying || code.length < 6) && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            {verifying
              ? <ActivityIndicator color={colors.teal} />
              : <Text style={styles.ctaText}>Verify & finish</Text>
            }
          </Pressable>

          <Pressable
            testID="signup-otp-resend"
            onPress={resend}
            disabled={resending}
            style={{ marginTop: 16, alignSelf: 'center' }}
            accessibilityRole="button"
          >
            <Text style={[text.bodyDim, { fontSize: 13, color: resending ? colors.tealMute : colors.saffron }]}>
              {resending ? 'Sending…' : 'Resend code'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // --- Registration form ---
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={text.h2}>Join Chaioz</Text>
        <Text style={[text.bodyDim, { marginTop: 6 }]}>
          100 loyalty points on signup. Earn 1 pt per $1 after that.
        </Text>

        <TextInput
          testID="signup-name"
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.tealMute}
        />
        <TextInput
          testID="signup-email"
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.tealMute}
        />
        <TextInput
          testID="signup-phone"
          style={styles.input}
          placeholder="Mobile (optional, 0412 345 678)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={colors.tealMute}
        />
        <Text style={styles.helper}>Used for Square Loyalty points + order-ready SMS.</Text>

        <TextInput
          testID="signup-password"
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.tealMute}
        />
        <View style={styles.rules} testID="signup-pass-rules">
          {PASS_RULES.map((r) => {
            const ok = r.test(password);
            return (
              <Text key={r.label} style={[styles.rule, { color: ok ? '#16a34a' : colors.tealMute }]}>
                {ok ? '✓' : '·'} {r.label}
              </Text>
            );
          })}
        </View>

        <Pressable
          testID="signup-submit"
          onPress={startSignup}
          disabled={loading || !formOk}
          style={[styles.cta, (loading || !formOk) && { opacity: 0.5 }]}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color={colors.teal} />
            : <Text style={styles.ctaText}>Send verification code</Text>
          }
        </Pressable>

        <Pressable
          onPress={() => navigation.replace('Login')}
          style={{ marginTop: 16, alignSelf: 'center' }}
          accessibilityRole="button"
        >
          <Text style={[text.bodyDim, { fontSize: 13 }]}>Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.teal,
  },
  helper: { marginTop: 6, fontSize: 11, color: colors.tealMute },
  rules: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 12 },
  rule: { fontSize: 12 },
  cta: {
    marginTop: 20,
    backgroundColor: colors.saffron,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaText: { color: colors.teal, fontWeight: '700' },
  otpInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: colors.teal,
    fontSize: 28,
    letterSpacing: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  devHint: { marginTop: 8, fontSize: 11, color: '#b45309', textAlign: 'center' },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 13, color: colors.tealMute },
});
