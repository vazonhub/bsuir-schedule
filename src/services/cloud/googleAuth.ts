import { Platform } from 'react-native';

/**
 * Thin wrapper around `@react-native-google-signin/google-signin`.
 * Only runs on Android — all exports are no-ops on iOS.
 *
 * IMPORTANT: Replace `GOOGLE_WEB_CLIENT_ID` with your real Web Client ID
 * from Google Cloud Console before building.
 */

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

const isAndroid = Platform.OS === 'android';

let configured = false;

/** Call once at app startup (Android only). */
export const configureGoogleSignIn = (): void => {
  if (!isAndroid || configured) return;
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.appdata'],
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
    configured = true;
  } catch {
    // Package not available (e.g. Expo Go).
  }
};

/** Interactive sign-in. Returns `true` on success. */
export const signInWithGoogle = async (): Promise<boolean> => {
  if (!isAndroid) return false;
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    return true;
  } catch {
    return false;
  }
};

/** Sign out and clear cached tokens. */
export const signOutGoogle = async (): Promise<void> => {
  if (!isAndroid) return;
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Ignore.
  }
};

/** Check if user has a previous sign-in session. */
export const isGoogleSignedIn = (): boolean => {
  if (!isAndroid) return false;
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    return GoogleSignin.hasPreviousSignIn();
  } catch {
    return false;
  }
};

/**
 * Get a valid access token, refreshing silently if needed.
 * Returns `null` if user is not signed in or refresh fails.
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (!isAndroid) return null;
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    if (!GoogleSignin.hasPreviousSignIn()) return null;
    await GoogleSignin.signInSilently();
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken ?? null;
  } catch {
    return null;
  }
};
