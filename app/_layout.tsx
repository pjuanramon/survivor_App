import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import { useDeepLinks } from '../hooks/useDeepLinks';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Initialize universal links & deep links handler
  useDeepLinks();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'survivor-global-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body {
            background-color: #0A0A0A !important;
            color: #FFFFFF !important;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            width: 100%;
            overflow-x: hidden;
            overflow-y: auto !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          #root, #root > div {
            background-color: #0A0A0A !important;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            flex: 1;
            width: 100%;
          }
          * {
            box-sizing: border-box;
          }
          input, button, select, textarea {
            font-family: inherit;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (!initialized || !fontsLoaded) return;

    async function checkAuthAndNavigate() {
      if (!session) {
        if (segments.length > 0) {
          router.replace('/');
        }
      } else {
        const { data: entries } = await supabase
          .from('sur_entries')
          .select('id')
          .eq('player_id', session.user.id);

        const currentRoute = segments.join('/');
        if (!entries || entries.length === 0) {
          if (currentRoute !== 'onboarding') {
            router.replace('/onboarding');
          }
        } else {
          if (currentRoute === '' || currentRoute === 'onboarding') {
            router.replace('/(tabs)');
          }
        }
      }
      SplashScreen.hideAsync();
    }

    checkAuthAndNavigate();
  }, [session, initialized, segments, fontsLoaded]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="rules" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}
