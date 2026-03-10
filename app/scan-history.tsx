import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import AppHeader from "../components/app-header";
import { Colors, Shadows } from "../constants/Colors";
import { checkDrugInteraction } from "../services/gemini";
import { clearScans, getRecentScans, SavedScan } from "../services/storage";
import { moderateScale, scale, verticalScale } from "../utils/responsive";

type SortType = "newest" | "oldest";

interface SelectedMedicine {
  name: string;
  dosage?: string;
}

interface InteractionResult {
  isSafe: boolean;
  interaction: string;
  sidesEffects: string[];
  recommendation: string;
}

export default function ScanHistoryScreen() {
  const router = useRouter();
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("newest");
  const [selectedMeds, setSelectedMeds] = useState<SelectedMedicine[]>([]);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionResult, setInteractionResult] =
    useState<InteractionResult | null>(null);
  const [checkingInteraction, setCheckingInteraction] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await getRecentScans();
    setScans(data);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const data = await getRecentScans();
    setScans(data);
    setRefreshing(false);
  }, []);

  const handleClearAll = () => {
    Alert.alert(
      "Clear History",
      "Delete all scan history? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearScans();
            setScans([]);
          },
        },
      ],
    );
  };

  const handleMedicinePress = (medicineName: string, dosage?: string) => {
    setSelectedMeds((prev) => {
      const exists = prev.some(
        (m) => m.name.toLowerCase() === medicineName.toLowerCase(),
      );
      if (exists) {
        return prev.filter(
          (m) => m.name.toLowerCase() !== medicineName.toLowerCase(),
        );
      }
      if (prev.length >= 2) {
        Alert.alert(
          "Limit Reached",
          "Select up to 2 medicines to check interactions",
        );
        return prev;
      }
      return [...prev, { name: medicineName, dosage }];
    });
  };

  const checkInteraction = async () => {
    if (selectedMeds.length < 2) {
      Alert.alert(
        "Select Medicines",
        "Please select 2 different medicines to check interactions",
      );
      return;
    }

    try {
      setCheckingInteraction(true);
      const result = await checkDrugInteraction(
        selectedMeds[0].name,
        selectedMeds[1].name,
      );

      if (!result || !result.interaction) {
        Alert.alert("Error", "Unable to check interaction. Please try again.");
        return;
      }

      setInteractionResult(result);
      setShowInteractionModal(true);
    } catch (error) {
      console.error("Interaction check error:", error);
      Alert.alert(
        "Error",
        "Failed to check drug interactions. Please verify your medicines and try again.",
      );
    } finally {
      setCheckingInteraction(false);
    }
  };

  const clearSelection = () => {
    setSelectedMeds([]);
    setInteractionResult(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return d.toLocaleDateString("en-PH", { weekday: "short" });
    }
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  const getStatusInfo = (warnings?: string) => {
    if (!warnings || warnings === "None")
      return { label: "Safe", color: Colors.success, bg: Colors.primaryBg };
    const w = warnings.toLowerCase();
    if (w.includes("severe") || w.includes("stop"))
      return { label: "Warning", color: Colors.error, bg: Colors.errorBg };
    if (w.includes("caution") || w.includes("avoid"))
      return { label: "Caution", color: Colors.warning, bg: Colors.warningBg };
    return { label: "Info", color: Colors.primary, bg: Colors.primaryBg };
  };

  const sorted = useMemo(() => {
    let result = scans.filter((scan) =>
      scan.analysis.some((m) =>
        m.medicineName.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
    result.sort((a, b) =>
      sortBy === "newest"
        ? b.timestamp - a.timestamp
        : a.timestamp - b.timestamp,
    );
    return result;
  }, [scans, searchQuery, sortBy]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; scans: SavedScan[] }[] = [];
    const map = new Map<string, SavedScan[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sorted.forEach((scan) => {
      const d = new Date(scan.timestamp);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor(
        (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
      );
      let label = d.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      if (diff === 0) label = "Today";
      else if (diff === 1) label = "Yesterday";
      else if (diff < 7) label = "This Week";

      if (!map.has(label)) {
        map.set(label, []);
        groups.push({ label, scans: map.get(label)! });
      }
      map.get(label)!.push(scan);
    });
    return groups;
  }, [sorted]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <AppHeader
        title="Scan History"
        subtitle={`${scans.length} prescription${scans.length !== 1 ? "s" : ""} scanned`}
        onBack={() => router.back()}
      />

      {/* Header tools */}
      <View style={styles.headerTools}>
        {scans.length > 0 && (
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              onPress={() =>
                setSortBy(sortBy === "newest" ? "oldest" : "newest")
              }
              style={styles.headerAction}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-vertical" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearAll}
              style={[
                styles.headerAction,
                {
                  backgroundColor: Colors.surfaceHighlight,
                  borderColor: Colors.border,
                  borderWidth: 1,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Search */}
        {scans.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicine name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Selected Medicines Bar */}
        {selectedMeds.length > 0 && (
          <View style={styles.selectedBar}>
            <View style={styles.selectedMeds}>
              {selectedMeds.map((med, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.selectedMedBadge}
                  onPress={() => handleMedicinePress(med.name, med.dosage)}
                >
                  <Text style={styles.selectedMedText} numberOfLines={1}>
                    {med.name}
                  </Text>
                  <Ionicons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.checkBtn, checkingInteraction && { opacity: 0.6 }]}
              onPress={checkInteraction}
              disabled={checkingInteraction}
            >
              {checkingInteraction ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="flask" size={16} color="#FFF" />
                  <Text style={styles.checkBtnText}>Check</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          sorted.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.emptyTitle}>Loading...</Text>
          </View>
        ) : scans.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
            <Text style={styles.emptySub}>
              Scan your first prescription to start tracking
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/scanner")}
              activeOpacity={0.85}
              style={styles.emptyBtn}
            >
              <Ionicons name="scan" size={20} color="#FFF" />
              <Text style={styles.emptyBtnText}>Scan Now</Text>
            </TouchableOpacity>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Results</Text>
            <Text style={styles.emptySub}>Try a different search term</Text>
          </View>
        ) : (
          grouped.map((group, gi) => (
            <Animated.View
              key={group.label}
              entering={FadeInUp.duration(300).delay(gi * 60)}
            >
              {/* Date Group Header */}
              <Text style={styles.dateLabel}>{group.label}</Text>

              {/* Prescription Card */}
              <View style={styles.rxCard}>
                {group.scans.map((scan, si) => {
                  const meds = scan.analysis;
                  const isLast = si === group.scans.length - 1;

                  return (
                    <TouchableOpacity
                      key={scan.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        router.push({
                          pathname: "/medicine-details",
                          params: {
                            scanData: JSON.stringify(scan),
                            medicineData: JSON.stringify(meds),
                          },
                        });
                      }}
                    >
                      <View
                        style={[styles.rxRow, !isLast && styles.rxRowBorder]}
                      >
                        {/* Rx Symbol */}
                        <View style={styles.rxSymbol}>
                          <Text style={styles.rxText}>Rx</Text>
                        </View>

                        {/* Medicine Info */}
                        <View style={styles.rxInfo}>
                          {meds.map((m, mi) => {
                            const isSelected = selectedMeds.some(
                              (sm) =>
                                sm.name.toLowerCase() ===
                                m.medicineName.toLowerCase(),
                            );
                            return (
                              <TouchableOpacity
                                key={mi}
                                style={[
                                  styles.medRow,
                                  isSelected && styles.medRowSelected,
                                ]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleMedicinePress(m.medicineName, m.dosage);
                                }}
                                activeOpacity={0.6}
                              >
                                {isSelected && (
                                  <View style={styles.checkmark}>
                                    <Ionicons
                                      name="checkmark"
                                      size={12}
                                      color="#FFF"
                                    />
                                  </View>
                                )}
                                <View>
                                  <Text style={styles.rxName} numberOfLines={1}>
                                    {m.medicineName}
                                  </Text>
                                  {m.dosage ? (
                                    <Text
                                      style={styles.rxDosage}
                                      numberOfLines={1}
                                    >
                                      {m.dosage}
                                    </Text>
                                  ) : null}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                          {meds.length > 2 && (
                            <Text style={styles.rxMore}>
                              +{meds.length - 2} more
                            </Text>
                          )}
                        </View>

                        {/* Right side: status + time */}
                        <View style={styles.rxRight}>
                          {(() => {
                            const status = getStatusInfo(meds[0]?.warnings);
                            return (
                              <View
                                style={[
                                  styles.statusPill,
                                  {
                                    backgroundColor: status.bg,
                                    borderColor: status.color,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.statusDot,
                                    { backgroundColor: status.color },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.statusLabel,
                                    { color: status.color },
                                  ]}
                                >
                                  {status.label}
                                </Text>
                              </View>
                            );
                          })()}
                          <Text style={styles.rxTime}>
                            {formatDate(scan.timestamp)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          ))
        )}

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* Interaction Modal */}
      <Modal
        visible={showInteractionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowInteractionModal(false);
          clearSelection();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <AppHeader
            title="Drug Interaction Check"
            subtitle="Safety summary"
            onBack={() => {
              setShowInteractionModal(false);
              clearSelection();
            }}
          />

          {checkingInteraction ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                Checking drug interaction...
              </Text>
            </View>
          ) : interactionResult ? (
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentInner}
              showsVerticalScrollIndicator={false}
            >
              {/* Medicines */}
              <View style={styles.medicinesSection}>
                <Text style={styles.sectionTitle}>Selected Medicines</Text>
                <View style={styles.medicinesList}>
                  {selectedMeds.map((med, idx) => (
                    <View key={idx} style={styles.medicineCard}>
                      <Ionicons name="flask" size={20} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medName}>{med.name}</Text>
                        {med.dosage && (
                          <Text style={styles.medDosage}>{med.dosage}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Interaction Status */}
              <View
                style={[
                  styles.statusSection,
                  {
                    backgroundColor: interactionResult.isSafe
                      ? Colors.primaryBg
                      : Colors.errorBg,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={[
                      styles.statusIcon,
                      {
                        backgroundColor: interactionResult.isSafe
                          ? Colors.success
                          : Colors.error,
                      },
                    ]}
                  >
                    <Ionicons
                      name={interactionResult.isSafe ? "checkmark" : "warning"}
                      size={24}
                      color="#FFF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>
                      {interactionResult.isSafe
                        ? "Safe to Combine"
                        : "Interaction Detected"}
                    </Text>
                    <Text style={styles.statusSubtitle}>
                      {interactionResult.interaction}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Side Effects */}
              {interactionResult.sidesEffects.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Possible Side Effects</Text>
                  <View style={styles.effectsList}>
                    {interactionResult.sidesEffects.map((effect, idx) => (
                      <View key={idx} style={styles.effectItem}>
                        <View style={styles.effectDot} />
                        <Text style={styles.effectText}>{effect}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Recommendation */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommendation</Text>
                <View style={styles.recommendationBox}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.recommendationText}>
                    {interactionResult.recommendation}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.checkAgainBtn}
                  onPress={() => {
                    setShowInteractionModal(false);
                    clearSelection();
                  }}
                >
                  <Text style={styles.checkAgainText}>Check Another Pair</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },

  // Header tools under the shared app header
  headerTools: {
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(12),
    paddingHorizontal: scale(20),
    backgroundColor: "#F8FAFC",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(14),
  },
  headerActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: moderateScale(13),
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    width: scale(38),
    height: scale(38),
    borderRadius: 12,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: scale(14),
    height: verticalScale(44),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    fontWeight: "500",
  },

  body: { flex: 1 },
  bodyContent: { paddingHorizontal: scale(20), paddingTop: verticalScale(8) },

  // Date Group Label
  dateLabel: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
    textTransform: "uppercase",
  },

  // Prescription Card (groups scans under a single card)
  rxCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginBottom: verticalScale(8),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Shadows.small?.shadowColor || "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },

  rxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    gap: scale(12),
  },
  rxRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceHighlight,
  },

  // Rx symbol
  rxSymbol: {
    width: scale(36),
    height: scale(36),
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rxText: {
    fontSize: moderateScale(14),
    fontWeight: "800",
    color: Colors.primary,
    fontStyle: "italic",
  },

  // Medicine info
  rxInfo: { flex: 1 },
  rxName: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  rxDosage: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rxMore: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: Colors.primary,
    marginTop: 4,
  },

  // Right side
  rxRight: { alignItems: "flex-end", gap: 6 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: moderateScale(12), fontWeight: "700" },
  rxTime: {
    fontSize: moderateScale(11),
    fontWeight: "500",
    color: Colors.textTertiary,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: moderateScale(14),
    color: Colors.textTertiary,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: moderateScale(15),
  },

  // Selected Medicines Bar
  selectedBar: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    marginTop: verticalScale(8),
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    justifyContent: "space-between",
  },
  selectedMeds: {
    flex: 1,
    flexDirection: "row",
    gap: scale(8),
    flexWrap: "wrap",
    alignItems: "center",
  },
  selectedMedBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    maxWidth: "70%",
  },
  selectedMedText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: moderateScale(12),
    flexShrink: 1,
  },
  checkBtn: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    minWidth: scale(70),
    justifyContent: "center",
  },
  checkBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: moderateScale(12),
  },
  medRow: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(8),
    borderRadius: 8,
    marginBottom: verticalScale(6),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  medRowSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  checkmark: {
    width: scale(18),
    height: scale(18),
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
  },
  modalContentInner: {
    paddingBottom: verticalScale(24),
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(16),
  },
  loadingText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  medicinesSection: {
    marginBottom: verticalScale(24),
  },
  medicinesList: {
    gap: verticalScale(10),
  },
  medicineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: scale(14),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: scale(12),
  },
  medName: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  medDosage: {
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusSection: {
    padding: scale(16),
    borderRadius: 12,
    marginBottom: verticalScale(20),
  },
  statusIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: moderateScale(15),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  statusSubtitle: {
    fontSize: moderateScale(13),
    fontWeight: "500",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontSize: moderateScale(15),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: verticalScale(10),
  },
  effectsList: {
    gap: verticalScale(8),
  },
  effectItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    padding: scale(12),
    borderRadius: 10,
    gap: scale(10),
  },
  effectDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: verticalScale(6),
  },
  effectText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontWeight: "500",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  recommendationBox: {
    flexDirection: "row",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: scale(14),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: scale(10),
  },
  recommendationText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontWeight: "500",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  actionButtons: {
    gap: verticalScale(10),
  },
  checkAgainBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(14),
    borderRadius: 12,
    alignItems: "center",
  },
  checkAgainText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: moderateScale(14),
  },
});
