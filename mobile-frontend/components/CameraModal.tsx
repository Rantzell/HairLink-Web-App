import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { ms, vs } from '../lib/scaling';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onPictureTaken: (uri: string) => void;
}

export default function CameraModal({ visible, onClose, onPictureTaken }: CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [taking, setTaking] = useState(false);

  if (!visible) return null;

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.permissionContainer}>
          <Text style={styles.permissionText}>We need your permission to show the camera</Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !taking) {
      setTaking(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo && photo.uri) {
          onPictureTaken(photo.uri);
          onClose();
        }
      } catch (err) {
        console.error('Failed to take picture', err);
      } finally {
        setTaking(false);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          <SafeAreaView style={styles.overlay}>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.bottomBar}>
              <TouchableOpacity 
                style={styles.captureButtonOuter} 
                onPress={takePicture}
                disabled={taking}
              >
                <View style={styles.captureButtonInner}>
                  {taking && <ActivityIndicator size="small" color="#AD246D" />}
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: ms(20),
  },
  closeButton: {
    padding: ms(8),
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: ms(20),
  },
  bottomBar: {
    paddingBottom: vs(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonOuter: {
    width: ms(76),
    height: ms(76),
    borderRadius: ms(38),
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: ms(60),
    height: ms(60),
    borderRadius: ms(30),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9FB',
    padding: ms(20),
  },
  permissionText: {
    textAlign: 'center',
    fontSize: ms(16),
    color: '#333',
    marginBottom: vs(20),
  },
  btn: {
    backgroundColor: '#AD246D',
    paddingHorizontal: ms(20),
    paddingVertical: vs(12),
    borderRadius: ms(10),
    marginBottom: vs(10),
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: ms(16),
  },
  cancelBtn: {
    padding: ms(10),
  },
  cancelBtnText: {
    color: '#AD246D',
    fontSize: ms(16),
  },
});
