import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useLeagues } from './useLeagues';

export function useDeepLinks() {
  const router = useRouter();
  const { joinLeagueByCode } = useLeagues();

  useEffect(() => {
    // Handle URL when app is opened from a link
    function handleUrl(url: string | null) {
      if (!url) return;

      const parsed = Linking.parse(url);
      const path = parsed.path;
      const queryParams = parsed.queryParams;

      // Pattern: /join/:code or ?join=code or futvivor://join/ABC123
      if (path && path.startsWith('join/')) {
        const inviteCode = path.replace('join/', '').toUpperCase();
        if (inviteCode) {
          joinLeagueByCode(inviteCode);
        }
      } else if (queryParams && queryParams.join) {
        const inviteCode = String(queryParams.join).toUpperCase();
        if (inviteCode) {
          joinLeagueByCode(inviteCode);
        }
      }
    }

    // Check initial URL
    Linking.getInitialURL().then(handleUrl);

    // Listen to incoming URLs
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);
}
