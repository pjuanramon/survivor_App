import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Clock, Award, AlertTriangle, ArrowLeft } from 'lucide-react-native';

export default function RulesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          {router.canGoBack() && (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#00FF9D" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>Reglamento Oficial</Text>
            <Text style={styles.subtitle}>Survivor Football La Liga 26/27</Text>
          </View>
        </View>

        {/* Section 1 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookOpen size={22} color="#00FF9D" />
            <Text style={styles.cardTitle}>1. Objetivo y Dinámica</Text>
          </View>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>Objetivo:</Text> Ser el último mánager en pie (Last Man Standing) o acumular la mayor cantidad de puntos/goles.
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>El Pick Semanal:</Text> Eliges <Text style={styles.boldPrimary}>1 equipo</Text> por cada pick activo en cada jornada.
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldGreen}>Si tu equipo GANA:</Text> Avanzas de jornada sin perder vidas.
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldRed}>Si EMPATA o PIERDE:</Text> Tu pick pierde 1 vida. Si llega a 0 vidas, queda eliminado (RIP).
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>Regla de Equipos Usados:</Text> No puedes repetir equipo con la misma vida durante el torneo. Cada selección "quema" al equipo para ese pick.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={22} color="#00FF9D" />
            <Text style={styles.cardTitle}>2. Cierre y Deadlines</Text>
          </View>
          <Text style={styles.bulletText}>
            • La selección se cierra exactamente a la fecha y hora del <Text style={styles.boldWhite}>primer partido de la jornada</Text>.
          </Text>
          <Text style={styles.bulletText}>
            • Si no eliges equipo antes del cierre, tu pick no acumula puntos y puede sufrir la pérdida automática de 1 vida.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={[styles.card, styles.warningCard]}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={22} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: '#F59E0B' }]}>3. Partidos Aplazados y J1</Text>
          </View>
          <Text style={styles.bulletText}>
            Las jornadas cubren exclusivamente los partidos jugados dentro de la <Text style={styles.boldWhite}>ventana oficial previa al inicio de la siguiente jornada</Text>.
          </Text>
          <View style={styles.innerNotice}>
            <Text style={styles.noticeTitle}>Caso J1 (Mundial 2026):</Text>
            <Text style={styles.noticeBody}>
              Si un partido de la jornada 1 se disputa semanas después (tras arrancar la Jornada 2), la jornada Survivor se resuelve con los partidos jugados en la ventana original.
            </Text>
          </View>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>Aplazamiento conocido antes de J1:</Text> El partido queda deshabilitado para elegirse.
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>Suspensión de última hora:</Text> Se otorga <Text style={styles.boldPrimary}>Pase Libre</Text> (avanzas de jornada sin perder vida, pero el equipo seleccionado queda consumido).
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Award size={22} color="#00FF9D" />
            <Text style={styles.cardTitle}>4. Desempates y Puntos</Text>
          </View>
          <Text style={styles.bulletText}>
            1. <Text style={styles.boldWhite}>Estado de Vida:</Text> Supervivientes priman sobre eliminados.
          </Text>
          <Text style={styles.bulletText}>
            2. <Text style={styles.boldWhite}>Puntos Totales:</Text> Acumulado de victorias de tus equipos elegidos.
          </Text>
          <Text style={styles.bulletText}>
            3. <Text style={styles.boldWhite}>Goles a Favor (GF):</Text> Total de goles anotados por los equipos elegidos en tus picks victoriosos.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  backBtn: {
    marginRight: 14,
    padding: 10,
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  warningCard: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#00FF9D',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
  },
  bulletText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  boldPrimary: {
    color: '#00FF9D',
    fontWeight: '800',
  },
  boldGreen: {
    color: '#34D399',
    fontWeight: '700',
  },
  boldRed: {
    color: '#F87171',
    fontWeight: '700',
  },
  innerNotice: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    marginVertical: 10,
  },
  noticeTitle: {
    color: '#FBBF24',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  noticeBody: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 18,
  },
});
