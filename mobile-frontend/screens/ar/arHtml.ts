/**
 * AR Try-On WebView — MediaPipe Face Landmarker head-pose pipeline.
 *
 * Key difference from the MindAR approach:
 *  - MindAR's `addAnchor()` gives you a face landmark's POSITION but no
 *    real head rotation matrix. The wig ends up stuck to the face plane.
 *  - MediaPipe's FaceLandmarker exposes `facialTransformationMatrixes` —
 *    a true 6-DoF head pose matrix (4x4) in metric cm. We parent the wig
 *    under that matrix, so it rotates with the *skull*, not the face.
 *
 * Pipeline:
 *  1. Own getUserMedia stream → <video>
 *  2. MediaPipe FaceLandmarker.detectForVideo() per frame → head pose
 *  3. three.js scene:
 *       headRoot (matrixAutoUpdate=off) ← head pose matrix
 *         ├── headOccluder (invisible ellipsoid, depthWrite only)
 *         │     → makes face video "occlude" the front of the wig
 *         ├── shortWig (sits at scalp center in head-local space)
 *         └── longWig
 *
 * Coordinate system: MediaPipe canonical face metric space (cm)
 *   +X = face's right     (viewer's left in selfie)
 *   +Y = up
 *   +Z = out of face (toward camera)
 *   Face origin = approximately between the eyes
 *   Scalp center top ≈ (0, +6cm, -2cm)
 *   Back of skull   ≈ (0,  0cm, -10cm)
 */

const TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
html,body{margin:0;padding:0;overflow:hidden;width:100%;height:100%;background:#000;touch-action:none;user-select:none;-webkit-user-select:none;}
#stage{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;}
#video,#canvas{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;}
#video{z-index:0;}
#canvas{z-index:1;pointer-events:none;}
#stage.mirror #video,#stage.mirror #canvas{transform:scaleX(-1);}

#status{position:fixed;top:12px;left:12px;right:12px;color:#fff;font-family:monospace;font-size:12px;background:rgba(0,0,0,.6);padding:8px 12px;border-radius:8px;z-index:200;pointer-events:none;opacity:0;transition:opacity .25s;text-align:center;}
#status.show{opacity:1;}

#dbPanel{
  position:fixed;bottom:0;left:0;right:0;
  background:rgba(8,8,18,.96);
  border-top:1px solid rgba(255,255,255,.12);
  border-radius:14px 14px 0 0;
  z-index:300;
  transform:translateY(100%);
  transition:transform .28s cubic-bezier(.4,0,.2,1);
  max-height:64vh;
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  padding:0 14px 28px;
  font-family:monospace;font-size:12px;color:#fff;
  touch-action:pan-y;
}
#dbPanel.open{transform:translateY(0);}
#dbHandle{width:36px;height:4px;background:rgba(255,255,255,.25);border-radius:2px;margin:10px auto 12px;}
.dbTitle{font-size:13px;font-weight:700;letter-spacing:.5px;margin-bottom:4px;color:#ff8dc7;text-align:center;}
.dbCurrentStyle{text-align:center;font-size:10px;color:rgba(255,255,255,.45);margin-bottom:8px;letter-spacing:.5px;}
.dbSection{color:#ff8dc7;font-size:10px;letter-spacing:1.8px;margin:12px 0 6px;text-transform:uppercase;border-bottom:1px solid rgba(255,77,141,.2);padding-bottom:3px;}
.dbRow{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
.dbLabel{min-width:84px;color:rgba(255,255,255,.7);font-size:11px;}
.dbSlider{flex:1;height:4px;accent-color:#ff4d8d;cursor:pointer;}
.dbVal{min-width:58px;text-align:right;color:#fff;font-size:11px;font-weight:600;}
.dbHint{font-size:10px;color:rgba(255,200,140,.85);margin:2px 0 4px 78px;font-style:italic;}
.dbSavedTag{display:inline-block;margin-left:8px;padding:1px 6px;border-radius:6px;font-size:9px;letter-spacing:.5px;background:rgba(141,255,184,.18);color:#8dffb8;vertical-align:middle;}
.dbSavedTag.dirty{background:rgba(255,200,140,.18);color:#ffc88c;}
.dbActions{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap;justify-content:center;align-items:stretch;}
.dbBtn{padding:10px 14px;border-radius:10px;border:none;background:rgba(255,255,255,.1);color:#fff;font-size:12px;cursor:pointer;font-family:monospace;min-height:42px;}
.dbBtn.primary{
  background:linear-gradient(135deg,#ff4d8d 0%,#ff8dc7 100%);
  flex:1 1 100%;
  font-size:14px;font-weight:700;
  padding:14px;
  box-shadow:0 4px 16px rgba(255,77,141,.4);
  letter-spacing:.5px;
}
.dbBtn.primary:active{transform:scale(.98);opacity:.9;}
.dbBtn:active{opacity:.7;}
#dbJson{margin-top:12px;padding:10px;border-radius:8px;background:rgba(255,255,255,.06);font-size:10px;color:#8dffb8;white-space:pre-wrap;word-break:break-all;display:none;}
#dbJson.show{display:block;}
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.158.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.158.0/examples/jsm/",
    "@mediapipe/tasks-vision": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm"
  }
}
</script>
</head>
<body>
<div id="stage" class="mirror">
  <video id="video" playsinline muted autoplay></video>
  <canvas id="canvas"></canvas>
</div>
<div id="status"></div>

<div id="dbPanel">
  <div id="dbHandle"></div>
  <div class="dbTitle">⚙ Head-Fit Calibration</div>
  <div class="dbCurrentStyle">
    <span id="dbStyleLabel">Style: —</span>
    <span id="dbSavedTag" class="dbSavedTag">No saved default</span>
  </div>

  <div class="dbSection">▸ POSITION (cm — head-local)</div>
  <div class="dbRow"><span class="dbLabel">X left/right</span><input type="range" id="sl_px" class="dbSlider" min="-25" max="25" step="0.1" value="0"><span class="dbVal" id="v_px">0.0</span></div>
  <div class="dbRow"><span class="dbLabel">Y up/down</span><input type="range" id="sl_py" class="dbSlider" min="-25" max="25" step="0.1" value="0"><span class="dbVal" id="v_py">0.0</span></div>
  <div class="dbRow">
    <span class="dbLabel">Z back/front</span>
    <input type="range" id="sl_pz" class="dbSlider" min="-30" max="15" step="0.1" value="0">
    <span class="dbVal" id="v_pz">0.0</span>
  </div>
  <div class="dbHint">Z slider: drag LEFT to push hair deeper into skull. Negative = into head.</div>

  <div class="dbSection">▸ ROTATION (degrees)</div>
  <div class="dbRow"><span class="dbLabel">Rot X pitch</span><input type="range" id="sl_rx" class="dbSlider" min="-90" max="90" step="0.5" value="0"><span class="dbVal" id="v_rx">0°</span></div>
  <div class="dbRow"><span class="dbLabel">Rot Y yaw</span><input type="range" id="sl_ry" class="dbSlider" min="-90" max="90" step="0.5" value="0"><span class="dbVal" id="v_ry">0°</span></div>
  <div class="dbRow"><span class="dbLabel">Rot Z roll</span><input type="range" id="sl_rz" class="dbSlider" min="-90" max="90" step="0.5" value="0"><span class="dbVal" id="v_rz">0°</span></div>

  <div class="dbSection">▸ SCALE (head widths)</div>
  <div class="dbRow"><span class="dbLabel">Scale X</span><input type="range" id="sl_sx" class="dbSlider" min="0.3" max="3" step="0.01" value="1"><span class="dbVal" id="v_sx">1.00</span></div>
  <div class="dbRow"><span class="dbLabel">Scale Y</span><input type="range" id="sl_sy" class="dbSlider" min="0.3" max="3" step="0.01" value="1"><span class="dbVal" id="v_sy">1.00</span></div>
  <div class="dbRow"><span class="dbLabel">Scale Z</span><input type="range" id="sl_sz" class="dbSlider" min="0.3" max="3" step="0.01" value="1"><span class="dbVal" id="v_sz">1.00</span></div>

  <div class="dbActions">
    <button class="dbBtn primary" id="btnSave">💾  SAVE AS DEFAULT FOR THIS STYLE</button>
    <button class="dbBtn" id="btnReset">↺ Reset to anchor</button>
    <button class="dbBtn" id="btnCopy">{ } Show JSON</button>
  </div>
  <pre id="dbJson"></pre>
</div>

<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// ─── Injected assets ─────────────────────────────────────────────────────────
const SHORT_B64     = '__SHORT_B64__';
const LONG_B64      = '__LONG_B64__';
const INITIAL_STYLE = '__INITIAL_STYLE__';
const INITIAL_COLOR = '__INITIAL_COLOR__';

// ─── Tunables ────────────────────────────────────────────────────────────────
// MediaPipe's facialTransformationMatrix assumes a virtual perspective camera
// with this vertical FOV. Three.js camera must match for correct overlay.
const VIRTUAL_CAMERA_FOV_Y = 63;

// Default wig anchor relative to MediaPipe face origin (between eyes).
// Per-style defaults because the wig's effective PIVOT differs between
// short (we pivot at bbox center) and long (we pivot near the scalp cap
// area, ignoring the long strands below).
// Units: cm in canonical face metric space.
const DEFAULT_ANCHOR = {
  short: { x: 0, y: 5.0, z: -2.0 },
  long:  { x: 0, y: 8.0, z: -2.0 },
};

// Reference head width that MediaPipe's CANONICAL face model has. We auto-
// scale each GLB to this width as a starting point. After that, the
// per-frame face-landmark measurement multiplies in a "real head size"
// correction (see currentHeadSizeMul).
const HEAD_WIDTH_CM = 14;

// Canonical face width at the temples (landmarks 234 ↔ 454) for the
// MediaPipe canonical face. We compare measured face width against this
// to scale the wig to the user's actual head.
const FACE_WIDTH_BASELINE_CM = 13.5;

// Smoothing factor for the per-frame head-size measurement (EMA).
// Lower = smoother but more lag; higher = snappier but more jitter.
const HEAD_SIZE_SMOOTH = 0.25;

// Head-shaped invisible occluder dimensions (cm).
// This is the depth proxy for the user's face/skull. Wig polygons whose
// camera-space z is *farther* than this ellipsoid's surface get hidden,
// which is what makes the face naturally appear in front of the wig.
const HEAD_OCCLUDER = {
  center: { x: 0, y: 2.0, z: -3.0 },
  radius: { x: 7.5, y: 9.5, z: 7.5 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function b64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
function d2r(d) { return d * Math.PI / 180; }
function r2d(r) { return r * 180 / Math.PI; }

// ─── Status toast ────────────────────────────────────────────────────────────
const statusEl = document.getElementById('status');
let statusTimer;
function showStatus(msg, persist) {
  statusEl.textContent = msg;
  statusEl.classList.add('show');
  clearTimeout(statusTimer);
  if (!persist) statusTimer = setTimeout(() => statusEl.classList.remove('show'), 2400);
}

// ─── RN bridge ───────────────────────────────────────────────────────────────
function send(payload) {
  try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch(e){}
}

// ─── Transform state ─────────────────────────────────────────────────────────
let currentStyle = INITIAL_STYLE;
let currentColor = INITIAL_COLOR;
const models = {};

// Base transform = auto-derived from GLB bounding box (uniform scale).
const baseTransform = {
  short: { scale: 1 },
  long:  { scale: 1 },
};

// User-tunable transform in HEAD-LOCAL space (cm, radians, scale factors).
function makeOffset(style) {
  const a = DEFAULT_ANCHOR[style] || DEFAULT_ANCHOR.short;
  return {
    px: a.x, py: a.y, pz: a.z,
    rx: 0, ry: 0, rz: 0,
    sx: 1, sy: 1, sz: 1,
  };
}
const userOffset = {
  short: makeOffset('short'),
  long:  makeOffset('long'),
};

// Per-frame head-size multiplier derived from face-landmark measurement.
// 1.0 = head matches canonical face size. >1.0 = user has bigger head.
let currentHeadSizeMul = 1;

// localStorage — bump key namespace each time the default-anchor scheme
// changes so old saves don't override new sensible defaults.
const LS_PREFIX = 'hl_mp_v2_';
function loadSaved(style) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + style);
    if (raw) userOffset[style] = Object.assign(makeOffset(style), JSON.parse(raw));
  } catch(e){}
}
function getSavedRaw(style) {
  try { return localStorage.getItem(LS_PREFIX + style); } catch(e) { return null; }
}
function isCurrentSaved(style) {
  const raw = getSavedRaw(style);
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    const u = userOffset[style];
    const keys = ['px','py','pz','rx','ry','rz','sx','sy','sz'];
    for (const k of keys) {
      if (Math.abs((saved[k] ?? 0) - (u[k] ?? 0)) > 1e-4) return false;
    }
    return true;
  } catch(e) { return false; }
}
function saveCurrent(style) {
  try {
    localStorage.setItem(LS_PREFIX + style, JSON.stringify(userOffset[style]));
    send({ type: 'transformSaved', style, values: userOffset[style] });
    showStatus('✓ Default saved for ' + style.toUpperCase() + ' — will auto-load next session', false);
    updateSavedTag(style);
  } catch(e) {
    showStatus('✗ Save failed: ' + (e && e.message ? e.message : 'storage unavailable'), false);
  }
}
function updateSavedTag(style) {
  const tag = document.getElementById('dbSavedTag');
  if (!tag) return;
  const raw = getSavedRaw(style);
  if (!raw) {
    tag.textContent = 'No saved default';
    tag.className = 'dbSavedTag dirty';
  } else if (isCurrentSaved(style)) {
    tag.textContent = '✓ Saved';
    tag.className = 'dbSavedTag';
  } else {
    tag.textContent = '● Unsaved changes';
    tag.className = 'dbSavedTag dirty';
  }
}
loadSaved('short');
loadSaved('long');

function applyTransform(style) {
  const m = models[style];
  if (!m) return;
  const b = baseTransform[style];
  const u = userOffset[style];
  const hm = currentHeadSizeMul;
  m.position.set(u.px, u.py, u.pz);
  m.rotation.set(u.rx, u.ry, u.rz);
  // Final scale = (auto-fit base) × (per-frame head-size match) × (user offset)
  m.scale.set(b.scale * hm * u.sx, b.scale * hm * u.sy, b.scale * hm * u.sz);
}

function resetOffset(style) {
  userOffset[style] = makeOffset(style);
  applyTransform(style);
  syncPanel(style);
}

function applyColor(root, hex) {
  const target = new THREE.Color(hex);
  root.traverse(o => {
    if (o.isMesh && o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(mat => {
        if (mat.color) mat.color.copy(target);
        if ('roughness' in mat) mat.roughness = 0.55;
        if ('metalness' in mat) mat.metalness = 0.05;
        mat.needsUpdate = true;
      });
    }
  });
}

function setVisibility(style) {
  Object.keys(models).forEach(k => { if (models[k]) models[k].visible = (k === style); });
}

// ─── Debug panel ─────────────────────────────────────────────────────────────
const dbPanel = document.getElementById('dbPanel');
let dbOpen = false;
const SL = {}, VL = {};
['px','py','pz','rx','ry','rz','sx','sy','sz'].forEach(id => {
  SL[id] = document.getElementById('sl_' + id);
  VL[id] = document.getElementById('v_' + id);
});

function syncPanel(style) {
  const u = userOffset[style];
  document.getElementById('dbStyleLabel').textContent = 'Style: ' + style.toUpperCase();
  SL.px.value = u.px; VL.px.textContent = u.px.toFixed(1);
  SL.py.value = u.py; VL.py.textContent = u.py.toFixed(1);
  SL.pz.value = u.pz; VL.pz.textContent = u.pz.toFixed(1);
  const rxd = r2d(u.rx), ryd = r2d(u.ry), rzd = r2d(u.rz);
  SL.rx.value = rxd; VL.rx.textContent = rxd.toFixed(0) + '°';
  SL.ry.value = ryd; VL.ry.textContent = ryd.toFixed(0) + '°';
  SL.rz.value = rzd; VL.rz.textContent = rzd.toFixed(0) + '°';
  SL.sx.value = u.sx; VL.sx.textContent = u.sx.toFixed(2);
  SL.sy.value = u.sy; VL.sy.textContent = u.sy.toFixed(2);
  SL.sz.value = u.sz; VL.sz.textContent = u.sz.toFixed(2);
  updateSavedTag(style);
}

function toggleDebug() {
  dbOpen = !dbOpen;
  dbPanel.classList.toggle('open', dbOpen);
  if (dbOpen) syncPanel(currentStyle);
}

function wire(id, setter, fmt) {
  SL[id].addEventListener('input', function() {
    const v = parseFloat(this.value);
    setter(v);
    VL[id].textContent = fmt(v);
    applyTransform(currentStyle);
    updateSavedTag(currentStyle);
  });
}
wire('px', v => userOffset[currentStyle].px = v,       v => v.toFixed(1));
wire('py', v => userOffset[currentStyle].py = v,       v => v.toFixed(1));
wire('pz', v => userOffset[currentStyle].pz = v,       v => v.toFixed(1));
wire('rx', v => userOffset[currentStyle].rx = d2r(v),  v => v.toFixed(0) + '°');
wire('ry', v => userOffset[currentStyle].ry = d2r(v),  v => v.toFixed(0) + '°');
wire('rz', v => userOffset[currentStyle].rz = d2r(v),  v => v.toFixed(0) + '°');
wire('sx', v => userOffset[currentStyle].sx = v,       v => v.toFixed(2));
wire('sy', v => userOffset[currentStyle].sy = v,       v => v.toFixed(2));
wire('sz', v => userOffset[currentStyle].sz = v,       v => v.toFixed(2));

document.getElementById('btnSave').addEventListener('click',  () => saveCurrent(currentStyle));
document.getElementById('btnReset').addEventListener('click', () => resetOffset(currentStyle));
document.getElementById('btnCopy').addEventListener('click',  () => {
  const u = userOffset[currentStyle];
  const out = {
    style: currentStyle,
    headLocal: {
      px: +u.px.toFixed(2), py: +u.py.toFixed(2), pz: +u.pz.toFixed(2),
      rxDeg: +r2d(u.rx).toFixed(1), ryDeg: +r2d(u.ry).toFixed(1), rzDeg: +r2d(u.rz).toFixed(1),
      sx: +u.sx.toFixed(3), sy: +u.sy.toFixed(3), sz: +u.sz.toFixed(3),
    },
    baseScale: baseTransform[currentStyle].scale,
  };
  const j = document.getElementById('dbJson');
  j.textContent = JSON.stringify(out, null, 2);
  j.classList.toggle('show');
  send({ type: 'transformJson', data: out });
});

// ─── Real-world face-width estimation (adaptive, multi-pair fallback) ───────
// Uses normalized 2D landmarks (faceLandmarks[i] in image space [0..1]) +
// the head's depth from the transformation matrix to back-compute the
// user's actual face width in cm. This is what scales the wig to the
// real head — NOT any guide overlay, NOT any fixed region.
//
//   apparentPx ← distance (in image pixels) between two landmarks
//   tz_cm      ← head distance from camera (matrix translation Z)
//   focalPx    ← virtual camera focal length: H / (2·tan(fov/2))
//   realW_cm   = apparentPx · tz_cm / focalPx · pair.faceWidthRatio
//
// We try multiple landmark pairs in order of accuracy and only skip a
// pair if BOTH landmarks are clearly outside the frame. This means the
// estimate keeps working when the face is partially clipped — e.g. the
// user is too close to the camera and the temples are off-screen, we
// fall back to cheekbones; if those are off too, we use eye corners.
//
// Each pair has a 'faceWidthRatio' that converts the measured distance
// into equivalent FULL face width (temple-to-temple equivalent), so the
// scale stays consistent regardless of which pair won.
const WIDTH_PAIRS = [
  { a: 234, b: 454, ratio: 1.00, name: 'temples'    },
  { a: 127, b: 356, ratio: 1.02, name: 'cheekbones' },
  { a:  21, b: 251, ratio: 1.05, name: 'uppertemples'},
  { a:  33, b: 263, ratio: 1.50, name: 'eyecorners' },
];

function inFrame(lm) {
  // Allow a little slack outside [0,1] so landmarks right at the edge
  // still count (MediaPipe extrapolates slightly).
  return lm && lm.x > -0.05 && lm.x < 1.05 && lm.y > -0.05 && lm.y < 1.05;
}

function estimateFaceWidthCm(landmarks, mat16, videoW, videoH) {
  if (!landmarks || !videoW || !videoH) return null;
  const tz = Math.abs(mat16[14]);
  if (!isFinite(tz) || tz < 5) return null;

  const fovYRad = VIRTUAL_CAMERA_FOV_Y * Math.PI / 180;
  const focalPx = videoH / (2 * Math.tan(fovYRad / 2));

  for (const p of WIDTH_PAIRS) {
    const A = landmarks[p.a], B = landmarks[p.b];
    if (!inFrame(A) || !inFrame(B)) continue;

    const dxPx = (B.x - A.x) * videoW;
    const dyPx = (B.y - A.y) * videoH;
    const px = Math.hypot(dxPx, dyPx);
    if (px < 4) continue;

    const realCm = (px * tz / focalPx) * p.ratio;
    if (isFinite(realCm) && realCm >= 5 && realCm <= 30) return realCm;
  }
  return null;
}

// ─── Main AR loop ────────────────────────────────────────────────────────────
let currentFacing = 'user';
let videoStream = null;
let faceLandmarker = null;
let lastVideoTime = -1;

async function main() {
  try {
    showStatus('Loading MediaPipe…', true);

    // 1. MediaPipe FaceLandmarker (with head-pose matrix output)
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    // ── Adaptive detection thresholds ──
    // Defaults are 0.5 — we lower everything to 0.3 so the model:
    //   • picks up faces at the edge of the frame (partially clipped)
    //   • keeps tracking through brief occlusions / fast head turns
    //   • still detects faces that are unusually large or small
    // There is NO region-of-interest filter — MediaPipe scans the whole frame.
    const FACE_OPTS_BASE = {
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.3,
      minFacePresenceConfidence:  0.3,
      minTrackingConfidence:      0.3,
    };
    faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      ...FACE_OPTS_BASE,
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
    }).catch(async (err) => {
      // GPU delegate can fail on some Android WebViews — fall back to CPU.
      console.warn('GPU delegate failed, falling back to CPU:', err);
      return await FaceLandmarker.createFromOptions(fileset, {
        ...FACE_OPTS_BASE,
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'CPU',
        },
      });
    });

    // 2. Camera stream
    showStatus('Starting camera…', true);
    await startCamera(currentFacing);

    // 3. three.js scene
    const canvas = document.getElementById('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      VIRTUAL_CAMERA_FOV_Y,
      window.innerWidth / window.innerHeight,
      1, 5000
    );
    // Camera at origin looking down -Z (three.js default). MediaPipe's
    // facialTransformationMatrix maps canonical face → camera-space, which
    // is the world space three.js renders by default.

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.0));
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(0.5, 1, 0.5);
    scene.add(dir);

    // Head root — receives MediaPipe pose matrix every frame
    const headRoot = new THREE.Group();
    headRoot.matrixAutoUpdate = false;
    headRoot.visible = false;  // hide until first detection
    scene.add(headRoot);

    // ── Invisible head-shaped occluder ──
    // Renders depth only (colorWrite=false). Sits where the user's actual
    // skull is, so wig polygons that try to draw in front of the face
    // fail the depth test → face video shows through.
    const occGeom = new THREE.SphereGeometry(1, 32, 24);
    occGeom.scale(HEAD_OCCLUDER.radius.x, HEAD_OCCLUDER.radius.y, HEAD_OCCLUDER.radius.z);
    const occMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
    });
    const occluder = new THREE.Mesh(occGeom, occMat);
    occluder.position.set(HEAD_OCCLUDER.center.x, HEAD_OCCLUDER.center.y, HEAD_OCCLUDER.center.z);
    occluder.renderOrder = -10;   // depth-prepass before everything else
    headRoot.add(occluder);

    // ── Load GLB wigs ──
    const loader = new GLTFLoader();
    // DRACO decoder — some GLBs (especially from Sketchfab / asset libraries)
    // are DRACO-compressed and silently fail to load without this.
    try {
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://unpkg.com/three@0.158.0/examples/jsm/libs/draco/gltf/');
      loader.setDRACOLoader(draco);
    } catch(e) { /* non-fatal if DRACO addon unavailable */ }

    async function loadWig(style, b64) {
      if (!b64) return;
      try {
        const buf = b64ToArrayBuffer(b64);
        const gltf = await new Promise((res, rej) => loader.parse(buf, '', res, rej));
        const model = gltf.scene;

        // Apply all nested transforms so the bbox reflects what we'll actually render.
        model.updateMatrixWorld(true);

        // Count meshes / verts so we can detect "empty" GLBs.
        let meshCount = 0, vertCount = 0;
        model.traverse(o => {
          if (o.isMesh) {
            meshCount++;
            const g = o.geometry;
            if (g && g.attributes && g.attributes.position) vertCount += g.attributes.position.count;
          }
        });

        // Re-center on bbox so the wig pivots around its geometric center
        // (then DEFAULT_WIG_ANCHOR places that center at the scalp).
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3(), center = new THREE.Vector3();
        box.getSize(size); box.getCenter(center);

        // Emit diagnostics so the RN side can log what's actually in the file.
        send({
          type: 'modelDiag',
          style,
          meshes: meshCount,
          verts: vertCount,
          bbox: {
            sizeX: +size.x.toFixed(3), sizeY: +size.y.toFixed(3), sizeZ: +size.z.toFixed(3),
            ctrX:  +center.x.toFixed(3), ctrY:  +center.y.toFixed(3), ctrZ:  +center.z.toFixed(3),
          },
        });

        // Reject degenerate / empty wigs rather than silently rendering nothing.
        if (meshCount === 0 || vertCount === 0) {
          send({ type: 'error', message: 'Wig ' + style + ' has no meshes/vertices.' });
          return;
        }
        const maxDim = Math.max(size.x, size.y, size.z);
        if (!isFinite(maxDim) || maxDim < 1e-5) {
          send({ type: 'error', message: 'Wig ' + style + ' has degenerate bbox.' });
          return;
        }

        // ── Smart pivot selection ─────────────────────────────────────────────
        // For "tall" wigs (long hair, strands hanging far below the head cap)
        // the geometric center of the bbox is way below the actual head area.
        // Pivoting there makes the head-cap float far above the user's head
        // (invisible / off-screen). For these, pivot near the top instead.
        //
        // For roughly cubic wigs (short hair, bob, etc.) the bbox center is
        // approximately the head center — use that.
        const isTallStyle = size.y > 1.4 * size.x;
        const pivotY = isTallStyle
          ? (box.min.y + size.y * 0.82)   // 82% up from bottom = scalp-cap area
          : center.y;                      // bbox center

        model.position.set(-center.x, -pivotY, -center.z);

        const wrapper = new THREE.Group();
        wrapper.add(model);

        // Auto-scale: width-based. We always want the head's WIDTH to match
        // HEAD_WIDTH_CM. For long hair the bbox X is still the wig's width
        // at the temples — depth-based scaling would shrink it incorrectly.
        const widthBasis = size.x > 1e-3 ? size.x : Math.max(size.z, 1e-3);
        const scale = HEAD_WIDTH_CM / widthBasis;
        baseTransform[style] = { scale };

        // Emit pivot+scale info so we can debug per-GLB sizing.
        send({
          type: 'modelFit',
          style,
          pivotMode: isTallStyle ? 'top-82%' : 'bbox-center',
          pivotY: +pivotY.toFixed(3),
          scaleApplied: +scale.toFixed(4),
        });

        // Wig renders AFTER the occluder so depth test culls front-of-face
        // polygons correctly. Be conservative with material settings:
        //   - Force DoubleSide (single-sided hair planes are common but
        //     viewer-side rendering looks bad).
        //   - Disable frustum culling (long strands extend far from origin
        //     and were being culled before fit).
        //   - Leave transparent / depthWrite alone for transparent materials
        //     (alpha-blended hair strands need transparent rendering).
        wrapper.traverse(o => {
          if (o.isMesh) {
            o.renderOrder = 1;
            o.frustumCulled = false;
            if (o.material) {
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              mats.forEach(m => {
                m.side = THREE.DoubleSide;
                if (!m.transparent) {
                  m.depthTest = true;
                  m.depthWrite = true;
                }
                m.needsUpdate = true;
              });
            }
          }
        });

        wrapper.visible = (style === currentStyle);
        headRoot.add(wrapper);
        models[style] = wrapper;
        applyTransform(style);
        applyColor(wrapper, currentColor);
        send({ type: 'modelLoaded', style, scaleApplied: +scale.toFixed(4) });
      } catch(e) {
        send({ type: 'error', message: 'Load ' + style + ': ' + (e && e.message ? e.message : String(e)) });
      }
    }

    await Promise.all([
      loadWig('short', SHORT_B64),
      loadWig('long',  LONG_B64),
    ]);

    showStatus('1-finger: move  •  Pinch: scale  •  Twist: rotate  •  2-finger up/down: depth  •  ⚙: panel', false);
    send({ type: 'ready' });

    // ── Render loop ──
    const video = document.getElementById('video');
    const tmpMatrix = new THREE.Matrix4();

    // Brief persistence on detection dropouts. MediaPipe will occasionally
    // miss a frame when the user turns fast, blinks, or moves to the edge
    // of the frame. We keep the wig at the last known pose for a short
    // grace period so it doesn't pop in and out.
    const KEEP_VISIBLE_FRAMES = 10;     // ~166 ms at 60 fps
    let framesSinceDetection = 999;

    function frame() {
      requestAnimationFrame(frame);
      if (video.readyState < 2 || !faceLandmarker) {
        renderer.render(scene, camera);
        return;
      }
      const now = performance.now();
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const result = faceLandmarker.detectForVideo(video, now);
          const mats = result.facialTransformationMatrixes;
          if (mats && mats.length > 0) {
            // MediaPipe gives a 16-float column-major matrix that maps
            // canonical face metric space → camera-space (cm units).
            tmpMatrix.fromArray(mats[0].data);
            headRoot.matrix.copy(tmpMatrix);
            headRoot.visible = true;
            framesSinceDetection = 0;

            // Measure the user's ACTUAL face width from whichever
            // landmark pair is currently in-frame, and rescale the wig
            // to match. Source of truth: detected head geometry.
            const lms = result.faceLandmarks && result.faceLandmarks[0];
            if (lms) {
              const realCm = estimateFaceWidthCm(lms, mats[0].data, video.videoWidth, video.videoHeight);
              if (realCm !== null) {
                const target = realCm / FACE_WIDTH_BASELINE_CM;
                currentHeadSizeMul = currentHeadSizeMul * (1 - HEAD_SIZE_SMOOTH) + target * HEAD_SIZE_SMOOTH;
                applyTransform(currentStyle);
              }
            }
          } else {
            framesSinceDetection++;
            // Keep last pose for a short grace period; only hide after.
            if (framesSinceDetection > KEEP_VISIBLE_FRAMES) {
              headRoot.visible = false;
            }
          }
        } catch(e) {
          // Detection can occasionally throw on rapid resizes — ignore
        }
      }
      renderer.render(scene, camera);
    }
    frame();

    // ── Resize ──
    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    // ── Touch gestures ──
    // Operate in HEAD-LOCAL cm. 1px ≈ 0.05cm felt about right.
    const PAN_FACTOR = 0.06;
    let touch = null;
    function ptDist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    function ptAng(a, b)  { return Math.atan2(a.clientY - b.clientY, a.clientX - b.clientX); }

    function syncPanelMaybe() {
      if (dbOpen) syncPanel(currentStyle);
      else updateSavedTag(currentStyle);
    }

    document.addEventListener('touchstart', e => {
      if (dbOpen && dbPanel.contains(e.target)) return;
      if (e.touches.length === 1) {
        touch = { mode:'pan', x0:e.touches[0].clientX, y0:e.touches[0].clientY, base: { ...userOffset[currentStyle] } };
      } else if (e.touches.length === 2) {
        touch = {
          mode:'pinch',
          d0: ptDist(e.touches[0],e.touches[1]),
          a0: ptAng(e.touches[0],e.touches[1]),
          cy0: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          base: { ...userOffset[currentStyle] },
        };
      }
    }, { passive: false });

    document.addEventListener('touchmove', e => {
      if (!touch) return;
      if (dbOpen && dbPanel.contains(e.target)) return;
      e.preventDefault();
      const u = userOffset[currentStyle];
      if (touch.mode === 'pan' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touch.x0;
        const dy = e.touches[0].clientY - touch.y0;
        // Mirror: dragging right in selfie view should move wig viewer-right.
        // With CSS scaleX(-1), screen-X is flipped, so negate dx.
        const isMirror = document.getElementById('stage').classList.contains('mirror');
        u.px = touch.base.px + (isMirror ? -dx : dx) * PAN_FACTOR;
        u.py = touch.base.py - dy * PAN_FACTOR;
        applyTransform(currentStyle);
        syncPanelMaybe();
      } else if (touch.mode === 'pinch' && e.touches.length === 2) {
        const d  = ptDist(e.touches[0], e.touches[1]);
        const a  = ptAng(e.touches[0],  e.touches[1]);
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const sf = d / (touch.d0 || 1);

        // Pinch → uniform scale
        const ns = Math.max(0.3, Math.min(3, touch.base.sx * sf));
        u.sx = ns; u.sy = ns; u.sz = ns;

        // Twist → rot Z
        u.rz = touch.base.rz + (a - touch.a0);

        // Centroid vertical drag → Pos Z (depth)
        //   drag UP   = push hair backward, into skull (Z decreases)
        //   drag DOWN = pull hair forward, away from skull (Z increases)
        const dyCenter = cy - touch.cy0;
        const Z_FACTOR = 0.05; // cm per pixel
        u.pz = Math.max(-30, Math.min(15, touch.base.pz + dyCenter * Z_FACTOR));

        applyTransform(currentStyle);
        syncPanelMaybe();
      }
    }, { passive: false });

    document.addEventListener('touchend',    e => { if (e.touches.length === 0) touch = null; }, { passive: false });
    document.addEventListener('touchcancel', () => { touch = null; }, { passive: false });

    // ── Camera flip ──
    window.__flipCamera = async function() {
      currentFacing = currentFacing === 'user' ? 'environment' : 'user';
      document.getElementById('stage').classList.toggle('mirror', currentFacing === 'user');
      try {
        await startCamera(currentFacing);
        send({ type: 'cameraFlipped', facing: currentFacing });
      } catch(e) {
        send({ type: 'error', message: 'Camera flip: ' + (e && e.message ? e.message : String(e)) });
        // revert
        currentFacing = currentFacing === 'user' ? 'environment' : 'user';
        document.getElementById('stage').classList.toggle('mirror', currentFacing === 'user');
        await startCamera(currentFacing).catch(()=>{});
      }
    };

    // ── Capture ──
    window.__capture = function() {
      try {
        renderer.render(scene, camera);
        const video = document.getElementById('video');
        const canvas3 = renderer.domElement;
        const dpr = window.devicePixelRatio || 1;
        const out = document.createElement('canvas');
        out.width  = window.innerWidth * dpr;
        out.height = window.innerHeight * dpr;
        const ctx = out.getContext('2d');
        const isMirror = document.getElementById('stage').classList.contains('mirror');

        // Cover-fit the video
        if (video && video.videoWidth) {
          const vR = video.videoWidth / video.videoHeight;
          const oR = out.width / out.height;
          let dw, dh, dx, dy;
          if (vR > oR) { dh = out.height; dw = dh * vR; dx = (out.width - dw) / 2; dy = 0; }
          else { dw = out.width; dh = dw / vR; dx = 0; dy = (out.height - dh) / 2; }
          ctx.save();
          if (isMirror) {
            ctx.translate(out.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, out.width - dx - dw, dy, dw, dh);
          } else {
            ctx.drawImage(video, dx, dy, dw, dh);
          }
          ctx.restore();
        }

        // Overlay three.js — also mirror if needed
        ctx.save();
        if (isMirror) {
          ctx.translate(out.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(canvas3, 0, 0, out.width, out.height);
        ctx.restore();

        send({ type: 'capture', dataUri: out.toDataURL('image/jpeg', 0.92) });
      } catch(e) {
        send({ type: 'error', message: 'Capture: ' + (e && e.message ? e.message : String(e)) });
      }
    };

  } catch(e) {
    const msg = e && e.message ? e.message : String(e);
    showStatus('Error: ' + msg, true);
    send({ type: 'error', message: msg });
  }
}

