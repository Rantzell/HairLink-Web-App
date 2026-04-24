import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';
import RequestSuccessModal from '../../components/RequestSuccessModal';

interface HairRequestScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function HairRequestScreen({ onBack, onSuccess }: HairRequestScreenProps) {
  const [story, setStory] = useState('');
  const [hairLength, setHairLength] = useState<'Long' | 'Short' | null>(null);
  const [wigColor, setWigColor] = useState<'Black' | 'Brown' | 'Light' | null>(null);
  const [surveySource, setSurveySource] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  // Image states
  const [docImage, setDocImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Submitting...');
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleSurvey = (val: string) => {
    setSurveySource(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const togglePermission = (val: string) => {
    setPermissions(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const pickImage = async (type: 'doc' | 'ref') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      if (type === 'doc') setDocImage(result.assets[0].uri);
      else setRefImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!story.trim() || !hairLength || !wigColor || !docImage) {
      Alert.alert('Missing Information', 'Please provide your story, specifications, and medical documentation.');
      return;
    }

    setLoading(true);
    setLoadingLabel('Preparing request...');

    try {
      const formData = new FormData();
      formData.append('reference', `REQ-${Date.now()}`);
      formData.append('story', story);
      formData.append('wig_length', hairLength);
      formData.append('wig_color', wigColor);
      
      // Handle Medical Certificate
      const docExt = docImage.split('.').pop() || 'jpg';
      formData.append('medical_certificate', {
        uri: Platform.OS === 'android' ? docImage : docImage.replace('file://', ''),
        name: `medical_cert.${docExt}`,
        type: `image/${docExt === 'jpg' ? 'jpeg' : docExt}`,
      } as any);

      // Handle Reference Photo (Optional)
      if (refImage) {
        const refExt = refImage.split('.').pop() || 'jpg';
        formData.append('additional_photo', {
          uri: Platform.OS === 'android' ? refImage : refImage.replace('file://', ''),
          name: `reference.${refExt}`,
          type: `image/${refExt === 'jpg' ? 'jpeg' : refExt}`,
        } as any);
      }

      // Handle Survey & Permissions (Serialized)
      formData.append('notes', JSON.stringify({
        survey_source: surveySource,
        permissions: permissions
      }));

      setLoadingLabel('Submitting to server...');
      
      const response = await api.post('/hair-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 201 || response.status === 200) {
        setShowSuccess(true);
      } else {
        throw new Error('Unexpected server response.');
      }
    } catch (err: any) {
      console.error('Submission error:', err.response?.data || err.message);
      Alert.alert('Submission Error', err.response?.data?.message || 'Failed to submit your request. Please try again.');
    } finally {
      setLoading(false);
      setLoadingLabel('Submitting...');
    }
  };

  const CustomCheckbox = ({ label, checked, onPress }: { label: string, checked: boolean, onPress: () => void }) => (
    <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView 
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      
      {/* ── Elite Header ──────────────────────────────── */}
      <LinearGradient
        colors={['#8E44AD', '#9B59B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerBrand}>Strand Up for Cancer</Text>
          <Text style={styles.headerTitle}>Hair Request</Text>
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{loadingLabel}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── Your Journey Section ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
          <Text style={styles.cardTitle}>Your Journey</Text>
          <Text style={styles.instructions}>Please share with us your story/journey*</Text>
          <View style={styles.bulletList}>
            {[
              'Cause of Hair Loss',
              'Duration of Hair Loss',
              'Name of Attending Physician (optional)',
              'What has been the most challenging part?',
              'What gives you hope and keeps you going?',
            ].map((item, i) => (
              <View key={i} style={styles.bulletItem}>
                <Ionicons name="heart-half" size={14} color="#9B59B6" />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
          <TextInput
            style={styles.storyInput}
            placeholder="Write your story here..."
            placeholderTextColor="#999"
            multiline
            value={story}
            onChangeText={setStory}
            textAlignVertical="top"
          />
        </Animated.View>

        {/* ── Documentation Section ───────────────────── */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <Text style={styles.cardTitle}>Supporting Documents</Text>
          <Text style={styles.subLabel}>Upload medical certificate or diagnosis *</Text>
          <Text style={styles.hint}>Any proof that verifies the donee as a patient.</Text>
          
          <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('doc')}>
            {docImage ? (
              <Image source={{ uri: docImage }} style={styles.previewImg} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#9B59B6" />
                <Text style={styles.uploadBtnText}>Add File</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.subLabel, { marginTop: 20 }]}>Additional Picture for reference *</Text>
          <Text style={styles.hint}>To help us gain a clearer understanding of your condition.</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('ref')}>
            {refImage ? (
              <Image source={{ uri: refImage }} style={styles.previewImg} />
            ) : (
              <>
                <Ionicons name="image-outline" size={24} color="#9B59B6" />
                <Text style={styles.uploadBtnText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── Hair Information Section ────────────────── */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
          <Text style={styles.cardTitle}>Hair Information</Text>
          
          <Text style={styles.fieldLabel}>Hair Length *</Text>
          <View style={styles.chipRow}>
            {['Long', 'Short'].map((val: any) => (
              <TouchableOpacity
                key={val}
                style={[styles.chip, hairLength === val && styles.chipActive]}
                onPress={() => setHairLength(val)}
              >
                <Text style={[styles.chipText, hairLength === val && styles.chipTextActive]}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Wig Color *</Text>
          <View style={styles.chipRow}>
            {['Black', 'Brown', 'Light'].map((val: any) => (
              <TouchableOpacity
                key={val}
                style={[styles.chip, wigColor === val && styles.chipActive]}
                onPress={() => setWigColor(val)}
              >
                <Text style={[styles.chipText, wigColor === val && styles.chipTextActive]}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Quick Survey Section ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Quick Survey</Text>
          <Text style={styles.fieldLabel}>Where did you hear about us? *</Text>
          {[
            'Facebook Page',
            'Instagram Page',
            'Other Social Media (X, TikTok, etc.)',
            'Family and / or Friends',
            'Online Article or News',
            'Other',
          ].map(item => (
            <CustomCheckbox
              key={item}
              label={item}
              checked={surveySource.includes(item)}
              onPress={() => toggleSurvey(item)}
            />
          ))}

          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Usage Consent *</Text>
          <Text style={styles.hint}>Willing to share with other supporters?</Text>
          {[
            'Personal Details in My story',
            'My Diagnosis',
            'My Photograph',
            'None of the above',
          ].map(item => (
            <CustomCheckbox
              key={item}
              label={item}
              checked={permissions.includes(item)}
              onPress={() => togglePermission(item)}
            />
          ))}
          <Text style={styles.consentFootnote}>
            Items checked may be used for promotional materials as testimonies.
          </Text>
        </Animated.View>

        {/* ── Submit Button ───────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.submitContainer}>
          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} disabled={loading}>
            <LinearGradient
              colors={['#8E44AD', '#9B59B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            >
              <Text style={styles.submitText}>{loading ? 'Uploading...' : 'Submit Request'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>

      <RequestSuccessModal 
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onSuccess();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4FC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    paddingVertical: vs(15),
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },
  headerTextContainer: { alignItems: 'center' },
  headerBrand: { fontSize: ms(12), color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1 },
  headerTitle: { fontSize: ms(22), fontWeight: '900', color: '#fff' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#fff', marginTop: vs(15), fontWeight: '800', fontSize: ms(16) },

  scrollContent: { paddingHorizontal: ms(16), paddingBottom: vs(50), paddingTop: vs(10) },

  card: {
    backgroundColor: '#fff',
    borderRadius: ms(24),
    padding: ms(20),
    marginBottom: vs(20),
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardTitle: { fontSize: ms(20), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(12) },
  instructions: { fontSize: ms(15), fontWeight: '700', color: '#444', marginBottom: vs(10) },
  
  bulletList: { marginBottom: vs(15) },
  bulletItem: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(6) },
  bulletText: { fontSize: ms(13), color: '#666', marginLeft: ms(8), fontWeight: '500' },

  storyInput: {
    backgroundColor: '#FBF8FF',
    borderWidth: 1.5,
    borderColor: '#E8DAEF',
    borderRadius: ms(18),
    padding: ms(16),
    height: vs(160),
    fontSize: ms(15),
    color: '#1a1a1a',
    fontWeight: '500',
  },

  subLabel: { fontSize: ms(15), fontWeight: '700', color: '#1a1a1a' },
  hint: { fontSize: ms(12), color: '#888', marginBottom: vs(12), lineHeight: vs(18) },
  
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9B59B6',
    borderRadius: ms(18),
    paddingVertical: vs(14),
    backgroundColor: 'rgba(155,89,182,0.03)',
    overflow: 'hidden',
    minHeight: vs(60),
  },
  previewImg: { width: '100%', height: vs(160), resizeMode: 'cover' },
  uploadBtnText: { fontSize: ms(14), fontWeight: '800', color: '#9B59B6', marginLeft: ms(8) },

  fieldLabel: { fontSize: ms(14), fontWeight: '900', color: '#444', marginBottom: vs(12) },
  chipRow: { flexDirection: 'row', gap: ms(10) },
  chip: {
    flex: 1,
    paddingVertical: vs(12),
    alignItems: 'center',
    borderRadius: ms(16),
    borderWidth: 1.5,
    borderColor: '#E8DAEF',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#9B59B6', backgroundColor: '#F9F4FC' },
  chipText: { fontSize: ms(14), fontWeight: '700', color: '#666' },
  chipTextActive: { color: '#9B59B6' },

  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(14) },
  checkBox: {
    width: ms(24), height: ms(24), borderRadius: ms(8),
    borderWidth: 2, borderColor: '#E8DAEF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: ms(12),
  },
  checkBoxActive: { backgroundColor: '#9B59B6', borderColor: '#9B59B6' },
  checkLabel: { fontSize: ms(14), color: '#555', fontWeight: '600' },
  
  consentFootnote: { fontSize: ms(11), color: '#aaa', marginTop: vs(10), fontStyle: 'italic' },

  submitContainer: { marginTop: vs(10) },
  submitBtn: {
    flexDirection: 'row',
    height: vs(60),
    borderRadius: ms(30),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  submitText: { fontSize: ms(18), fontWeight: '900', color: '#fff', marginRight: ms(10) },
});

