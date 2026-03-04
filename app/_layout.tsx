import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

const ONBOARDING_KEY = 'onboarding_done';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isSupposedOnboarding, setIsSupposedOnboarding] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // Check if user completed onboarding
      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);

      // Listen to Firebase auth state
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setReady(true);

        if (user) {
          // User is logged in - go to home
          setTimeout(() => router.replace('/(tabs)'), 50);
        } else {
          // User is not logged in
          if (!onboardingDone) {
            // First time user - show onboarding
            setIsSupposedOnboarding(true);
            setTimeout(() => router.replace('/onboarding'), 50);
          } else {
            // User completed onboarding but not logged in - show login
            setTimeout(() => router.replace('/auth/login'), 50);
          }
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Auth check error:', error);
      setReady(true);
    }
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="medications" options={{ headerShown: false }} />
        <Stack.Screen name="scan-history" options={{ headerShown: false }} />
        <Stack.Screen name="pharmacy-finder" options={{ headerShown: false }} />
        <Stack.Screen name="medicine-details" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="interaction-result" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
