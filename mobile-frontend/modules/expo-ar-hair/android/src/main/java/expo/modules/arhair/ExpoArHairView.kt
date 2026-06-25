package expo.modules.arhair

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Handler
import android.os.HandlerThread
import android.util.Base64
import android.util.Log
import android.view.PixelCopy
import android.view.SurfaceView
import android.view.ViewGroup
import androidx.lifecycle.LifecycleCoroutineScope
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.google.ar.core.ArCoreApk
import com.google.ar.core.AugmentedFace
import com.google.ar.core.CameraConfig
import com.google.ar.core.CameraConfigFilter
import com.google.ar.core.Config
import com.google.ar.core.TrackingState
import dev.romainguy.kotlin.math.Float3
import dev.romainguy.kotlin.math.Quaternion
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.model.ModelInstance
import io.github.sceneview.node.ModelNode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * ARCore Augmented Faces view that renders a glTF hair model attached to the
 * tracked face mesh, rendered via SceneView (Filament).
 *
 * Flow each frame:
 *   ARSceneView.onSessionUpdated → ask the frame for AugmentedFace trackables →
 *   take the first one in TRACKING state → align our ModelNode to face.centerPose.
 *
 * The hair model swap (short ↔ long) re-loads from the URI passed in via prop
 * and replaces the child node. Color tint is applied via Filament material
 * baseColorFactor since the GLBs ship without per-instance color.
 */
class ExpoArHairView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext) {

  companion object {
    private const val TAG = "ExpoArHairView"
  }

  private val onReady by EventDispatcher()
  private val onError by EventDispatcher()
  private val onCapture by EventDispatcher()
  private val onTracking by EventDispatcher()

  private var sceneView: ARSceneView? = null
  private var hairNode: ModelNode? = null

  private var hairStyle: String = "short"
  private var colorHex: String = "#1a1a1a"
  private var shortModelUri: String? = null
  private var longModelUri: String? = null
  private var pendingStyleSwap: Boolean = false

  // Tunable offsets — empirically the GLB origins sit slightly above/in-front
  // of where ARCore's face centerPose lands; defaults bias toward the forehead.
  private var offX: Float = 0f
  private var offY: Float = 0.04f
  private var offZ: Float = -0.02f
  private var scaleFactor: Float = 0.18f
  private var rotX: Float = 0f
  private var rotY: Float = 0f
  private var rotZ: Float = 0f

  private var wasTracking: Boolean = false

  init {
    checkArCoreAndSetup()
  }

  /**
   * ARCore Augmented Faces requires the Google Play Services for AR APK to
   * be installed on the device. If it's missing or out of date, ARSceneView's
   * `session.resume()` throws a FatalException — which then makes SceneView's
   * frame loop keep calling `session.update()` on a paused session and crashes
   * the app. So we gate ARSceneView creation behind an availability check, and
   * trigger the Play Store install prompt if needed.
   */
  private fun checkArCoreAndSetup(retries: Int = 5) {
    try {
      val availability = ArCoreApk.getInstance().checkAvailability(context)
      if (availability.isTransient) {
        // ARCore is still figuring itself out — retry shortly.
        if (retries > 0) {
          postDelayed({ checkArCoreAndSetup(retries - 1) }, 200)
        } else {
          onError(mapOf("message" to "ARCore availability check timed out"))
        }
        return
      }
      if (!availability.isSupported) {
        onError(mapOf("message" to "AR Try-On isn't supported on this device"))
        return
      }
      if (availability == ArCoreApk.Availability.SUPPORTED_INSTALLED) {
        setupSceneView()
        return
      }

      // SUPPORTED_APK_TOO_OLD or SUPPORTED_NOT_INSTALLED — request install.
      val activity = (context as? Activity) ?: appContext.currentActivity
      if (activity == null) {
        onError(mapOf("message" to "Cannot request ARCore install: no activity"))
        return
      }
      val installStatus = ArCoreApk.getInstance().requestInstall(activity, true)
      when (installStatus) {
        ArCoreApk.InstallStatus.INSTALLED -> setupSceneView()
        ArCoreApk.InstallStatus.INSTALL_REQUESTED -> {
          // Play Store launched. When the user returns, the next onResume
          // should see availability == INSTALLED — re-check.
          onError(mapOf("message" to "Installing Google Play Services for AR — please complete the install, then reopen AR Try-On"))
        }
        else -> onError(mapOf("message" to "ARCore install status: $installStatus"))
      }
    } catch (t: Throwable) {
      Log.e(TAG, "ARCore availability check failed", t)
      onError(mapOf("message" to ("AR initialization failed: " + (t.message ?: t::class.java.simpleName))))
    }
  }

