import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/app-header";
import { Colors } from "../constants/Colors";
import { analyzeInteractions, InteractionReport } from "../services/gemini";
import { getRecentScans, SavedScan } from "../services/storage";
import { moderateScale, scale, verticalScale } from "../utils/responsive";
export default function InteractionResultScreen() {
  const { ids } = useLocalSearchParams();
  const router = useRouter();
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<InteractionReport | null>(null);
  useEffect(() => {
    if (ids) {
      try {
        const parsedIds = JSON.parse(ids as string);
        loadData(parsedIds);
      } catch {
        router.back();
      }
    }
  }, [ids]);
  const loadData = async (selectedIds: string[]) => {
    setLoading(true);
    const allScans = await getRecentScans();
    const selectedScans = allScans.filter((s) => selectedIds.includes(s.id));
    setScans(selectedScans);
    // Collect all primary medicines for interaction check
    const allMeds = selectedScans.flatMap((s) => s.analysis);
    try {
      const interaction = await analyzeInteractions(allMeds);
      setReport(interaction);
    } catch (e) {
      console.error(e);
      setReport({
        hasConflict: false,
        severity: "none",
        description:
          "Failed to analyze interactions. Please ensure you have an active internet connection.",
      });
    }
    setLoading(false);
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
        <AppHeader
          title="AI Safety Check"
          subtitle="Drug interaction analysis"
          onBack={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTitle}>Analyzing Combinations...</Text>
          <Text style={styles.loadingSub}>
            Checking selected medicines for possible interactions.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!report) return null;
  const bgColor =
    report.severity === "high"
      ? Colors.errorBg
      : report.severity === "medium"
        ? Colors.warningBg
        : Colors.successBg;
  const borderColor =
    report.severity === "high"
      ? Colors.errorBorder
      : report.severity === "medium"
        ? Colors.warningBorder
        : Colors.successBorder;
  const iconColor =
    report.severity === "high"
      ? Colors.error
      : report.severity === "medium"
        ? Colors.warning
        : Colors.success;
  const iconName =
    report.severity === "high"
      ? "dangerous"
      : report.severity === "medium"
        ? "warning"
        : "verified-user";
  const titleText =
    report.severity === "none"
      ? "Safe Combination"
      : report.severity === "high"
        ? "High Risk Interaction"
        : "Caution Advised";
  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <AppHeader
        title="AI Safety Check"
        subtitle="Drug interaction analysis"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {scans.length} medicine(s) checked
          </Text>
        </View>

        <Animated.View
          entering={FadeInDown.duration(600).springify()}
          style={[styles.resultCard, { borderColor }]}
        >
          <View style={[styles.resultHeader, { backgroundColor: bgColor }]}>
            <View
              style={[styles.iconWrap, { backgroundColor: iconColor + "15" }]}
            >
              <MaterialIcons
                name={iconName}
                size={scale(32)}
                color={iconColor}
              />
            </View>
            <Text style={[styles.resultTitle, { color: iconColor }]}>
              {titleText}
            </Text>
          </View>
          <View
            style={[
              styles.resultBody,
              report.severity === "high"
                ? { backgroundColor: Colors.errorBgLight }
                : {},
            ]}
          >
            <Text
              style={[
                styles.resultDesc,
                report.severity === "high" ? { color: Colors.errorText } : {},
              ]}
            >
              {report.description}
            </Text>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Text style={styles.sectionTitle}>Selected Medicines</Text>
          <View style={styles.medsList}>
            {scans.map((scan, i) => (
              <TouchableOpacity
                key={scan.id}
                style={styles.medCard}
                activeOpacity={0.7}
                onPress={() => {
                  router.push({
                    pathname: "/medicine-details",
                    params: {
                      scanData: JSON.stringify(scan),
                      medicineData: JSON.stringify(scan.analysis),
                    },
                  });
                }}
              >
                <View style={styles.medCardHeader}>
                  <Text style={styles.medName} numberOfLines={1}>
                    {scan.analysis[0].medicineName}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color="#94A3B8"
                  />
                </View>
                <Text style={styles.medUses} numberOfLines={2}>
                  {scan.analysis[0].commonUses}
                </Text>
                <View style={styles.ingredientBadge}>
                  <Text style={styles.ingredientText} numberOfLines={1}>
                    {scan.analysis[0].activeIngredients}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={styles.actionWrap}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Close Analysis</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(12),
    backgroundColor: Colors.background,
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  content: {
    padding: scale(20),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(28),
  },
  metaRow: {
    marginBottom: verticalScale(12),
  },
  metaText: {
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(40),
  },
  loadingTitle: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: verticalScale(24),
  },
  loadingSub: {
    fontSize: moderateScale(15),
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: verticalScale(12),
    lineHeight: 24,
    fontWeight: "500",
  },
  resultCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    marginBottom: verticalScale(32),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 16,
  },
  iconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    letterSpacing: -0.5,
    flex: 1,
  },
  resultBody: {
    padding: scale(20),
    backgroundColor: "#FAFAFA",
  },
  resultDesc: {
    fontSize: moderateScale(15),
    color: Colors.primaryDark,
    lineHeight: 24,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: verticalScale(16),
    letterSpacing: -0.2,
  },
  medsList: {
    gap: verticalScale(12),
  },
  medCard: {
    backgroundColor: Colors.cardBackground,
    padding: scale(20),
    borderRadius: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  medCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  medName: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: scale(12),
    letterSpacing: -0.2,
  },
  medUses: {
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: verticalScale(16),
    lineHeight: 22,
  },
  ingredientBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.background,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 10,
  },
  ingredientText: {
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  actionWrap: {
    marginTop: verticalScale(20),
  },
  doneBtn: {
    backgroundColor: Colors.primaryDark,
    paddingVertical: verticalScale(16),
    borderRadius: 20,
    alignItems: "center",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  doneBtnText: {
    color: Colors.buttonText,
    fontSize: moderateScale(17),
    fontWeight: "700",
  },
});
