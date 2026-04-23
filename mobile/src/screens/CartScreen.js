import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../contexts/CartContext';
import { colors, text } from '../theme';
import { fmtAUD } from '../lib/api';

export default function CartScreen({ navigation }) {
  const { items, changeQty, remove, subtotal, count, clear } = useCart();

  if (count === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Text style={[text.h2, { textAlign: 'center' }]}>Your cart is empty</Text>
        <Text style={[text.bodyDim, { marginTop: 6, textAlign: 'center' }]}>Add a chai and a bite to get started.</Text>
        <Pressable onPress={() => navigation.navigate('Menu')} style={styles.cta}>
          <Text style={styles.ctaText}>Browse menu</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.item_id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={<Text style={[text.h2, { marginBottom: 12 }]}>Your cart</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[text.body, { fontWeight: '600' }]}>{item.name}</Text>
              <Text style={{ color: colors.saffron, marginTop: 4 }}>{fmtAUD(item.line_total)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => changeQty(item.item_id, -1)} style={styles.qtyBtn}><Text style={styles.qtyTxt}>−</Text></Pressable>
              <Text style={{ width: 20, textAlign: 'center', color: colors.teal }}>{item.qty}</Text>
              <Pressable onPress={() => changeQty(item.item_id, 1)} style={styles.qtyBtn}><Text style={styles.qtyTxt}>+</Text></Pressable>
              <Pressable onPress={() => remove(item.item_id)} style={{ marginLeft: 8 }}>
                <Text style={{ color: colors.danger, fontSize: 12 }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={text.body}>Subtotal</Text>
          <Text style={[text.body, { fontWeight: '700' }]}>{fmtAUD(subtotal)}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Checkout')} style={styles.cta}>
          <Text style={styles.ctaText}>Checkout · {fmtAUD(subtotal)}</Text>
        </Pressable>
        <Pressable onPress={clear} style={{ alignSelf: 'center', marginTop: 10 }}>
          <Text style={[text.bodyDim, { fontSize: 12 }]}>Clear cart</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 999, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  qtyTxt: { color: colors.teal, fontWeight: '700' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.cream },
  cta: { backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  ctaText: { color: colors.teal, fontWeight: '700', fontSize: 15 },
});
