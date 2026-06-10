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
  short: {
    px: -1.1, py: -0.8, pz: -6.0,
    rx: 0, ry: 0, rz: 5 * DEG,
    sx: 2.28, sy: 2.22, sz: 2.16,
  },
  long: {
    px: 2.0, py: 3.8, pz: -2.1,
    rx: 0, ry: 0, rz: 1 * DEG,
    sx: 2.83, sy: 2.83, sz: 2.83,
  },
};

// Wig width — set to FACE width so the wig fits real heads naturally.
// Was 17 (skull width) before — made the wig too wide and the sides
// projected forward of the face.
const WIG_WIDTH_CM = 14;

// Face-shaped depth occluder — STATIC dimensions for reliability.
// Covers the FACE AREA only (temples → chin) but extends FORWARD toward
// the camera so any hair geometry sticking out past the face gets clipped
// by the depth test, letting the camera video (face) show through.
//
// Center is in MediaPipe canonical face space (cm). Radius is half-extent.
const HEAD_OCCLUDER = {
  center: { x: 0, y: -1.0, z:  2.5 },  // face center, pushed forward toward camera
  radius: { x: 7.0, y:  9.5, z:  6.0 },// face-sized, DEEP forward to clip protruding hair
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

// Baked transforms per style — no user adjustment.
function makeOffset(style) {
  const f = FACTORY_TRANSFORM[style] || FACTORY_TRANSFORM.short;
  return { px: f.px, py: f.py, pz: f.pz, rx: f.rx, ry: f.ry, rz: f.rz, sx: f.sx, sy: f.sy, sz: f.sz };
}
const userOffset = {
  short: makeOffset('short'),
  long:  makeOffset('long'),
};

function applyTransform(style) {
  const m = models[style];
  if (!m) return;
  const b = baseTransform[style];
  const u = userOffset[style];
  m.position.set(u.px, u.py, u.pz);
  m.rotation.set(u.rx, u.ry, u.rz);
  m.scale.set(b.scale * u.sx, b.scale * u.sy, b.scale * u.sz);
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

    // (Static occluder — sized at geometry creation, no per-frame update.
    //  The buggy dynamic version was double-scaling, leaving the occluder
    //  either huge or microscopic. A static face-sized occluder is more
    //  reliable than chasing landmark-derived sizes every frame.)

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

            // (Occluder is static — no per-frame resize. The static face-sized
            //  occluder reliably hides hair that protrudes in front of the face.)
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

    // (Touch gestures removed — transforms are baked factory defaults,
    //  so per-session pan/pinch/twist adjustments are no longer needed.)

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
  } else if (msg.type === 'setColor') {
    currentColor = msg.value;
    const m = models[currentStyle];
    if (m) applyColor(m, msg.value);
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
