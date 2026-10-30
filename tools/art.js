// Drawing shared by the web app icons and the Android TV launcher art.
// These functions run inside the browser: inject them with page.addScriptTag({ content: ART_SOURCE }).

function drawBackground(x, W, H) {
  const g = x.createRadialGradient(W / 2, H * 0.15, 0, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#2c1b72'); g.addColorStop(1, '#0e0a22');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}

// A small Crazy Sips wheel with its gold rim, hub and pointer. R is the slice radius.
function drawWheel(x, cx, cy, R) {
  const S = R / 0.4;
  const cols = ['#2f7bff', '#ffc83a', '#ff3d8b', '#11a39a', '#9a55ff', '#2ad4ff', '#e8590c', '#3fe08f', '#2f7bff', '#ffc83a', '#ff3d8b', '#d9dceb', '#9a55ff', '#2ad4ff', '#e8590c', '#3fe08f'];
  const a = Math.PI * 2 / cols.length;
  x.save(); x.shadowColor = 'rgba(255,61,139,.55)'; x.shadowBlur = S * 0.08;
  x.beginPath(); x.arc(cx, cy, R * 1.09, 0, Math.PI * 2); x.fillStyle = '#ffc83a'; x.fill(); x.restore();
  x.beginPath(); x.arc(cx, cy, R * 1.03, 0, Math.PI * 2); x.fillStyle = '#2a2168'; x.fill();
  cols.forEach((col, i) => {
    const a0 = -Math.PI / 2 + i * a - a / 2;
    x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0, a0 + a); x.closePath(); x.fillStyle = col; x.fill();
    x.strokeStyle = 'rgba(10,6,30,.55)'; x.lineWidth = Math.max(1, S / 160); x.stroke();
  });
  const hub = x.createRadialGradient(cx - R * .1, cy - R * .12, 0, cx, cy, R * .34);
  hub.addColorStop(0, '#3d2f96'); hub.addColorStop(1, '#120c33');
  x.beginPath(); x.arc(cx, cy, R * .32, 0, Math.PI * 2); x.fillStyle = hub; x.fill();
  x.lineWidth = R * .07; x.strokeStyle = '#ffc83a'; x.stroke();
  const pw = R * .26, ph = R * .38, top = cy - R * 1.2;
  x.save(); x.beginPath(); x.moveTo(cx - pw, top); x.lineTo(cx + pw, top); x.lineTo(cx, top + ph); x.closePath();
  x.fillStyle = '#ffc83a'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = S * .02; x.shadowOffsetY = S * .008; x.fill(); x.restore();
}

const ART_SOURCE = drawBackground.toString() + '\n' + drawWheel.toString();

module.exports = { ART_SOURCE };
