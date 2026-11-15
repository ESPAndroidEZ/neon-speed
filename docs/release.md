# Release

## Builds
| Command | What |
|---|---|
| `npm run build` | The single verification entry: line check, code health, `tsc --noEmit`, `vite build`. |
| `npm run build:prod` | Release bundle in `dist/`: same checks, minified, hashed file names, no source maps, `.gz` + `.br` copies, service-worker precache list, asset budget report. |
| `npm run build:public` | `build:prod` with `VITE_PUBLIC_BUILD=1`: brand-safe (fictional car brand and model names in every UI string; ids, numbers, handling and saves identical). Checked by `tests/brand-check.mts`. |
| `npm run assets` | Asset budget report of `dist/` (totals per kind, largest file, WARN over budget; `--strict` fails). |
| `npm run preview` | Serves `dist/` on the LAN at :4173 (the service worker only runs in a build, not in dev). |

Not in a release bundle: the tuning panel, the K audio panel, the F4 handling overlay (dev), the dev URL flags (`?skip`, `?car` ...), the P / 1-3 debug keys, the FPS counter. They sit behind `import.meta.env.DEV` (lazy imports), so the minifier drops them. Console log/info/debug are silenced in production (`core/guard.ts`); warnings and errors stay.

## Offline and updates (PWA)
`public/sw.js` precaches the whole release (shell, code, models, icons) on the first visit; afterwards the game starts offline. Each build writes a content-hash `VERSION`, so a new release installs in the background and the page shows **Update ready: Reload / Later** (`core/pwa.ts`). Manifest: `public/manifest.webmanifest` (fullscreen, landscape, 192/512/maskable icons). Checked by `npm run e2e -- --only offline`.

## Deploy (GitHub Pages)
`.github/workflows/deploy.yml` builds `build:prod` and deploys `dist/` on every push to `main`.
Carlos, once:
1. GitHub repo > Settings > Pages > Build and deployment > Source: **GitHub Actions**.
2. The repo is private: GitHub Pages for private repos needs a paid plan (Pro / Team). Without it, either make the repo public or use Cloudflare Pages (below).
3. Optional: Settings > Secrets and variables > Actions > Variables > `REAL_BRANDS` = `1` to ship real car names. Default is the brand-safe build.
Live URL afterwards: `https://espandroidez.github.io/racer-blood/` (shown on the workflow run). No secrets are needed.

### Alternative: Cloudflare Pages (works with a private repo, free)
dash.cloudflare.com > Workers & Pages > Create > Pages > Connect to Git > pick the repo. Build command `npm run build:public`, output `dist`, env `NODE_VERSION=22`. No token goes into the repo.

## Phone on the same Wi-Fi (no deploy)
`npm run dev` (Vite `host: true`) prints `Network: http://<pc-ip>:5173/`; open that on the phone. On WSL2 run `scripts/phone-access.ps1` once in an admin PowerShell. Motion sensors (tilt) and full screen need HTTPS on iOS and some Android browsers: for those use the deployed URL, or `npm run build && npx vite preview --host` behind an HTTPS tunnel (e.g. `npx localtunnel --port 4173`).

## Capacitor (iOS / Android)
The web build is Capacitor-ready: relative `base: './'`, safe-area insets, `viewport-fit=cover`, Android back button (pause, then back to the menu), pause + silent audio when the app goes to the background, status bar hidden (`@capacitor/status-bar`), haptics through `@capacitor/haptics`, no full-screen button inside the app. `android/` and `ios/` exist already.
```
npm run build:prod && npx cap sync      # copy dist/ and the plugins into both native projects
npx cap open android                    # Android Studio: Run, or Build > Generate Signed Bundle
npx cap open ios                        # Xcode (Mac): cd ios/App && pod install once, pick a team, Run
```
Android immersive (hiding the navigation bar too) needs one line in `MainActivity` (WindowInsetsControllerCompat.hide(systemBars)); not added yet.

## Checks before a release
`npm run build:q`, `npm run test:q`, `npm run visual:q` (dev server), `npm run viewport` (10 viewports, dev server), `npm run e2e` (dev server; builds and previews dist itself for the offline check).
