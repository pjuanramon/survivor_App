import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Award,
  ArrowLeft,
  Home,
  Scale,
  Globe,
  RefreshCw,
  Users,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';

export default function RulesScreen() {
  const router = useRouter();

  function handleGoBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
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
            <Text style={styles.title}>Reglamento Oficial</Text>
            <Text style={styles.subtitle}>Futvivor 2.0 • Euro-Survivor & Ligas</Text>
          </View>
        </View>

        {/* Section 1: Euro-Survivor Doble Bala */}
        <View style={[styles.card, styles.highlightCard]}>
          <View style={styles.cardHeader}>
            <Globe size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>1. Ticket Doble: Euro-Survivor</Text>
          </View>
          <Text style={styles.bulletText}>
            En el formato principal <Text style={styles.boldPrimary}>Euro-Survivor</Text>, cada fin de semana sellas un <Text style={styles.boldWhite}>Ticket Doble</Text> por cada vida activa antes del inicio del primer partido de la ventana:
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>🇪🇸 Bala 1 (Casa):</Text> 1 equipo de <Text style={styles.boldPrimary}>LaLiga</Text>.
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>🌍 Bala 2 (Europa):</Text> 1 equipo a elegir libremente entre <Text style={styles.boldPrimary}>Premier League, Serie A o Bundesliga</Text> (completando las 4 Grandes Ligas).
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldWhite}>Regla de No Repetición:</Text> Ningún club utilizado puede repetirse durante el resto de la Ronda en curso (se liberan todos al comenzar una nueva Ronda).
          </Text>
          <View style={styles.innerAlert}>
            <Text style={styles.alertText}>
              ⚠️ <Text style={styles.boldWhite}>Puntualidad:</Text> Los picks son secretos hasta el cierre del plazo. Si olvidas registrar un hueco, el sistema asigna el <Text style={styles.boldWhite}>colista disponible</Text>.
            </Text>
          </View>
        </View>

        {/* Section 2: Tarjetas Amarillas y Roja Directa */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Award size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>2. Resultados y Tarjetas Amarillas 🟨</Text>
          </View>

          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeBadge, styles.badgeWin]}>
              <Text style={styles.badgeTextWin}>SI GANA</Text>
            </View>
            <Text style={styles.outcomeDesc}>
              Bala superada limpia y sumas <Text style={styles.boldGreen}>+3 puntos</Text> + goles a favor (pleno de 2 victorias = <Text style={styles.boldGreen}>+6 pts</Text>).
            </Text>
          </View>

          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeBadge, styles.badgeDraw]}>
              <Text style={styles.badgeTextDraw}>SI EMPATA 🟨</Text>
            </View>
            <Text style={styles.outcomeDesc}>
              Sumas <Text style={styles.boldYellow}>+1 punto</Text>, pero tu vida recibe <Text style={styles.boldYellow}>1 Tarjeta Amarilla 🟨</Text>. ¡Al acumular <Text style={styles.boldRed}>2 Amarillas</Text> (en la misma jornada o en jornadas distintas), es <Text style={styles.boldRed}>DOBLE AMARILLA = ROJA (Eliminado)</Text>!
            </Text>
          </View>

          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeBadge, styles.badgeLoss]}>
              <Text style={styles.badgeTextLoss}>SI PIERDE 🟥</Text>
            </View>
            <Text style={styles.outcomeDesc}>
              Con que pierda <Text style={styles.boldRed}>CUALQUIERA</Text> de tus equipos recibes <Text style={styles.boldRed}>ROJA DIRECTA</Text> y esa vida queda eliminada de la ronda.
            </Text>
          </View>

          <View style={styles.innerNotice}>
            <Text style={styles.tieStep}>
              🔥 <Text style={styles.boldYellow}>Muerte Súbita Final:</Text> Cuando quedan <Text style={styles.boldWhite}>3 o menos supervivientes</Text> en la ronda, se activa el cierre de anillo: cualquier empate supone eliminación directa si el rival gana.
            </Text>
          </View>
        </View>

        {/* Section 3: Rondas Continuas y Ranking General */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <RefreshCw size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>3. Rondas y Ranking General Anual</Text>
          </View>
          <Text style={styles.bulletText}>
            • Cuando solo queda <Text style={styles.boldWhite}>1 superviviente en pie</Text>, se proclama Campeón de la Ronda y suma el título al palmarés del grupo.
          </Text>
          <Text style={styles.bulletText}>
            • Al concluir una Ronda, el Administrador (o el sistema automáticamente en Salas Abiertas) lanza la <Text style={styles.boldPrimary}>siguiente Ronda</Text> donde <Text style={styles.boldWhite}>todos los miembros reviven con equipos y tarjetas reseteados</Text>.
          </Text>
          <Text style={styles.bulletText}>
            • Todos los puntos, goles y títulos de cada Ronda se acumulan en la pestaña <Text style={styles.boldPrimary}>🏆 General Anual</Text> de tu liga.
          </Text>
        </View>

        {/* Section 4: Salas, Cupos y Desempates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>4. Tamaño de Grupos y Salas Abiertas</Text>
          </View>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>Grupos Privados de Amigos:</Text> Hasta <Text style={styles.boldPrimary}>25 jugadores</Text> (diseñado para rondas rápidas de 4–5 semanas).
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>Salas Abiertas Oficiales:</Text> Divisiones automáticas de <Text style={styles.boldPrimary}>30 jugadores</Text>; al llenarse una sala, se abre automáticamente la siguiente.
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.boldWhite}>Ligas Comunidad / VIP:</Text> Hasta <Text style={styles.boldPrimary}>100–250 jugadores</Text> para peñas, empresas o creadores.
          </Text>
        </View>

        {/* Section 5: Desempates y Partidos Suspendidos */}
        <View style={[styles.card, styles.warningCard]}>
          <View style={styles.cardHeader}>
            <Scale size={22} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: '#F59E0B' }]}>5. Desempates y Casos Especiales</Text>
          </View>
          <Text style={styles.bulletText}>
            Si los últimos supervivientes caen eliminados simultáneamente en la misma jornada, el campeón se decide por: <Text style={styles.boldWhite}>1º Más Puntos Acumulados</Text> → <Text style={styles.boldWhite}>2º Más Goles a Favor (GF)</Text> → <Text style={styles.boldWhite}>3º Menos Tarjetas Amarillas</Text>.
          </Text>
          <Text style={styles.bulletText}>
            Si un partido se aplaza fuera de la ventana del fin de semana sin jugarse, computa como empate `0-0` (o marcador al suspenderse).
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.returnBtn}
          activeOpacity={0.8}
        >
          <Home size={20} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.returnBtnText}>VOLVER A MIS PARTIDAS</Text>
        </TouchableOpacity>

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
    maxWidth: 640,
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
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '900',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  highlightCard: {
    borderColor: COLORS.primaryBorder,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  warningCard: {
    borderColor: COLORS.warningBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 10,
    flex: 1,
  },
  bulletText: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 9,
  },
  boldWhite: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  boldPrimary: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  boldGreen: {
    color: COLORS.alive,
    fontWeight: '800',
  },
  boldYellow: {
    color: COLORS.warning,
    fontWeight: '800',
  },
  boldRed: {
    color: COLORS.dead,
    fontWeight: '800',
  },
  innerAlert: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    marginTop: 6,
  },
  alertText: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
    minWidth: 98,
    alignItems: 'center',
  },
  badgeWin: {
    backgroundColor: COLORS.aliveBg,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  badgeTextWin: {
    color: COLORS.alive,
    fontWeight: '900',
    fontSize: 11,
  },
  badgeDraw: {
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  badgeTextDraw: {
    color: COLORS.warning,
    fontWeight: '900',
    fontSize: 11,
  },
  badgeLoss: {
    backgroundColor: COLORS.deadBg,
    borderWidth: 1,
    borderColor: COLORS.deadBorder,
  },
  badgeTextLoss: {
    color: COLORS.dead,
    fontWeight: '900',
    fontSize: 11,
  },
  outcomeDesc: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  innerNotice: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 6,
  },
  tieStep: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 19,
  },
  returnBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  returnBtnText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
