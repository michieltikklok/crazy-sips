# Crazy Sips

A drinking game wheel inspired by Crazy Time. The spinner bets sips, drinks them, spins the wheel and hands out bet × number, or plays one of the bonus games and special outcomes (King of Hearts, Ride the Bus, Plinko of Doom, Accent Curse and more).

It is an installable web app (PWA) that works offline after the first visit.

## Install

Open the GitHub Pages URL on your phone.

- **Android (Chrome):** tap **Install app** in the header, or *Install app* in Chrome's menu.
- **iPhone / iPad (Safari):** tap **Share**, then **Add to Home Screen**.

## Android TV

Every push that changes `android/` builds an APK on GitHub Actions and publishes it as a release. The newest build is always at:

https://github.com/michieltikklok/crazy-sips/releases/latest/download/crazy-sips-tv.apk

To install it on an Android TV / Google TV: install the free **Downloader** app from the Play Store, allow it to install unknown apps (Settings → Apps → Security & restrictions → Unknown sources), open the URL above in Downloader and choose **Install**. Crazy Sips then shows up on the home screen.

On the TV the arrows on the remote move between buttons, OK presses, Back closes the scoreboard or settings (and leaves the app from the wheel), and Play/Pause spins. ### Signing

An update only installs over the app already on the TV when both builds are signed with the same key. Set two repository secrets (Settings → Secrets and variables → Actions) to sign every build with your own key:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_B64` | The keystore file, base64-encoded (`base64 -w0 release.keystore`). The key alias must be `crazysips`. |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore and key password. |

Without these secrets the workflow signs with a debug key that it keeps in the Actions cache. That works until the cache expires (7 days without a build); after that, uninstall the app on the TV before installing the next build.

## Project layout

| Path | What it is |
|---|---|
| `src/crazy-sips.html` | The game: one self-contained HTML file. Edit this. |
| `tools/build.js` | Builds the PWA files into the repo root. |
| `tools/fonts.css` | `@font-face` rules for the self-hosted fonts. |
| `tools/build-android.js` | Builds the TV version of the page, the launcher icon and the TV banner into `android/`. |
| `tools/art.js` | Wheel drawing shared by the app icons and the TV banner. |
| `android/` | Android TV app: a full-screen WebView around the game, built by `.github/workflows/android-tv.yml`. |
| `index.html`, `sw.js`, `manifest.webmanifest`, `icons/` | Build output, served by GitHub Pages. |
| `fonts/` | Bungee, Barlow and Barlow Condensed (SIL Open Font License), self-hosted for offline use. |

## Changing the game

```bash
node tools/build.js
```

```bash
node tools/build-android.js
```

Run both after editing `src/crazy-sips.html`, then commit and push. The service worker's cache name is a hash of the built files, so installed copies pick up the new version on their next launch.

The wheel odds live in the `OUTCOMES` object near the top of the script in `src/crazy-sips.html`; each `w` is a percentage and they add up to 100.
