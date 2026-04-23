import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { api, fmtAUD, formatApiError } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { colors, text } from '../theme';

function pickupSlots() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15 - (now.getMinutes() % 15));
  const out = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getTime() + i * 15 * 60000);
    out.push({
      iso: d.toISOString(),
      label: d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    });
  }
  return out;
}

export default function CheckoutScreen({ navigation }) {
  const { items, subtotal, clear } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slots = pickupSlots();
  const [pickup, setPickup] = useState(slots[0].iso);

  const submit = async () => {
    if (!name || !phone) return Alert.alert('Missing details', 'Name and phone are required.');
    if (items.length === 0) return Alert.alert('Cart is empty');
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({
          item_id: i.item_id, name: i.name, price: i.price, qty: i.qty,
          size: i.size, addons: i.addons, notes: i.notes, line_total: i.line_total,
        })),
        pickup_time: pickup,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        notes: null,
        payment_method: 'square_mock',
        fulfillment: 'pickup',
      });
      clear();
      navigation.replace('OrderConfirm', { order: data });
    } catch (e) {
      Alert.alert('Order failed', formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} style={{ backgroundColor: colors.cream }}>
      <Text style={text.h2}>Pickup details</Text>
      <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.tealMute} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Phone (e.g. 0400 000 000)" placeholderTextColor={colors.tealMute} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Email (optional, for receipt)" placeholderTextColor={colors.tealMute} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <Text style={[text.h3, { marginTop: 20 }]}>Pickup time</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
        {slots.map((s) => (
          <Pressable key={s.iso} onPress={() => setPickup(s.iso)} style={[styles.slot, pickup === s.iso && styles.slotActive]}>
            <Text style={[styles.slotText, pickup === s.iso && styles.slotTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.summary}>
        <Text style={text.h3}>Order summary</Text>
        {items.map((i) => (
          <View key={i.item_id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={text.body}>{i.qty}× {i.name}</Text>
            <Text style={[text.body, { fontWeight: '600' }]}>{fmtAUD(i.line_total)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text style={[text.body, { fontWeight: '700' }]}>Total</Text>
          <Text style={{ color: colors.saffron, fontSize: 18, fontWeight: '700' }}>{fmtAUD(subtotal)}</Text>
        </View>
      </View>

      <Pressable disabled={submitting} onPress={submit} style={[styles.cta, submitting && { opacity: 0.6 }]}>
        {submitting ? <ActivityIndicator color={colors.teal} /> : <Text style={styles.ctaText}>Place order · {fmtAUD(subtotal)}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.teal, marginTop: 10 },
  slot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  slotActive: { backgroundColor: colors.saffron, borderColor: colors.saffron },
  slotText: { color: colors.teal },
  slotTextActive: { color: colors.teal, fontWeight: '700' },
  summary: { marginTop: 20, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  cta: { marginTop: 20, backgroundColor: colors.saffron, paddingVertical: 15, borderRadius: 999, alignItems: 'center' },
  ctaText: { color: colors.teal, fontWeight: '700', fontSize: 15 },
});
