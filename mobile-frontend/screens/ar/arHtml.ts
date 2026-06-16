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
/* Light blur on the 3D hair overlay feathers the hair silhouette so its
   edges blend into the real photo instead of looking like hard-cut cards.
   Tune the px value: more = softer/dreamier, less = crisper. */
#canvas{z-index:1;pointer-events:none;filter:blur(0.8px);}
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

<!-- Calibration panel removed — wig transforms are baked factory defaults. -->

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
// short (we pivot at bbox center → head center) and long (we pivot near
// the scalp cap → crown of skull).
// Units: cm in canonical face metric space.
// Baked-in factory defaults per style — calibrated against real
// user-head sizes and saved here so the wig drops onto the user
// correctly the moment AR initializes, with no manual calibration.
// Numbers in cm / radians / scale-factor. d2r(deg) = deg*PI/180.
const DEG = Math.PI / 180;
const FACTORY_TRANSFORM = {
  // Baked from on-device fitting for the current GLB models.
  short: {
    // px baked with the user's Horizontal -1.4 (0.287 + (-1.4) = -1.113).
    px: -1.113, py: 1.112, pz: -10.4,
    // ry baked with the user's Rotation 11° (11 * PI/180 = 0.192).
    rx: 0, ry: 0.192, rz: -0.0698,
    // Baked +4% from the user's preferred on-device fit (slider was 104%).
    sx: 2.575, sy: 3.033, sz: 2.581,
  },
  long: {
    px: 0.438, py: 4.535, pz: -4.1,
    rx: 0, ry: 0, rz: 0.0175,
    // Baked +3% from the user's preferred on-device fit (slider was 103%).
    sx: 1.740, sy: 1.661, sz: 1.661,
  },
};

// Wig width (cm). Widened from 14 → 15 so the wig wraps a bit further down the
// sides and covers the user's real hair at the temples instead of leaving it
// peeking out. Raise for more coverage, lower if the sides bow out past the face.
const WIG_WIDTH_CM = 15;

// Face-shaped depth occluder driven by the LIVE MediaPipe face mesh.
// The old version was a fixed ellipsoid — it cut a generic OVAL "hole" through
// the hair regardless of the user's actual face (the "fixed circle"). Instead
// we now build a depth mask from the detected FACE-OVAL landmarks every frame,
// so the cutout is the exact shape of THIS face. Hair that sits on/behind the
// face inside this silhouette is depth-culled (face shows through); bangs in
// front of the face still render; side/back hair outside the silhouette renders.
//
// Ordered clockwise loop of the 36 MediaPipe face-oval landmark indices.
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
// Push the mask slightly toward the camera (fraction of head depth) so the
// wig's face-covering polygons fall behind it and get culled, while real
// bangs (closer to the camera) still render in front.
const OCCLUDER_FORWARD = 0.06;
// Reference face width (cm) used to convert normalized landmark z → world depth
// when giving the occluder its 3D curvature/tilt.
const OCCLUDER_FACE_CM = 14;
// How far up the forehead the depth mask extends:
//   0   = stop at the eyebrows (forehead fully exposed → back-of-wig strands
//         bleed through onto the forehead — the artifact we're fixing)
//   1   = extend all the way to the hairline (forehead fully masked → strands
//         draped behind the head are culled there)
// Raise toward 1 if you still see back hair on the forehead; lower it if real
// bangs start getting clipped.
const FOREHEAD_COVER = 0.9;
// Extra depth (cm) the forehead part of the mask is pushed AWAY from the camera,
// so it sits BEHIND real bangs (which hang in front of the skin) yet still in
// FRONT of the back-of-head strands. This is what lets bangs render while the
// back hair on the forehead is culled. Increase if bangs get clipped; decrease
// if back strands still show through the forehead.
const FOREHEAD_PUSH_BACK = 1.5;
// Soft halo radius (CSS px) around the WIG's OUTER edge only. Implemented as a
// drop-shadow in the current hair color — so the wig INTERIOR stays fully sharp
// (hair strands visible) and only the silhouette gets a soft colored fringe
// that bleeds over the real hair at the hairline/temples and hides it. The
// camera feed stays sharp too. Raise to cover more real hair at the edge;
// lower for a crisper outline. 0 = off (no edge halo).
const WIG_EDGE_BLUR_PX = 0;

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
  // Keep the AR view clean: only ever surface ERROR text on screen. All the
  // informational status ("Loading…", instructions, etc.) is suppressed so no
  // text floats above the camera.
  if (!/^error/i.test(msg)) return;
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

// Baked transforms per style — no user adjustment.
function makeOffset(style) {
  const f = FACTORY_TRANSFORM[style] || FACTORY_TRANSFORM.short;
  return { px: f.px, py: f.py, pz: f.pz, rx: f.rx, ry: f.ry, rz: f.rz, sx: f.sx, sy: f.sy, sz: f.sz };
}
const userOffset = {
  short: makeOffset('short'),
  long:  makeOffset('long'),
};

