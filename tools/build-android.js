// Builds the Android TV app's web assets and launcher art from src/crazy-sips.html.
// Usage: node tools/build-android.js   (then GitHub Actions builds the APK from android/)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { ART_SOURCE } = require('./art');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'crazy-sips.html');
const APP = path.join(ROOT, 'android', 'app', 'src', 'main');
const ASSETS = path.join(APP, 'assets');

// ---------- index.html for the TV ----------
const src = fs.readFileSync(SRC, 'utf8')
  .replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n?/g, '')
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '')
  .replace(/<title>.*?<\/title>\n?/, '');
const fontsCss = fs.readFileSync(path.join(__dirname, 'fonts.css'), 'utf8');

// The viewport is pinned to 960 CSS px wide, so every TV (720p, 1080p, 4K) lays out at 960×540.
const head = `<!doctype html>
<html lang="en" class="tv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=960, user-scalable=no">
<title>Crazy Sips</title>
<style>
${fontsCss}
[hidden]{display:none!important}
body{margin:0}
img{max-width:100%}
</style>
</head>
<body>
`;

const tvCss = `<style>
/* Android TV: 960x540 layout, overscan-safe margins, players beside the wheel, large focus rings */
html.tv body{padding:18px 36px 24px}
html.tv .wrap{max-width:none;gap:12px}
html.tv .logo{font-size:30px}
html.tv .stage{grid-template-columns:auto minmax(0,1fr);gap:28px}
html.tv .wheelcol{gap:22px}
html.tv .wheelbox{width:calc(100vh - 160px)}
html.tv .topslot{padding:4px 6px 4px 12px;gap:8px}
html.tv .topslot .lbl{font-size:13px}
html.tv .topslot .chip{font-size:13px;padding:3px 8px}
html.tv .topslot .mult{font-size:16px;padding:1px 10px}
html.tv .desk{padding:16px;gap:12px}
html.tv .desk-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 16px;align-items:end}
html.tv .desk-top>.btn.spin{grid-column:1/-1;padding:14px;font-size:20px}
html.tv .desk-top>p{display:none}
html.tv .spinner-name{font-size:28px}
html.tv .bet b{font-size:34px}
html.tv .rbtn{width:42px;height:42px}
html.tv .tv-players .sect-h{margin-bottom:6px}
html.tv .tv-players .sect-h h3{font-size:15px}
html.tv .tv-players .sect-h .muted{display:none}
html.tv .pgrid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
html.tv .pc{padding:8px 10px;gap:4px}
html.tv .pc-top b{font-size:15px}
html.tv :focus{outline:none}
html.tv :focus-visible{outline:4px solid var(--cyan)!important;outline-offset:3px;box-shadow:0 0 0 10px rgba(42,212,255,.28)!important}
html.tv .btn:focus-visible,html.tv .tile:focus-visible{transform:scale(1.04)}
</style>
`;

