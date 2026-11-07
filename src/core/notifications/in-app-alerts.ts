import { create } from 'zustand';

import type { NotificationMessage, Notifier, PermissionState } from './notifier';

export type InAppAlert = NotificationMessage & { id: number };

type InAppAlertsStore = {
  alerts: InAppAlert[];
  permission: PermissionState;
};

// Small global state (Zustand): the alerts shown as a banner inside the app (RN-31), and what the
// user decided about system notifications.
export const useInAppAlertsStore = create<InAppAlertsStore>(() => ({
  alerts: [],
  permission: 'undetermined',
}));

let nextId = 1;

export function showInAppAlert(message: NotificationMessage): void {
  const alert: InAppAlert = { ...message, id: nextId };
  nextId += 1;
  useInAppAlertsStore.setState((state) => ({ alerts: [...state.alerts, alert] }));
}

export function dismissInAppAlert(id: number): void {
  useInAppAlertsStore.setState((state) => ({
    alerts: state.alerts.filter((alert) => alert.id !== id),
  }));
}

// RN-31: with permission the alert goes to the system; without it (or if the system fails to
// show it) it appears as a banner inside the app, so it is never lost.
export function createAlertDispatcher(notifier: Notifier) {
  return async function dispatch(message: NotificationMessage): Promise<'system' | 'banner'> {
    try {
      if ((await notifier.getPermission()) === 'granted') {
        await notifier.show(message);
        return 'system';
      }
    } catch {
      // fall through to the banner
    }
    showInAppAlert(message);

    return 'banner';
  };
}

// Asks for permission once, the first time it is needed. Never asks again after a refusal: the
// user can change it from the system settings, and alerts keep appearing as a banner (RN-31).
export async function setUpNotificationPermission(notifier: Notifier): Promise<PermissionState> {
  let permission = await notifier.getPermission();
  if (permission === 'undetermined') permission = await notifier.requestPermission();
  useInAppAlertsStore.setState({ permission });

  return permission;
}
