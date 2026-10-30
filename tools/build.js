// Builds the installable PWA from src/crazy-sips.html into the repo root (served by GitHub Pages).
// Usage: node tools/build.js   (needs Node and Playwright with Chromium, for the icons)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { ART_SOURCE } = require('./art');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'crazy-sips.html');
const OUT = ROOT;
const BG = '#0e0a22';

// ---------- index.html ----------
let src = fs.readFileSync(SRC, 'utf8')
  .replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n?/g, '')
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '')
  .replace(/<title>.*?<\/title>\n?/, '');

const fontsCss = fs.readFileSync(path.join(__dirname, 'fonts.css'), 'utf8');

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Crazy Sips</title>
<meta name="description" content="A drinking game wheel inspired by Crazy Time. Bet sips, spin, hand them out.">
<meta name="theme-color" content="${BG}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Crazy Sips">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>
${fontsCss}
[hidden]{display:none!important}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{-webkit-text-size-adjust:100%}
body{margin:0;overscroll-behavior-y:none;-webkit-tap-highlight-color:transparent}
button{touch-action:manipulation;-webkit-user-select:none;user-select:none}
img{max-width:100%}
</style>
</head>
<body>
`;

const pwaScript = `
<script>
/* PWA: offline service worker, install button, keep the screen awake */
(()=>{
  if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

  let lock=null;
  const wake=async()=>{try{if('wakeLock' in navigator&&document.visibilityState==='visible'&&!lock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>lock=null)}}catch(e){}};
  document.addEventListener('click',wake,{once:true});
  document.addEventListener('visibilitychange',wake);

  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(standalone)return;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const btn=document.createElement('button');btn.className='btn sm';btn.textContent='Install app';btn.hidden=!ios;
  document.querySelector('.top-actions').prepend(btn);
  let deferred=null;
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;btn.hidden=false});
  addEventListener('appinstalled',()=>{btn.hidden=true;deferred=null});
  btn.onclick=async()=>{
    if(deferred){deferred.prompt();await deferred.userChoice.catch(()=>{});deferred=null;btn.hidden=true;return}
    const body=openSheet('<div class="m-head" style="--c:#000;--cf:#ffc83a"><span class="m-kind">iPhone &amp; iPad</span><h2>Install Crazy Sips</h2></div>',
      '<ol class="drinks" style="list-style:decimal;padding-left:22px"><li>Tap the <b>Share</b> button (the square with the arrow pointing up).</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Crazy Sips now opens full screen from your home screen and works offline.</li></ol><button class="btn wide" data-close>Got it</button>');
    body.querySelector('[data-close]').onclick=closeModal;
  };
})();
</script>
`;

fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
const index = head + src.trim() + '\n' + pwaScript + '</body>\n</html>\n';
fs.writeFileSync(path.join(OUT, 'index.html'), index);

// ---------- manifest ----------
const manifest = {
  name: 'Crazy Sips',
  short_name: 'Crazy Sips',
  description: 'A drinking game wheel inspired by Crazy Time. Bet sips, spin, hand them out.',
  id: './',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  background_color: BG,
  theme_color: BG,
  categories: ['games', 'entertainment'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

// ---------- icons ----------
const ICONS = [
  ['icon-192.png', 192, 0.40],
  ['icon-512.png', 512, 0.40],
  ['icon-maskable-512.png', 512, 0.30],
  ['apple-touch-icon.png', 180, 0.38],
];

async function renderIcons() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.addScriptTag({ content: ART_SOURCE });
  for (const [name, size, r] of ICONS) {
    const data = await page.evaluate(({ size, r }) => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d');
      drawBackground(x, size, size);
      drawWheel(x, size / 2, size * 0.53, size * r);
      return c.toDataURL('image/png');
    }, { size, r });
    fs.writeFileSync(path.join(OUT, 'icons', name), Buffer.from(data.split(',')[1], 'base64'));
  }
  await browser.close();
}

(async () => {
  await renderIcons();

  // ---------- service worker (cache name changes whenever any file changes) ----------
  const files = ['index.html', 'manifest.webmanifest',
    ...ICONS.map(([n]) => 'icons/' + n),
    ...fs.readdirSync(path.join(OUT, 'fonts')).filter(f => f.endsWith('.woff2')).map(f => 'fonts/' + f)];
  const hash = crypto.createHash('sha256');
  files.forEach(f => hash.update(fs.readFileSync(path.join(OUT, f))));
  const version = hash.digest('hex').slice(0, 10);

  const sw = `// Crazy Sips service worker: precaches the whole app so it runs offline.
const CACHE = 'crazy-sips-${version}';
const ASSETS = ${JSON.stringify(['./', ...files.map(f => './' + f)], null, 2)};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('crazy-sips-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true })
      .then(hit => hit || fetch(req))
      .catch(() => req.mode === 'navigate' ? caches.match('./') : Response.error())
  );
});
`;
  fs.writeFileSync(path.join(OUT, 'sw.js'), sw);
  console.log(`Built ${OUT} (cache ${version}, ${files.length} files)`);
})();
