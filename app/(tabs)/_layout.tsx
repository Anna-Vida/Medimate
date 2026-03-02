import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

// Shared palette — matches home screen
const TEAL = "#2DD4BF";
const TEAL_DARK = "#0D9488";
const BAR_BG = "#FFFFFF";
const BAR_BG_END = "#F1F5F9";
const INACTIVE = "#94A3B8";
const ACTIVE_TEXT = "#0D9488";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_TEXT,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => (
          <View style={styles.tabBarBg}>
            <LinearGradient
              colors={[BAR_BG, BAR_BG_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Top teal accent line */}
            <View style={styles.accentLine} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan-history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? "time" : "time-outline"}
                size={22}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      {/* Center Scan Button — navigates to /scanner */}
      <Tabs.Screen
        name="scan-placeholder"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.centerBtnOuter}>
              <LinearGradient
                colors={[TEAL, TEAL_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.centerBtnGradient}
              >
                <Ionicons name="scan" size={28} color="#FFFFFF" />
              </LinearGradient>
              {/* Glow ring */}
              <View style={styles.centerGlowRing} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/scanner");
          },
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: "SOS",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? "warning" : "warning-outline"}
                size={22}
                color={focused ? "#EF4444" : color}
              />
              {focused && (
                <View style={[styles.activeDot, { backgroundColor: "#EF4444" }]} />
              )}
            </View>
          ),
          tabBarActiveTintColor: "#EF4444",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={22}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const TAB_HEIGHT = Platform.OS === "ios" ? 82 : 72;
const BOTTOM_PADDING = Platform.OS === "ios" ? 24 : 10;

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_HEIGHT,
    backgroundColor: "transparent",
    borderRadius: 0,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingBottom: BOTTOM_PADDING,
    paddingTop: 10,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    overflow: "hidden",
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: TEAL,
    borderRadius: 1,
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 4,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 30,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_TEXT,
    marginTop: 3,
  },
  centerBtnOuter: {
    position: "absolute",
    top: -28,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBtnGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: BAR_BG,
  },
  centerGlowRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(13, 148, 136, 0.2)",
  },
});
