import NetInfo from "@react-native-community/netinfo";

// A more robust check that includes a DNS lookup to a reliable server.
// This avoids issues where the device is connected to a network (e.g., WiFi)
// but has no actual internet access.
export async function isInternetAvailable(): Promise<boolean> {
  const netInfoState = await NetInfo.fetch();
  if (!netInfoState.isConnected) {
    return false;
  }

  // NetInfo's isInternetReachable can be unreliable. We add a fetch test.
  try {
    const response = await fetch("https://www.google.com/generate_204");
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    // This fetch will fail if there's no internet, even if connected to WiFi.
    return false;
  }
}
