import NetInfo from "@react-native-community/netinfo";

export async function isInternetAvailable(): Promise<boolean> {
  try {
    const state = await Promise.race([
      NetInfo.fetch(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("NETWORK_TIMEOUT")), 2500);
      }),
    ]);
    return !!state.isConnected && (state.isInternetReachable ?? true);
  } catch {
    return false;
  }
}