const tvScript = `
<script>
/* Android TV: remote-control navigation (D-pad moves focus, OK presses), Back handling, focus that survives re-renders */
(()=>{
  const setupEl=document.getElementById('setup');
  const desk=document.querySelector('.desk');
  const players=document.getElementById('players').closest('section');
  players.classList.add('tv-players');players.style.marginTop='0';
  desk.insertBefore(players,desk.querySelector('details.odds'));

  const SEL='button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
  const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  const focusables=sc=>[...sc.querySelectorAll(SEL)].filter(el=>!el.disabled&&visible(el));
  const scope=()=>modal.hidden?document:sheet;
  const keyOf=el=>{
    if(el.id)return'#'+CSS.escape(el.id);
    const d=[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>'['+a.name+'="'+CSS.escape(a.value)+'"]').join('');
    return d?el.tagName.toLowerCase()+d:null;
  };
  const focusEl=el=>{el.focus({preventScroll:true});el.scrollIntoView({block:'nearest',inline:'nearest'})};
  let lastKey=null,lastNext=null;
  document.addEventListener('focusin',e=>{const k=keyOf(e.target);if(k)lastKey=k});

  function fallback(sc){
    if(sc===document){
      for(const id of ['spinBtn','startBtn']){const el=document.getElementById(id);if(el&&!el.disabled&&visible(el))return el}
    }
    const list=focusables(sc);
    return list.find(el=>el.classList.contains('btn'))||list.find(el=>!el.classList.contains('linkbtn'))||list[0];
  }
  // Re-renders replace buttons; put focus back on the same control, or on the obvious next one.
  function ensureFocus(){
    if(spinning&&modal.hidden)return;
    const nx=!modal.hidden&&sheet.querySelector('[data-next]');
    if(nx&&nx!==lastNext){lastNext=nx;focusEl(nx);return}
    const sc=scope(),a=document.activeElement;
    if(a&&a!==document.body&&sc.contains(a)&&!a.disabled&&visible(a))return;
    let t=lastKey&&sc.querySelector(lastKey);
    if(t&&(t.disabled||!visible(t)))t=null;
    t=t||fallback(sc);
    if(t)focusEl(t);
  }
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureFocus()})})
    .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled']});

  // Spatial navigation: pick the nearest control in the pressed direction.
  function move(dx,dy){
    const sc=scope(),a=document.activeElement;
    if(!a||a===document.body||!sc.contains(a)){ensureFocus();return}
    const r=a.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let best=null,bestScore=Infinity;
    for(const el of focusables(sc)){
      if(el===a)continue;
      const q=el.getBoundingClientRect(),qx=q.left+q.width/2,qy=q.top+q.height/2;
      let main,cross;
      if(dx){
        if(dx>0?qx<=cx+1:qx>=cx-1)continue;
        main=dx>0?Math.max(0,q.left-r.right):Math.max(0,r.left-q.right);
        cross=Math.max(0,q.top-r.bottom,r.top-q.bottom);
      }else{
        if(dy>0?qy<=cy+1:qy>=cy-1)continue;
        main=dy>0?Math.max(0,q.top-r.bottom):Math.max(0,r.top-q.bottom);
        cross=Math.max(0,q.left-r.right,r.left-q.right);
      }
      const score=main+cross*4+Math.abs(dx?qy-cy:qx-cx)*0.05;
      if(score<bestScore){bestScore=score;best=el}
    }
    if(best)focusEl(best);
    else if(dy)(modal.hidden?document.scrollingElement:modal).scrollBy({top:dy*160,behavior:'smooth'});
  }

  document.addEventListener('keydown',e=>{
    if(e.key==='MediaPlayPause'||e.key==='MediaPlay'){
      const sb=document.getElementById('spinBtn');
      if(modal.hidden&&!spinning&&sb&&visible(sb)){e.preventDefault();sb.click()}
      return;
    }
    if(e.key==='Enter'&&document.activeElement===document.body){e.preventDefault();ensureFocus();return}
    const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];
    if(!d)return;
    const a=document.activeElement;
    if(a&&a.tagName==='INPUT'&&a.type!=='number'&&d[0]){
      const s=a.selectionStart,en=a.selectionEnd;
      if(s!==null&&!(d[0]<0?s===0&&en===0:s===a.value.length))return;
    }
    e.preventDefault();
    if(spinning&&modal.hidden)return;
    move(d[0],d[1]);
  },true);

  // Called by the app when the remote's Back button is pressed. true = handled, false = leave the app.
  window.tvBack=()=>{
    if(!modal.hidden){
      if(sheet.querySelector('[data-close]')){closeModal();ensureFocus();return true}
      toast('Finish this round first, or choose Skip this round');return true;
    }
    if(!setupEl.hidden&&S.started&&S.players.length>=2){show();ensureFocus();return true}
    const sb=document.getElementById('spinBtn');
    if(sb&&visible(sb)&&document.activeElement!==sb&&!spinning){focusEl(sb);return true}
    return false;
  };

  ensureFocus();
})();
</script>
`;

fs.mkdirSync(path.join(ASSETS, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(ASSETS, 'index.html'), head + tvCss + src.trim() + '\n' + tvScript + '</body>\n</html>\n');
for (const f of fs.readdirSync(path.join(ROOT, 'fonts')).filter(f => f.endsWith('.woff2'))) {
  fs.copyFileSync(path.join(ROOT, 'fonts', f), path.join(ASSETS, 'fonts', f));
}

// ---------- launcher icon and TV banner ----------
const MIPMAPS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.addScriptTag({ content: ART_SOURCE });
  const font = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
  await page.evaluate(async ({ bungee, barlow }) => {
    const faces = [new FontFace('Bungee', `url(${bungee})`), new FontFace('Barlow Condensed', `url(${barlow})`, { weight: '700' })];
    for (const f of faces) document.fonts.add(await f.load());
  }, { bungee: font('Bungee-400-latin.woff2'), barlow: font('BarlowCondensed-700-latin.woff2') });

  const png = (dir, name, data) => {
    fs.mkdirSync(path.join(APP, 'res', dir), { recursive: true });
    fs.writeFileSync(path.join(APP, 'res', dir, name), Buffer.from(data.split(',')[1], 'base64'));
  };

  for (const [density, size] of Object.entries(MIPMAPS)) {
    png('mipmap-' + density, 'ic_launcher.png', await page.evaluate(size => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d');
      drawBackground(x, size, size);
      drawWheel(x, size / 2, size * 0.53, size * 0.40);
      return c.toDataURL('image/png');
    }, size));
  }

  // Android TV home-screen banner: 320x180 in drawable-xhdpi.
  png('drawable-xhdpi', 'banner.png', await page.evaluate(() => {
    const W = 320, H = 180, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    drawBackground(x, W, H);
    drawWheel(x, 90, 98, 58);
    const g = x.createLinearGradient(170, 0, 306, 0);
    g.addColorStop(0, '#ffc83a'); g.addColorStop(.55, '#ff3d8b'); g.addColorStop(1, '#2ad4ff');
    x.fillStyle = g; x.font = '34px Bungee'; x.textBaseline = 'alphabetic';
    x.fillText('CRAZY', 170, 88); x.fillText('SIPS', 170, 126);
    x.fillStyle = '#a9a1d8'; x.font = '700 13px "Barlow Condensed"';
    if ('letterSpacing' in x) x.letterSpacing = '2px';
    x.fillText('DRINKING WHEEL', 171, 150);
    return c.toDataURL('image/png');
  }));

  await browser.close();
  console.log('Built android/app/src/main (assets, launcher icons, TV banner)');
})();
