import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android (and later iOS) shell around the web build in dist/.
 * Build: `npm run android:sync`, then `npm run android:apk` or open Android Studio.
 */
const config: CapacitorConfig = {
  appId: 'com.cardsclash.fan',
  appName: 'Cards Clash',
  webDir: 'dist',
  backgroundColor: '#120c2b',
  android: {
    // Ship the web build exactly as built; no remote debugging in release builds.
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#120c2b',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
