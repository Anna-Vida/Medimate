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
import { HeaderMetrics, Spacing } from "../constants/ui";
import {
  HeaderIconButton,
  HEADER_ICON_BUTTON_SIZE,
} from "./ui/header-icon-button";

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
        <HeaderIconButton
          icon={onBack ? "arrow-back" : undefined}
          onPress={onBack}
          disabled={!onBack}
          variant="dark"
        />

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

        <View style={styles.rightButton}>
          {rightIcon ? (
            <HeaderIconButton
              icon={rightIcon}
              onPress={onRightPress}
              disabled={!onRightPress}
              variant="dark"
            />
          ) : rightLabel ? (
            <TouchableOpacity
              onPress={onRightPress}
              disabled={!onRightPress}
              activeOpacity={0.8}
            >
              <Text style={styles.rightLabel}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptySide} />
          )}
        </View>
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
    paddingHorizontal: HeaderMetrics.horizontal,
    paddingTop: HeaderMetrics.compactTop,
    paddingBottom: HeaderMetrics.regularVertical,
    flexDirection: "row",
    alignItems: "center",
    gap: HeaderMetrics.contentGap,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  emptySide: {
    width: HEADER_ICON_BUTTON_SIZE,
    height: HEADER_ICON_BUTTON_SIZE,
  },
  center: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: HeaderMetrics.titleSize,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: HeaderMetrics.subtitleSize,
    marginTop: 2,
  },
  rightButton: {
    minWidth: HEADER_ICON_BUTTON_SIZE,
    minHeight: HEADER_ICON_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  rightLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    minHeight: HEADER_ICON_BUTTON_SIZE,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: HeaderMetrics.actionRadius,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    textAlign: "center",
    textAlignVertical: "center",
  },
});
