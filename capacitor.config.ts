import type { CapacitorConfig } from '@capacitor/cli';

/** Native shell for iOS and Android: serves the Vite build (dist/) from the app bundle. See docs/mobile.md. */
const config: CapacitorConfig = {
  appId: 'com.racersblood.game',
  appName: "Racer's Blood",
  webDir: 'dist',
  backgroundColor: '#05060d',
  ios: { contentInset: 'never', allowsLinkPreview: false },
  android: { allowMixedContent: false },
  plugins: {
    // immersive: the game draws under the status bar (safe-area insets keep the HUD clear) and hides it at start
    StatusBar: { overlaysWebView: true, style: 'DARK', backgroundColor: '#00000000' },
  },
};

export default config;
