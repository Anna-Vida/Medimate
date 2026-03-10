import NetInfo from "@react-native-community/netinfo";

export async function isInternetAvailable(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!state.isConnected && (state.isInternetReachable ?? true);
  } catch {
    return false;
  }
}
