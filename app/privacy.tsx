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
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

export default function PrivacyScreen() {
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
            <Text style={styles.title}>Política de Privacidad</Text>
            <Text style={styles.subtitle}>Futvivor • Conforme a RGPD y LOPDGDD</Text>
          </View>
        </View>

        {/* Introduction Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>1. Responsable del Tratamiento</Text>
          </View>
          <Text style={styles.bodyText}>
            En <Text style={styles.bold}>Futvivor</Text>, nos tomamos muy en serio la
            privacidad y seguridad de tus datos. El responsable del tratamiento de
            los datos recabados en esta aplicación es el equipo desarrollador de
            Futvivor. Para cualquier consulta o ejercicio de derechos puedes contactar en{' '}
            <Text style={styles.boldPrimary}>contacto@futvivor.app</Text>.
          </Text>
        </View>

        {/* Data Collected */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Eye size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>2. Datos que Recopilamos</Text>
          </View>
          <Text style={styles.bodyText}>
            Recopilamos únicamente los datos necesarios para el correcto
            funcionamiento del juego:
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.bold}>Datos de Cuenta:</Text> Correo electrónico y nombre de usuario para gestionar tu acceso y clasificaciones.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.bold}>Datos de Juego:</Text> Selecciones semanales, puntos acumulados, historial de supervivencia y ligas a las que perteneces.
          </Text>
          <Text style={styles.bulletItem}>
            • <Text style={styles.bold}>Tokens de Notificación:</Text> Para enviarte alertas sobre plazos de picks y resultados (siempre bajo tu consentimiento).
          </Text>
        </View>

        {/* Data Purpose & Legal Basis */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Lock size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>3. Finalidad y Base Jurídica</Text>
          </View>
          <Text style={styles.bodyText}>
            La base legal para el tratamiento de tus datos es la{' '}
            <Text style={styles.bold}>ejecución del servicio (contrato)</Text> al
            registrarte en Futvivor para participar en los torneos y ligas con
            amigos. No comercializamos ni vendemos tus datos a terceros.
          </Text>
        </View>

        {/* User Rights & Account Deletion */}
        <View style={[styles.card, styles.highlightCard]}>
          <View style={styles.cardHeader}>
            <Trash2 size={20} color={COLORS.dead} />
            <Text style={[styles.cardTitle, { color: COLORS.textPrimary }]}>
              4. Tus Derechos y Eliminación de Cuenta
            </Text>
          </View>
          <Text style={styles.bodyText}>
            Conforme al Reglamento General de Protección de Datos (RGPD), puedes
            ejercer tus derechos de acceso, rectificación, supresión, limitación y
            portabilidad.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Puedes <Text style={styles.bold}>eliminar tu cuenta y todos tus datos</Text> en cualquier momento de forma instantánea desde la sección{' '}
            <Text style={styles.boldPrimary}>Perfil → Eliminar mi cuenta</Text> dentro de la aplicación.
          </Text>
        </View>

        {/* Security & Third Parties */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>5. Seguridad y Almacenamiento</Text>
          </View>
          <Text style={styles.bodyText}>
            Tus datos se almacenan de forma cifrada mediante infraestructura en la
            nube de Supabase (PostgreSQL) con estándares internacionales de
            seguridad y centros de datos en la Unión Europea.
          </Text>
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Mail size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>6. Contacto</Text>
          </View>
          <Text style={styles.bodyText}>
            Si tienes cualquier duda sobre nuestra política o sobre el tratamiento
            de tus datos, escríbenos a{' '}
            <Text style={styles.boldPrimary}>privacidad@futvivor.app</Text>.
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
    borderColor: 'rgba(255, 77, 77, 0.3)',
    backgroundColor: 'rgba(255, 77, 77, 0.03)',
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
  bulletItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  boldPrimary: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  updateDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
