/**
 * 2.5D AR Try-On renderer (WebView HTML).
 *
 * Instead of a low-poly 3D GLB model, this overlays a flat, high-quality hair
 * IMAGE that is positioned, scaled, and rotated to the user's face every frame
 * using MediaPipe FaceLandmarker. It swaps between front / left-¾ / right-¾
 * artwork based on the head's yaw so it holds up when the user turns.
 *
 * Why 2.5D: photographic 2D hair reads as far more realistic than real-time 3D
 * hair on a mid-range phone, and landmark-driven placement means it fits any
 * head size/shape (not a fixed circle).
 *
 * Hair artwork is provided by `buildHairAssets` as data-URIs keyed by
 * style → { front, left, right }. The default set is generated as shaded SVG
 * placeholders; drop in real transparent PNG photos (front + 2 sides) later and
 * the pipeline is unchanged.
 */

export type HairImageSet = { front: string; left: string; right: string };

export type Hair2DOptions = {
  initialStyle: 'short' | 'long';
  initialColor: string; // hex, e.g. '#4a4744'
  /** Real photographic hair (data URIs). Any style provided here overrides the
   *  generated SVG placeholder. e.g. { short: { front, left, right } } */
  images?: Partial<Record<'short' | 'long', HairImageSet>>;
};

