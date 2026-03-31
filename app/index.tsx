import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { getCurrentUserId } from "../services/auth";

const LOGO = require("../assets/images/MEDIMATE LOGO V2.png");

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState<string | null>(null);
  const loadingAnim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(loadingAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
      loadingAnim.stopAnimation();
    };
  }, [loadingAnim]);

  const checkAuth = async () => {
    try {
      const onboardingDone = await AsyncStorage.getItem("onboarding_done");
      if (!onboardingDone) {
        setDestination("/onboarding");
        return;
      }

      const userId = await getCurrentUserId();
      if (userId) {
        setDestination("/(tabs)");
      } else {
        setDestination("/auth/login");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setDestination("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !destination) {
    const progressWidth = loadingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["18%", "66%"],
    });

    const progressTranslate = loadingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 88],
    });

    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.backgroundAccentTop} />
        <View style={styles.backgroundAccentBottom} />

        <View style={styles.content}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>MediMate</Text>
              <Text style={styles.brandTag}>Medicine support</Text>
            </View>
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>Preparing your workspace</Text>
            <Text style={styles.subtitle}>
              Scan, organize, and understand medication with a cleaner workflow.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.loadingTrack}>
            <Animated.View
              style={[
                styles.loadingFill,
                {
                  width: progressWidth,
                  transform: [{ translateX: progressTranslate }],
                },
              ]}
            />
          </View>
          <Text style={styles.footerText}>Loading your health tools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <Redirect href={destination as any} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  backgroundAccentTop: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(173, 227, 40, 0.12)",
  },
  backgroundAccentBottom: {
    position: "absolute",
    bottom: -70,
    left: -50,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(18, 52, 88, 0.05)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  logo: {
    width: 62,
    height: 62,
    resizeMode: "contain",
  },
  brandName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  brandTag: {
    marginTop: 2,
    fontSize: 13,
    color: "#6A717C",
  },
  copyBlock: {
    maxWidth: 320,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -1.1,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: "#5F6772",
  },
  footer: {
    gap: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#ECEEF2",
  },
  loadingTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#D9E0F4",
    overflow: "hidden",
  },
  loadingFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  footerText: {
    fontSize: 14,
    color: "#5F6772",
  },
});
