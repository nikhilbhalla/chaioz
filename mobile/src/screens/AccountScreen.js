import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { api, fmtAUD } from '../lib/api';
import { colors, text } from '../theme';

export default function AccountScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user) api.get('/orders/me').then((r) => setOrders(r.data || [])).catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={[text.h2, { textAlign: 'center' }]}>Sign in to Chaioz</Text>
        <Text style={[text.bodyDim, { marginTop: 6, textAlign: 'center' }]}>Track orders, save favourites, earn loyalty points.</Text>
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.cta}><Text style={styles.ctaText}>Sign in</Text></Pressable>
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.ctaGhost}><Text style={styles.ctaGhostText}>Create account</Text></Pressable>
      </SafeAreaView>
    );
  }

  const reorder = async (orderId) => {
    try {
      const { data } = await api.post(`/orders/${orderId}/reorder`);
      Alert.alert('Reordered', `Your order #${data.short_code} is placed.`);
      const r = await api.get('/orders/me');
      setOrders(r.data || []);
    } catch (e) {
      Alert.alert('Reorder failed', e?.response?.data?.detail || 'Try again');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={text.h2}>{user.name}</Text>
        <Text style={[text.bodyDim, { marginTop: 2 }]}>{user.email}</Text>

        <View style={styles.loyalty}>
          <Text style={[text.small, { color: colors.saffron }]}>Chaioz Loyalty · {user.loyalty_tier}</Text>
          <Text style={[text.h1, { marginTop: 6 }]}>{user.loyalty_points}</Text>
          <Text style={[text.bodyDim, { marginTop: 2 }]}>points</Text>
        </View>

        <Text style={[text.h3, { marginTop: 24 }]}>Recent orders</Text>
        {orders.length === 0 ? (
          <Text style={[text.bodyDim, { marginTop: 8 }]}>No orders yet.</Text>
        ) : (
          orders.slice(0, 10).map((o) => (
            <View key={o.id} style={styles.order}>
              <View style={{ flex: 1 }}>
                <Text style={[text.body, { fontWeight: '600' }]}>#{o.short_code}</Text>
                <Text style={[text.bodyDim, { fontSize: 12 }]}>{new Date(o.created_at).toLocaleDateString('en-AU')} · {fmtAUD(o.total)}</Text>
              </View>
              <Pressable onPress={() => reorder(o.id)} style={styles.reorderBtn}>
                <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>Reorder</Text>
              </Pressable>
            </View>
          ))
        )}

        <Pressable onPress={logout} style={[styles.cta, { marginTop: 32, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }]}>
          <Text style={{ color: colors.teal, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cta: { marginTop: 20, backgroundColor: colors.saffron, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 999, alignItems: 'center' },
  ctaText: { color: colors.teal, fontWeight: '700' },
  ctaGhost: { marginTop: 8, paddingVertical: 10 },
  ctaGhostText: { color: colors.tealDim, textAlign: 'center' },
  loyalty: { marginTop: 22, padding: 18, backgroundColor: colors.teal, borderRadius: 18 },
  order: { marginTop: 10, padding: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  reorderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.saffron },
});
