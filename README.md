# Crazy Sips

A drinking game wheel inspired by Crazy Time. The spinner bets sips, drinks them, spins the wheel and hands out bet × number, or plays one of the bonus games and special outcomes (King of Hearts, Ride the Bus, Plinko of Doom, Accent Curse and more).

It is an installable web app (PWA) that works offline after the first visit.

## Install

Open the GitHub Pages URL on your phone.

- **Android (Chrome):** tap **Install app** in the header, or *Install app* in Chrome's menu.
- **iPhone / iPad (Safari):** tap **Share**, then **Add to Home Screen**.

## Project layout

| Path | What it is |
|---|---|
| `src/crazy-sips.html` | The game: one self-contained HTML file. Edit this. |
| `tools/build.js` | Builds the PWA files into the repo root. |
| `tools/fonts.css` | `@font-face` rules for the self-hosted fonts. |
| `index.html`, `sw.js`, `manifest.webmanifest`, `icons/` | Build output, served by GitHub Pages. |
| `fonts/` | Bungee, Barlow and Barlow Condensed (SIL Open Font License), self-hosted for offline use. |

## Changing the game

```bash
node tools/build.js
```

Run it after editing `src/crazy-sips.html`, then commit and push. The service worker's cache name is a hash of the built files, so installed copies pick up the new version on their next launch.

The wheel odds live in the `OUTCOMES` object near the top of the script in `src/crazy-sips.html`; each `w` is a percentage and they add up to 100.
