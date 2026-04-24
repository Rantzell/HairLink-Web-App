<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>HairLink AR Try-On</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 100vw; height: 100vh; overflow: hidden; background: #111; font-family: -apple-system, sans-serif; }
    #video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    #canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; transform: scaleX(-1); }
    #status {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      color: #fff; text-align: center; font-size: 15px; z-index: 30;
      background: rgba(0,0,0,0.7); padding: 20px 28px; border-radius: 16px;
      max-width: 85%;
    }
  </style>
</head>
<body>
  <video id="video" autoplay playsinline muted></video>
  <canvas id="canvas"></canvas>
  <div id="status">Loading AR Engine...</div>

  <script type="module">
    // --- Config ---
    const WIG_OPTIONS = [
      { id: 'long_straight', name: 'Long Straight', url: 'https://www.pngall.com/wp-content/uploads/5/Wig-PNG.png', scaleW: 2.2, scaleH: 2.8, offY: -0.6 },
      { id: 'bob_cut', name: 'Bob Cut', url: 'https://www.pngall.com/wp-content/uploads/5/Black-Wig-PNG-Picture.png', scaleW: 1.8, scaleH: 2.2, offY: -0.5 },
      { id: 'curly', name: 'Curly', url: 'https://www.pngall.com/wp-content/uploads/5/Black-Wig-PNG.png', scaleW: 2.0, scaleH: 2.4, offY: -0.55 },
      { id: 'wavy_brown', name: 'Wavy Brown', url: 'https://www.pngall.com/wp-content/uploads/5/Wig-Hair-PNG-HD-Image.png', scaleW: 1.6, scaleH: 2.6, offY: -0.5 },
      { id: 'blonde_long', name: 'Blonde Long', url: 'https://www.pngall.com/wp-content/uploads/5/Golden-Wig-PNG.png', scaleW: 2.2, scaleH: 2.6, offY: -0.55 },
      { id: 'red_curly', name: 'Red Curly', url: 'https://www.pngall.com/wp-content/uploads/5/Red-Wig-PNG-Image.png', scaleW: 2.0, scaleH: 2.2, offY: -0.5 },
    ];

    const status = document.getElementById('status');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const wigBar = document.getElementById('wig-bar');
    const wigScroll = document.getElementById('wig-scroll');

    let selectedWig = 0;
    let wigImages = [];
    let faceDetector = null;
    let running = false;

    // --- Step 1: Load wig images ---
    async function loadWigImages() {
      status.textContent = 'Loading wig images...';
      const promises = WIG_OPTIONS.map(opt => {
        return new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = opt.url;
        });
      });
      wigImages = await Promise.all(promises);
    }

    // --- Step 2: Cycle wigs (optional logic kept for future) ---
    function nextWig() {
      selectedWig = (selectedWig + 1) % WIG_OPTIONS.length;
    }
    window.addEventListener('click', nextWig);
    window.addEventListener('touchstart', nextWig);

    // --- Step 3: Start camera ---
    async function startCamera() {
      status.textContent = 'Starting camera...';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        return true;
      } catch (err) {
        status.style.background = 'rgba(200,0,0,0.7)';
        status.innerHTML = '<b>Camera Error</b><br><br>' + err.message +
          '<br><br><small>On iPhone, camera requires HTTPS and user gesture.</small>';
        return false;
      }
    }

    // --- Step 4: Init face detection (FaceDetection API or fallback) ---
    async function initFaceDetection() {
      status.textContent = 'Loading face detection...';

      // Try native FaceDetector API (Chrome/Edge)
      if (window.FaceDetector) {
        try {
          faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          return true;
        } catch (e) { /* fallback */ }
      }

      // Fallback: Use MediaPipe Face Detection via CDN
      try {
        status.textContent = 'Downloading AI Models (MediaPipe)...';
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs');
        const { FaceDetector: MPFaceDetector, FilesetResolver } = vision;

        status.textContent = 'Resolving Fileset...';
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        status.textContent = 'Configuring Face Detector...';
        faceDetector = await MPFaceDetector.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });

        return true;
      } catch (err) {
        console.error('MediaPipe error:', err);
        // Final fallback: simple face position estimation (center of screen)
        faceDetector = 'fallback';
        return true;
      }
    }

    // --- Step 5: Detection loop ---
    function detectFaces(timestamp) {
      if (!running) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let faceBox = null;

      try {
        if (faceDetector === 'fallback') {
          // No face detection available — use center position
          faceBox = {
            x: canvas.width * 0.25,
            y: canvas.height * 0.15,
            width: canvas.width * 0.5,
            height: canvas.height * 0.5,
          };
        } else if (faceDetector.detect) {
          // Native FaceDetector API
          // This is async, so we handle it differently
        } else if (faceDetector.detectForVideo) {
          // MediaPipe
          const result = faceDetector.detectForVideo(video, timestamp || performance.now());
          if (result.detections && result.detections.length > 0) {
            const det = result.detections[0];
            const bb = det.boundingBox;
            faceBox = { x: bb.originX, y: bb.originY, width: bb.width, height: bb.height };
          }
        }
      } catch (e) {
        // Silently ignore detection errors for individual frames
      }

      // Draw wig if face found
      if (faceBox && wigImages[selectedWig]) {
        const opt = WIG_OPTIONS[selectedWig];
        const img = wigImages[selectedWig];
        const wigW = faceBox.width * opt.scaleW;
        const wigH = faceBox.height * opt.scaleH;
        const wigX = faceBox.x + (faceBox.width / 2) - (wigW / 2) + (faceBox.width * (opt.offX || 0));
        const wigY = faceBox.y + (faceBox.height * opt.offY);
        ctx.drawImage(img, wigX, wigY, wigW, wigH);
      }

      requestAnimationFrame(detectFaces);
    }

    // --- Main ---
    async function main() {
      try {
        const cameraOk = await startCamera();
        if (!cameraOk) return;

        await initFaceDetection();

        // Start loading images in background, don't block start
        loadWigImages().then(() => {
          console.log('Wigs loaded');
        });

        status.style.display = 'none';
        running = true;
        requestAnimationFrame(detectFaces);
      } catch (err) {
        status.style.background = 'rgba(200,0,0,0.8)';
        status.innerHTML = '<b>Initialization Failed</b><br><br>' + err.message + 
          '<br><br><button onclick="location.reload()" style="padding:10px 20px; border-radius:10px; border:none; background:#fff; font-weight:bold;">Retry</button>';
        console.error(err);
      }
    }

    main();
  </script>
</body>
</html>
