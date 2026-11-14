import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs: required when the build is served from Capacitor's local scheme on iOS.
  base: './',
  // host: true exposes the dev server on the LAN so a real iPhone can load it.
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 900 },
});
