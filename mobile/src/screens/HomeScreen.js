import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, fmtAUD } from '../lib/api';
import { colors, text } from '../theme';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [combos, setCombos] = useState([]);
  const [best, setBest] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [c, b] = await Promise.all([api.get('/menu/combos'), api.get('/menu/bestsellers')]);
      setCombos(c.data || []);
      setBest(b.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning. Chai's brewing.";
    if (h < 17) return 'Craving your afternoon chai?';
    return 'Late night calling?';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={styles.hero}>
          <Text style={[text.small, { color: 'rgba(255,255,255,0.7)' }]}>Chaioz · Adelaide</Text>
          <Text style={[text.h1, { marginTop: 8, color: colors.saffron }]}>{greeting}</Text>
          <Text style={[text.body, { marginTop: 10, color: 'rgba(255,255,255,0.8)' }]}>
            {user ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Order pickup or delivery in seconds.'}
          </Text>
          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.ctaText}>Order now</Text>
          </Pressable>
        </View>

        {combos.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <Text style={text.h3}>Smart combos</Text>
            <Text style={[text.bodyDim, { marginTop: 4 }]}>Hand-picked pairings, save on every order.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
              {combos.map((c) => (
                <View key={c.id} style={styles.combo}>
                  <Text style={styles.comboBadge}>{c.badge}</Text>
                  <Text style={[text.h3, { marginTop: 8 }]}>{c.name}</Text>
                  <Text style={[text.bodyDim, { marginTop: 4 }]}>{c.tagline}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12, gap: 8 }}>
                    <Text style={{ color: colors.saffron, fontSize: 22, fontWeight: '600' }}>{fmtAUD(c.bundle_price)}</Text>
                    <Text style={{ color: colors.tealMute, textDecorationLine: 'line-through' }}>{fmtAUD(c.original_price)}</Text>
                  </View>
                  <Text style={{ color: colors.saffron, fontSize: 12, marginTop: 4 }}>Save {fmtAUD(c.save_aud)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {best.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 30 }}>
            <Text style={text.h3}>Bestsellers</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 12 }}>
              {best.slice(0, 6).map((m) => (
                <View key={m.id} style={styles.card}>
                  {m.image && <Image source={{ uri: m.image }} style={styles.cardImg} />}
                  <Text style={[text.body, { marginTop: 8, fontWeight: '600' }]} numberOfLines={1}>{m.name}</Text>
                  <Text style={{ color: colors.saffron, marginTop: 2 }}>{fmtAUD(m.price)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.teal,
    paddingHorizontal: 22,
    paddingVertical: 36,
    marginHorizontal: 0,
  },
  cta: {
    marginTop: 22,
    backgroundColor: colors.saffron,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  ctaText: { color: colors.teal, fontWeight: '600', fontSize: 15 },
  combo: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 240,
  },
  comboBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.saffron,
    color: colors.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    width: '47%',
  },
  cardImg: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: colors.creamDeep,
  },
});
