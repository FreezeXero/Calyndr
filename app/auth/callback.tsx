import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/Colors';
import { handleOAuthCallbackUrl } from '@/lib/oauthCallback';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const ok = await handleOAuthCallbackUrl(url);
      if (ok) router.replace('/');
    };

    void Linking.getInitialURL().then(url => {
      if (url) void handleUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => void handleUrl(url));
    return () => sub.remove();
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
}