export function buildArHtml2D(opts: Hair2DOptions): string {
  const { initialStyle, initialColor, images } = opts;
  const imagesJson = JSON.stringify(images || {});

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;overflow:hidden;width:100%;height:100%;background:#000;touch-action:none;user-select:none;-webkit-user-select:none;}
  #stage{position:absolute;inset:0;overflow:hidden;background:#000;}
  #video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
  #stage.mirror #video{transform:scaleX(-1);}
  #hair{position:absolute;left:0;top:0;will-change:transform;pointer-events:none;transform-origin:50% 50%;}
  #hair img{display:block;width:100%;height:auto;}
  #hint{position:absolute;left:0;right:0;top:14%;text-align:center;color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;opacity:.85;text-shadow:0 1px 3px rgba(0,0,0,.6);transition:opacity .3s;}
</style>
<script type="importmap">
{
  "imports": {
    "@mediapipe/tasks-vision": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm"
  }
}
</script>
</head>
<body>
  <div id="stage" class="mirror">
    <video id="video" playsinline muted autoplay></video>
    <div id="hair"><img id="hairImg" alt=""/></div>
  </div>
  <div id="hint">Position your face in the frame…</div>

<script type="module">
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const send = (p) => { try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(p)); } catch(e){} };
window.onerror = function(m, src, ln, col){ send({ type: 'jserror', message: m + ' @' + ln + ':' + col }); };
window.addEventListener('unhandledrejection', function(e){ send({ type: 'jserror', message: 'promise: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)) }); });

// ---- tunable placement constants (safe to tweak) ----
const WIDTH_MULT   = 1.9;   // hair width relative to face width (temple→temple)
const ANCHOR_Y     = 0.5;   // fraction down the hair image that sits on the forehead pt
const RAISE        = 0.42;  // lift hair up by this fraction of face width
const YAW_SWAP_DEG = 16;    // beyond this yaw, swap to a ¾ side image
const YAW_SHIFT    = 0.10;  // horizontal parallax shift per yaw unit
const SMOOTH       = 0.4;   // 0..1 position smoothing (higher = snappier)

// MediaPipe landmark indices
const L_TEMPLE = 234, R_TEMPLE = 454, FOREHEAD = 10, NOSE = 1, CHIN = 152;

const REAL_IMAGES = ${imagesJson};   // { short?: {front,left,right}, long?: {...} }
let state = { style: '${initialStyle}', color: '${initialColor}', facing: 'user' };
let assets = buildHairAssets(state.color);
let stream = null, faceLandmarker = null, running = false;
let mirror = true;
const smooth = { x: 0, y: 0, w: 0, rot: 0, ready: false };

const stageEl = document.getElementById('stage');
const video   = document.getElementById('video');
const hairEl  = document.getElementById('hair');
const hairImg = document.getElementById('hairImg');
const hintEl  = document.getElementById('hint');

function isRealStyle(s) { return REAL_IMAGES && REAL_IMAGES[s] && REAL_IMAGES[s].front; }
// Real photos are one fixed colour (black). Approximate the colour options with
// a CSS filter. SVG placeholders are already recoloured, so they get no filter.
function colorFilter(hex) {
  hex = (hex || '').toLowerCase();
  if (hex === '#5a3320') return 'sepia(0.55) saturate(1.7) hue-rotate(-12deg) brightness(1.05)'; // brown
  if (hex === '#c9a37a') return 'sepia(0.8) saturate(1.35) brightness(2.1) hue-rotate(-6deg)';   // light
  return 'none'; // black / default
}
function setHairImage() {
  const set = assets[state.style] || assets.long;
  hairImg.src = set[currentView] || set.front;
  hairImg.style.filter = isRealStyle(state.style) ? colorFilter(state.color) : 'none';
  hairImg.style.filter = REAL_IMAGES[state.style] ? tintFor(state.color) : 'none';
}
let currentView = 'front';

// ---------- camera ----------
async function startCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  mirror = state.facing === 'user';
  stageEl.classList.toggle('mirror', mirror);
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  } catch (e) {
    send({ type: 'error', message: 'Camera error: ' + (e && e.message ? e.message : e) });
  }
}

// ---------- mediapipe ----------
async function initFace() {
  try {
    hintEl.textContent = 'Loading hair try-on…';
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    } catch (gpuErr) {
      // Some devices' WebView GL can't run the GPU delegate — fall back to CPU.
      faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    }
  } catch (e) {
    send({ type: 'error', message: 'Face model failed: ' + (e && e.message ? e.message : e) });
  }
}

// map a normalized landmark to on-screen pixels (object-fit: cover + mirror)
function mapPt(lm) {
  const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
  const sw = stageEl.clientWidth, sh = stageEl.clientHeight;
  const scale = Math.max(sw / vw, sh / vh);
  const dw = vw * scale, dh = vh * scale;
  const ox = (sw - dw) / 2, oy = (sh - dh) / 2;
  let x = lm.x * vw * scale + ox;
  const y = lm.y * vh * scale + oy;
  if (mirror) x = sw - x;
  return { x, y };
}

function loop() {
  if (!running) return;
  if (faceLandmarker && video.readyState >= 2) {
    let res = null;
    try { res = faceLandmarker.detectForVideo(video, performance.now()); } catch (e) {}
    const lms = res && res.faceLandmarks && res.faceLandmarks[0];
    if (lms) {
      hintEl.style.opacity = '0';
      const L = mapPt(lms[L_TEMPLE]);
      const R = mapPt(lms[R_TEMPLE]);
      const F = mapPt(lms[FOREHEAD]);
      const N = mapPt(lms[NOSE]);

      const faceW = Math.hypot(R.x - L.x, R.y - L.y);
      const midX  = (L.x + R.x) / 2;
      // In the mirrored preview the temples swap left/right, so the L→R vector
      // points backwards and a level head would read as ~180°. Measure from the
      // screen-left temple to the screen-right one so a level head reads ~0°.
      const roll  = Math.atan2(L.y - R.y, L.x - R.x) * 180 / Math.PI;
      const rot   = ((roll + 180) % 360) - 180; // normalize to [-180, 180]

      // yaw estimate: nose offset from temple-midpoint, normalized by half-width
      const yawRatio = (N.x - midX) / (faceW / 2 || 1);
      const yawDeg = yawRatio * 45;

      // choose front / side artwork
      const view = yawDeg > YAW_SWAP_DEG ? 'left' : (yawDeg < -YAW_SWAP_DEG ? 'right' : 'front');
      if (view !== currentView) { currentView = view; setHairImage(); }

      const hairW = faceW * WIDTH_MULT;
      const cx = midX + yawRatio * faceW * YAW_SHIFT;
      const cy = F.y - faceW * RAISE;

      if (!smooth.ready) { smooth.x = cx; smooth.y = cy; smooth.w = hairW; smooth.rot = rot; smooth.ready = true; }
      else {
        smooth.x += (cx - smooth.x) * SMOOTH;
        smooth.y += (cy - smooth.y) * SMOOTH;
        smooth.w += (hairW - smooth.w) * SMOOTH;
        let dr = rot - smooth.rot; if (dr > 180) dr -= 360; if (dr < -180) dr += 360;
        smooth.rot += dr * SMOOTH;
      }

      hairEl.style.width = smooth.w + 'px';
      hairEl.style.display = 'block';
      // translate so the image's (50%, ANCHOR_Y) point lands on (smooth.x, smooth.y)
      hairEl.style.transform =
        'translate(' + smooth.x + 'px,' + smooth.y + 'px) rotate(' + smooth.rot + 'deg) translate(-50%,' + (-ANCHOR_Y * 100) + '%)';
    } else {
      hintEl.style.opacity = '0.85';
      hintEl.textContent = faceLandmarker ? 'Position your face in the frame…' : 'Loading hair try-on…';
      hairEl.style.display = 'none';
      smooth.ready = false;
    }
  }
  requestAnimationFrame(loop);
}

// ---------- capture: composite video + hair to a jpeg ----------
function doCapture() {
  try {
    const sw = stageEl.clientWidth, sh = stageEl.clientHeight;
    const cvs = document.createElement('canvas');
    cvs.width = sw; cvs.height = sh;
    const ctx = cvs.getContext('2d');

    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    const scale = Math.max(sw / vw, sh / vh);
    const dw = vw * scale, dh = vh * scale;
    const ox = (sw - dw) / 2, oy = (sh - dh) / 2;

    ctx.save();
    if (mirror) { ctx.translate(sw, 0); ctx.scale(-1, 1); ctx.drawImage(video, sw - ox - dw, oy, dw, dh); }
    else { ctx.drawImage(video, ox, oy, dw, dh); }
    ctx.restore();

    if (hairEl.style.display !== 'none' && hairImg.complete && hairImg.naturalWidth) {
      const w = parseFloat(hairEl.style.width) || 0;
      const h = w * (hairImg.naturalHeight / hairImg.naturalWidth);
      ctx.save();
      ctx.translate(smooth.x, smooth.y);
      ctx.rotate(smooth.rot * Math.PI / 180);
      ctx.translate(-w / 2, -ANCHOR_Y * h);
      ctx.drawImage(hairImg, 0, 0, w, h);
      ctx.restore();
    }
    send({ type: 'capture', dataUri: cvs.toDataURL('image/jpeg', 0.92) });
  } catch (e) {
    send({ type: 'error', message: 'Capture failed: ' + (e && e.message ? e.message : e) });
  }
}

// ---------- message bridge ----------
function handleMessage(raw) {
  let msg; try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch(e){ return; }
  if (!msg || !msg.type) return;
  if (msg.type === 'setStyle') { state.style = msg.value; setHairImage(); }
  else if (msg.type === 'setColor') { state.color = msg.value; assets = buildHairAssets(state.color); setHairImage(); }
  else if (msg.type === 'flipCamera') { state.facing = state.facing === 'user' ? 'environment' : 'user'; smooth.ready = false; startCamera(); }
  else if (msg.type === 'capture') { doCapture(); }
}
window.addEventListener('message',  e => handleMessage(e.data));
document.addEventListener('message', e => handleMessage(e.data));

// ---------- hair artwork (shaded SVG placeholders; swap for real PNGs) ----------
function shade(hex, amt) {
  let c = hex.replace('#',''); if (c.length === 3) c = c.split('').map(x=>x+x).join('');
  let r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return 'rgb('+r+','+g+','+b+')';
}
function svgURI(svg) { return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg); }

