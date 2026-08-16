import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Clock, Award, AlertTriangle, ArrowLeft, Home, CheckCircle2, ShieldAlert, Scale, HelpCircle } from 'lucide-react-native';

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
            <ArrowLeft size={22} color="#00FF9D" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Reglamento Oficial</Text>
            <Text style={styles.subtitle}>Futvivor • LaLiga & Liga MX 26/27</Text>
          </View>
        </View>

        {/* Section 0: Regla Principal y Plazo */}
        <View style={[styles.card, styles.highlightCard]}>
          <View style={styles.cardHeader}>
            <Clock size={22} color="#00FF9D" />
            <Text style={styles.cardTitle}>Plazo y Selección Semanal</Text>
          </View>
          <Text style={styles.bulletText}>
            Cada participante seleccionará un equipo con el cual competirá durante la jornada en curso, el cual tendrá que registrar con plazo límite fijado exactamente al <Text style={styles.boldPrimary}>inicio del primer partido de la jornada</Text>.
          </Text>
          <View style={styles.innerAlert}>
            <Text style={styles.alertText}>
              ⚠️ <Text style={styles.boldWhite}>Puntualidad obligatoria:</Text> En caso de no registrar la selección antes del inicio de la jornada, el administrador le asignará automáticamente el <Text style={styles.boldWhite}>equipo que se encuentre en último lugar de la tabla</Text>.
            </Text>
          </View>
        </View>

        {/* Section 1: Reglas de Selección y Equipos (1-4) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookOpen size={22} color="#00FF9D" />
            <Text style={styles.cardTitle}>Dinámica de Selección (Pts 1-4)</Text>
          </View>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>1.</Text> Se deberá mandar el equipo en el grupo/app de forma transparente y pública, no por privado.
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>2.</Text> La tabla de juego actualizada se publicará antes del inicio de cada jornada.
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>3.</Text> El equipo seleccionado <Text style={styles.boldWhite}>únicamente tiene validez para la jornada en curso</Text>. De avanzar a la siguiente jornada, se deberá seleccionar un equipo nuevo.
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>4.</Text> <Text style={styles.boldWhite}>Regla de No Repetición:</Text> Si eliges un equipo, no podrás volver a seleccionarlo en jornadas posteriores. Cada jornada deberás elegir un equipo diferente.
          </Text>
        </View>

        {/* Section 2: Resultados y Eliminación (Pts 5-8) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Award size={22} color="#00FF9D" />
            <Text style={styles.cardTitle}>Resultados y Puntuación (Pts 5-8)</Text>
          </View>
          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeBadge, styles.badgeWin]}>
              <Text style={styles.badgeTextWin}>SI GANA</Text>
            </View>
            <Text style={styles.outcomeDesc}>
              Avanzas a la siguiente jornada y acumulas <Text style={styles.boldGreen}>+3 puntos</Text>.
            </Text>
          </View>

          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeBadge, styles.badgeDraw]}>
              <Text style={styles.badgeTextDraw}>SI EMPATA</Text>
            </View>
            <Text style={styles.outcomeDesc}>
              Avanzas a la siguiente jornada y acumulas <Text style={styles.boldYellow}>+1 punto</Text>.
            </Text>
          </View>

          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeBadge, styles.badgeLoss]}>
              <Text style={styles.badgeTextLoss}>SI PIERDE</Text>
            </View>
            <Text style={styles.outcomeDesc}>
              Quedas <Text style={styles.boldRed}>ELIMINADO</Text> de la competición (sin reingresos).
            </Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.bulletText}>
              <Text style={styles.boldNumber}>6.</Text> Los puntos acumulados se utilizarán como criterio de desempate.
            </Text>
            <Text style={styles.bulletText}>
              <Text style={styles.boldNumber}>7.</Text> <Text style={styles.boldWhite}>Goles a Favor (GF):</Text> Se sumarán los goles anotados por los equipos que selecciones en cada jornada.
            </Text>
            <Text style={styles.bulletText}>
              <Text style={styles.boldNumber}>8.</Text> <Text style={styles.boldWhite}>Ganador del Torneo:</Text> Será el participante que tras el transcurso de las jornadas y eliminación de los rivales logre "Sobrevivir" y quedar solo (Last Man Standing).
            </Text>
          </View>
        </View>

        {/* Section 3: Desempates (Pts 9-10) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Scale size={22} color="#00FF9D" />
            <Text style={styles.cardTitle}>Criterios de Desempate (Pts 9-10)</Text>
          </View>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>9.</Text> <Text style={styles.boldWhite}>Casos de Empate:</Text> Se puede presentar si:
          </Text>
          <Text style={[styles.bulletText, { paddingLeft: 16 }]}>
            • En una jornada, absolutamente todos los participantes que sigan en juego quedan eliminados simultáneamente.
          </Text>
          <Text style={[styles.bulletText, { paddingLeft: 16 }]}>
            • Al término de la última jornada del torneo queda más de un participante con vida.
          </Text>
          <Text style={[styles.bulletText, { marginTop: 8 }]}>
            <Text style={styles.boldNumber}>10.</Text> <Text style={styles.boldWhite}>Jerarquía de Desempate:</Text>
          </Text>
          <View style={styles.innerNotice}>
            <Text style={styles.tieStep}>1º <Text style={styles.boldWhite}>Puntos Conseguidos</Text> (3 por victoria, 1 por empate).</Text>
            <Text style={styles.tieStep}>2º <Text style={styles.boldWhite}>Goles a Favor (GF)</Text> (aplica si y solo si persiste igualdad en puntos).</Text>
          </View>
        </View>

        {/* Section 4: Partidos Suspendidos y Casos Especiales (Pts 11-15) */}
        <View style={[styles.card, styles.warningCard]}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={22} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: '#F59E0B' }]}>Partidos Suspendidos y Casos Especiales (Pts 11-15)</Text>
          </View>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>11.</Text> Si un partido es suspendido y no se reanuda dentro de la fecha estipulada para la jornada, se tomará como marcador final el que se haya tenido al momento de la suspensión (siendo un empate a 0 goles si el partido no hubiese iniciado).
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>12.</Text> Si se sabe antes del inicio de la jornada que uno o más partidos serán suspendidos, no se podrá elegir a los equipos involucrados (deberán cambiar de equipo si no se había enviado la tabla).
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>13.</Text> En caso de <Text style={styles.boldWhite}>suspensión total de la jornada</Text>, no se tomará en cuenta dicha jornada, reanudándose el Survivor en la siguiente jornada.
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>14.</Text> En caso de <Text style={styles.boldWhite}>suspensión total del Torneo</Text>, el ganador será quien vaya en primer lugar aplicando los criterios de desempate (Puntos &gt; Goles a Favor).
          </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldNumber}>15.</Text> <Text style={styles.boldWhite}>Sanciones posteriores de LaLiga:</Text> Sanciones federativas posteriores a un partido no afectarán a la quiniela; se mantendrá siempre el resultado dado en la cancha.
          </Text>
        </View>

        {/* Bottom Return Action Button */}
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.returnBtn}
          activeOpacity={0.8}
        >
          <Home size={20} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.returnBtnText}>VOLVER A MIS PICKS</Text>
        </TouchableOpacity>

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
    padding: 12,
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
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
  highlightCard: {
    borderColor: 'rgba(0, 255, 157, 0.4)',
    backgroundColor: '#121c17',
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
    flex: 1,
  },
  boldNumber: {
    color: '#00FF9D',
    fontWeight: '900',
  },
  bulletText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
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
    fontWeight: '800',
  },
  boldYellow: {
    color: '#FBBF24',
    fontWeight: '800',
  },
  boldRed: {
    color: '#F87171',
    fontWeight: '800',
  },
  innerAlert: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 8,
  },
  alertText: {
    color: '#E5E5E5',
    fontSize: 13,
    lineHeight: 19,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#0F0F0F',
    padding: 10,
    borderRadius: 12,
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  badgeWin: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  badgeTextWin: {
    color: '#34D399',
    fontWeight: '900',
    fontSize: 12,
  },
  badgeDraw: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  badgeTextDraw: {
    color: '#FBBF24',
    fontWeight: '900',
    fontSize: 12,
  },
  badgeLoss: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  badgeTextLoss: {
    color: '#F87171',
    fontWeight: '900',
    fontSize: 12,
  },
  outcomeDesc: {
    color: '#CCCCCC',
    fontSize: 13,
    flex: 1,
  },
  innerNotice: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    marginTop: 6,
  },
  tieStep: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 22,
  },
  returnBtn: {
    backgroundColor: '#00FF9D',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#00FF9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  returnBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

