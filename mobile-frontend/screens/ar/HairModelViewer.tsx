import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, PanResponder } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, loadAsync, THREE } from 'expo-three';
import { Asset } from 'expo-asset';

type Props = {
  /** which model — currently only "short" has real geometry */
  length: 'short' | 'long';
  /** hex color to tint the wig (e.g. "#0d0d0d") */
  colorHex?: string;
  /** External face yaw (radians). When provided, overrides pan-controlled Y rotation. */
  faceYaw?: number;
  /** External face roll (radians). When provided, overrides pan-controlled Z rotation. */
  faceRoll?: number;
  /** Forward / backward tilt of the model (X-axis pitch, radians). */
  pitch?: number;
  /** Disable pan-to-rotate when face tracking is active. */
  disablePan?: boolean;
};

/**
 * Real 3D viewer for the .glb hair model.
 *
 * Renders the bundled GLB on a GLView using three.js + expo-three.
 * Pan to rotate the model, no face tracking — this is a 3D model preview,
 * not face-mounted AR. (Face-mounted AR requires ARCore Augmented Faces,
 * which is implemented in the separate native HairLink AR app.)
 */
export default function HairModelViewer({
  length,
  colorHex = '#0d0d0d',
  faceYaw,
  faceRoll,
  pitch,
  disablePan = false,
}: Props) {
  const meshRef = useRef<THREE.Object3D | null>(null);
  const matRef = useRef<any>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const lastColorRef = useRef<string>(colorHex);
  const faceYawRef = useRef<number | undefined>(faceYaw);
  const faceRollRef = useRef<number | undefined>(faceRoll);
  const pitchRef = useRef<number | undefined>(pitch);

  React.useEffect(() => { faceYawRef.current = faceYaw; }, [faceYaw]);
  React.useEffect(() => { faceRollRef.current = faceRoll; }, [faceRoll]);
  React.useEffect(() => { pitchRef.current = pitch; }, [pitch]);

  // Update tint when color changes
  React.useEffect(() => {
    lastColorRef.current = colorHex;
    if (matRef.current) {
      matRef.current.color = new THREE.Color(colorHex);
    }
  }, [colorHex]);

  // Drag → rotate
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        rotationRef.current.y += g.dx * 0.005;
        rotationRef.current.x += g.dy * 0.005;
        if (meshRef.current) {
          meshRef.current.rotation.y = rotationRef.current.y;
          meshRef.current.rotation.x = rotationRef.current.x;
        }
      },
    }),
  ).current;

  const onContextCreate = async (gl: any) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.01,
      1000,
    );
    camera.position.set(0, 0.3, 7);

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(2, 4, 3);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xff7bd0, 0.4);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    try {
      // Pick model. (We only have geometry for "short" right now —
      // "long" falls back to the same model with a y-scale stretch.)
      const moduleId = length === 'short'
        ? require('../../assets/models/hair_short.glb')
        : require('../../assets/models/hair_short.glb');
      const asset = Asset.fromModule(moduleId);
      await asset.downloadAsync();

      const obj: any = await loadAsync(asset.localUri || asset.uri);
      const root: THREE.Object3D = obj?.scene || obj;

      // RN can't decode embedded glTF textures (no Blob/ArrayBuffer support),
      // so replace every mesh's material with a solid pink→purple gradient
      // look using vertex normals as a fallback. Geometry will still render.
      const sharedMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(lastColorRef.current),
        roughness: 0.45,
        metalness: 0.15,
        side: THREE.DoubleSide,
        transparent: false,
        depthWrite: true,
        opacity: 1,
      });
      matRef.current = sharedMat;
      root.traverse((child: any) => {
        if (child?.isMesh) {
          child.material = sharedMat;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      // Center & fit
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      // Tight fit factor — model occupies a small fraction of the GLView
      // frustum so it can never be clipped by the box edges, no matter how
      // much the user pinches it.
      const fitScale = 0.9 / maxDim;
      root.scale.setScalar(fitScale);
      root.position.sub(center.multiplyScalar(fitScale));

      if (length === 'long') root.scale.y *= 1.4;

      meshRef.current = root;
      scene.add(root);
    } catch (e: any) {
      // Couldn't load — draw a small wire sphere so the screen isn't blank
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xff379b, wireframe: true }),
      );
      meshRef.current = sphere;
      scene.add(sphere);
    }

    const animate = () => {
      requestAnimationFrame(animate);
      // If external face-tracking values are provided, drive the rotation
      // from them; otherwise fall back to pan-controlled rotation.
      if (meshRef.current) {
        if (faceYawRef.current !== undefined) {
          meshRef.current.rotation.y = faceYawRef.current;
        }
        if (faceRollRef.current !== undefined) {
          meshRef.current.rotation.z = faceRollRef.current;
        }
        if (pitchRef.current !== undefined) {
          meshRef.current.rotation.x = pitchRef.current;
        }
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  return (
    <View
      style={styles.root}
      {...(disablePan ? {} : panResponder.panHandlers)}
    >
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  hintWrap: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
