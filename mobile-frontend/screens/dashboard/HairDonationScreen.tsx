import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import DonationSuccessModal from '../../components/DonationSuccessModal';
import api from '../../lib/api';
import { CustomAlert } from '../../components/GlobalAlert';

/**
 * Donor Hair Donation form — visual + structural twin of the recipient
 * `HairRequestScreen`. Both forms share:
 *   • Personal Details card pulled from /auth/me
 *   • Card-stacked layout with brand-coloured option cards
 *   • Hair length as title+subtitle option cards
 *   • Hair color as swatch cards
 *
 * Only the theme differs — donor uses brand pink (#D63B8A), recipient
 * uses light purple (#B084CC). All other tokens are shared.
 */
interface HairDonationScreenProps {
    onBack: () => void;
    onSuccess?: () => void;
}

export default function HairDonationScreen({ onBack, onSuccess }: HairDonationScreenProps) {
    // Same value vocab as the website (frontend/src/pages/DonorDonate.tsx):
    //   length → 'short' | 'long'    color → 'Black' | 'Brown' | 'Light'
    const [hairLength, setHairLength] = useState<'short' | 'long' | null>(null);
    const [hairColor, setHairColor] = useState<'Black' | 'Brown' | 'Light' | null>(null);
    const [chemicallyTreated, setChemicallyTreated] = useState(false);
    const [address, setAddress] = useState('');
    const [reason, setReason] = useState('');
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingLabel, setLoadingLabel] = useState('Submitting...');
    const [showSuccess, setShowSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Read-only profile snapshot (matches the recipient's Personal Details
    // card pattern — kept in sync with /auth/me, surfaced as static rows).
    const [profile, setProfile] = useState<{
        name: string;
        phone: string;
        gender: string;
        email: string;
    }>({ name: '', phone: '', gender: '', email: '' });

    useEffect(() => {
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
                console.warn('Could not load profile for donation', err);
            }
        };
        loadProfile();
    }, []);

    const handleImageSource = () => {
        CustomAlert.alert(
            'Upload Photo',
            'Select the source of your hair photo',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Gallery', onPress: pickImageFromLibrary },
                { text: 'Cancel', style: 'cancel' },
            ],
        );
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            CustomAlert.alert('Permission Denied', 'We need camera access to take a photo of your donation.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) setProofImage(result.assets[0].uri);
    };

    const pickImageFromLibrary = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            CustomAlert.alert('Permission Denied', 'We need access to your gallery to pick a photo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) setProofImage(result.assets[0].uri);
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        if (!hairLength || !hairColor || !address || !reason || !proofImage) {
            setSubmitError('Please fill in all fields and upload a photo.');
            return;
        }

        setLoading(true);
        setLoadingLabel('Preparing submission...');

        try {
            const filename = proofImage.split('/').pop() || 'donation.jpg';
            const match = /\.(\w+)$/.exec(filename);
            let mime = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
            if (mime === 'image/jpg') mime = 'image/jpeg';

            setLoadingLabel('Uploading to secure server...');

            // Use expo-file-system uploadAsync — handles RN file URIs natively
            // (axios + FormData chokes on Android scoped-storage URIs).
            const baseURL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '') || 'http://localhost:3001/api';
            const url = `${baseURL}/donations`;

            // Need a fresh Supabase token for auth (axios interceptor isn't used here)
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            const result = await FileSystem.uploadAsync(url, proofImage, {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'photo_front',
                mimeType: mime,
                parameters: {
                    reference: `MOB-${Date.now()}`,
                    type: 'hair',
                    hair_length: hairLength,
                    hair_color: hairColor,
                    treated_hair: chemicallyTreated ? '1' : '0',
                    address,
                    reason,
                },
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (__DEV__) console.log('[Donate] upload result:', result.status, result.body?.slice(0, 200));

            if (result.status === 201 || result.status === 200) {
                setShowSuccess(true);
            } else {
                let serverMsg = '';
                try { serverMsg = JSON.parse(result.body || '{}')?.message || ''; } catch {}
                throw new Error(serverMsg || `Server responded with ${result.status}`);
            }
        } catch (err: any) {
            console.error('Submission error:', err?.message || err);
            const errorMsg = err?.message || 'An unexpected error occurred.';
            setSubmitError(errorMsg);
            CustomAlert.alert('Submission Error', errorMsg);
        } finally {
            setLoading(false);
            setLoadingLabel('Submitting...');
        }
    };

    const insets = useSafeAreaInsets();

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={ms(80)}
        >
            <StatusBar style="light" />

            {/* ── Brand-pink gradient header (matches recipient's purple header) ── */}
            <LinearGradient
                colors={['#E863A1', '#D63B8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerBrand}>Strand Up for Cancer</Text>
                    <Text style={styles.headerTitle}>Hair Donation</Text>
                </View>
                <View style={{ width: ms(44) }} />
            </LinearGradient>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>{loadingLabel}</Text>
                </View>
            )}

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(vs(40), insets.bottom + vs(20)) }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Donation Story (same bullet-list + textarea as recipient) ── */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                    <Text style={styles.cardTitle}>Donation Story</Text>
                    <Text style={styles.instructions}>Kindly describe the reason for your hair donation. *</Text>
                    <View style={styles.bulletList}>
                        {[
                            'Who are you donating for?',
                            'What inspired your gift?',
                            'A message for the future recipient',
                        ].map((item, i) => (
                            <View key={i} style={styles.bulletItem}>
                                <Ionicons name="heart" size={14} color="#D63B8A" />
                                <Text style={styles.bulletText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                    <TextInput
                        style={styles.storyInput}
                        placeholder="Tell us your story..."
                        placeholderTextColor="#A8A29E"
                        multiline
                        value={reason}
                        onChangeText={setReason}
                        textAlignVertical="top"
                    />
                </Animated.View>

                {/* ── Proof of Hair (image upload — same UX as recipient docs) ── */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <Text style={styles.cardTitle}>Proof of Hair</Text>
                    <Text style={styles.subLabel}>Upload a clear picture of the hair *</Text>
                    <Text style={styles.hint}>Make sure the hair is visible and measured if possible. Max 10MB.</Text>

                    <TouchableOpacity style={styles.uploadBtn} onPress={handleImageSource}>
                        {proofImage ? (
                            <Image source={{ uri: proofImage }} style={styles.previewImg} />
                        ) : (
                            <>
                                <Ionicons name="camera-outline" size={24} color="#D63B8A" />
                                <Text style={styles.uploadBtnText}>Add Photo</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Hair Information — option cards + swatch cards (same as recipient) ── */}
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

                    <Text style={[styles.fieldLabel, { marginTop: vs(20) }]}>Natural Hair Color *</Text>
                    <View style={styles.optRow}>
                        {([
                            { value: 'Black', label: 'Black', swatch: '#1C1917' },
                            { value: 'Brown', label: 'Brown', swatch: '#7B4A2A' },
                            { value: 'Light', label: 'Light', swatch: '#D9B58A' },
                        ] as const).map((opt) => {
                            const active = hairColor === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    activeOpacity={0.85}
                                    style={[styles.colorCard, active && styles.colorCardActive]}
                                    onPress={() => setHairColor(opt.value)}
                                >
                                    <View style={[styles.swatch, { backgroundColor: opt.swatch }]} />
                                    <Text style={[styles.colorLabel, active && styles.colorLabelActive]}>{opt.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={styles.checkRow}
                        onPress={() => setChemicallyTreated(!chemicallyTreated)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.checkBox, chemicallyTreated && styles.checkBoxActive]}>
                            {chemicallyTreated && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={styles.checkLabel}>
                            My hair has been chemically treated (coloured, permed, etc.)
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Shipping Logistics — address textarea ── */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
                    <Text style={styles.cardTitle}>Shipping Logistics</Text>
                    <Text style={styles.subLabel}>Where will you be sending from? *</Text>
                    <TextInput
                        style={[styles.storyInput, { height: vs(100) }]}
                        placeholder="Enter your complete shipping address..."
                        placeholderTextColor="#A8A29E"
                        multiline
                        value={address}
                        onChangeText={setAddress}
                        textAlignVertical="top"
                    />
                </Animated.View>

                {/* ── Delivery Details (read-only info — same drop-off the
                       donor sees in DonationHistoryScreen after approval) ── */}
                <Animated.View entering={FadeInDown.delay(450)} style={styles.deliveryCard}>
                    <View style={styles.deliveryTitleRow}>
                        <Ionicons name="location" size={ms(16)} color="#D63B8A" />
                        <Text style={styles.deliveryCardTitle}>Drop-off Details</Text>
                    </View>
                    <Text style={styles.deliveryLine}>
                        <Text style={styles.deliveryLabel}>Address: </Text>
                        Manila Downtown YMCA, 945 Sabino Padilla St, Binondo, Manila
                    </Text>
                    <Text style={styles.deliveryLine}>
                        <Text style={styles.deliveryLabel}>Hours: </Text>
                        Monday to Sunday, 9:00 AM to 7:00 PM
                    </Text>
                    <Text style={styles.deliveryLine}>
                        <Text style={styles.deliveryLabel}>Contact: </Text>
                        Venus May Alinsod · 0917-847-4270
                    </Text>
                </Animated.View>

                {/* ── Submit (same gradient pill as the recipient) ── */}
                <Animated.View entering={FadeInUp.delay(500)} style={styles.submitContainer}>
                    {submitError && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{submitError}</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85} disabled={loading}>
                        <LinearGradient
                            colors={['#E863A1', '#D63B8A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        >
                            <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Donation'}</Text>
                            {!loading && <Ionicons name="heart" size={20} color="#fff" style={{ marginLeft: 8 }} />}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>

            <DonationSuccessModal
                visible={showSuccess}
                type="hair"
                amount={0}
                stars={10}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                    else onBack();
                }}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF9FB' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: ms(16),
        paddingVertical: vs(15),
        borderBottomLeftRadius: ms(30),
        borderBottomRightRadius: ms(30),
        shadowColor: '#D63B8A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },
    headerTextContainer: { alignItems: 'center' },
    headerBrand: { fontSize: ms(12), color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 1 },
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

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: ms(20),
        padding: ms(18),
        marginBottom: vs(16),
        shadowColor: '#1C1917',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0EDE9',
    },
    cardTitle: { fontSize: ms(18), fontWeight: '900', color: '#1C1917', marginBottom: vs(10), letterSpacing: -0.3 },
    instructions: { fontSize: ms(14), fontWeight: '700', color: '#44403C', marginBottom: vs(8) },
    subLabel: { fontSize: ms(14), fontWeight: '800', color: '#1C1917', marginBottom: vs(6), letterSpacing: -0.2 },
    hint: { fontSize: ms(12), color: '#78716C', marginBottom: vs(12), lineHeight: vs(17) },

    bulletList: { marginBottom: vs(12) },
    bulletItem: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(6) },
    bulletText: { fontSize: ms(13), color: '#57534E', marginLeft: ms(8), fontWeight: '500' },

    storyInput: {
        backgroundColor: '#FAFAF9',
        borderWidth: 1.5,
        borderColor: '#EEEDE8',
        borderRadius: ms(14),
        padding: ms(14),
        height: vs(130),
        fontSize: ms(14),
        color: '#1C1917',
        fontWeight: '500',
    },

    fieldLabel: { fontSize: ms(14), fontWeight: '900', color: '#44403C', marginBottom: vs(12) },

    // ── Option cards (Hair Length: label + subtitle) ──
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
        borderColor: '#D63B8A',
        backgroundColor: '#FFF0F8',
        shadowColor: '#D63B8A',
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
        backgroundColor: '#D63B8A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optLabel: {
        fontSize: ms(15),
        fontWeight: '800',
        color: '#1C1917',
        letterSpacing: -0.2,
    },
    optLabelActive: { color: '#B52B72' },
    optSub: {
        fontSize: ms(11),
        fontWeight: '600',
        color: '#78716C',
        marginTop: vs(2),
    },
    optSubActive: { color: '#D63B8A' },

    // ── Color swatch cards ──
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
        borderColor: '#D63B8A',
        backgroundColor: '#FFF0F8',
        shadowColor: '#D63B8A',
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
    colorLabelActive: { color: '#B52B72' },

    // ── Checkbox (chemically treated) ──
    checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: vs(18) },
    checkBox: {
        width: ms(22),
        height: ms(22),
        borderRadius: ms(7),
        borderWidth: 2,
        borderColor: '#E5E3DD',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: ms(10),
    },
    checkBoxActive: { backgroundColor: '#D63B8A', borderColor: '#D63B8A' },
    checkLabel: { flex: 1, fontSize: ms(13), color: '#44403C', fontWeight: '600', lineHeight: vs(19) },

    // ── Upload button ──
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: ms(8),
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#FFB8E4',
        borderRadius: ms(14),
        paddingVertical: vs(20),
        backgroundColor: '#FFF5FA',
        overflow: 'hidden',
    },
    previewImg: { width: '100%', height: vs(200), resizeMode: 'cover' },
    uploadBtnText: { fontSize: ms(14), fontWeight: '800', color: '#D63B8A' },

    // ── Personal details rows (read-only) ──
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(12),
    },
    profileIcon: {
        width: ms(34),
        height: ms(34),
        borderRadius: ms(10),
        backgroundColor: '#FFF0F8',
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

    // ── Delivery info card (read-only) ──
    deliveryCard: {
        backgroundColor: '#FFF0F8',
        borderRadius: ms(16),
        padding: ms(16),
        marginBottom: vs(16),
        borderWidth: 1,
        borderColor: '#FFD9EC',
    },
    deliveryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(6),
        marginBottom: vs(10),
    },
    deliveryCardTitle: { fontSize: ms(14), fontWeight: '900', color: '#B52B72', letterSpacing: 0.2 },
    deliveryLabel: { fontWeight: '800', color: '#1C1917' },
    deliveryLine: { fontSize: ms(12.5), color: '#44403C', lineHeight: ms(18), marginBottom: vs(4) },

    // ── Submit ──
    submitContainer: { marginTop: vs(6) },
    errorBanner: {
        padding: ms(12),
        backgroundColor: '#FFF0F0',
        borderRadius: ms(12),
        marginBottom: vs(12),
        borderWidth: 1,
        borderColor: '#FFD1D1',
    },
    errorText: { color: '#D32F2F', fontSize: ms(13), fontWeight: '700', textAlign: 'center' },
    submitBtn: {
        height: vs(54),
        borderRadius: ms(16),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#D63B8A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 12,
        elevation: 6,
    },
    submitText: { fontSize: ms(16), fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
});
