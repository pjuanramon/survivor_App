import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Heart, Minus, Plus, BookOpen } from 'lucide-react-native';

export default function OnboardingScreen() {
  const [pickCount, setPickCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkExistingEntries();
  }, []);

  async function checkExistingEntries() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: entries } = await supabase
        .from('sur_entries')
        .select('id')
        .eq('player_id', user.id);
      if (entries && entries.length > 0) {
        router.replace('/(tabs)');
      }
    }
  }

  async function handleConfirm() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('sur_entries')
        .select('id')
        .eq('player_id', user.id);

      if (existing && existing.length > 0) {
        router.replace('/(tabs)');
        return;
      }

      await supabase.from('sur_profiles').upsert({ 
        id: user.id, 
        username: user.email?.split('@')[0] || 'User' 
      });

      const entries = Array.from({ length: pickCount }).map((_, i) => ({
        player_id: user.id,
        entry_name: `Pick ${i + 1}`,
      }));

      const { error } = await supabase.from('sur_entries').insert(entries);

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.badgeContainer}>
            <Heart size={32} color="#00FF9D" />
          </View>
          
          <Text style={styles.title}>¿CUÁNTOS PICKS?</Text>
          <Text style={styles.subtitle}>
            Puedes competir con hasta 5 picks independientes. Cada pick es una oportunidad única de sobrevivir en la liga.
          </Text>

          <View style={styles.counterCard}>
            <TouchableOpacity 
              onPress={() => setPickCount(Math.max(1, pickCount - 1))}
              style={styles.circleBtn}
              activeOpacity={0.7}
            >
              <Minus size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.countWrapper}>
              <Text style={styles.countText}>{pickCount}</Text>
              <Text style={styles.countLabel}>{pickCount === 1 ? 'PICK INDEPENDIENTE' : 'PICKS INDEPENDIENTES'}</Text>
            </View>

            <TouchableOpacity 
              onPress={() => setPickCount(Math.min(5, pickCount + 1))}
              style={[styles.circleBtn, styles.circleBtnActive]}
              activeOpacity={0.7}
            >
              <Plus size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.confirmBtn, loading && styles.btnDisabled]}
          >
            <Text style={styles.confirmBtnText}>
              {loading ? 'CREANDO...' : `CONFIRMAR ${pickCount} ${pickCount === 1 ? 'PICK' : 'PICKS'}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/rules')}
            style={styles.rulesBtn}
          >
            <BookOpen size={16} color="#888888" style={{ marginRight: 6 }} />
            <Text style={styles.rulesBtnText}>Consultar Reglamento Oficial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0A0A0A',
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  badgeContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 255, 157, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF9D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#00FF9D',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  counterCard: {
    width: '100%',
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBtnActive: {
    backgroundColor: '#00FF9D',
  },
  countWrapper: {
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '900',
  },
  countLabel: {
    color: '#00FF9D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -4,
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: '#00FF9D',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rulesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rulesBtnText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
