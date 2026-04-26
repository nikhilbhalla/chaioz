/**
 * Push notifications — Expo's free push pipeline.
 *  - Registers an Expo push token with the backend
 *  - Sets up an Android default channel
 *  - Listens for incoming pushes and handles deep-link `data.type` payloads
 *
 * Imported from `App.js` via `usePushNotifications(navigationRef)`.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';

// While the app is foregrounded show the notification banner instead of
// silently dropping it — important for "your chai is ready" while the user
// is mid-checkout on a different screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function _registerForPushAsync() {
  if (!Device.isDevice) {
    // Push tokens only work on physical devices / TestFlight builds.
    return null;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Chaioz updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F1B73E',
    });
  }
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    undefined;
  const tokenObj = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenObj?.data || null;
}

/** Register hook: call once near the top of the tree. */
export function usePushNotifications(onTap) {
  const tokenRef = useRef(null);
  const tappedSubRef = useRef(null);
  const receivedSubRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await _registerForPushAsync();
        if (!mounted || !token) return;
        tokenRef.current = token;
        // Best-effort backend register — don't crash the app if backend is down.
        try {
          await api.post('/devices/register', {
            token,
            platform: Platform.OS,
            device_name: Device.modelName || null,
          });
        } catch (e) {
          console.warn('[push] register failed', e?.message);
        }
      } catch (e) {
        console.warn('[push] init error', e?.message);
      }
    })();

    receivedSubRef.current = Notifications.addNotificationReceivedListener(() => {
      // Foreground delivery — already handled by setNotificationHandler.
    });
    tappedSubRef.current = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp?.notification?.request?.content?.data || {};
      if (typeof onTap === 'function') onTap(data);
    });

    return () => {
      mounted = false;
      receivedSubRef.current?.remove?.();
      tappedSubRef.current?.remove?.();
    };
  }, [onTap]);

  return tokenRef;
}

/** Call from logout to stop pushing to this device under the previous user. */
export async function unregisterPushToken(token) {
  if (!token) return;
  try {
    await api.post('/devices/unregister', { token });
  } catch {}
}
