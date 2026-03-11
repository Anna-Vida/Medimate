import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Colors } from "../../constants/Colors";

const TEAL = Colors.primary;
const TEAL_DARK = Colors.primaryDark;
const BAR_BG = Colors.surface;
const BAR_BG_END = "#F1F5F9";
const INACTIVE = Colors.textTertiary;
const ACTIVE_TEXT = Colors.primaryDark;

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
                <View
                  style={[styles.activeDot, { backgroundColor: "#EF4444" }]}
                />
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

const TAB_HEIGHT = Platform.OS === "ios" ? 74 : 64;
const BOTTOM_PADDING = Platform.OS === "ios" ? 16 : 8;

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
    paddingTop: 8,
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
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  tabItem: {
    paddingTop: 2,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 28,
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
    top: -22,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBtnGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: BAR_BG,
  },
  centerGlowRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: `${Colors.primary}33`,
  },
});
