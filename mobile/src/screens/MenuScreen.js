import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, FlatList, Image, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, fmtAUD } from '../lib/api';
import { colors, text } from '../theme';
import { useCart } from '../contexts/CartContext';

const TAGS = [
  { id: 'quick_breakfast', label: 'Quick Breakfast' },
  { id: 'ready_in_5', label: 'Ready in 5' },
  { id: 'under_10', label: 'Under $10' },
  { id: 'late_night', label: 'Late Night' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'sweet', label: 'Sweet' },
  { id: 'savoury', label: 'Savoury' },
];

export default function MenuScreen() {
  const { add } = useCart();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [activeTags, setActiveTags] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const [i, c] = await Promise.all([api.get('/menu/items'), api.get('/menu/categories')]);
      setItems(i.data || []);
      setCats(c.data || []);
      setActiveCat((c.data?.[0]?.name) || null);
    })();
  }, []);

  const filtered = useMemo(() => {
    let out = items;
    if (activeCat) out = out.filter((i) => i.category === activeCat);
    if (activeTags.length) out = out.filter((i) => activeTags.every((t) => (i.tags || []).includes(t)));
    if (q) out = out.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
    return out;
  }, [items, activeCat, activeTags, q]);

  const toggleTag = (tag) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ padding: 16 }}>
        <Text style={text.h2}>Menu</Text>
        <TextInput
          style={styles.search}
          placeholder="Search chai, bites, sweets…"
          placeholderTextColor={colors.tealMute}
          value={q}
          onChangeText={setQ}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {cats.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => setActiveCat(c.name)}
            style={[styles.chip, activeCat === c.name && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeCat === c.name && styles.chipTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginTop: 8 }}
        style={{ maxHeight: 44 }}
      >
        {TAGS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => toggleTag(t.id)}
            style={[styles.tag, activeTags.includes(t.id) && styles.tagActive]}
          >
            <Text style={[styles.tagText, activeTags.includes(t.id) && styles.tagTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.image && <Image source={{ uri: item.image }} style={styles.rowImg} />}
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={[text.body, { fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[text.bodyDim, { marginTop: 2 }]} numberOfLines={2}>{item.description}</Text>
              <Text style={{ color: colors.saffron, marginTop: 6, fontWeight: '600' }}>{fmtAUD(item.price)}</Text>
            </View>
            <Pressable onPress={() => add(item, 1)} style={styles.addBtn}>
              <Text style={{ color: colors.teal, fontWeight: '700' }}>+</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.teal,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.teal, fontSize: 13 },
  chipTextActive: { color: colors.saffron, fontWeight: '600' },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  tagActive: { backgroundColor: colors.saffron, borderColor: colors.saffron },
  tagText: { color: colors.teal, fontSize: 12 },
  tagTextActive: { color: colors.teal, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10 },
  rowImg: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.creamDeep },
  addBtn: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.saffron, alignItems: 'center', justifyContent: 'center' },
});
