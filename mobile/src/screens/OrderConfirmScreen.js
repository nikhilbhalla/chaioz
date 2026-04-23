import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, text } from '../theme';
import { fmtAUD } from '../lib/api';

export default function OrderConfirmScreen({ route, navigation }) {
  const order = route.params?.order || {};
  const pickupLocal = order.pickup_time
    ? new Date(order.pickup_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, padding: 28, paddingTop: 60 }}>
      <Text style={[text.small, { color: colors.saffron }]}>Order confirmed</Text>
      <Text style={[text.h1, { marginTop: 10 }]}>#{order.short_code}</Text>
      <Text style={[text.bodyDim, { marginTop: 8 }]}>Pick up at {pickupLocal}. We'll text you when it's ready.</Text>

      <View style={styles.card}>
        <Text style={text.h3}>Total</Text>
        <Text style={{ color: colors.saffron, fontSize: 40, fontWeight: '700', marginTop: 6 }}>{fmtAUD(order.total)}</Text>
        {order.points_earned > 0 && (
          <Text style={[text.bodyDim, { marginTop: 6 }]}>
            You earned {order.points_earned} Chaioz points.
          </Text>
        )}
      </View>

      <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} style={styles.cta}>
        <Text style={styles.ctaText}>Back to home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 20 },
  cta: { marginTop: 32, backgroundColor: colors.teal, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  ctaText: { color: colors.saffron, fontWeight: '700' },
});
