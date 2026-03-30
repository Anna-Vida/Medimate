import NetInfo from "@react-native-community/netinfo";

export async function isInternetAvailable(): Promise<boolean> {
  const netInfoState = await NetInfo.fetch();
  if (!netInfoState.isConnected) {
    return false;
  }

  // Treat an explicit "unreachable" signal as offline, but do not hardcode a
  // probe to a third-party endpoint like Google. That probe can fail even when
  // the APIs used by the app are reachable, which incorrectly forces offline mode.
  if (netInfoState.isInternetReachable === false) {
    return false;
  }

  return true;
}