function buildHairAssets(color) {
  const root = shade(color, -34), base = color, hi = shade(color, 46), hi2 = shade(color, 78);
  const defs = (id) =>
    '<defs>' +
    '<linearGradient id="g'+id+'" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="'+shade(color,-10)+'"/>' +
      '<stop offset="0.55" stop-color="'+base+'"/>' +
      '<stop offset="1" stop-color="'+shade(color,26)+'"/>' +
    '</linearGradient>' +
    '<radialGradient id="s'+id+'" cx="0.5" cy="0.34" r="0.62">' +
      '<stop offset="0" stop-color="'+hi2+'" stop-opacity="0.55"/>' +
      '<stop offset="0.5" stop-color="'+hi+'" stop-opacity="0.16"/>' +
      '<stop offset="1" stop-color="'+base+'" stop-opacity="0"/>' +
    '</radialGradient>' +
    '</defs>';

  const strands = (paths, w) =>
    paths.map(d => '<path d="'+d+'" fill="none" stroke="'+hi+'" stroke-opacity="0.28" stroke-width="'+w+'" stroke-linecap="round"/>').join('');

  // Long — front: full curtains framing the face, center part, shoulder-length
  const longFront =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340">' + defs('lf') +
    '<path d="M150 8 C86 8 44 60 40 132 C36 196 44 268 60 332 L104 332 C92 250 92 176 108 150 '+
    'C120 130 138 122 150 122 C162 122 180 130 192 150 C208 176 208 250 196 332 L240 332 '+
    'C256 268 264 196 260 132 C256 60 214 8 150 8 Z" fill="url(#glf)"/>' +
    '<path d="M150 12 C104 12 66 44 54 96 C82 70 116 60 150 60 C184 60 218 70 246 96 C234 44 196 12 150 12 Z" fill="'+root+'" opacity="0.85"/>' +
    '<rect x="0" y="0" width="300" height="340" fill="url(#slf)"/>' +
    strands(['M78 120 C70 190 74 260 88 322','M222 120 C230 190 226 260 212 322','M150 70 C150 96 150 108 150 120'], 3) +
    '</svg>';

  // Long — right-¾ (user turned so their right cheek shows): weight to one side
  const longRight =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340">' + defs('lr') +
    '<path d="M158 8 C92 8 50 62 46 134 C42 200 52 270 68 332 L118 332 C104 250 106 172 122 148 '+
    'C136 126 156 120 172 124 C196 130 214 168 216 210 C218 262 210 300 202 332 L240 332 '+
    'C256 268 262 196 258 132 C252 58 214 8 158 8 Z" fill="url(#glr)"/>' +
    '<path d="M158 12 C108 12 70 46 60 98 C92 74 128 64 162 66 C196 68 224 82 246 104 C238 48 204 12 158 12 Z" fill="'+root+'" opacity="0.85"/>' +
    '<rect x="0" y="0" width="300" height="340" fill="url(#slr)"/>' +
    strands(['M86 122 C76 194 82 264 98 322','M206 150 C214 210 210 274 198 322'], 3) +
    '</svg>';

  // Long — left-¾ (mirror of right)
  const longLeft = longRight.replace('viewBox="0 0 300 340">','viewBox="0 0 300 340"><g transform="translate(300,0) scale(-1,1)">')
    .replace('</svg>','</g></svg>').replace(/id="glr"/g,'id="gll"').replace(/url\(#glr\)/g,'url(#gll)')
    .replace(/id="slr"/g,'id="sll"').replace(/url\(#slr\)/g,'url(#sll)').replace(/id="lr"/g,'id="ll"');

  // Short — front: rounded cap/bob ending near the jaw
  const shortFront =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">' + defs('sf') +
    '<path d="M150 14 C88 14 46 58 44 126 C43 168 52 206 66 232 L96 214 C84 190 82 160 92 140 '+
    'C104 118 128 110 150 110 C172 110 196 118 208 140 C218 160 216 190 204 214 L234 232 '+
    'C248 206 257 168 256 126 C254 58 212 14 150 14 Z" fill="url(#gsf)"/>' +
    '<path d="M150 18 C104 18 68 48 58 96 C86 72 118 62 150 62 C182 62 214 72 242 96 C232 48 196 18 150 18 Z" fill="'+root+'" opacity="0.85"/>' +
    '<rect x="0" y="0" width="300" height="300" fill="url(#ssf)"/>' +
    strands(['M84 120 C78 160 82 196 96 220','M216 120 C222 160 218 196 204 220'], 3) +
    '</svg>';

  const shortRight =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">' + defs('sr') +
    '<path d="M156 14 C94 14 52 60 50 128 C49 170 58 206 72 232 L100 216 C88 192 88 160 98 140 '+
    'C110 118 134 110 156 112 C182 114 202 134 206 168 C209 194 202 216 194 232 L232 226 '+
    'C246 200 254 166 252 126 C248 56 210 14 156 14 Z" fill="url(#gsr)"/>' +
    '<path d="M156 18 C110 18 72 50 62 98 C90 74 124 64 158 66 C190 68 218 80 240 102 C232 48 200 14 156 14 Z" fill="'+root+'" opacity="0.85"/>' +
    '<rect x="0" y="0" width="300" height="300" fill="url(#ssr)"/>' +
    strands(['M92 122 C84 162 90 200 104 224'], 3) +
    '</svg>';

  const shortLeft = shortRight.replace('viewBox="0 0 300 300">','viewBox="0 0 300 300"><g transform="translate(300,0) scale(-1,1)">')
    .replace('</svg>','</g></svg>').replace(/id="gsr"/g,'id="gsl"').replace(/url\(#gsr\)/g,'url(#gsl)')
    .replace(/id="ssr"/g,'id="ssl"').replace(/url\(#ssr\)/g,'url(#ssl)').replace(/id="sr"/g,'id="sl"');

  const out = {
    long:  { front: svgURI(longFront),  left: svgURI(longLeft),  right: svgURI(longRight) },
    short: { front: svgURI(shortFront), left: svgURI(shortLeft), right: svgURI(shortRight) },
  };
  // Real photographic hair overrides the SVG placeholder for any provided style.
  if (REAL_IMAGES.short) out.short = REAL_IMAGES.short;
  if (REAL_IMAGES.long)  out.long  = REAL_IMAGES.long;
  return out;
}

// Photographic hair is a fixed color; approximate the swatch with a CSS filter.
function tintFor(color) {
  const c = (color || '').toLowerCase();
  if (c === '#5a3320' || c === 'brown') return 'sepia(0.6) saturate(1.6) hue-rotate(-15deg) brightness(1.05)';
  if (c === '#c9a37a' || c === 'light') return 'sepia(0.8) saturate(1.3) hue-rotate(-8deg) brightness(1.7) contrast(0.92)';
  return 'none';
}

// ---------- boot ----------
(async function boot(){
  setHairImage();
  await startCamera();
  await initFace();
  running = true;
  requestAnimationFrame(loop);
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
