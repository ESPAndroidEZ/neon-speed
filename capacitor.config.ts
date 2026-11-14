import type { CapacitorConfig } from '@capacitor/cli';

/** Native shell for iOS and Android: serves the Vite build (dist/) from the app bundle. See docs/mobile.md. */
const config: CapacitorConfig = {
  appId: 'com.racersblood.game',
  appName: "Racer's Blood",
  webDir: 'dist',
  backgroundColor: '#05060d',
  ios: { contentInset: 'never', allowsLinkPreview: false },
  android: { allowMixedContent: false },
};

export default config;
