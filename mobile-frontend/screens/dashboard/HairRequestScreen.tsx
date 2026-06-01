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
  // Field set + names must match the website's RecipientRequest.tsx so a
  // mobile-submitted request lands identically in the same backend route.
  //   story · wig_length · wig_color · delivery_method · documents · additional_photo
  // Plus contact_number + gender are pulled from /auth/me at mount.
  const [story, setStory] = useState('');
  const [hairLength, setHairLength] = useState<'short' | 'long' | null>(null);
  const [wigColor, setWigColor] = useState<'black' | 'brown' | 'light' | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');

  // Image states
  const [docImage, setDocImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Submitting...');
  const [showSuccess, setShowSuccess] = useState(false);

  // Read-only profile data shown in the "Personal Details" card
  // (mirrors the web's profile-pulled inputs at the top of the form).
  const [profile, setProfile] = useState<{
    name: string;
    phone: string;
    gender: string;
    email: string;
  }>({ name: '', phone: '', gender: '', email: '' });

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const d = res.data || {};
        const first = d.firstName || d.first_name || '';
        const last = d.lastName || d.last_name || '';
        setProfile({
          name: `${first} ${last}`.trim() || d.name || '',
          phone: d.phone || '',
          gender: d.gender || '',
          email: d.email || '',
        });
      } catch (err) {
        console.warn('Could not load profile for hair request', err);
      }
    };
    loadProfile();
  }, []);

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
    // Match the website's required-field set exactly: story, length, color,
    // delivery method, supporting document, AND reference photo are all
    // mandatory on the web (`!documents.length || !additionalPhoto`).
    if (!story.trim() || !hairLength || !wigColor || !docImage || !refImage) {
      Alert.alert(
        'Missing Information',
        'Please share your story, choose length & color, attach a supporting document, and add a reference picture.',
      );
      return;
    }

    setLoading(true);
    setLoadingLabel('Preparing request...');

    try {
      const formData = new FormData();

      // Same shape the web sends (see RecipientRequest.tsx → doSubmit):
      //   reference · contact_number · gender · story · wig_length ·
      //   wig_color · delivery_method · appointment_at · documents[] ·
      //   additional_photo
      const reference = `REQ-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      formData.append('reference', reference);
      formData.append('contact_number', profile.phone || '');
      formData.append('gender', profile.gender || '');
      formData.append('story', story.trim());
      formData.append('wig_length', hairLength);
      formData.append('wig_color', wigColor);
      formData.append('delivery_method', deliveryMethod);
      formData.append(
        'appointment_at',
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      );

      // Supporting document — field name `documents` to mirror the web's
      // multi-file upload. Mobile contributes a single file for now.
      const docExt = docImage.split('.').pop() || 'jpg';
      formData.append('documents', {
        uri: Platform.OS === 'android' ? docImage : docImage.replace('file://', ''),
        name: `document.${docExt}`,
        type: `image/${docExt === 'jpg' ? 'jpeg' : docExt}`,
      } as any);

      // Reference picture (mandatory on web — guarded above)
      const refExt = refImage.split('.').pop() || 'jpg';
      formData.append('additional_photo', {
        uri: Platform.OS === 'android' ? refImage : refImage.replace('file://', ''),
        name: `reference.${refExt}`,
        type: `image/${refExt === 'jpg' ? 'jpeg' : refExt}`,
      } as any);

      setLoadingLabel('Submitting to server...');

      const response = await api.post('/requests', formData, {
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? ms(0) : ms(20)}
    >
      <StatusBar style="light" />
      
      {/* ── Elite Header ──────────────────────────────── */}
      <LinearGradient
        colors={['#9B6BBF', '#B084CC']}
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

        {/* ── Personal Details (read-only — pulled from profile, matches web) ── */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.card}>
          <Text style={styles.cardTitle}>Personal Details</Text>
          <Text style={styles.hint}>
            Pulled from your profile. Update your profile to change these.
          </Text>

          {[
            { icon: 'person-outline' as const, label: 'Full Name', value: profile.name || '—' },
            { icon: 'call-outline' as const,   label: 'Contact Number', value: profile.phone || '—' },
            { icon: 'transgender-outline' as const, label: 'Gender', value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—' },
            { icon: 'mail-outline' as const,   label: 'Email', value: profile.email || '—' },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.profileRow}>
                <View style={styles.profileIcon}>
                  <Ionicons name={row.icon} size={ms(14)} color="#B084CC" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileLabel}>{row.label}</Text>
                  <Text style={styles.profileValue} numberOfLines={1}>{row.value}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <View style={styles.profileDivider} />}
            </View>
          ))}
        </Animated.View>

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
                <Ionicons name="heart-half" size={14} color="#B084CC" />
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
                <Ionicons name="cloud-upload-outline" size={24} color="#B084CC" />
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
                <Ionicons name="image-outline" size={24} color="#B084CC" />
                <Text style={styles.uploadBtnText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── Hair Information Section ────────────────── */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
          <Text style={styles.cardTitle}>Hair Information</Text>

          <Text style={styles.fieldLabel}>Hair Length *</Text>
          <View style={styles.optRow}>
            {([
              { value: 'short', label: 'Short', sub: '10 – 14 inches' },
              { value: 'long', label: 'Long', sub: '15 inches or more' },
            ] as const).map((opt) => {
              const active = hairLength === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.85}
                  style={[styles.optCard, active && styles.optCardActive]}
                  onPress={() => setHairLength(opt.value)}
                >
                  {/* Tiny check chip in the corner for the active option */}
                  {active && (
                    <View style={styles.optCheck}>
                      <Ionicons name="checkmark" size={ms(12)} color="#fff" />
                    </View>
                  )}
                  <Text style={[styles.optLabel, active && styles.optLabelActive]}>{opt.label}</Text>
                  <Text style={[styles.optSub, active && styles.optSubActive]}>{opt.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Wig Color *</Text>
          <View style={styles.optRow}>
            {([
              { value: 'black', label: 'Black', swatch: '#1C1917' },
              { value: 'brown', label: 'Brown', swatch: '#7B4A2A' },
              { value: 'light', label: 'Light',  swatch: '#D9B58A' },
            ] as const).map((opt) => {
              const active = wigColor === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.85}
                  style={[styles.colorCard, active && styles.colorCardActive]}
                  onPress={() => setWigColor(opt.value)}
                >
                  <View style={[styles.swatch, { backgroundColor: opt.swatch }]} />
                  <Text style={[styles.colorLabel, active && styles.colorLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Delivery Method (matches the website's radio cards) ── */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Method</Text>
          <Text style={styles.fieldLabel}>How would you like to receive your wig? *</Text>

          <View style={{ gap: vs(10) }}>
            {([
              {
                value: 'delivery',
                icon: 'car' as const,
                label: 'Delivery',
                sub: 'We will deliver the wig to your address.',
              },
              {
                value: 'pickup',
                icon: 'storefront' as const,
                label: 'Pick-up at Binondo Office',
                sub: 'Collect your wig in person at our Binondo office.',
              },
            ] as const).map((opt) => {
              const active = deliveryMethod === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.85}
                  onPress={() => setDeliveryMethod(opt.value)}
                  style={[styles.deliveryRow, active && styles.deliveryRowActive]}
                >
                  <View style={[styles.deliveryIcon, active && styles.deliveryIconActive]}>
                    <Ionicons name={opt.icon} size={ms(18)} color={active ? '#fff' : '#B084CC'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deliveryLabel, active && { color: '#7C3AED' }]}>{opt.label}</Text>
                    <Text style={styles.deliverySub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Submit Button ───────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.submitContainer}>
          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} disabled={loading}>
            <LinearGradient
              colors={['#9B6BBF', '#B084CC']}
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
    shadowColor: '#9B6BBF',
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
    shadowColor: '#9B6BBF',
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
    borderColor: '#B084CC',
    borderRadius: ms(18),
    paddingVertical: vs(14),
    backgroundColor: 'rgba(155,89,182,0.03)',
    overflow: 'hidden',
    minHeight: vs(60),
  },
  previewImg: { width: '100%', height: vs(160), resizeMode: 'cover' },
  uploadBtnText: { fontSize: ms(14), fontWeight: '800', color: '#B084CC', marginLeft: ms(8) },

  fieldLabel: { fontSize: ms(14), fontWeight: '900', color: '#444', marginBottom: vs(12) },

  // ── Option cards (Hair Length: main label + subtitle) ──
  optRow: { flexDirection: 'row', gap: ms(10) },
  optCard: {
    flex: 1,
    paddingVertical: vs(14),
    paddingHorizontal: ms(12),
    alignItems: 'center',
    borderRadius: ms(14),
    borderWidth: 1.5,
    borderColor: '#EEEDE8',
    backgroundColor: '#fff',
    position: 'relative',
  },
  optCardActive: {
    borderColor: '#B084CC',
    backgroundColor: '#F3EBFB',
    shadowColor: '#B084CC',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  optCheck: {
    position: 'absolute',
    top: ms(8),
    right: ms(8),
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    backgroundColor: '#B084CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLabel: {
    fontSize: ms(15),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  optLabelActive: { color: '#7C3AED' },
  optSub: {
    fontSize: ms(11),
    fontWeight: '600',
    color: '#78716C',
    marginTop: vs(2),
  },
  optSubActive: { color: '#9B6BBF' },

  // ── Color cards (Wig Color: swatch + name) ──
  colorCard: {
    flex: 1,
    paddingVertical: vs(12),
    alignItems: 'center',
    borderRadius: ms(14),
    borderWidth: 1.5,
    borderColor: '#EEEDE8',
    backgroundColor: '#fff',
  },
  colorCardActive: {
    borderColor: '#B084CC',
    backgroundColor: '#F3EBFB',
    shadowColor: '#B084CC',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  swatch: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    marginBottom: vs(6),
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  colorLabel: {
    fontSize: ms(13),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.1,
  },
  colorLabelActive: { color: '#7C3AED' },

  // ── Personal details (read-only) ──
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
  },
  profileIcon: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(10),
    backgroundColor: '#F3EBFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(12),
  },
  profileLabel: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: vs(2),
  },
  profileValue: {
    fontSize: ms(14),
    fontWeight: '800',
    color: '#1C1917',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#F4F1ED',
    marginLeft: ms(46),
  },

  // ── Delivery method rows ──
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(14),
    paddingHorizontal: ms(14),
    borderRadius: ms(14),
    borderWidth: 1.5,
    borderColor: '#EEEDE8',
    backgroundColor: '#fff',
    gap: ms(12),
  },
  deliveryRowActive: {
    borderColor: '#B084CC',
    backgroundColor: '#F3EBFB',
    shadowColor: '#B084CC',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  deliveryIcon: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(12),
    backgroundColor: '#F3EBFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIconActive: { backgroundColor: '#B084CC' },
  deliveryLabel: {
    fontSize: ms(14),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.2,
    marginBottom: vs(2),
  },
  deliverySub: {
    fontSize: ms(11.5),
    fontWeight: '500',
    color: '#78716C',
    lineHeight: ms(15),
  },
  radio: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    borderWidth: 1.5,
    borderColor: '#D6D3CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#B084CC' },
  radioInner: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: '#B084CC',
  },

  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(14) },
  checkBox: {
    width: ms(24), height: ms(24), borderRadius: ms(8),
    borderWidth: 2, borderColor: '#E8DAEF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: ms(12),
  },
  checkBoxActive: { backgroundColor: '#B084CC', borderColor: '#B084CC' },
  checkLabel: { fontSize: ms(14), color: '#555', fontWeight: '600' },
  
  consentFootnote: { fontSize: ms(11), color: '#aaa', marginTop: vs(10), fontStyle: 'italic' },

  submitContainer: { marginTop: vs(10) },
  submitBtn: {
    flexDirection: 'row',
    height: vs(60),
    borderRadius: ms(30),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9B6BBF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  submitText: { fontSize: ms(18), fontWeight: '900', color: '#fff', marginRight: ms(10) },
});