  private fun setupSceneView() {
    val sv = ARSceneView(
      context = context,
      sharedLifecycle = findViewTreeLifecycleOwner()?.lifecycle,
      sessionFeatures = setOf(),
      // Pick a front-facing CameraConfig before the session resumes — Augmented
      // Faces is front-camera only, and the default config is rear-facing, so
      // without this `resume()` throws FatalException and the frame loop then
      // crashes the app via SessionPausedException.
      sessionCameraConfig = { session ->
        val filter = CameraConfigFilter(session)
          .setFacingDirection(CameraConfig.FacingDirection.FRONT)
        session.getSupportedCameraConfigs(filter).firstOrNull()
          ?: session.cameraConfig
      },
      sessionConfiguration = { _, config ->
        config.augmentedFaceMode = Config.AugmentedFaceMode.MESH3D
        config.depthMode = Config.DepthMode.DISABLED
        config.focusMode = Config.FocusMode.AUTO
      }
    ).apply {
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      )

      planeRenderer.isEnabled = false

      onSessionCreated = { _ ->
        onReady(mapOf("ok" to true))
      }

      onSessionFailed = { ex ->
        Log.e(TAG, "ARCore session failed", ex)
        onError(mapOf("message" to (ex.message ?: ex::class.java.simpleName ?: "AR session failed")))
      }

      onSessionUpdated = { _, frame ->
        try {
          val face = frame.getUpdatedTrackables(AugmentedFace::class.java).firstOrNull()
          val tracking = face?.trackingState == TrackingState.TRACKING
          if (tracking != wasTracking) {
            wasTracking = tracking
            onTracking(mapOf("tracking" to tracking))
          }
          if (face != null && tracking) {
            alignHairToFace(face)
          }
        } catch (t: Throwable) {
          Log.w(TAG, "session update error", t)
        }
      }
    }

    sceneView = sv
    addView(sv)
  }

  private fun alignHairToFace(face: AugmentedFace) {
    val node = hairNode ?: return
    val pose = face.centerPose

    // Position: face center + small forehead offset along the face's local up axis
    val t = pose.translation
    node.worldPosition = Float3(t[0] + offX, t[1] + offY, t[2] + offZ)

    val q = pose.rotationQuaternion
    val base = Quaternion(q[0], q[1], q[2], q[3])
    // Apply user rotation offsets on top of the base face rotation
    node.worldQuaternion = base * Quaternion.fromEuler(Float3(rotX, rotY, rotZ))
    node.scale = Float3(scaleFactor, scaleFactor, scaleFactor)
  }

  // ── Prop setters (called from ExpoArHairModule) ─────────────────────────

  fun setHairStyle(value: String) {
    if (value == hairStyle) return
    hairStyle = value
    swapModel()
  }

  fun setColor(value: String) {
    colorHex = value
    applyTint()
  }

  fun setShortModelUri(value: String) {
    shortModelUri = value
    if (hairStyle == "short") swapModel()
  }

  fun setLongModelUri(value: String) {
    longModelUri = value
    if (hairStyle == "long") swapModel()
  }

  fun setOffsetX(value: Float) { offX = value }
  fun setOffsetY(value: Float) { offY = value }
  fun setOffsetZ(value: Float) { offZ = value }
  fun setScaleFactor(value: Float) { scaleFactor = value }
  fun setRotX(value: Float) { rotX = value }
  fun setRotY(value: Float) { rotY = value }
  fun setRotZ(value: Float) { rotZ = value }

  // ── Model load + tint ────────────────────────────────────────────────────

  private fun swapModel() {
    val uri = when (hairStyle) {
      "long" -> longModelUri
      else -> shortModelUri
    } ?: return
    val sv = sceneView ?: return

    val scope: LifecycleCoroutineScope =
      findViewTreeLifecycleOwner()?.lifecycleScope ?: return

    scope.launch {
      try {
        val file = File(uri.removePrefix("file://"))
        val modelInstance: ModelInstance = withContext(Dispatchers.IO) {
          sv.modelLoader.createModelInstance(file)
        } ?: throw IllegalStateException("modelLoader returned null for $uri")

        // Remove any existing hair node before adding the new one.
        hairNode?.let { sv.removeChildNode(it) }
        val node = ModelNode(modelInstance = modelInstance, scaleToUnits = null)
        hairNode = node
        sv.addChildNode(node)
        applyTint()
      } catch (t: Throwable) {
        Log.e(TAG, "Failed to load model: $uri", t)
        onError(mapOf("message" to ("Failed to load model: " + (t.message ?: ""))))
      }
    }
  }

  private fun applyTint() {
    val node = hairNode ?: return
    val parsed = try { Color.parseColor(colorHex) } catch (_: Throwable) { Color.BLACK }
    val r = Color.red(parsed) / 255f
    val g = Color.green(parsed) / 255f
    val b = Color.blue(parsed) / 255f
    node.modelInstance.materialInstances.forEach { material ->
      try {
        material.setParameter("baseColorFactor", r, g, b, 1f)
      } catch (_: Throwable) {
        // Material may not have baseColorFactor — silently skip.
      }
    }
  }

  // ── Screenshot ───────────────────────────────────────────────────────────

  fun capture() {
    val sv = sceneView ?: return
    val surface = findSurfaceView(sv) ?: return
    val w = surface.width
    val h = surface.height
    if (w <= 0 || h <= 0) return

    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val ht = HandlerThread("ar-capture").apply { start() }
    PixelCopy.request(surface, bmp, { res ->
      ht.quitSafely()
      if (res == PixelCopy.SUCCESS) {
        val stream = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.JPEG, 88, stream)
        val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
        onCapture(mapOf("dataUri" to "data:image/jpeg;base64,$b64"))
      } else {
        onError(mapOf("message" to "PixelCopy failed: $res"))
      }
    }, Handler(ht.looper))
  }

  private fun findSurfaceView(root: android.view.View): SurfaceView? {
    if (root is SurfaceView && root.holder?.surfaceFrame != null) return root
    if (root is ViewGroup) {
      for (i in 0 until root.childCount) {
        val found = findSurfaceView(root.getChildAt(i))
        if (found != null) return found
      }
    }
    return null
  }
}
