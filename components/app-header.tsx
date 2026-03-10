import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { Radius, Spacing } from "../constants/ui";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightLabel?: string;
}

export default function AppHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightLabel,
}: AppHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.sideButton}
          onPress={onBack}
          disabled={!onBack}
          activeOpacity={0.8}
        >
          {onBack ? (
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          ) : (
            <View style={styles.emptySide} />
          )}
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={onRightPress}
          disabled={!onRightPress}
          activeOpacity={0.8}
        >
          {rightIcon ? (
            <Ionicons name={rightIcon} size={19} color="#FFFFFF" />
          ) : rightLabel ? (
            <Text style={styles.rightLabel}>{rightLabel}</Text>
          ) : (
            <View style={styles.emptySide} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.primaryDark,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  sideButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  emptySide: {
    width: 16,
    height: 16,
  },
  center: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    marginTop: 1,
  },
  rightLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
