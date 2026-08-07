import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { useRouter } from 'expo-router';
import { ShieldAlert, BookOpen, Clock, Award, AlertTriangle, ArrowLeft } from 'lucide-react-native';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouch = styled(TouchableOpacity);

export default function RulesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="p-5">
        {/* Header */}
        <StyledView className="flex-row items-center mb-6 mt-2">
          {router.canGoBack() && (
            <StyledTouch 
              onPress={() => router.back()}
              className="mr-3 p-2 bg-surface rounded-full border border-gray-800"
            >
              <ArrowLeft size={20} color="#00FF9D" />
            </StyledTouch>
          )}
          <StyledView>
            <StyledText className="text-white text-3xl font-black">Reglamento</StyledText>
            <StyledText className="text-muted text-sm">Survivor Football La Liga 26/27</StyledText>
          </StyledView>
        </StyledView>

        {/* Section 1: Objetivo y Dinámica */}
        <StyledView className="bg-surface rounded-3xl p-5 mb-5 border border-gray-800">
          <StyledView className="flex-row items-center mb-3">
            <BookOpen size={22} color="#00FF9D" />
            <StyledText className="text-primary text-xl font-bold ml-2">1. Objetivo y Dinámica</StyledText>
          </StyledView>
          <StyledText className="text-gray-300 leading-6 mb-2">
            • <StyledText className="font-bold text-white">Objetivo:</StyledText> Ser el último mánager en pie (Last Man Standing) o acumular la mayor cantidad de puntos/goles.
          </StyledText>
          <StyledText className="text-gray-300 leading-6 mb-2">
            • <StyledText className="font-bold text-white">El Pick Semanal:</StyledText> Eliges <StyledText className="text-primary font-bold">1 equipo</StyledText> por cada pick que tengas activo en cada jornada.
          </StyledText>
          <StyledText className="text-gray-300 leading-6 mb-2">
            • <StyledText className="font-bold text-green-400">Si tu equipo GANA:</StyledText> Avanzas de jornada sin perder vidas.
          </StyledText>
          <StyledText className="text-gray-300 leading-6 mb-2">
            • <StyledText className="font-bold text-red-400">Si EMPATA o PIERDE:</StyledText> Tu pick pierde 1 vida. Si llega a 0 vidas, queda eliminado (RIP).
          </StyledText>
          <StyledText className="text-gray-300 leading-6">
            • <StyledText className="font-bold text-white">Regla de Equipos Usados:</StyledText> No puedes repetir equipo con la misma vida durante el torneo. Cada selección "quema" al equipo para ese pick.
          </StyledText>
        </StyledView>

        {/* Section 2: Cierre de Jornada y Deadline */}
        <StyledView className="bg-surface rounded-3xl p-5 mb-5 border border-gray-800">
          <StyledView className="flex-row items-center mb-3">
            <Clock size={22} color="#00FF9D" />
            <StyledText className="text-primary text-xl font-bold ml-2">2. Cierre y Deadlines</StyledText>
          </StyledView>
          <StyledText className="text-gray-300 leading-6 mb-2">
            • La selección se cierra exactamente a la fecha y hora del <StyledText className="font-bold text-white">primer partido de la jornada</StyledText> (o según la hora configurada de la liga).
          </StyledText>
          <StyledText className="text-gray-300 leading-6">
            • Si no eliges equipo antes del cierre, tu pick no acumula puntos y puede sufrir la pérdida automática de una vida si no se disputa ningún partido posterior disponible.
          </StyledText>
        </StyledView>

        {/* Section 3: Partidos Aplazados y Jornadas Largas */}
        <StyledView className="bg-surface rounded-3xl p-5 mb-5 border border-amber-500/40">
          <StyledView className="flex-row items-center mb-3">
            <AlertTriangle size={22} color="#F59E0B" />
            <StyledText className="text-amber-400 text-xl font-bold ml-2">3. Partidos Aplazados y J1</StyledText>
          </StyledView>
          <StyledText className="text-gray-300 leading-6 mb-3">
            Las jornadas cubren exclusivamente los partidos jugados dentro de la <StyledText className="font-bold text-white">ventana oficial previa al inicio de la siguiente jornada</StyledText>.
          </StyledText>
          <StyledView className="bg-gray-900/60 p-4 rounded-2xl border border-gray-800 mb-3">
            <StyledText className="text-amber-300 font-bold mb-1">Caso J1 (Mundial 2026):</StyledText>
            <StyledText className="text-gray-300 text-xs leading-5">
              Si un partido de la jornada 1 se disputa semanas después (después de que haya arrancado la Jornada 2), la jornada Survivor se resuelve con los partidos jugados en la ventana original.
            </StyledText>
          </StyledView>
          <StyledText className="text-gray-300 leading-6 mb-2">
            • <StyledText className="font-bold text-white">Aplazamiento conocido antes de J1:</StyledText> El partido queda deshabilitado para elegirse.
          </StyledText>
          <StyledText className="text-gray-300 leading-6">
            • <StyledText className="font-bold text-white">Suspensión de última hora:</StyledText> Se otorga <StyledText className="text-primary font-bold">Pase Libre</StyledText> (avanzas de jornada sin perder vida, pero el equipo seleccionado queda consumido).
          </StyledText>
        </StyledView>

        {/* Section 4: Criterios de Desempate */}
        <StyledView className="bg-surface rounded-3xl p-5 mb-8 border border-gray-800">
          <StyledView className="flex-row items-center mb-3">
            <Award size={22} color="#00FF9D" />
            <StyledText className="text-primary text-xl font-bold ml-2">4. Desempates y Puntos</StyledText>
          </StyledView>
          <StyledText className="text-gray-300 leading-6 mb-2">
            1. <StyledText className="font-bold text-white">Estado de Vida:</StyledText> Varios supervivientes priman sobre eliminados.
          </StyledText>
          <StyledText className="text-gray-300 leading-6 mb-2">
            2. <StyledText className="font-bold text-white">Puntos Totales:</StyledText> Acumulado de victorias de tus equipos elegidos.
          </StyledText>
          <StyledText className="text-gray-300 leading-6">
            3. <StyledText className="font-bold text-white">Goles a Favor (GF):</StyledText> Total de goles anotados por los equipos elegidos en tus picks victoriosos.
          </StyledText>
        </StyledView>

        <StyledView className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