async function startCamera(facing) {
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
  videoStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facing },
      width:  { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
  const video = document.getElementById('video');
  video.srcObject = videoStream;
  await video.play();
}

// ─── Message router ──────────────────────────────────────────────────────────
function handleMessage(raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch(e) { return; }
  if (msg.type === 'setStyle') {
    currentStyle = msg.value;
    setVisibility(msg.value);
    if (dbOpen) syncPanel(msg.value);
  } else if (msg.type === 'setColor') {
    currentColor = msg.value;
    const m = models[currentStyle];
    if (m) applyColor(m, msg.value);
  } else if (msg.type === 'resetTransform') {
    resetOffset(currentStyle);
  } else if (msg.type === 'flipCamera') {
    if (window.__flipCamera) window.__flipCamera();
  } else if (msg.type === 'capture') {
    if (window.__capture) window.__capture();
  } else if (msg.type === 'toggleDebug') {
    toggleDebug();
  }
}
window.addEventListener('message',   e => handleMessage(e.data));
document.addEventListener('message',  e => handleMessage(e.data));

main();
</script>
</body>
</html>`;

export function buildArHtml(opts: {
  shortB64: string;
  longB64: string;
  initialStyle: 'short' | 'long';
  initialColor: string;
}): string {
  return TEMPLATE
    .replace('__SHORT_B64__', opts.shortB64)
    .replace('__LONG_B64__',  opts.longB64)
    .replace('__INITIAL_STYLE__', opts.initialStyle)
    .replace('__INITIAL_COLOR__', opts.initialColor);
}