// User-adjustable controls (set live from the RN UI), per style:
//   userScale — size multiplier on top of the auto-fit + factory scale (1 = default)
//   userSpinY — extra spin around the head's vertical axis, in radians (0..2π) → 360°
//   userMove  — extra position offset (cm) added to the factory anchor:
//                 mx = horizontal (left/right), my = vertical (up/down),
//                 mz = depth (toward/away from the camera)
const userScale = { short: 1, long: 1 };
const userSpinY = { short: 0, long: 0 };
const userMove  = { short: { mx: 0, my: 0, mz: 0 }, long: { mx: 0, my: 0, mz: 0 } };

function applyTransform(style) {
  const m = models[style];
  if (!m) return;
  const b = baseTransform[style];
  const u = userOffset[style];
  const us = userScale[style] || 1;
  const spin = userSpinY[style] || 0;
  const mv = userMove[style] || { mx: 0, my: 0, mz: 0 };
  m.position.set(u.px + mv.mx, u.py + mv.my, u.pz + mv.mz);
  m.rotation.set(u.rx, u.ry + spin, u.rz);
  m.scale.set(b.scale * u.sx * us, b.scale * u.sy * us, b.scale * u.sz * us);
}

function resetOffset(style) {
  userOffset[style] = makeOffset(style);
  applyTransform(style);
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

// Keep the wig sharp, but give its OUTER silhouette a soft halo in the current
// hair color so the edge blends over (and hides) the real hair. Uses stacked
// drop-shadows — these only affect the silhouette, never the interior strands.
function applyEdgeFeather() {
  const c = document.getElementById('canvas');
  if (!c) return;
  // Keep the original light 0.8px anti-alias feather on the silhouette.
  let f = 'blur(0.8px)';
  if (WIG_EDGE_BLUR_PX > 0) {
    const ds = ' drop-shadow(0 0 ' + WIG_EDGE_BLUR_PX + 'px ' + currentColor + ')';
    f += ds + ds + ds; // stack 3 for a denser, more opaque fringe
  }
  c.style.filter = f;
}

// (Calibration panel removed — transforms baked in FACTORY_TRANSFORM.)
function toggleDebug() { /* no-op — panel removed */ }

// (Face-width estimation removed — wig scale is now fixed per-GLB.
//  Dynamic occluder sizing from face-oval landmarks is done inside main().)

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

    // ── Live face-mesh depth occluder ──
    // A triangle fan over the face-oval landmarks (centroid at index 0 + the
    // 36 rim verts). Positions are rewritten every frame in the render loop
    // from the detected landmarks; indices are fixed. It writes depth only
    // (colorWrite=false) so it never draws pixels — it just makes the wig's
    // face-covering polygons fail the depth test, revealing the camera video.
    // Lives in WORLD space (not under headRoot): we position its verts by
    // unprojecting the on-screen landmarks, which already account for pose.
    const OVAL_N = FACE_OVAL.length;
    const maskPos = new Float32Array((OVAL_N + 1) * 3); // +1 centroid at index 0
    const maskGeom = new THREE.BufferGeometry();
    maskGeom.setAttribute('position', new THREE.BufferAttribute(maskPos, 3));
    const maskIdx = [];
    for (let i = 0; i < OVAL_N; i++) maskIdx.push(0, 1 + i, 1 + ((i + 1) % OVAL_N));
    maskGeom.setIndex(maskIdx);
    const maskMat = new THREE.MeshBasicMaterial({
      colorWrite: false, depthWrite: true, depthTest: true, side: THREE.DoubleSide,
    });
    const faceMask = new THREE.Mesh(maskGeom, maskMat);
    faceMask.frustumCulled = false;
    faceMask.renderOrder = -10;   // depth prepass before the wig
    faceMask.visible = false;     // shown on first detection
    scene.add(faceMask);
    const maskRay = new THREE.Vector3();

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

        // Auto-scale: width-based, targeting the FULL SKULL width (WIG_WIDTH_CM)
        // not the face width. This makes the wig wrap the whole head instead
        // of clinging to the face oval.
        const widthBasis = size.x > 1e-3 ? size.x : Math.max(size.z, 1e-3);
        const scale = WIG_WIDTH_CM / widthBasis;
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

        // (Long hair shader-clip removed — was preventing AR from initializing
        //  on some material setups. If you want to crop the long strands, use
        //  the Y-position slider in the calibration panel to push the wig up.)

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

    send({ type: 'ready' });

    // ── Render loop ──
    const video = document.getElementById('video');
    // Camera feed AND wig interior stay sharp — only the wig's outer edge gets a
    // soft colored halo (see applyEdgeFeather) to blend over the real hair.
    video.style.filter = 'none';
    applyEdgeFeather();
    const tmpMatrix = new THREE.Matrix4();

    // ── Head-pose smoothing ──
    // MediaPipe gives a fresh pose only on detection frames, and it's noisy, so
    // copying it straight to the wig makes it jitter / snap when you turn. We
    // decompose the latest pose into a TARGET (pos / rotation / scale) and, every
    // render frame, ease the CURRENT pose toward it. Result: buttery tracking
    // that keeps moving smoothly even between detections.
    const tgtPos = new THREE.Vector3();
    const tgtQuat = new THREE.Quaternion();
    const tgtScale = new THREE.Vector3(1, 1, 1);
    const curPos = new THREE.Vector3();
    const curQuat = new THREE.Quaternion();
    const curScale = new THREE.Vector3(1, 1, 1);
    let hasPose = false;
    // Per-frame easing (0 = frozen, 1 = instant/snappy). ~0.4 ≈ smooth but
    // still responsive at 60 fps. Lower it for more glide, raise for less lag.
    const POSE_SMOOTH = 0.4;

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
            // Set the smoothing TARGET (eased toward every render frame below).
            tmpMatrix.decompose(tgtPos, tgtQuat, tgtScale);
            if (!hasPose) {
              // First detection — snap so it doesn't glide in from origin.
              curPos.copy(tgtPos); curQuat.copy(tgtQuat); curScale.copy(tgtScale);
              hasPose = true;
            }
            headRoot.visible = true;
            framesSinceDetection = 0;

            // ── Update the live face-mesh depth occluder ──
            // Map each face-oval landmark through the video's object-fit:cover
            // transform → screen NDC → unproject to a point at (just in front
            // of) the head depth. This builds a face-shaped depth mask that
            // matches the real face, so the cutout follows the face — not a
            // fixed oval. The CSS mirror on #stage flips mask + video together.
            const lm = result.faceLandmarks && result.faceLandmarks[0];
            if (lm && video.videoWidth) {
              const vw = video.videoWidth, vh = video.videoHeight;
              const sw = window.innerWidth, sh = window.innerHeight;
              const cover = Math.max(sw / vw, sh / vh);
              const oX = (sw - vw * cover) / 2, oY = (sh - vh * cover) / 2;
              const baseZ = tmpMatrix.elements[14] * (1 - OCCLUDER_FORWARD); // toward camera
              // Per-vertex DEPTH from the landmark z so the mask is a curved
              // surface that TILTS with the head — when you look up/down the
              // forehead recedes and the mask follows it, so the front hair no
              // longer sinks "inside" the head. Convert the normalized landmark
              // z into cm using the measured face width as the scale reference.
              const a = lm[234], b = lm[454];
              const ovalW = (a && b) ? Math.hypot(a.x - b.x, a.y - b.y) : 0.33;
              const kz = OCCLUDER_FACE_CM / Math.max(ovalW, 0.05);
              // Clamp the TOP of the mask down to the eyebrow line so the
              // forehead is NOT covered — otherwise the occluder culls the
              // bangs that legitimately sit on the forehead, punching holes in
              // the hair. Eyes / nose / cheeks / jaw stay covered.
              const browA = lm[105], browB = lm[334];
              const browSy = (browA && browB)
                ? Math.min(browA.y, browB.y) * vh * cover + oY
                : null;
              let cx = 0, cy = 0, cz = 0;
              for (let i = 0; i < OVAL_N; i++) {
                const p = lm[FACE_OVAL[i]];
                const sx = p.x * vw * cover + oX;
                const trueSy = p.y * vh * cover + oY;
                let sy = trueSy;
                // Vertices above the eyebrow line are the forehead/hairline rim.
                // Instead of clamping them flat to the brow (which left the
                // forehead exposed), raise them back UP toward the hairline by
                // FOREHEAD_COVER so the forehead gets masked too.
                let isForehead = false;
                if (browSy !== null && trueSy < browSy) {
                  isForehead = true;
                  sy = browSy + (trueSy - browSy) * FOREHEAD_COVER;
                }
                const ndcX = (sx / sw) * 2 - 1;
                const ndcY = -((sy / sh) * 2 - 1);
                // camera is at the origin → unproject + normalize gives the ray
                // direction; scale it to reach this vertex's depth.
                maskRay.set(ndcX, ndcY, 0.5).unproject(camera).normalize();
                // Landmark z is smaller (more negative) when CLOSER to camera,
                // so move that vertex toward the camera (toward 0) accordingly.
                // For forehead vertices, push the mask a bit deeper (away from
                // camera) so it stays behind real bangs but in front of the
                // back-of-head strands.
                const depth = (baseZ - (p.z || 0) * kz) - (isForehead ? FOREHEAD_PUSH_BACK : 0);
                const t = depth / maskRay.z;
                const wx = maskRay.x * t, wy = maskRay.y * t, wz = maskRay.z * t;
                const vi = (i + 1) * 3;
                maskPos[vi] = wx; maskPos[vi + 1] = wy; maskPos[vi + 2] = wz;
                cx += wx; cy += wy; cz += wz;
              }
              maskPos[0] = cx / OVAL_N; maskPos[1] = cy / OVAL_N; maskPos[2] = cz / OVAL_N;
              maskGeom.attributes.position.needsUpdate = true;
              faceMask.visible = true;
            }
          } else {
            framesSinceDetection++;
            // Keep last pose for a short grace period; only hide after.
            if (framesSinceDetection > KEEP_VISIBLE_FRAMES) {
              headRoot.visible = false;
              faceMask.visible = false;
            }
          }
        } catch(e) {
          // Detection can occasionally throw on rapid resizes — ignore
        }
      }
      // Ease the wig pose toward the latest target every frame for smooth,
      // glide-y head tracking (runs even on non-detection frames).
      if (hasPose) {
        curPos.lerp(tgtPos, POSE_SMOOTH);
        curQuat.slerp(tgtQuat, POSE_SMOOTH);
        curScale.lerp(tgtScale, POSE_SMOOTH);
        headRoot.matrix.compose(curPos, curQuat, curScale);
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

    // (Fitting controls removed — wig transforms are baked in FACTORY_TRANSFORM.)

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
          // Camera feed stays sharp in the saved photo (no blur here).
          if (isMirror) {
            ctx.translate(out.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, out.width - dx - dw, dy, dw, dh);
          } else {
            ctx.drawImage(video, dx, dy, dw, dh);
          }
          ctx.restore();
        }

        // Overlay the wig: sharp interior + a soft colored edge halo that
        // matches the live drop-shadow feather (CSS filters don't apply to
        // drawImage, so reproduce the halo with a canvas shadow in device px).
        ctx.save();
        if (isMirror) {
          ctx.translate(out.width, 0);
          ctx.scale(-1, 1);
        }
        if (WIG_EDGE_BLUR_PX > 0) {
          ctx.shadowColor = currentColor;
          ctx.shadowBlur = Math.round(WIG_EDGE_BLUR_PX * dpr);
          // Draw a few times to build up the halo density like the stacked CSS shadows.
          ctx.drawImage(canvas3, 0, 0, out.width, out.height);
          ctx.drawImage(canvas3, 0, 0, out.width, out.height);
          ctx.shadowColor = 'rgba(0,0,0,0)';
          ctx.shadowBlur = 0;
        }
        // Sharp wig on top — crisp interior strands.
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
    // Carry the currently selected color over to the newly shown style so
    // switching Short ↔ Long keeps the same hair color.
    const m = models[currentStyle];
    if (m) applyColor(m, currentColor);
    applyEdgeFeather();
  } else if (msg.type === 'setColor') {
    currentColor = msg.value;
    const m = models[currentStyle];
    if (m) applyColor(m, msg.value);
    applyEdgeFeather(); // recolor the edge halo to match the new hair color
  } else if (msg.type === 'setScale') {
    // Size multiplier (clamped). Applies to the currently visible style.
    const v = Math.max(0.4, Math.min(2.5, Number(msg.value) || 1));
    userScale[currentStyle] = v;
    applyTransform(currentStyle);
  } else if (msg.type === 'setSpin') {
    // 360° rotation around the head's vertical axis. value = degrees (0..360).
    userSpinY[currentStyle] = ((Number(msg.value) || 0) * Math.PI) / 180;
    applyTransform(currentStyle);
  } else if (msg.type === 'setMoveX') {
    // Horizontal move (cm). +right / -left.
    userMove[currentStyle].mx = Math.max(-8, Math.min(8, Number(msg.value) || 0));
    applyTransform(currentStyle);
  } else if (msg.type === 'setMoveY') {
    // Vertical move (cm). +up / -down.
    userMove[currentStyle].my = Math.max(-8, Math.min(8, Number(msg.value) || 0));
    applyTransform(currentStyle);
  } else if (msg.type === 'setDepth') {
    // Depth move (cm). + toward camera / - away (deeper onto the head).
    userMove[currentStyle].mz = Math.max(-10, Math.min(10, Number(msg.value) || 0));
    applyTransform(currentStyle);
  } else if (msg.type === 'resetAdjust') {
    // Reset size + spin + move/depth for the current style back to factory defaults.
    userScale[currentStyle] = 1;
    userSpinY[currentStyle] = 0;
    userMove[currentStyle] = { mx: 0, my: 0, mz: 0 };
    applyTransform(currentStyle);
  } else if (msg.type === 'flipCamera') {
    if (window.__flipCamera) window.__flipCamera();
  } else if (msg.type === 'capture') {
    if (window.__capture) window.__capture();
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
