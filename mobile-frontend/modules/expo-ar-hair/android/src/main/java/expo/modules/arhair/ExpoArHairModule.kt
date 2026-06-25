package expo.modules.arhair

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Module definition for the ARCore Augmented Faces hair try-on view.
 *
 * The JS side (see modules/expo-ar-hair/src/ArHairView.tsx) imports a native
 * component named "ExpoArHair" — the Name() below must match.
 *
 * Props map to setters on ExpoArHairView. Events (onReady, onError, onCapture,
 * onTracking) are declared on the View itself via the Events() builder.
 */
class ExpoArHairModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoArHair")

    View(ExpoArHairView::class) {
      Events("onReady", "onError", "onCapture", "onTracking")

      Prop("hairStyle") { view: ExpoArHairView, value: String ->
        view.setHairStyle(value)
      }
      Prop("color") { view: ExpoArHairView, value: String ->
        view.setColor(value)
      }
      Prop("shortModelUri") { view: ExpoArHairView, value: String ->
        view.setShortModelUri(value)
      }
      Prop("longModelUri") { view: ExpoArHairView, value: String ->
        view.setLongModelUri(value)
      }
      Prop("offsetX") { view: ExpoArHairView, value: Float -> view.setOffsetX(value) }
      Prop("offsetY") { view: ExpoArHairView, value: Float -> view.setOffsetY(value) }
      Prop("offsetZ") { view: ExpoArHairView, value: Float -> view.setOffsetZ(value) }
      Prop("scale") { view: ExpoArHairView, value: Float -> view.setScaleFactor(value) }
      Prop("rotX") { view: ExpoArHairView, value: Float -> view.setRotX(value) }
      Prop("rotY") { view: ExpoArHairView, value: Float -> view.setRotY(value) }
      Prop("rotZ") { view: ExpoArHairView, value: Float -> view.setRotZ(value) }

      AsyncFunction("capture") { view: ExpoArHairView ->
        view.capture()
      }
      AsyncFunction("flipCamera") { view: ExpoArHairView ->
        // No-op: AugmentedFaces only supports the front-facing camera.
        // We expose this for parity with the JS ref interface.
      }
    }
  }
}
