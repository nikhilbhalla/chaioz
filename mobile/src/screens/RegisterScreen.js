import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
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
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passOk = PASS_RULES.every((r) => r.test(password));
  const formOk = useMemo(() => {
    if (!NAME_RE.test(name.trim())) return false;
    if (!EMAIL_RE.test(email.trim())) return false;
    if (!passOk) return false;
    if (phone && !AU_PHONE_RE.test(phone.replace(/[\s\-()]/g, ''))) return false;
    return true;
  }, [name, email, phone, password, passOk]);

  const submit = async () => {
    if (!formOk) {
      return Alert.alert('Check your details', 'Please fix the highlighted fields and try again.');
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, phone.trim() || null);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Sign up failed', e?.response?.data?.detail || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 24 }}>
      <Text style={text.h2}>Join Chaioz</Text>
      <Text style={[text.bodyDim, { marginTop: 6 }]}>100 loyalty points on signup. Earn 1 pt per $1 after that.</Text>
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
        onPress={submit}
        disabled={loading || !formOk}
        style={[styles.cta, (loading || !formOk) && { opacity: 0.5 }]}
      >
        <Text style={styles.ctaText}>{loading ? 'Creating…' : 'Create account'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.replace('Login')} style={{ marginTop: 16, alignSelf: 'center' }}>
        <Text style={[text.bodyDim, { fontSize: 13 }]}>Already have an account? Sign in</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.teal },
  helper: { marginTop: 6, fontSize: 11, color: colors.tealMute },
  rules: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 12 },
  rule: { fontSize: 12 },
  cta: { marginTop: 20, backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  ctaText: { color: colors.teal, fontWeight: '700' },
});
