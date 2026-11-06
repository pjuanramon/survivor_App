import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { Platform, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useDeepLinks } from '../hooks/useDeepLinks';
import { COLORS } from '../constants/colors';

// Prevent auto hide on native only
if (Platform.OS !== 'web') {
  try {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  } catch (e) {}
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Initialize universal links & deep links handler safely
  useDeepLinks();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
  });

  // Inject web reset styles
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'survivor-global-styles';
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        html, body {
          background-color: ${COLORS.background} !important;
          color: ${COLORS.textPrimary} !important;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          overflow-y: auto !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        #root, #root > div {
          background-color: ${COLORS.background} !important;
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
    }
  }, []);

  // Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Auth & User Journey gatekeeper
  useEffect(() => {
    if (!initialized) return;
    if (Platform.OS !== 'web' && !fontsLoaded && !fontError) return;

    async function checkAuthAndNavigate() {
      try {
        const currentRoute = segments.join('/');
        const isPublicDoc =
          currentRoute === 'rules' ||
          currentRoute === 'privacy' ||
          currentRoute === 'terms';

        if (!session) {
          if (segments.length > 0 && segments[0] === '(tabs)') {
            router.replace('/');
          } else if (currentRoute === 'onboarding') {
            router.replace('/');
          }
        } else {
          const [{ data: entries }, { data: memberships }] = await Promise.all([
            supabase
              .from('sur_entries')
              .select('id')
              .eq('player_id', session.user.id)
              .limit(1),
            supabase
              .from('sur_league_members')
              .select('league_id')
              .eq('user_id', session.user.id)
              .limit(1),
          ]);

          const hasArenaEnrolled =
            (entries && entries.length > 0) ||
            (memberships && memberships.length > 0);

          if (!hasArenaEnrolled) {
            if (currentRoute !== 'onboarding' && !isPublicDoc) {
              router.replace('/onboarding');
            }
          } else {
            if (currentRoute === '' || currentRoute === 'onboarding') {
              router.replace('/(tabs)');
            }
          }
        }
      } catch (err) {
        console.error('Navigation gate error:', err);
      } finally {
        if (Platform.OS !== 'web') {
          try {
            SplashScreen.hideAsync().catch(() => {});
          } catch (e) {}
        }
      }
    }

    checkAuthAndNavigate();
  }, [session, initialized, segments, fontsLoaded, fontError]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
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
