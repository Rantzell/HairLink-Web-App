package expo.modules.facetracker

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Module definition for the ML Kit face tracker view.
 *
 * The JS shim (modules/expo-face-tracker/src/FaceTrackerView.tsx) imports a
 * native component named "ExpoFaceTracker" — the Name() below must match.
 */
class ExpoFaceTrackerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoFaceTracker")

    View(ExpoFaceTrackerView::class) {
      Events("onFace", "onFaceLost", "onError")
    }
  }
}
