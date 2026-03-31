import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { HeaderMetrics } from "../../constants/ui";

export const HEADER_ICON_BUTTON_SIZE = HeaderMetrics.actionSize;
export const HEADER_ICON_BUTTON_RADIUS = HeaderMetrics.actionRadius;

type HeaderIconButtonProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: "light" | "dark";
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function HeaderIconButton({
  icon,
  onPress,
  variant = "light",
  iconColor,
  style,
  disabled = false,
}: HeaderIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.8}
      style={[
        styles.base,
        variant === "dark" ? styles.dark : styles.light,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={iconColor ?? (variant === "dark" ? "#FFFFFF" : "#123458")}
        />
      ) : (
        <View style={styles.placeholder} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: HEADER_ICON_BUTTON_SIZE,
    height: HEADER_ICON_BUTTON_SIZE,
    borderRadius: HEADER_ICON_BUTTON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  light: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8DCE2",
  },
  dark: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  disabled: {
    opacity: 0.7,
  },
  placeholder: {
    width: 20,
    height: 20,
  },
});
