import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ARScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync();
        Alert.alert('Success', 'Photo captured successfully!');
        console.log(photo.uri);
      } catch (e) {
        Alert.alert('Error', 'Could not capture photo');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-5">
        <MaterialCommunityIcons name="camera-off" size={64} color="#ccc" />
        <Text className="text-base text-gray-600 text-center mt-5 mb-8">
          Camera access is required
        </Text>
        <TouchableOpacity 
          className="bg-[#FF1493] px-8 py-4 rounded-full" 
          onPress={requestPermission}
        >
          <Text className="text-white text-base font-bold">Enable Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} className="mt-5">
          <Text className="text-gray-400">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        responsiveOrientationWhenOrientationLocked
      />

      {/* Header Controls */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={{ paddingTop: insets.top + 10 }}
        className="absolute top-0 left-0 right-0 flex-row justify-between px-5 pb-10 z-10"
      >
        <TouchableOpacity 
          className="w-11 h-11 rounded-full bg-black/40 items-center justify-center border border-white/20" 
          onPress={onBack}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View className="flex-row gap-4">
          <TouchableOpacity 
            className="w-11 h-11 rounded-full bg-black/40 items-center justify-center border border-white/20" 
            onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
          >
            <Ionicons name={flash === 'on' ? "flash" : "flash-off"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Bottom Controls */}
      <View 
        style={{ paddingBottom: insets.bottom + 40 }} 
        className="absolute bottom-0 left-0 right-0 items-center z-10"
      >
        <View className="flex-row items-center justify-around w-full px-10">
          <TouchableOpacity 
            className="w-12 h-12 rounded-full bg-black/40 items-center justify-center border border-white/20"
            onPress={toggleCameraFacing}
          >
            <MaterialCommunityIcons name="camera-flip-outline" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={takePicture}
            className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
          >
            <View className="w-[70px] h-[70px] rounded-full bg-white/30 items-center justify-center">
              <View className={`w-[60px] h-[60px] rounded-full ${isCapturing ? 'bg-[#FF1493]' : 'bg-white'}`} style={{ transform: [{ scale: isCapturing ? 0.9 : 1 }] }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="w-12 h-12 rounded-full bg-black/40 items-center justify-center border border-white/20">
            <Feather name="image" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
