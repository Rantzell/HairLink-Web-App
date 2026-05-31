import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout,
} from 'react-native-reanimated';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
    onBack: () => void;
    onLogout: () => void;
    onRoleChange?: (role: 'Donor' | 'Recipient') => void;
}

export default function ProfileScreen({ onBack, onLogout, onRoleChange }: ProfileScreenProps) {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Profile Data
    const [profile, setProfile] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'Donor' | 'Recipient'>('Donor');
    const [points, setPoints] = useState(0);
    const [referralCode, setReferralCode] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [hasRedeemed, setHasRedeemed] = useState(false);

    // Redemption State
    const [otherReferralCode, setOtherReferralCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);

    const insets = useSafeAreaInsets();

    const getAvatarUrl = (photoUrl: string | null | undefined): string | null => {
        if (!photoUrl) return null;
        if (photoUrl.startsWith('http')) return photoUrl;
        const { data } = supabase.storage.from('hairlink').getPublicUrl(`profile-photos/${photoUrl}`);
        return data.publicUrl;
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const [meRes, statsRes] = await Promise.all([
                api.get('/auth/me'),
                api.get('/donations/stats').catch(() => null),
            ]);
            const data = meRes.data;

            if (data) {
                setProfile(data);
                setEmail(data.email || '');
                const first = data.firstName || data.first_name || '';
                const last = data.lastName || data.last_name || '';
                setFullName(`${first} ${last}`.trim());
                setPhone(data.phone || '');
                const fetchedRole = data.role ? (data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()) : 'Donor';
                setRole(fetchedRole as 'Donor' | 'Recipient');
                const computedPoints = statsRes?.data?.totalPoints ?? data.starPoints ?? data.star_points ?? 0;
                setPoints(computedPoints);
                setReferralCode(data.referralCode || data.referral_code || '---');
                setAvatarUrl(getAvatarUrl(data.profile_photo_url || data.profilePhotoUrl));
                setHasRedeemed(!!(data.referredBy || data.referred_by || data.has_redeemed_code || data.hasRedeemedCode));
            }
        } catch (error: any) {
            Alert.alert('Error', 'Failed to fetch profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemCode = async () => {
        if (!otherReferralCode.trim()) return;
        setIsRedeeming(true);
        try {
            const res = await api.post('/referral/', { referral_code: otherReferralCode });
            Alert.alert('Success', res.data.message || 'Referral code applied successfully! ✨');
            setOtherReferralCode('');
            await fetchProfile();
        } catch (error: any) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Invalid referral code.';
            Alert.alert('Redeem Failed', msg);
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setUpdating(true);

            const names = fullName.trim().split(/\s+/);
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || firstName;

            await api.post('/profile/', {
                first_name: firstName,
                last_name: lastName,
                phone: phone,
            });

            Alert.alert('Success', 'Profile updated successfully! ✨');
            setEditMode(false);
            fetchProfile();
        } catch (error: any) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to update profile.';
            Alert.alert('Update Failed', msg);
        } finally {
            setUpdating(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.3, // Reduced quality for faster upload
            });

            if (!result.canceled) {
                uploadAvatar(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadAvatar = async (uri: string) => {
        try {
            setUpdating(true);

            const formData = new FormData();
            const fileExt = uri.split('.').pop()?.toLowerCase();
            const fileName = `avatar.${fileExt}`;

            formData.append('profile_photo', {
                uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                name: fileName,
                type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
            } as any);

            const names = fullName.trim().split(/\s+/);
            formData.append('first_name', names[0] || '');
            formData.append('last_name', names.slice(1).join(' ') || (names[0] || ''));
            if (phone) formData.append('phone', phone);

            const response = await api.post('/profile/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const updatedUser = response.data?.user;
            setAvatarUrl(getAvatarUrl(updatedUser?.profile_photo_url || updatedUser?.profilePhotoUrl));
            Alert.alert('Success', 'Profile picture updated! ✨');
        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Upload Error', 'Failed to upload image to server.');
        } finally {
            setUpdating(false);
        }
    };

    const copyReferral = async () => {
        await Clipboard.setStringAsync(referralCode);
        Alert.alert('Copied', 'Referral code copied to clipboard!');
    };

    // Role switcher removed — keep `role` state because it still drives the
    // hero gradient + a few labels, but it is no longer user-mutable.

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF1493" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? ms(0) : ms(20)}
        >
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header Hero Section */}
                <LinearGradient
                    colors={role === 'Donor' ? ['#FF1493', '#FF69B4'] : ['#8E44AD', '#9B59B6']}
                    style={[styles.heroHeader, { paddingTop: insets.top }]}
                >
                    <View style={styles.topNav}>
                        <TouchableOpacity onPress={onBack} style={styles.glassButton}>
                            <Ionicons name="chevron-back" size={ms(24)} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Account Settings</Text>
                        <View style={{ width: ms(44) }} />
                    </View>

                    {/* Premium Avatar Section */}
                    <Animated.View entering={FadeInDown.springify()} style={styles.avatarSection}>
                            <View style={styles.avatarWrapper}>
                                <View style={styles.avatarImageContainer}>
                                    <Image
                                        source={avatarUrl ? { uri: avatarUrl } : require('../../assets/logo.png')}
                                        style={styles.avatar}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.premiumCamBtn}
                                    onPress={pickImage}
                                    disabled={updating}
                                    activeOpacity={0.7}
                                >
                                    {updating ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Ionicons name="camera" size={20} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.userName}>{fullName || 'User Name'}</Text>
                            <View style={styles.idChip}>
                                <Text style={styles.idChipText}>#{profile?.id ? profile.id.substring(0, 8) : '0000'}</Text>
                            </View>
                        </Animated.View>
                </LinearGradient>

                <View style={styles.bodyContent}>
                    {/* Role switcher removed — users now have a single permanent role.
                        The Donor/Recipient routing happens automatically based on the
                        role recorded at signup; switching dashboards mid-session was
                        confusing and error-prone. (Was: COMMUNITY STATUS toggle.) */}

                    {/* Personal details — header + fields live in ONE card so the
                        EDIT pill doesn't float over the pink hero anymore. */}
                    <View style={styles.infoSection}>
                        <View style={styles.detailsCard}>
                            <View style={styles.detailsCardHeader}>
                                <View>
                                    <Text style={styles.detailsCardTitle}>Personal Details</Text>
                                    <Text style={styles.detailsCardSub}>
                                        Keep your contact info up to date.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.detailsEditBtn, editMode && styles.detailsEditBtnSaving]}
                                    onPress={() => editMode ? handleUpdateProfile() : setEditMode(true)}
                                    disabled={updating}
                                    activeOpacity={0.85}
                                >
                                    <Feather name={editMode ? "check" : "edit-3"} size={ms(13)} color="#fff" />
                                    <Text style={styles.detailsEditBtnText}>{editMode ? 'Save' : 'Edit'}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Fields live inside the same card now */}
                            <InfoRow
                                icon="mail"
                                label="Email Address"
                                value={email}
                                isEdit={editMode}
                                onChange={setEmail}
                                keyboardType="email-address"
                            />
                            <View style={styles.divider} />
                            <InfoRow
                                icon="user"
                                label="Full Name"
                                value={fullName}
                                isEdit={editMode}
                                onChange={setFullName}
                                readOnly
                            />
                            <View style={styles.divider} />
                            <InfoRow
                                icon="phone"
                                label="Mobile Number"
                                value={phone}
                                isEdit={editMode}
                                onChange={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Rewards Premium View - Only for Donors */}
                    {role === 'Donor' && (
                        <Animated.View entering={FadeInUp.delay(300)} style={styles.premiumCard}>
                            <LinearGradient
                                colors={['#1a1a1a', '#333']}
                                style={styles.cardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.platinumBadge}>
                                        <FontAwesome5 name="medal" size={ms(14)} color="#FFD700" />
                                        <Text style={styles.platinumText}>ELITE MEMBER</Text>
                                    </View>
                                    <Ionicons name="star" size={ms(24)} color="#FFD700" />
                                </View>

                                <View style={styles.pointsBody}>
                                    <Text style={styles.pointsValue}>{points}</Text>
                                    <Text style={styles.pointsLabel}>TOTAL REWARD STARS</Text>
                                </View>

                                {/* Referral code removed per user request */}
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {/* Referral Share Card - Only for Donors */}
                    {role === 'Donor' && (
                        <Animated.View entering={FadeInUp.delay(350)} style={[styles.glassCard, { padding: ms(20), marginBottom: vs(20) }]}>
                            <Text style={styles.sectionHeading}>My Referral Code</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF0F5', borderRadius: ms(15), paddingHorizontal: ms(16), paddingVertical: vs(12) }}>
                                <Text style={{ fontSize: ms(16), fontWeight: '900', color: '#FF1493', letterSpacing: 1.5 }}>{referralCode}</Text>
                                <TouchableOpacity onPress={copyReferral} style={{ backgroundColor: 'rgba(255,20,147,0.1)', paddingHorizontal: ms(12), paddingVertical: vs(6), borderRadius: ms(10) }}>
                                    <Text style={{ fontSize: ms(12), fontWeight: '800', color: '#FF1493' }}>Copy Code</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={{ fontSize: ms(11), color: '#888', marginTop: vs(8), fontWeight: '600' }}>
                                Share your code with friends. You will earn 5 points for every new donor referred!
                            </Text>
                        </Animated.View>
                    )}

                    {/* Redeem Referral Card - Only for Donors */}
                    {role === 'Donor' && (
                        <Animated.View entering={FadeInUp.delay(400)} style={styles.redeemCard}>
                            <View style={styles.redeemHeader}>
                                <View style={styles.redeemIconBg}>
                                    <Ionicons name={hasRedeemed ? "checkmark-circle" : "gift"} size={24} color="#FF1493" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.redeemTitle}>{hasRedeemed ? 'Referral Status' : 'Redeem Referral Code'}</Text>
                                    <Text style={styles.redeemSubtitle}>
                                        {hasRedeemed ? 'Referral code successfully redeemed!' : 'Enter code from other user referal.'}
                                    </Text>
                                </View>
                            </View>

                            {!hasRedeemed && (
                                <View style={styles.redeemInputRow}>
                                    <TextInput
                                        style={styles.redeemInput}
                                        placeholder="e.g. HL-XXXXXX"
                                        placeholderTextColor="#ccc"
                                        value={otherReferralCode}
                                        onChangeText={text => setOtherReferralCode(text.toUpperCase())}
                                        autoCapitalize="characters"
                                        editable={!isRedeeming}
                                    />
                                    <TouchableOpacity
                                        style={[styles.claimBtn, { backgroundColor: '#FF1493' }]}
                                        onPress={handleRedeemCode}
                                        disabled={isRedeeming || !otherReferralCode.trim()}
                                    >
                                        {isRedeeming ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.claimBtnText}>Apply</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    )}

                    {/* Logout Action */}
                    <TouchableOpacity style={styles.premiumLogout} onPress={onLogout}>
                        <Feather name="log-out" size={ms(18)} color="#C0392B" />
                        <Text style={styles.logoutText}>Sign Out Account</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function InfoRow({ icon, label, value, isEdit, onChange, keyboardType, readOnly }: any) {
    // `readOnly` forces the row to render as a static value even in edit mode —
    // used for the full name so users can’t rename their identity post-signup.
    const editable = isEdit && !readOnly;
    return (
        <View style={styles.rowItem}>
            <View style={styles.iconContainer}>
                <Feather name={icon} size={ms(18)} color="#D63B8A" />
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    {readOnly && (
                        <Feather name="lock" size={ms(10)} color="#A8A29E" />
                    )}
                </View>
                {editable ? (
                    <TextInput
                        style={styles.rowInput}
                        value={value}
                        onChangeText={onChange}
                        placeholder={`Enter ${label}`}
                        keyboardType={keyboardType}
                        autoCapitalize={label === 'Email Address' ? 'none' : 'words'}
                    />
                ) : (
                    <Text style={[styles.rowValue, readOnly && { color: '#1C1917' }]}>
                        {value || `Add ${label}`}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fdfdfd' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },

    // Hero Header
    heroHeader: { paddingBottom: vs(32), borderBottomLeftRadius: ms(28), borderBottomRightRadius: ms(28) },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ms(20), paddingTop: vs(10) },
    glassButton: { width: ms(44), height: ms(44), borderRadius: ms(22), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },

    // Avatar
    avatarSection: { alignItems: 'center', marginTop: vs(25) },
    avatarWrapper: {
        position: 'relative',
    },
    avatarImageContainer: {
        width: ms(140),
        height: ms(140),
        borderRadius: ms(70),
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 5,
        borderColor: '#fff',
    },
    avatar: { width: '100%', height: '100%' },
    premiumCamBtn: {
        position: 'absolute',
        bottom: ms(4),
        right: ms(4),
        backgroundColor: '#1a1a1a',
        width: ms(44),
        height: ms(44),
        borderRadius: ms(22),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        zIndex: 10,
    },
    userName: { fontSize: ms(26), fontWeight: '900', color: '#fff', marginTop: vs(18), letterSpacing: ms(-0.5) },
    idChip: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: ms(16), paddingVertical: vs(6), borderRadius: ms(15), marginTop: vs(10) },
    idChipText: { color: '#fff', fontSize: ms(13), fontWeight: '800', letterSpacing: 1.5 },

    // -22 lets the card "tuck" under the rounded hero edge without the
    // section header floating awkwardly on top of the pink (the old -40
    // pulled the label up into the gradient).
    bodyContent: { marginTop: vs(-22), paddingHorizontal: ms(16) },

    // Role Switcher
    roleCard: {
        backgroundColor: '#fff',
        padding: ms(24),
        borderRadius: ms(30),
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        marginBottom: vs(25),
        shadowOffset: { width: 0, height: 4 }
    },
    sectionHeading: { fontSize: ms(12), fontWeight: '900', color: '#ccc', letterSpacing: 2, marginBottom: vs(18), textTransform: 'uppercase' },
    toggleContainer: { height: vs(60) },
    toggleBase: { flex: 1, borderRadius: ms(30), position: 'relative', overflow: 'hidden' },
    toggleThumb: {
        position: 'absolute', top: 5, bottom: 5, width: '48%',
        borderRadius: ms(25), zIndex: 1,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 5
    },
    toggleText: { color: '#fff', fontWeight: '900', fontSize: ms(15), textTransform: 'uppercase' },
    toggleLabels: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: ms(10) },
    toggleLabelText: { color: '#aaa', fontSize: ms(14), fontWeight: '800', textTransform: 'uppercase' },

    // Info Section
    infoSection: { marginBottom: vs(20) },

    // ── New unified "Personal Details" card (replaces sectionRow + glassCard) ──
    detailsCard: {
        backgroundColor: '#fff',
        borderRadius: ms(22),
        paddingTop: vs(16),
        paddingBottom: vs(6),
        shadowColor: '#1C1917',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        shadowOffset: { width: 0, height: 6 },
        borderWidth: 1,
        borderColor: '#F4F1ED',
    },
    detailsCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: ms(20),
        paddingBottom: vs(12),
        borderBottomWidth: 1,
        borderBottomColor: '#F4F1ED',
        marginBottom: vs(4),
    },
    detailsCardTitle: {
        fontSize: ms(15),
        fontWeight: '800',
        color: '#1C1917',
        letterSpacing: -0.2,
        marginBottom: vs(2),
    },
    detailsCardSub: {
        fontSize: ms(11),
        color: '#78716C',
        fontWeight: '500',
    },
    detailsEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D63B8A',
        paddingHorizontal: ms(14),
        paddingVertical: vs(7),
        borderRadius: 999,
        shadowColor: '#D63B8A',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    detailsEditBtnSaving: {
        backgroundColor: '#16A34A',
        shadowColor: '#16A34A',
    },
    detailsEditBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: ms(12),
        marginLeft: ms(6),
        letterSpacing: 0.3,
    },

    // Old aliases kept so any stragglers still resolve; safe to leave unused.
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(18) },
    miniEditBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#bbb', paddingHorizontal: ms(18), paddingVertical: vs(10), borderRadius: ms(15), elevation: 2 },
    activeSaveBtn: { backgroundColor: '#27AE60' },
    miniEditBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(13), marginLeft: ms(8), textTransform: 'uppercase' },

    glassCard: {
        backgroundColor: '#fff',
        borderRadius: ms(30),
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
        shadowOffset: { width: 0, height: 4 }
    },
    rowItem: { flexDirection: 'row', alignItems: 'center', padding: ms(22) },
    iconContainer: {
        width: ms(44),
        height: ms(44),
        borderRadius: ms(14),
        backgroundColor: '#f9f9f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: ms(18),
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    rowLabel: { fontSize: ms(12), fontWeight: '800', color: '#bbb', marginBottom: vs(4), textTransform: 'uppercase', letterSpacing: 0.5 },
    rowValue: { fontSize: ms(14), fontWeight: '900', color: '#1a1a1a' },
    rowInput: { fontSize: ms(16), fontWeight: '900', color: '#FF1493', padding: 0 },
    divider: { height: 1, backgroundColor: '#f5f5f5', marginLeft: ms(80) },

    // Premium Card
    premiumCard: { height: vs(210), borderRadius: ms(35), overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, marginBottom: vs(25), shadowOffset: { width: 0, height: 8 } },
    cardGradient: { flex: 1, padding: ms(30) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    platinumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: ms(12), paddingVertical: vs(6), borderRadius: ms(12) },
    platinumText: { color: '#FFD700', fontSize: ms(11), fontWeight: '900', marginLeft: ms(8), letterSpacing: 1.5 },
    pointsBody: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    pointsValue: { fontSize: ms(54), fontWeight: '900', color: '#fff', letterSpacing: -1 },
    pointsLabel: { fontSize: ms(13), fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginTop: vs(-5) },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    footerLabel: { fontSize: ms(10), fontWeight: '900', color: 'rgba(255,255,255,0.35)', marginBottom: vs(4), letterSpacing: 1 },
    footerValue: { fontSize: ms(18), fontWeight: '900', color: '#fff', letterSpacing: 2 },
    premiumCopyBtn: { backgroundColor: 'rgba(255,255,255,0.15)', width: ms(44), height: ms(44), borderRadius: ms(14), justifyContent: 'center', alignItems: 'center' },

    // Redeem Card
    redeemCard: {
        backgroundColor: '#fff',
        borderRadius: ms(30),
        padding: ms(24),
        marginBottom: vs(30),
        borderWidth: 2,
        borderColor: '#FFD6EF',
        shadowColor: '#FF1493',
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    redeemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(20) },
    redeemIconBg: { width: ms(48), height: ms(48), borderRadius: ms(16), backgroundColor: '#FFF0F7', justifyContent: 'center', alignItems: 'center', marginRight: ms(15) },
    redeemTitle: { fontSize: ms(14), fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.5 },
    redeemSubtitle: { fontSize: ms(12), fontWeight: '700', color: '#999', marginTop: vs(2) },
    redeemInputRow: { flexDirection: 'row', alignItems: 'center' },
    redeemInput: {
        flex: 1,
        backgroundColor: '#F8F8F8',
        height: vs(54),
        borderRadius: ms(18),
        paddingHorizontal: ms(20),
        fontSize: ms(15),
        fontWeight: '900',
        color: '#FF1493',
        marginRight: ms(12),
        letterSpacing: 2,
    },
    claimBtn: {
        backgroundColor: '#FF1493',
        height: vs(54),
        paddingHorizontal: ms(25),
        borderRadius: ms(18),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF1493',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    claimBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(14), letterSpacing: 1 },

    // Logout
    premiumLogout: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFF5F5', padding: ms(20), borderRadius: ms(24),
        borderWidth: 2, borderColor: '#FEE2E2', marginBottom: vs(20)
    },
    logoutText: { color: '#C0392B', fontWeight: '900', fontSize: ms(16), marginLeft: ms(12), textTransform: 'uppercase', letterSpacing: 1 },
});

