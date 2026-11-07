import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export type NotificationMessage = { title: string; body: string };

// What the app needs from the system notifications. Only local ones (no server, no push).
export interface Notifier {
  getPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  // Shows a notification right now. May fail; the caller falls back to the in-app banner.
  show(message: NotificationMessage): Promise<void>;
}

const ANDROID_CHANNEL_ID = 'budget-alerts';

function toPermissionState(status: Notifications.PermissionStatus): PermissionState {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

// Call once at startup. `channelName` is the translated name Android shows in its settings.
// While the app is open the notification still appears as a banner (RN-31 covers the denied case).
export async function configureNotifications(channelName: string): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
  });

  if (Platform.OS === 'android') {
    // Android 13+ shows the permission prompt only after a channel exists.
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: channelName,
      importance: AndroidImportance.HIGH,
    });
  }
}

export function createExpoNotifier(): Notifier {
  return {
    async getPermission() {
      return toPermissionState((await Notifications.getPermissionsAsync()).status);
    },
    async requestPermission() {
      const result = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: false },
      });
      return toPermissionState(result.status);
    },
    async show(message) {
      await Notifications.scheduleNotificationAsync({
        content: { title: message.title, body: message.body },
        trigger: null, // right now
      });
    },
  };
}

// For tests: remembers what was shown, and lets a test set the permission.
export function createFakeNotifier(initial: PermissionState = 'granted', failToShow = false) {
  let permission = initial;
  let nextAfterRequest: PermissionState = 'granted';
  const shown: NotificationMessage[] = [];
  let requests = 0;

  const notifier: Notifier = {
    getPermission: () => Promise.resolve(permission),
    requestPermission() {
      requests += 1;
      permission = nextAfterRequest;
      return Promise.resolve(permission);
    },
    show(message) {
      if (failToShow) return Promise.reject(new Error('system refused the notification'));
      shown.push(message);
      return Promise.resolve();
    },
  };

  return {
    notifier,
    shown,
    get requests() {
      return requests;
    },
    // What the user answers to the permission prompt.
    answerRequestWith(state: PermissionState) {
      nextAfterRequest = state;
    },
  };
}
