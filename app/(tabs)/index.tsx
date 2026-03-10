import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppTheme from "../../constants/Colors";
import { Radius, Spacing } from "../../constants/ui";
import { moderateScale, scale, verticalScale } from "../../utils/responsive";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Colors: any = (AppTheme as any).Colors ?? (AppTheme as any);
const Shadows: any = (AppTheme as any).Shadows ?? {};

export default function App() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return unsub;
  }, []);
  const [locationActive, setLocationActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  // Status dot pulse
  const statusPulse = useSharedValue(1);
  useEffect(() => {
    statusPulse.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, [statusPulse]);

  const statusDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statusPulse.value }],
  }));

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Fetch location function
  const fetchLocation = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationActive(status === "granted");

    if (status === "granted") {
      try {
        setFetchingLocation(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        };
        setCurrentLocation(coords);

        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: coords.lat,
            longitude: coords.lon,
          });
          if (geo) {
            const parts = [
              geo.street,
              geo.district,
              geo.city,
              geo.region,
            ].filter(Boolean);
            setAddress(parts.join(", ") || "Unknown Location");
          }
        } catch (geoErr) {
          console.log("Geocode error:", geoErr);
        }
      } catch (error) {
        console.log("Error fetching location:", error);
      } finally {
        setFetchingLocation(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchLocation();
    const interval = setInterval(() => {
      void fetchLocation();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchLocation]);

  const handleLocationEdit = () => {
    setShowLocationModal(true);
  };

  const openInGoogleMaps = () => {
    if (currentLocation) {
      const url = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lon}`;
      Linking.openURL(url);
    }
  };

  const refreshLocation = async () => {
    setShowLocationModal(false);
    await fetchLocation();
    setShowLocationModal(true);
  };

  const modules = [
    {
      title: "Pharma Scan",
      subtitle: "AI Medicine Identification",
      icon: "scan-circle",
      route: "/scanner" as const,
      color: Colors.primary,
      status: "READY",
    },
    {
      title: "Medication Log",
      subtitle: "Track Your Medicines",
      icon: "list-circle",
      route: "/medications" as const,
      color: Colors.primary,
      status: "ACTIVE",
    },
    {
      title: "Find Pharmacy",
      subtitle: "Nearest Pharmacy Locator",
      icon: "location-outline",
      route: "/pharmacy-finder" as const,
      color: Colors.primary,
      status: "NEAR YOU",
    },
    {
      title: "CareBot Chat",
      subtitle: "AI health support",
      icon: "chatbubble-ellipses-outline",
      route: "/chatbot" as const,
      color: Colors.primary,
      status: "NEW",
    },
  ];

  const renderContent = () => (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-outline" size={14} color={Colors.white} />
          <Text style={styles.offlineText}>
            No Internet — AI features unavailable
          </Text>
        </View>
      )}

      <View style={styles.headerSection}>
        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.header}
        >
          <View>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.brandLabel}>MediMate</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.statusRow}
        >
          <View style={styles.statusPill}>
            <Animated.View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.success : Colors.error },
                statusDotStyle,
              ]}
            />
            <Text style={styles.statusText}>
              {isOnline ? "System Online" : "Offline Mode"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.locationPill}
            onPress={handleLocationEdit}
            activeOpacity={0.7}
          >
            <Ionicons
              name={currentLocation ? "location" : "location-outline"}
              size={12}
              color={Colors.textSecondary}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {fetchingLocation
                ? "Acquiring..."
                : address
                  ? address
                  : locationActive
                    ? "GPS Active"
                    : "GPS Off"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={10}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            What can I help you with today?
          </Text>
        </View>

        <View style={styles.gridContainer}>
          {modules.map((item, index) => (
            <AnimatedTouchable
              key={index}
              entering={FadeInUp.duration(500)
                .delay(300 + index * 120)
                .springify()
                .damping(14)}
              style={styles.moduleCard}
              onPress={() => item.route && router.push(item.route)}
              activeOpacity={0.85}
            >
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: Colors.primaryBg },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={28}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{item.title}</Text>
                  <Text style={styles.moduleSubtitle}>{item.subtitle}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                </View>
                <View style={styles.arrowContainer}>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.border}
                  />
                </View>
              </View>
            </AnimatedTouchable>
          ))}
        </View>
      </View>

      {showLocationModal && (
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconBg,
                  { backgroundColor: Colors.primary },
                ]}
              >
                <Ionicons name="location" size={28} color={Colors.white} />
              </View>
              <Text style={styles.modalTitle}>LOCATION SERVICES</Text>
            </View>
            <View style={styles.addressCard}>
              <Ionicons
                name="navigate-circle"
                size={24}
                color={Colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>CURRENT ADDRESS</Text>
                <Text style={styles.addressText}>
                  {address || "Fetching address..."}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.btnMaps}
              onPress={openInGoogleMaps}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={20} color={Colors.white} />
              <Text style={styles.btnMapsText}>OPEN IN MAPS</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnRefresh}
                onPress={refreshLocation}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color={Colors.primaryDark} />
                <Text style={styles.btnRefreshText}>REFRESH</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnClose}
                onPress={() => setShowLocationModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCloseText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSection: {
    backgroundColor: Colors.surface,
    paddingBottom: verticalScale(18),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(28),
    paddingBottom: verticalScale(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  brandLabel: {
    fontSize: moderateScale(26),
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  profileBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: 22,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusRow: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    gap: scale(10),
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    flex: 1,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  locationText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: Colors.textSecondary,
    flex: 1,
  },
  statusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: 3,
  },
  mainContent: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  sectionHeader: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(22),
    paddingBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  gridContainer: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
  },
  moduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Shadows.small.shadowColor,
    shadowOffset: Shadows.small.shadowOffset,
    shadowOpacity: Shadows.small.shadowOpacity,
    shadowRadius: Shadows.small.shadowRadius,
    elevation: Shadows.small.elevation,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(16),
    gap: scale(12),
  },
  iconContainer: {
    width: scale(52),
    height: scale(52),
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moduleInfo: {
    flex: 1,
    gap: verticalScale(3),
  },
  moduleTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  moduleSubtitle: {
    fontSize: moderateScale(13),
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 2,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  arrowContainer: {
    width: scale(32),
    height: scale(32),
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale(24),
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: scale(32),
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: verticalScale(28),
    gap: verticalScale(12),
  },
  modalIconBg: {
    width: scale(64),
    height: scale(64),
    borderRadius: 24,
    backgroundColor: Colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(4),
  },
  modalTitle: {
    fontSize: moderateScale(16),
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surfaceHighlight,
    padding: scale(20),
    borderRadius: 16,
    gap: scale(14),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressLabel: {
    fontSize: moderateScale(11),
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: verticalScale(4),
  },
  addressText: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  btnMaps: {
    flexDirection: "row",
    backgroundColor: Colors.textSecondary,
    paddingVertical: verticalScale(18),
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  btnMapsText: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.5,
  },
  modalActions: {
    flexDirection: "row",
    gap: scale(12),
  },
  btnRefresh: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.surface,
    paddingVertical: verticalScale(16),
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnRefreshText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  btnClose: {
    flex: 1,
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: verticalScale(16),
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnCloseText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  offlineBanner: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    paddingVertical: verticalScale(10),
  },
  offlineText: {
    color: "#FFF",
    fontSize: moderateScale(13),
    fontWeight: "700",
  },
});
