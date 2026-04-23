import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, text } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password.length < 6) return Alert.alert('Password', 'Use at least 6 characters.');
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Sign up failed', e?.response?.data?.detail || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: colors.cream }}>
      <Text style={text.h2}>Join Chaioz</Text>
      <Text style={[text.bodyDim, { marginTop: 6 }]}>Get 100 loyalty points on signup.</Text>
      <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} placeholderTextColor={colors.tealMute} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.tealMute} />
      <TextInput style={styles.input} placeholder="Password (min. 6 characters)" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={colors.tealMute} />
      <Pressable onPress={submit} disabled={loading} style={[styles.cta, loading && { opacity: 0.6 }]}>
        <Text style={styles.ctaText}>{loading ? 'Creating…' : 'Create account'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.replace('Login')} style={{ marginTop: 16, alignSelf: 'center' }}>
        <Text style={[text.bodyDim, { fontSize: 13 }]}>Already have an account? Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.teal },
  cta: { marginTop: 20, backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  ctaText: { color: colors.teal, fontWeight: '700' },
});
