import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../lib/api';
import DonationSuccessModal from '../../components/DonationSuccessModal';
import { CustomAlert } from '../../components/GlobalAlert';

interface MonetaryDonationDashboardProps {
    onBack: () => void;
    onSuccess?: () => void;
    role?: 'Donor' | 'Recipient';
}

export default function MonetaryDonationDashboard({ onBack, onSuccess, role = 'Donor' }: MonetaryDonationDashboardProps) {
    const isRecipient = role === 'Recipient';
    
    // Theme Colors
    const themeColor = isRecipient ? '#9B59B6' : '#FF1493';
    const themeMedium = isRecipient ? '#8E44AD' : '#FF66B2';
    const themeLight = isRecipient ? '#E8DAEF' : '#FFB3D9';
    const themePale = isRecipient ? '#F5EEF8' : '#FFF0F5';
    const themeBg = isRecipient ? '#F9F4FC' : '#F9F5F7';
    const themeFrame = isRecipient ? '#F5EEF8' : '#F5DEE7';

    const [amount, setAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Bank' | 'InstaPay'>('Bank');
    const [fullName, setFullName] = useState('');
    const [numAmount, setNumAmount] = useState('');
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [anonymous, setAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [qrZoomOpen, setQrZoomOpen] = useState(false);

    const [showSuccess, setShowSuccess] = useState(false);
    const [lastAmount, setLastAmount] = useState(0);
    // Monetary donations no longer award stars — no `earnedStars` state.

    const amounts = [50, 100, 150, 200, 250];

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled) {
            setProofImage(result.assets[0].uri);
        }
    };

  const handleDonate = async () => {
    setSubmitError(null);
    if (!fullName || !numAmount || !proofImage) {
      setSubmitError('Please provide your name, amount, and upload a proof of payment.');
      return;
    }

    setLoading(true);
    try {
      const filename = proofImage.split('/').pop() || 'proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      let mime = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
      if (mime === 'image/jpg') mime = 'image/jpeg';

      const baseURL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '') || 'http://localhost:3001/api';
      const url = `${baseURL}/monetary/donate`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const result = await FileSystem.uploadAsync(url, proofImage, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'proof',
        mimeType: mime,
        parameters: {
          amount: numAmount,
          name: fullName,
          payment_method: paymentMethod,
          currency: 'PHP',
          is_anonymous: anonymous ? '1' : '0',
        },
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (__DEV__) console.log('[Monetary] upload result:', result.status, result.body?.slice(0, 200));

      if (result.status === 201 || result.status === 200) {
        const donationAmount = parseFloat(numAmount);
        setLastAmount(donationAmount);
        setShowSuccess(true);
      } else {
        let serverMsg = '';
        try {
          const parsed = JSON.parse(result.body || '{}');
          serverMsg = parsed?.error || parsed?.message || '';
        } catch {}
        throw new Error(serverMsg || `Server responded with ${result.status}`);
      }
    } catch (err: any) {
      console.error('Donation error:', err?.message || err);
      const errorMsg = err?.message || 'Failed to submit donation.';
      setSubmitError(errorMsg);
      CustomAlert.alert('Donation Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

    const insets = useSafeAreaInsets();

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: themeBg, paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? ms(0) : ms(20)}
        >
            <StatusBar style="light" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={ms(26)} color="#1a1a1a" />
                </TouchableOpacity>
                <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
                <View style={styles.spacer} />
            </View>

            <ScrollView 
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(vs(40), insets.bottom + vs(20)) }]} 
                showsVerticalScrollIndicator={false}
            >
                {/* Title Section */}
                <View style={styles.titleBlock}>
                    <View style={[styles.titleChip, { backgroundColor: themePale, borderColor: themeLight }]}>
                        <MaterialCommunityIcons name="hand-heart" size={ms(14)} color={themeColor} />
                        <Text style={[styles.titleChipText, { color: themeColor }]}>Support our mission</Text>
                    </View>
                    <Text style={styles.pageTitle}>Monetary Donation</Text>
                    <Text style={styles.pageSubtitle}>
                        Your gift helps us turn donated hair into wigs for those who need them most.
                    </Text>
                </View>

                {/* Guidelines Card */}
                <View style={styles.guidelinesCard}>
                    <View style={styles.guideHeader}>
                        <View style={[styles.guideIconWrap, { backgroundColor: themePale }]}>
                            <Ionicons name="information-circle" size={ms(18)} color={themeColor} />
                        </View>
                        <Text style={styles.guideTitle}>Before you donate</Text>
                    </View>
                    <View style={styles.guideListCol}>
                        {[
                            'Take a screenshot or photo of your transfer receipt',
                            'Make sure your full name matches your bank account',
                            'Submit the form — we\'ll message you directly to confirm',
                        ].map((line) => (
                            <View key={line} style={styles.guideRow}>
                                <View style={[styles.guideCheck, { backgroundColor: themePale }]}>
                                    <Ionicons name="checkmark" size={ms(12)} color={themeColor} />
                                </View>
                                <Text style={styles.guideRowText}>{line}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Choose an amount</Text>
                    <View style={styles.amountGrid}>
                        {amounts.map((v) => {
                            const active = amount === v;
                            return (
                                <TouchableOpacity
                                    key={v}
                                    activeOpacity={0.85}
                                    style={[
                                        styles.amountChip,
                                        active && { backgroundColor: themeColor, borderColor: themeColor },
                                    ]}
                                    onPress={() => { setAmount(v); setCustomAmount(''); setNumAmount(v.toString()); }}
                                >
                                    <Text style={[styles.amountChipText, active && styles.amountChipTextActive]}>
                                        ₱{v.toLocaleString()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.customAmountWrap}>
                        <Text style={styles.pesoPrefix}>₱</Text>
                        <TextInput
                            style={styles.customAmountInput}
                            placeholder="Enter custom amount"
                            placeholderTextColor="#A0A4AB"
                            keyboardType="number-pad"
                            value={customAmount}
                            onChangeText={(t) => { setCustomAmount(t); setAmount(null); setNumAmount(t); }}
                        />
                    </View>
                </View>

                {}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Payment method</Text>
                    <View style={styles.segmented}>
                        <TouchableOpacity
                            style={[styles.segment, paymentMethod === 'Bank' && { backgroundColor: '#fff', shadowOpacity: 0.08 }]}
                            onPress={() => setPaymentMethod('Bank')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="business-outline" size={ms(15)} color={paymentMethod === 'Bank' ? themeColor : '#7A7E86'} />
                            <Text style={[styles.segmentText, paymentMethod === 'Bank' && { color: themeColor }]}>Bank Transfer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, paymentMethod === 'InstaPay' && { backgroundColor: '#fff', shadowOpacity: 0.08 }]}
                            onPress={() => setPaymentMethod('InstaPay')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="qr-code-outline" size={ms(15)} color={paymentMethod === 'InstaPay' ? themeColor : '#7A7E86'} />
                            <Text style={[styles.segmentText, paymentMethod === 'InstaPay' && { color: themeColor }]}>InstaPay</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Billing details */}
                    {paymentMethod === 'Bank' ? (
                        <View style={styles.billingCard}>
                            <Image
                                source={require('../../assets/bdo-logo.jpg')}
                                style={styles.bdoLogo}
                                resizeMode="contain"
                            />
                            <View style={styles.billingDivider} />
                            <View style={styles.billingRow}>
                                <Text style={styles.billingRowLabel}>Account Name</Text>
                                <Text style={styles.billingRowValue}>Venus Alinsod</Text>
                            </View>
                            <View style={styles.billingRow}>
                                <Text style={styles.billingRowLabel}>Account Number</Text>
                                <Text style={[styles.billingRowValue, styles.billingMono]}>0045 6002 5684</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.billingCard}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => setQrZoomOpen(true)}
                                style={styles.qrTouch}
                            >
                                <Image
                                    source={require('../../assets/instapay-qr.png')}
                                    style={styles.qrImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.qrTapHint}>
                                    <Ionicons name="expand" size={ms(11)} color="#fff" />
                                    <Text style={styles.qrTapHintText}>Tap to zoom</Text>
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.billingName}>InstaPay QR</Text>
                            <Text style={styles.billingHint}>Scan with any e-wallet to donate</Text>
                        </View>
                    )}
                </View>

                {}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Donor information</Text>

                    <Text style={styles.formLabel}>Full name</Text>
                    <View style={styles.fieldBox}>
                        <Ionicons name="person-outline" size={ms(16)} color="#7A7E86" />
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="As it appears on your bank account"
                            placeholderTextColor="#A0A4AB"
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

                    <Text style={styles.formLabel}>Amount donated</Text>
                    <View style={styles.fieldBox}>
                        <Text style={styles.fieldPeso}>₱</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="0.00"
                            placeholderTextColor="#A0A4AB"
                            keyboardType="numeric"
                            value={numAmount}
                            onChangeText={setNumAmount}
                        />
                    </View>

                    <Text style={styles.formLabel}>Proof of payment</Text>
                    <Text style={styles.fieldHint}>Upload a screenshot of your receipt. PNG, JPG, or PDF up to 10 MB.</Text>

                    {proofImage ? (
                        <View style={styles.proofPreviewWrap}>
                            <Image source={{ uri: proofImage }} style={styles.proofPreviewImage} resizeMode="cover" />
                            <TouchableOpacity
                                style={styles.proofRemove}
                                onPress={() => setProofImage(null)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={ms(14)} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.uploadDropzone, { borderColor: themeLight, backgroundColor: themePale }]}
                            onPress={pickImage}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.uploadIconCircle, { backgroundColor: '#fff' }]}>
                                <Ionicons name="cloud-upload-outline" size={ms(20)} color={themeColor} />
                            </View>
                            <Text style={[styles.uploadDropzoneText, { color: themeColor }]}>Tap to upload proof</Text>
                            <Text style={styles.uploadDropzoneHint}>or paste a screenshot</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.anonRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.anonTitle}>Donate anonymously</Text>
                            <Text style={styles.anonSub}>Your name won&apos;t appear in public lists</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#E3E5E8', true: themeLight }}
                            thumbColor={anonymous ? themeColor : '#fff'}
                            ios_backgroundColor="#E3E5E8"
                            onValueChange={setAnonymous}
                            value={anonymous}
                        />
                    </View>
                </View>

                {submitError && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={ms(16)} color="#C0392B" />
                        <Text style={styles.errorBannerText}>{submitError}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.donateSubmitBtn, { backgroundColor: themeColor, shadowColor: themeColor }, loading && { opacity: 0.7 }]}
                    onPress={handleDonate}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    <Text style={styles.donateSubmitText}>
                        {loading ? 'Submitting…' : numAmount ? `Donate ₱${Number(numAmount).toLocaleString()}` : 'Confirm donation'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.legalText}>
                    By donating, you agree to our terms. Your contribution is non-refundable.
                </Text>

                <View style={{ height: 60 }} />
            </ScrollView>

            <DonationSuccessModal
                visible={showSuccess}
                amount={lastAmount}
                stars={0}
                type="monetary"
                role={role}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                    else onBack();
                }}
            />

            {/* QR zoom modal — full-screen tap-to-dismiss */}
            <Modal
                visible={qrZoomOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setQrZoomOpen(false)}
            >
                <Pressable style={styles.qrZoomBackdrop} onPress={() => setQrZoomOpen(false)}>
                    <View style={styles.qrZoomBox}>
                        <Image
                            source={require('../../assets/instapay-qr.png')}
                            style={styles.qrZoomImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.qrZoomCaption}>InstaPay · Tap anywhere to close</Text>
                    </View>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: ms(16), paddingTop: vs(8), paddingBottom: vs(6),
    },
    backBtn: { width: ms(40), height: ms(40), justifyContent: 'center' },
    logoImage: { width: ms(44), height: ms(44), resizeMode: 'contain', borderRadius: ms(22), marginLeft: ms(-4) },
    spacer: { flex: 1 },

    scrollContent: { paddingHorizontal: ms(18), paddingBottom: vs(40) },

    // Title block
    titleBlock: { alignItems: 'center', marginTop: vs(8), marginBottom: vs(20) },
    titleChip: {
        flexDirection: 'row', alignItems: 'center', gap: ms(6),
        borderWidth: 1, paddingHorizontal: ms(12), paddingVertical: vs(5),
        borderRadius: ms(20), marginBottom: vs(12),
    },
    titleChipText: { fontSize: ms(11), fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
    pageTitle: { fontSize: ms(26), fontWeight: '900', color: '#1a1a1a', textAlign: 'center', letterSpacing: -0.5 },
    pageSubtitle: {
        fontSize: ms(13.5), color: '#5C616B', textAlign: 'center',
        marginTop: vs(8), paddingHorizontal: ms(20), lineHeight: vs(20), fontWeight: '500',
    },

    // Guidelines
    guidelinesCard: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEEDEC',
        borderRadius: ms(18), padding: ms(18), marginBottom: vs(18),
    },
    guideHeader: { flexDirection: 'row', alignItems: 'center', gap: ms(10), marginBottom: vs(12) },
    guideIconWrap: {
        width: ms(32), height: ms(32), borderRadius: ms(16),
        alignItems: 'center', justifyContent: 'center',
    },
    guideTitle: { fontSize: ms(14.5), fontWeight: '800', color: '#1a1a1a' },
    guideListCol: { gap: vs(10) },
    guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: ms(10) },
    guideCheck: {
        width: ms(20), height: ms(20), borderRadius: ms(10),
        alignItems: 'center', justifyContent: 'center', marginTop: vs(1),
    },
    guideRowText: { flex: 1, fontSize: ms(13), color: '#444851', lineHeight: vs(19), fontWeight: '500' },

    // Cards
    card: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEEDEC',
        borderRadius: ms(18), padding: ms(18), marginBottom: vs(14),
    },
    cardLabel: {
        fontSize: ms(11), fontWeight: '900', color: '#7A7E86',
        letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: vs(12),
    },

    // Amount chips
    amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(8), marginBottom: vs(12) },
    amountChip: {
        borderWidth: 1.5, borderColor: '#E6E5E3', borderRadius: ms(12),
        paddingVertical: vs(11), paddingHorizontal: ms(14),
        flexBasis: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: '#fff',
    },
    amountChipText: { fontSize: ms(15), color: '#1a1a1a', fontWeight: '800' },
    amountChipTextActive: { color: '#fff' },

    // Custom amount with peso prefix
    customAmountWrap: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#E6E5E3', borderRadius: ms(12),
        paddingHorizontal: ms(14), height: vs(50), backgroundColor: '#FAFAF9',
    },
    pesoPrefix: { fontSize: ms(17), color: '#7A7E86', fontWeight: '800', marginRight: ms(8) },
    customAmountInput: { flex: 1, fontSize: ms(15), color: '#1a1a1a', fontWeight: '700', paddingVertical: 0 },

    // Segmented toggle
    segmented: {
        flexDirection: 'row', backgroundColor: '#F3F2F0',
        borderRadius: ms(12), padding: ms(4), marginBottom: vs(16),
    },
    segment: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: ms(6), paddingVertical: vs(10), borderRadius: ms(10),
        shadowColor: '#000', shadowOpacity: 0, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    segmentText: { fontSize: ms(13), fontWeight: '800', color: '#7A7E86' },

    // Billing card
    billingCard: {
        backgroundColor: '#FAFAF9', borderWidth: 1, borderColor: '#EEEDEC',
        borderRadius: ms(14), padding: ms(18), alignItems: 'center',
    },
    bdoLogo: { width: ms(96), height: ms(96), borderRadius: ms(10) },
    billingDivider: { width: '100%', height: 1, backgroundColor: '#EEEDEC', marginVertical: vs(14) },
    billingRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: vs(6) },
    billingRowLabel: { fontSize: ms(12), color: '#7A7E86', fontWeight: '700' },
    billingRowValue: { fontSize: ms(14), color: '#1a1a1a', fontWeight: '800' },
    billingMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 },
    qrTouch: {
        width: ms(180),
        height: ms(180),
        backgroundColor: '#fff',
        padding: ms(8),
        borderRadius: ms(12),
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.08)',
        marginBottom: vs(14),
        position: 'relative',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    qrImage: { width: '100%', height: '100%' },
    qrTapHint: {
        position: 'absolute',
        bottom: ms(6),
        right: ms(6),
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(4),
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: ms(8),
        paddingVertical: vs(3),
        borderRadius: ms(10),
    },
    qrTapHintText: {
        color: '#fff',
        fontSize: ms(10),
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    qrZoomBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: ms(20),
    },
    qrZoomBox: {
        width: '100%',
        aspectRatio: 1,
        maxWidth: ms(380),
        backgroundColor: '#fff',
        borderRadius: ms(20),
        padding: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrZoomImage: { width: '100%', height: '85%' },
    qrZoomCaption: {
        color: '#444',
        fontSize: ms(12),
        fontWeight: '700',
        marginTop: vs(10),
    },
    billingName: { fontSize: ms(15), fontWeight: '900', color: '#1a1a1a', marginTop: vs(10) },
    billingHint: { fontSize: ms(12), color: '#7A7E86', fontWeight: '600', marginTop: vs(2) },

    // Form fields
    formLabel: { fontSize: ms(13), fontWeight: '800', color: '#1a1a1a', marginTop: vs(8), marginBottom: vs(6) },
    fieldHint: { fontSize: ms(12), color: '#7A7E86', marginBottom: vs(10), lineHeight: vs(17), fontWeight: '500' },
    fieldBox: {
        flexDirection: 'row', alignItems: 'center', gap: ms(10),
        borderWidth: 1.5, borderColor: '#E6E5E3', borderRadius: ms(12),
        paddingHorizontal: ms(14), height: vs(50), backgroundColor: '#FAFAF9',
        marginBottom: vs(8),
    },
    fieldInput: { flex: 1, fontSize: ms(14), color: '#1a1a1a', fontWeight: '600', paddingVertical: 0 },
    fieldPeso: { fontSize: ms(17), color: '#7A7E86', fontWeight: '800' },

    // Upload
    uploadDropzone: {
        borderWidth: 1.5, borderStyle: 'dashed', borderRadius: ms(14),
        paddingVertical: vs(22), paddingHorizontal: ms(16),
        alignItems: 'center', justifyContent: 'center', marginBottom: vs(16),
    },
    uploadIconCircle: {
        width: ms(40), height: ms(40), borderRadius: ms(20),
        alignItems: 'center', justifyContent: 'center', marginBottom: vs(8),
    },
    uploadDropzoneText: { fontSize: ms(13.5), fontWeight: '800' },
    uploadDropzoneHint: { fontSize: ms(11.5), color: '#7A7E86', marginTop: vs(2), fontWeight: '500' },

    proofPreviewWrap: {
        alignSelf: 'flex-start', marginBottom: vs(16),
        borderRadius: ms(12), overflow: 'visible',
    },
    proofPreviewImage: {
        width: ms(110), height: ms(150),
        borderRadius: ms(12), borderWidth: 1, borderColor: '#E6E5E3',
    },
    proofRemove: {
        position: 'absolute', top: -ms(8), right: -ms(8),
        width: ms(26), height: ms(26), borderRadius: ms(13),
        backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
    },

    // Anonymous switch row
    anonRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FAFAF9', borderRadius: ms(12),
        borderWidth: 1, borderColor: '#EEEDEC',
        padding: ms(14), marginTop: vs(4),
    },
    anonTitle: { fontSize: ms(13.5), fontWeight: '800', color: '#1a1a1a', marginBottom: vs(2) },
    anonSub: { fontSize: ms(11.5), color: '#7A7E86', fontWeight: '500' },

    // Error
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: ms(8),
        backgroundColor: '#FEE9E5', borderWidth: 1, borderColor: '#F8C9C0',
        paddingHorizontal: ms(14), paddingVertical: vs(11),
        borderRadius: ms(12), marginBottom: vs(12),
    },
    errorBannerText: { flex: 1, fontSize: ms(12.5), color: '#C0392B', fontWeight: '700' },

    // Submit
    donateSubmitBtn: {
        borderRadius: ms(16), height: vs(54),
        justifyContent: 'center', alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22, shadowRadius: 14, elevation: 6,
        marginTop: vs(4),
    },
    donateSubmitText: { color: '#fff', fontSize: ms(15.5), fontWeight: '900', letterSpacing: 0.3 },
    legalText: {
        fontSize: ms(11), color: '#9CA0A6', textAlign: 'center',
        marginTop: vs(12), paddingHorizontal: ms(20), lineHeight: vs(15), fontWeight: '500',
    },
});

