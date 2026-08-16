import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, AlertTriangle, Trophy, CheckCircle } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

export default function TermsScreen() {
  const router = useRouter();

  function handleGoBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Términos y Condiciones</Text>
            <Text style={styles.subtitle}>Futvivor • Reglamento y Uso</Text>
          </View>
        </View>

        {/* Free-to-Play Disclaimer */}
        <View style={[styles.card, styles.highlightCard]}>
          <View style={styles.cardHeader}>
            <CheckCircle size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>1. Naturaleza Gratuita y Recreativa</Text>
          </View>
          <Text style={styles.bodyText}>
            Futvivor es un juego de pronósticos deportivos de entretenimiento social
            y formativo (Free-to-Play). La participación no constituye una actividad
            de apuestas ni juego de azar con apuestas económicas.
          </Text>
        </View>

        {/* Game Rules & Fair Play */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Trophy size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>2. Juego Limpio y Plazos</Text>
          </View>
          <Text style={styles.bodyText}>
            Cada usuario se compromete a respetar los plazos fijados por el calendario
            oficial de cada competición. Las selecciones quedan bloqueadas al inicio
            del primer partido de cada jornada.
          </Text>
        </View>

        {/* Account Conduct */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={20} color={COLORS.warning} />
            <Text style={[styles.cardTitle, { color: COLORS.warning }]}>
              3. Conducta y Uso Adecuado
            </Text>
          </View>
          <Text style={styles.bodyText}>
            Queda prohibido el uso de nombres de usuario ofensivos, el intento de
            manipulación de resultados mediante bots o cualquier conducta que altere
            el buen ambiente de las ligas comunitarias.
          </Text>
        </View>

        {/* Intellectual Property */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>4. Propiedad Intelectual</Text>
          </View>
          <Text style={styles.bodyText}>
            Todos los derechos sobre el software, diseño, marca y contenido de
            Futvivor son propiedad exclusiva de sus desarrolladores. Los nombres
            y marcas de los equipos de fútbol pertenecen a sus respectivos clubes
            y organizaciones deportivas oficiales.
          </Text>
          <Text style={styles.updateDate}>Última actualización: Agosto 2026</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  highlightCard: {
    borderColor: 'rgba(0, 255, 157, 0.3)',
    backgroundColor: 'rgba(0, 255, 157, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 8,
  },
  bodyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  updateDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
