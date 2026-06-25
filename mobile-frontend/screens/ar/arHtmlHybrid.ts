/**
 * Hybrid AR WebView — minimal three.js renderer driven by native pose events.
 *
 * Architecture difference from arHtml.ts:
 *   - No getUserMedia, no MediaPipe — the camera + face tracking live on the
 *     native side (modules/expo-face-tracker, ML Kit). This HTML just renders
 *     the 3D hair model on a TRANSPARENT canvas that overlays the native
 *     camera preview underneath.
 *   - Receives face pose via window.postMessage: `{ type: 'face', ...data }`,
 *     where `data` is the normalized FaceData payload from the native module.
 *   - On `{ type: 'faceLost' }` the hair fades out smoothly.
 *
 * The hair is positioned with an orthographic camera so screen-space mapping
 * from the native tracker (boxLeft / boxTop in 0..1) is one-to-one with
 * NDC — no perspective math needed on the JS side.
 */

interface BuildHybridOpts {
  shortB64: string;
  longB64: string;
  initialStyle: 'short' | 'long';
  initialColor: string;
}

const TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;}
#canvas{position:fixed;inset:0;width:100vw;height:100vh;display:block;background:transparent;pointer-events:none;}
#hint{position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:8px 14px;background:rgba(0,0,0,.55);border-radius:16px;color:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:13px;opacity:0;transition:opacity .3s;pointer-events:none;}
#hint.show{opacity:1;}
</style>
</head>
<body>
<canvas id="canvas"></canvas>
<div id="hint">Center your face in good lighting</div>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SHORT_B64 = '__SHORT_B64__';
const LONG_B64  = '__LONG_B64__';
const INIT_STYLE = '__INIT_STYLE__';
const INIT_COLOR = '__INIT_COLOR__';

const RN = (msg) => {
  try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  catch (e) { /* RN not available */ }
};

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas'),
  alpha: true,
  antialias: true,
  premultipliedAlpha: false,
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio || 1);

const resize = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  // Orthographic camera with NDC-aligned frustum — screen-normalized 0..1 box
  // coords map directly to (x*2-1, 1-y*2). aspect is folded in via the
  // viewport width/height when projecting the hair root.
  camera.left = -1;
  camera.right = 1;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();
};
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.position.z = 5;

const scene = new THREE.Scene();

// Soft 3-point lighting so the hair has shape but no harsh shadows.
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(0.5, 1, 1);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffe1f3, 0.4);
rim.position.set(-0.7, 0.3, -0.5);
scene.add(rim);

// The hair root carries position + scale + rotation derived from face pose;
// each loaded GLB lives inside it. We only show one at a time.
const hairRoot = new THREE.Group();
scene.add(hairRoot);

let shortHair = null, longHair = null;
let currentStyle = INIT_STYLE;
let currentColor = new THREE.Color(INIT_COLOR);
let visibleOpacity = 0; // smoothly faded based on tracking state

const loader = new GLTFLoader();
const b64ToBuffer = (b64) => {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return buf;
};

const loadModel = (b64) => new Promise((resolve, reject) => {
  try {
    loader.parse(b64ToBuffer(b64), '', (gltf) => resolve(gltf.scene), reject);
  } catch (e) { reject(e); }
});

const applyColorAndOpacity = (obj, color, opacity) => {
  obj.traverse((node) => {
    if (node.isMesh && node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (m.color) m.color.copy(color);
        m.transparent = true;
        m.opacity = opacity;
        m.depthWrite = opacity > 0.95;
      });
    }
  });
};

const setVisibleStyle = (style) => {
  currentStyle = style;
  if (shortHair) shortHair.visible = style === 'short';
  if (longHair) longHair.visible = style === 'long';
};

(async () => {
  try {
    const [shortScene, longScene] = await Promise.all([
      loadModel(SHORT_B64),
      loadModel(LONG_B64),
    ]);
    shortHair = shortScene;
    longHair = longScene;
    // Normalize each model so its bounding-box height ≈ 1 unit; we then scale
    // it down at runtime based on the face's vertical size in NDC.
    [shortHair, longHair].forEach((m) => {
      const box = new THREE.Box3().setFromObject(m);
      const sz = new THREE.Vector3();
      box.getSize(sz);
      const norm = 1 / Math.max(sz.y, 0.0001);
      m.scale.setScalar(norm);
      // Center the model on its own center so positioning is intuitive.
      const center = new THREE.Vector3();
      box.getCenter(center);
      m.position.sub(center.multiplyScalar(norm));
    });
    hairRoot.add(shortHair);
    hairRoot.add(longHair);
    setVisibleStyle(INIT_STYLE);
    applyColorAndOpacity(shortHair, currentColor, 0);
    applyColorAndOpacity(longHair, currentColor, 0);

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(tick);
    RN({ type: 'ready' });
  } catch (e) {
    RN({ type: 'error', message: 'Hair models failed to load: ' + (e && e.message || e) });
  }
})();

