import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { LogOut, BookOpen, User as UserIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          
          {/* Header User */}
          <View style={styles.header}>
            <View style={styles.avatarBox}>
              <UserIcon size={44} color="#00FF9D" />
            </View>
            <Text style={styles.title}>Mi Perfil</Text>
            <Text style={styles.subtitle}>Survivor Football La Liga 26/27</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.menuGroup}>
            <TouchableOpacity 
              onPress={() => router.push('/rules')}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <BookOpen size={22} color="#00FF9D" />
              <Text style={styles.menuItemText}>Reglamento Oficial</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSignOut}
              style={[styles.menuItem, styles.signOutItem]}
              activeOpacity={0.7}
            >
              <LogOut size={22} color="#EF4444" />
              <Text style={styles.signOutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

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
    padding: 24,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#161616',
    borderWidth: 2,
    borderColor: '#00FF9D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    marginTop: 4,
  },
  menuGroup: {
    width: '100%',
    gap: 16,
  },
  menuItem: {
    backgroundColor: '#161616',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  menuItemText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
    marginLeft: 16,
  },
  signOutItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginTop: 12,
  },
  signOutText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 17,
    marginLeft: 16,
  },
});
