package expo.modules.facetracker

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.Executors

/**
 * Native face tracker view:
 *   front-camera preview (CameraX) +
 *   ML Kit Face Detection on each frame ->
 *   stream of `onFace` events with bounding box + Euler angles + landmarks.
 *
 * Coordinates are normalized to 0..1 *within the preview surface* so the JS
 * side (which sits in a transparent WebView overlay) can map them straight
 * into NDC space for three.js without caring about pixel dimensions.
 */
class ExpoFaceTrackerView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext) {

  companion object {
    private const val TAG = "FaceTrackerView"
  }

  private val onFace by EventDispatcher()
  private val onFaceLost by EventDispatcher()
  private val onError by EventDispatcher()

  private val previewView: PreviewView = PreviewView(context).apply {
    layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    scaleType = PreviewView.ScaleType.FILL_CENTER
    // Hardware compositing — needed so a transparent WebView can be layered
    // on top in the React Native side without flicker.
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
  }

  private val detector: FaceDetector
  private val analysisExecutor = Executors.newSingleThreadExecutor()
  private var cameraProvider: ProcessCameraProvider? = null

  // Debounce "face lost" so we don't fire it on every blink/empty frame.
  private var consecutiveEmptyFrames = 0
  private var wasTracking = false

  init {
    addView(previewView)

    val options = FaceDetectorOptions.Builder()
      .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
      .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
      .setContourMode(FaceDetectorOptions.CONTOUR_MODE_NONE)
      .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
      // Minimum face size relative to frame width — 0.15 means the face needs
      // to fill ~15% of the frame's shorter dimension to be detected. Tunable.
      .setMinFaceSize(0.15f)
      .enableTracking()
      .build()
    detector = FaceDetection.getClient(options)

    bindCamera()
  }

  @SuppressLint("UnsafeOptInUsageError")
  private fun bindCamera() {
    val lifecycleOwner: LifecycleOwner = findViewTreeLifecycleOwner()
      ?: run {
        // No lifecycle yet — defer until the view is attached.
        post { bindCamera() }
        return
      }

    val providerFuture = ProcessCameraProvider.getInstance(context)
    providerFuture.addListener({
      try {
        val provider = providerFuture.get()
        cameraProvider = provider

        val preview = Preview.Builder().build().also {
          it.setSurfaceProvider(previewView.surfaceProvider)
        }

        val analysis = ImageAnalysis.Builder()
          // STRATEGY_KEEP_ONLY_LATEST drops frames if ML Kit can't keep up,
          // so latency stays low and we don't queue stale frames.
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .build().also { useCase ->
            useCase.setAnalyzer(analysisExecutor, ::analyzeImage)
          }

        provider.unbindAll()
        provider.bindToLifecycle(
          lifecycleOwner,
          CameraSelector.DEFAULT_FRONT_CAMERA,
          preview,
          analysis,
        )
      } catch (t: Throwable) {
        Log.e(TAG, "Failed to bind camera", t)
        onError(mapOf("message" to ("Camera bind failed: " + (t.message ?: t::class.java.simpleName))))
      }
    }, ContextCompat.getMainExecutor(context))
  }

  @SuppressLint("UnsafeOptInUsageError")
  private fun analyzeImage(proxy: ImageProxy) {
    val mediaImage = proxy.image
    if (mediaImage == null) {
      proxy.close()
      return
    }
    val rotationDegrees = proxy.imageInfo.rotationDegrees
    val image = InputImage.fromMediaImage(mediaImage, rotationDegrees)

    // The face landmarks are returned in the image's coordinate space (after
    // accounting for rotation). We normalize against the rotated dimensions
    // before emitting, so JS gets simple 0..1 values.
    val w = if (rotationDegrees % 180 == 0) proxy.width else proxy.height
    val h = if (rotationDegrees % 180 == 0) proxy.height else proxy.width

    detector.process(image)
      .addOnSuccessListener { faces ->
        if (faces.isEmpty()) {
          consecutiveEmptyFrames++
          // Only fire faceLost after ~6 empty frames (~200ms at 30fps) so
          // a single missed frame from a blink/turn doesn't flicker the UI.
          if (wasTracking && consecutiveEmptyFrames > 6) {
            wasTracking = false
            onFaceLost(emptyMap<String, Any>())
          }
        } else {
          consecutiveEmptyFrames = 0
          wasTracking = true
          emitFace(faces[0], w.toFloat(), h.toFloat())
        }
      }
      .addOnFailureListener { e ->
        Log.w(TAG, "ML Kit face detection failed", e)
      }
      .addOnCompleteListener { proxy.close() }
  }

  private fun emitFace(face: Face, frameW: Float, frameH: Float) {
    val box = face.boundingBox

    // Front camera is mirrored — flip X so JS-side renders match what the
    // user sees on screen (their right eye lands on the right of the preview).
    val mirroredLeft = 1f - (box.right.toFloat() / frameW)
    val boxLeft = mirroredLeft.coerceIn(0f, 1f)
    val boxTop = (box.top.toFloat() / frameH).coerceIn(0f, 1f)
    val boxWidth = (box.width().toFloat() / frameW).coerceIn(0f, 1f)
    val boxHeight = (box.height().toFloat() / frameH).coerceIn(0f, 1f)

    val landmarks = mutableListOf<Map<String, Any>>()
    fun addLandmark(name: String, type: Int) {
      val lm = face.getLandmark(type) ?: return
      val nx = (1f - lm.position.x / frameW).coerceIn(0f, 1f) // mirror X
      val ny = (lm.position.y / frameH).coerceIn(0f, 1f)
      landmarks.add(mapOf("type" to name, "x" to nx, "y" to ny))
    }
    addLandmark("leftEye", FaceLandmark.LEFT_EYE)
    addLandmark("rightEye", FaceLandmark.RIGHT_EYE)
    addLandmark("noseBase", FaceLandmark.NOSE_BASE)
    addLandmark("mouthBottom", FaceLandmark.MOUTH_BOTTOM)
    addLandmark("mouthLeft", FaceLandmark.MOUTH_LEFT)
    addLandmark("mouthRight", FaceLandmark.MOUTH_RIGHT)
    addLandmark("leftEar", FaceLandmark.LEFT_EAR)
    addLandmark("rightEar", FaceLandmark.RIGHT_EAR)
    addLandmark("leftCheek", FaceLandmark.LEFT_CHEEK)
    addLandmark("rightCheek", FaceLandmark.RIGHT_CHEEK)

    onFace(
      mapOf(
        "boxLeft" to boxLeft,
        "boxTop" to boxTop,
        "boxWidth" to boxWidth,
        "boxHeight" to boxHeight,
        // Euler Y is mirrored too — a leftward turn for the user reads as a
        // rightward turn in the mirrored preview.
        "eulerY" to -face.headEulerAngleY,
        "eulerX" to face.headEulerAngleX,
        // Roll flips with the mirror as well.
        "eulerZ" to -face.headEulerAngleZ,
        "smilingProbability" to (face.smilingProbability ?: -1f),
        "leftEyeOpenProbability" to (face.leftEyeOpenProbability ?: -1f),
        "rightEyeOpenProbability" to (face.rightEyeOpenProbability ?: -1f),
        "landmarks" to landmarks,
      )
    )
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    try {
      cameraProvider?.unbindAll()
      analysisExecutor.shutdown()
      detector.close()
    } catch (_: Throwable) { }
  }
}