// Smoothed target pose so the hair doesn't jitter on noisy ML Kit frames.
const targetPos = new THREE.Vector3();
const targetRot = new THREE.Euler();
let targetScale = 1;
let targetOpacity = 0;

const SMOOTHING = 0.35; // 0 = no smoothing (snappy), 1 = frozen
const DEG = Math.PI / 180;

const handleFace = (face) => {
  const aspect = window.innerWidth / window.innerHeight;

  // Forehead position = top-center of the bounding box, raised by ~20% of the
  // box height (the GLB pivot sits roughly at the crown of the hair model).
  const cx = face.boxLeft + face.boxWidth / 2;
  const topY = face.boxTop - face.boxHeight * 0.20;

  // Map 0..1 screen coords -> NDC (-1..1). For X we keep aspect intact because
  // the canvas is square in NDC; we scale x by aspect so a centered face stays
  // centered on tall screens.
  targetPos.x = (cx * 2 - 1) * aspect;
  targetPos.y = 1 - topY * 2;
  targetPos.z = 0;

  // Hair scale follows face height — empirically ~1.6x the face box height
  // looks right for long hair, slightly less for short.
  const baseScale = currentStyle === 'long' ? 1.7 : 1.4;
  targetScale = face.boxHeight * baseScale;

  // ML Kit Euler angles are in degrees. Tweak signs to match three.js' axes:
  //   eulerY -> rotate around three.js Y (yaw) — already correct
  //   eulerX -> rotate around three.js X (pitch) — flip sign so nod-down = forward
  //   eulerZ -> rotate around three.js Z (roll) — already correct
  targetRot.y = face.eulerY * DEG;
  targetRot.x = -face.eulerX * DEG;
  targetRot.z = face.eulerZ * DEG;
  targetOpacity = 1;
};

const handleFaceLost = () => {
  targetOpacity = 0;
};

const onRNMessage = (data) => {
  try {
    const msg = typeof data === 'string' ? JSON.parse(data) : data;
    if (msg.type === 'face') handleFace(msg);
    else if (msg.type === 'faceLost') handleFaceLost();
    else if (msg.type === 'setStyle') setVisibleStyle(msg.value);
    else if (msg.type === 'setColor') currentColor.set(msg.value);
    else if (msg.type === 'capture') {
      // Final render then snapshot the canvas. Since the canvas is transparent
      // overlay, the RN side will composite with the native camera frame.
      renderer.render(scene, camera);
      const dataUri = renderer.domElement.toDataURL('image/png');
      RN({ type: 'capture', dataUri });
    }
  } catch (e) { /* swallow */ }
};
window.addEventListener('message', (e) => onRNMessage(e.data));
document.addEventListener('message', (e) => onRNMessage(e.data));

const tick = () => {
  const k = 1 - SMOOTHING;
  hairRoot.position.lerp(targetPos, k);
  hairRoot.rotation.x += (targetRot.x - hairRoot.rotation.x) * k;
  hairRoot.rotation.y += (targetRot.y - hairRoot.rotation.y) * k;
  hairRoot.rotation.z += (targetRot.z - hairRoot.rotation.z) * k;
  hairRoot.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, k);
  visibleOpacity += (targetOpacity - visibleOpacity) * 0.1;

  // Apply opacity + color each frame (cheap — handful of meshes).
  if (shortHair && shortHair.visible) applyColorAndOpacity(shortHair, currentColor, visibleOpacity);
  if (longHair && longHair.visible) applyColorAndOpacity(longHair, currentColor, visibleOpacity);

  // Show the hint while we have no face yet.
  const hint = document.getElementById('hint');
  if (hint) hint.classList.toggle('show', visibleOpacity < 0.2);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};
</script>
</body>
</html>`;

export function buildArHtmlHybrid(opts: BuildHybridOpts): string {
  return TEMPLATE
    .replace('__SHORT_B64__', opts.shortB64)
    .replace('__LONG_B64__', opts.longB64)
    .replace('__INIT_STYLE__', opts.initialStyle)
    .replace('__INIT_COLOR__', opts.initialColor);
}
