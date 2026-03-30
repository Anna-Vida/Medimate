import Constants from "expo-constants";

type PermissionStatus = "granted" | "denied" | "undetermined";

type NotificationContentInput = {
  title: string;
  body: string;
  sound?: boolean;
  data?: Record<string, unknown>;
  priority?: unknown;
  vibrate?: number[];
};

type NotificationListener = (notification: any) => void;

type NotificationModuleShape = {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync: (
    channelId: string,
    input: Record<string, unknown>,
  ) => Promise<void>;
  addNotificationReceivedListener: (
    listener: NotificationListener,
  ) => { remove: () => void };
  requestPermissionsAsync: () => Promise<{ status: PermissionStatus }>;
  getPermissionsAsync: () => Promise<{ status: PermissionStatus }>;
  scheduleNotificationAsync: (input: {
    content: NotificationContentInput;
    trigger: Record<string, unknown>;
  }) => Promise<string>;
  AndroidImportance: {
    MAX: unknown;
  };
  AndroidNotificationPriority: {
    MAX: unknown;
    HIGH: unknown;
  };
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: unknown;
  };
};

let cachedNotificationsModule: NotificationModuleShape | null | undefined;

function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

function getNotificationsModule(): NotificationModuleShape | null {
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
  }

  if (isExpoGo()) {
    cachedNotificationsModule = null;
    return cachedNotificationsModule;
  }

  try {
    cachedNotificationsModule =
      require("expo-notifications") as NotificationModuleShape;
  } catch {
    cachedNotificationsModule = null;
  }

  return cachedNotificationsModule;
}

export function areNotificationsSupported(): boolean {
  return getNotificationsModule() !== null;
}

export function configureNotificationHandler(): void {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function configureReminderChannel(): Promise<void> {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return;
  }

  await notifications.setNotificationChannelAsync("medicine-reminders", {
    name: "Medicine Reminders",
    importance: notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: true,
  });
}

export function addReminderNotificationListener(
  listener: NotificationListener,
): { remove: () => void } {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return { remove: () => {} };
  }

  return notifications.addNotificationReceivedListener(listener);
}

export async function requestReminderPermissions(): Promise<boolean> {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return false;
  }

  const { status } = await notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getReminderPermissionStatus(): Promise<PermissionStatus> {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return "denied";
  }

  const { status } = await notifications.getPermissionsAsync();
  return status;
}

export async function scheduleReminderNotification(input: {
  title: string;
  body: string;
  secondsUntil: number;
  data?: Record<string, unknown>;
  sound?: boolean;
  vibrate?: number[];
  highPriority?: boolean;
}): Promise<string | null> {
  const notifications = getNotificationsModule();
  if (!notifications) {
    return null;
  }

  return notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: input.sound,
      data: input.data,
      priority: input.highPriority
        ? notifications.AndroidNotificationPriority.MAX
        : notifications.AndroidNotificationPriority.HIGH,
      vibrate: input.vibrate,
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: input.secondsUntil,
      channelId: "medicine-reminders",
    },
  });
}
