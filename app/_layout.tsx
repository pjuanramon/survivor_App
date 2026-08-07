import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
  });

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
        // If not logged in and not at root/index, go to root (login)
        if (segments.length > 0) {
          router.replace('/');
        }
      } else {
        // User is logged in
        // Check if user already has entries
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="rules" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
