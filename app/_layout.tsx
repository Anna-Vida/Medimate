import { useColorScheme } from "@/hooks/use-color-scheme";
import { auth } from "@/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";

const ONBOARDING_KEY = "onboarding_done";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    let isMounted = true;

    const init = async () => {
      try {
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!isMounted) return;

          setReady(true);
          if (user) {
            setTimeout(() => router.replace("/(tabs)"), 50);
            return;
          }

          if (!onboardingDone) {
            setTimeout(() => router.replace("/onboarding"), 50);
          } else {
            setTimeout(() => router.replace("/auth/login"), 50);
          }
        });
      } catch (error) {
        console.error("Auth check error:", error);
        if (isMounted) {
          setReady(true);
        }
      }
    };

    void init();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: "#F8FAFC" }} />;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="chatbot" options={{ headerShown: false }} />
        <Stack.Screen name="medications" options={{ headerShown: false }} />
        <Stack.Screen name="add-schedule" options={{ headerShown: false }} />
        <Stack.Screen name="inventory" options={{ headerShown: false }} />
        <Stack.Screen name="emergency" options={{ headerShown: false }} />
        <Stack.Screen name="translator" options={{ headerShown: false }} />
        <Stack.Screen name="scan-history" options={{ headerShown: false }} />
        <Stack.Screen name="pharmacy-finder" options={{ headerShown: false }} />
        <Stack.Screen
          name="medicine-details"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="interaction-result"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
