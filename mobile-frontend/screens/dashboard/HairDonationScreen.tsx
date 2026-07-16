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
import CameraModal from '../../components/CameraModal';

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

// One person's hair inside a Bundle Donation. Mirrors the website's Bundle shape.
interface Bundle {
    id: number;
    donorName: string; // name to print on that certificate
    hairLength: 'short' | 'long' | null;
    hairColor: 'Black' | 'Brown' | 'Light' | null;
    treated: boolean;
    photo: string | null;
}

let bundleIdSeq = 1;
const emptyBundle = (): Bundle => ({
    id: bundleIdSeq++,
    donorName: '',
    hairLength: null,
    hairColor: null,
    treated: false,
    photo: null,
});

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
    const [showCamera, setShowCamera] = useState(false);

    // ── Donation mode: single "Hair Donation" (existing) vs "Bundle Donation"
    // (parity with website frontend/src/pages/DonorDonate.tsx — a bundle lets a
    // donor submit several people's hair at once, each with its own certificate
    // name, sharing one shipping address + reason). ──────────────────────────
    const [mode, setMode] = useState<'hair' | 'bundle'>('hair');
    const [bundles, setBundles] = useState<Bundle[]>([emptyBundle()]);
    const [bundleAddress, setBundleAddress] = useState('');
    const [bundleReason, setBundleReason] = useState('');
    // Which photo slot the picker/camera writes to: 'main' or a bundle id.
    const [photoTarget, setPhotoTarget] = useState<'main' | number>('main');

    const addBundle = () => setBundles((prev) => [...prev, emptyBundle()]);
    const removeBundle = (id: number) =>
        setBundles((prev) => (prev.length === 1 ? prev : prev.filter((b) => b.id !== id)));
    const updateBundle = (id: number, patch: Partial<Bundle>) =>
        setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

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

    // Route a picked/captured photo to the right slot (main donation or a bundle).
    const applyPickedPhoto = (uri: string) => {
        if (photoTarget === 'main') setProofImage(uri);
        else updateBundle(photoTarget, { photo: uri });
    };

    const handleImageSource = (target: 'main' | number = 'main') => {
        setPhotoTarget(target);
        CustomAlert.alert(
            'Upload Photo',
            'Select the source of your hair photo',
            [
                { text: 'Take Photo', onPress: () => setShowCamera(true) },
                { text: 'Choose from Gallery', onPress: pickImageFromLibrary },
                { text: 'Cancel', style: 'cancel' },
            ],
        );
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
        if (!result.canceled) applyPickedPhoto(result.assets[0].uri);
    };

    // Append the certificate name to the reason exactly like the website does,
    // so staff see the same "Certificate names: …" line for bundle donors.
    const buildReason = (baseReason: string, certName?: string) =>
        certName && certName.trim() ? `${baseReason}\n\nCertificate names: ${certName.trim()}` : baseReason;

    // POST a single donation (one photo + its fields). Shared by both the single
    // Hair Donation path and each item of a Bundle Donation. Throws on failure.
    const postOneDonation = async (opts: {
        reference: string;
        photo: string;
        hairLength: string;
        hairColor: string;
        treated: boolean;
        address: string;
        reason: string;
        certName?: string;
    }) => {
        const filename = opts.photo.split('/').pop() || 'donation.jpg';
        const match = /\.(\w+)$/.exec(filename);
        let mime = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
        if (mime === 'image/jpg') mime = 'image/jpeg';

        // Use expo-file-system uploadAsync — handles RN file URIs natively
        // (axios + FormData chokes on Android scoped-storage URIs).
        const baseURL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '') || 'http://localhost:3001/api';
        const url = `${baseURL}/donations`;
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const result = await FileSystem.uploadAsync(url, opts.photo, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'photo_front',
            mimeType: mime,
            parameters: {
                reference: opts.reference,
                type: 'hair',
                hair_length: opts.hairLength,
                hair_color: opts.hairColor,
                treated_hair: opts.treated ? '1' : '0',
                address: opts.address,
                reason: buildReason(opts.reason, opts.certName),
            },
            headers: {
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (__DEV__) console.log('[Donate] upload result:', result.status, result.body?.slice(0, 200));
        if (result.status !== 201 && result.status !== 200) {
            let serverMsg = '';
            try { serverMsg = JSON.parse(result.body || '{}')?.message || ''; } catch {}
            throw new Error(serverMsg || `Server responded with ${result.status}`);
        }
    };

    const handleSubmit = async () => {
        setSubmitError(null);

        if (mode === 'bundle') {
            if (!bundleAddress.trim() || !bundleReason.trim()) {
                setSubmitError('Please provide a donation story and shipping address for your bundle.');
                return;
            }
            for (let i = 0; i < bundles.length; i++) {
                const b = bundles[i];
                if (!b.donorName.trim() || !b.hairLength || !b.hairColor || !b.photo) {
                    setSubmitError(`Please complete all fields and upload a photo for Bundle ${i + 1}.`);
                    return;
                }
            }
            setLoading(true);
            try {
                for (let i = 0; i < bundles.length; i++) {
                    const b = bundles[i];
                    setLoadingLabel(`Uploading bundle ${i + 1} of ${bundles.length}...`);
                    await postOneDonation({
                        reference: `MOB-${Date.now()}-${i}`,
                        photo: b.photo!,
                        hairLength: b.hairLength!,
                        hairColor: b.hairColor!,
                        treated: b.treated,
                        address: bundleAddress,
                        reason: bundleReason,
                        certName: b.donorName,
                    });
                }
                setShowSuccess(true);
            } catch (err: any) {
                console.error('Submission error:', err?.message || err);
                const errorMsg = err?.message || 'An unexpected error occurred.';
                setSubmitError(errorMsg);
                CustomAlert.alert('Submission Error', errorMsg);
            } finally {
                setLoading(false);
                setLoadingLabel('Submitting...');
            }
            return;
        }

        // Single Hair Donation
        if (!hairLength || !hairColor || !address || !reason || !proofImage) {
            setSubmitError('Please fill in all fields and upload a photo.');
            return;
        }
        setLoading(true);
        setLoadingLabel('Uploading to secure server...');
        try {
            await postOneDonation({
                reference: `MOB-${Date.now()}`,
                photo: proofImage,
                hairLength,
                hairColor,
                treated: chemicallyTreated,
                address,
                reason,
            });
            setShowSuccess(true);
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

    // Length + colour + treated controls, shared by the single form and each
    // bundle card so the two paths never visually diverge.
    const renderHairInfo = (cfg: {
        length: 'short' | 'long' | null;
        color: 'Black' | 'Brown' | 'Light' | null;
        treated: boolean;
        onLength: (v: 'short' | 'long') => void;
        onColor: (v: 'Black' | 'Brown' | 'Light') => void;
        onTreated: (v: boolean) => void;
    }) => (
        <>
            <Text style={styles.fieldLabel}>Hair Length *</Text>
            <View style={styles.optRow}>
                {([
                    { value: 'short', label: 'Short', sub: '10 – 14 inches' },
                    { value: 'long', label: 'Long', sub: '15 inches or more' },
                ] as const).map((opt) => {
                    const active = cfg.length === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            activeOpacity={0.85}
                            style={[styles.optCard, active && styles.optCardActive]}
                            onPress={() => cfg.onLength(opt.value)}
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
                    const active = cfg.color === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            activeOpacity={0.85}
                            style={[styles.colorCard, active && styles.colorCardActive]}
                            onPress={() => cfg.onColor(opt.value)}
                        >
                            <View style={[styles.swatch, { backgroundColor: opt.swatch }]} />
                            <Text style={[styles.colorLabel, active && styles.colorLabelActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity
                style={styles.checkRow}
                onPress={() => cfg.onTreated(!cfg.treated)}
                activeOpacity={0.8}
            >
                <View style={[styles.checkBox, cfg.treated && styles.checkBoxActive]}>
                    {cfg.treated && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkLabel}>
                    My hair has been chemically treated (coloured, permed, etc.)
                </Text>
            </TouchableOpacity>
        </>
    );

    const insets = useSafeAreaInsets();

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={ms(80)}
        >
            <StatusBar style="light" />

            {}
            <LinearGradient
                colors={['#E863A1', '#D63B8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.header, { paddingTop: insets.top + vs(15), paddingBottom: vs(15) }]}
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
                {/* Mode switcher: single Hair Donation vs multi-person Bundle Donation */}
                <Animated.View entering={FadeInDown} style={styles.tabRow}>
                    {([
                        { key: 'hair', label: 'Hair Donation' },
                        { key: 'bundle', label: 'Bundle Donation' },
                    ] as const).map((t) => {
                        const active = mode === t.key;
                        return (
                            <TouchableOpacity
                                key={t.key}
                                activeOpacity={0.85}
                                style={[styles.tabBtn, active && styles.tabBtnActive]}
                                onPress={() => { setMode(t.key); setSubmitError(null); }}
                            >
                                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                {mode === 'hair' && (<>
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

                {}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <Text style={styles.cardTitle}>Proof of Hair</Text>
                    <Text style={styles.subLabel}>Upload a clear picture of the hair *</Text>
                    <Text style={styles.hint}>Make sure the hair is visible and measured if possible. Max 10MB.</Text>

                    <TouchableOpacity style={styles.uploadBtn} onPress={() => handleImageSource('main')}>
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

                {}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                    <Text style={styles.cardTitle}>Hair Information</Text>
                    {renderHairInfo({
                        length: hairLength,
                        color: hairColor,
                        treated: chemicallyTreated,
                        onLength: setHairLength,
                        onColor: setHairColor,
                        onTreated: setChemicallyTreated,
                    })}
                </Animated.View>

                {}
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
                </>)}

                {mode === 'bundle' && (<>
                {/* Shared story + shipping for the whole bundle */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                    <Text style={styles.cardTitle}>Donation Story</Text>
                    <Text style={styles.instructions}>One story covers every person in this bundle. *</Text>
                    <TextInput
                        style={styles.storyInput}
                        placeholder="Tell us your story..."
                        placeholderTextColor="#A8A29E"
                        multiline
                        value={bundleReason}
                        onChangeText={setBundleReason}
                        textAlignVertical="top"
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(150)} style={styles.card}>
                    <Text style={styles.cardTitle}>Shipping Logistics</Text>
                    <Text style={styles.subLabel}>Where will you be sending from? *</Text>
                    <TextInput
                        style={[styles.storyInput, { height: vs(100) }]}
                        placeholder="Enter your complete shipping address..."
                        placeholderTextColor="#A8A29E"
                        multiline
                        value={bundleAddress}
                        onChangeText={setBundleAddress}
                        textAlignVertical="top"
                    />
                </Animated.View>

                {bundles.map((b, idx) => (
                    <Animated.View key={b.id} entering={FadeInDown.delay(200)} style={styles.card}>
                        <View style={styles.bundleHeader}>
                            <Text style={styles.cardTitle}>Bundle {idx + 1}</Text>
                            {bundles.length > 1 && (
                                <TouchableOpacity onPress={() => removeBundle(b.id)} style={styles.bundleRemove}>
                                    <Ionicons name="trash-outline" size={ms(18)} color="#D32F2F" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.subLabel}>Certificate Name *</Text>
                        <Text style={styles.hint}>Name to print on this donor's certificate.</Text>
                        <TextInput
                            style={styles.nameInput}
                            placeholder="e.g. Maria Santos"
                            placeholderTextColor="#A8A29E"
                            value={b.donorName}
                            onChangeText={(v) => updateBundle(b.id, { donorName: v })}
                        />

                        <TouchableOpacity
                            style={[styles.uploadBtn, { marginTop: vs(14) }]}
                            onPress={() => handleImageSource(b.id)}
                        >
                            {b.photo ? (
                                <Image source={{ uri: b.photo }} style={styles.previewImg} />
                            ) : (
                                <>
                                    <Ionicons name="camera-outline" size={24} color="#D63B8A" />
                                    <Text style={styles.uploadBtnText}>Add Photo *</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={{ marginTop: vs(16) }}>
                            {renderHairInfo({
                                length: b.hairLength,
                                color: b.hairColor,
                                treated: b.treated,
                                onLength: (v) => updateBundle(b.id, { hairLength: v }),
                                onColor: (v) => updateBundle(b.id, { hairColor: v }),
                                onTreated: (v) => updateBundle(b.id, { treated: v }),
                            })}
                        </View>
                    </Animated.View>
                ))}

                <TouchableOpacity style={styles.addBundleBtn} onPress={addBundle} activeOpacity={0.85}>
                    <Ionicons name="add-circle-outline" size={ms(20)} color="#D63B8A" />
                    <Text style={styles.addBundleText}>Add another person</Text>
                </TouchableOpacity>
                </>)}

                {}
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

                {}
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
                            <Text style={styles.submitText}>
                                {loading
                                    ? 'Submitting...'
                                    : mode === 'bundle'
                                        ? `Submit ${bundles.length} Bundle${bundles.length > 1 ? 's' : ''}`
                                        : 'Submit Donation'}
                            </Text>
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
            
            <CameraModal
                visible={showCamera}
                onClose={() => setShowCamera(false)}
                onPictureTaken={(uri) => applyPickedPhoto(uri)}
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

    // Mode tabs (Hair vs Bundle)
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#F3E6EF',
        borderRadius: ms(14),
        padding: ms(4),
        marginBottom: vs(16),
    },
    tabBtn: {
        flex: 1,
        paddingVertical: vs(10),
        alignItems: 'center',
        borderRadius: ms(11),
    },
    tabBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#D63B8A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 2,
    },
    tabText: { fontSize: ms(13.5), fontWeight: '800', color: '#9A6C86' },
    tabTextActive: { color: '#B52B72' },

    // Bundle card extras
    bundleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bundleRemove: {
        width: ms(34), height: ms(34), borderRadius: ms(10),
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F0',
    },
    nameInput: {
        backgroundColor: '#FAFAF9',
        borderWidth: 1.5,
        borderColor: '#EEEDE8',
        borderRadius: ms(14),
        paddingHorizontal: ms(14),
        paddingVertical: vs(12),
        fontSize: ms(14),
        color: '#1C1917',
        fontWeight: '600',
    },
    addBundleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: ms(8),
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#FFB8E4',
        borderRadius: ms(14),
        paddingVertical: vs(16),
        backgroundColor: '#FFF5FA',
        marginBottom: vs(16),
    },
    addBundleText: { fontSize: ms(14), fontWeight: '800', color: '#D63B8A' },

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
