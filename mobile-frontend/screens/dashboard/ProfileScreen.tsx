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
    Modal,
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
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { CustomAlert } from '../../components/GlobalAlert';

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
    const [age, setAge] = useState('');
    const [bio, setBio] = useState('');
    const [role, setRole] = useState<'Donor' | 'Recipient'>('Donor');
    const [points, setPoints] = useState(0);
    const [referralCode, setReferralCode] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [hasRedeemed, setHasRedeemed] = useState(false);

    // Redemption State
    const [otherReferralCode, setOtherReferralCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [showReferralSuccess, setShowReferralSuccess] = useState(false);

    // Delete Account State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Change Password State
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const doChangePassword = async () => {
        if (!oldPassword) {
            CustomAlert.alert('Missing field', 'Please enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            CustomAlert.alert('Weak password', 'New password must be at least 8 characters.');
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            CustomAlert.alert('Weak password', 'New password must contain a number.');
            return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>_]/.test(newPassword)) {
            CustomAlert.alert('Weak password', 'New password must contain a symbol.');
            return;
        }
        if (newPassword !== confirmPassword) {
            CustomAlert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        setIsChangingPassword(true);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: oldPassword,
            });
            if (signInError) {
                CustomAlert.alert('Incorrect password', 'Your current password is wrong.');
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                CustomAlert.alert('Could not update password', error.message || 'Please try again.');
                return;
            }

            setShowChangePassword(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            CustomAlert.alert('Password changed', 'Your password has been updated successfully.');
        } catch (err: any) {
            CustomAlert.alert('Error', err?.message || 'An unexpected error occurred.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const doDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        setIsDeleting(true);
        try {
            await api.delete('/auth/account');
            await supabase.auth.signOut();
            setShowDeleteConfirm(false);
            setDeleteConfirmText('');
            onLogout();
        } catch (err: any) {
            CustomAlert.alert(
                'Could not delete account',
                err?.response?.data?.message || err?.message || 'Please try again.',
            );
        } finally {
            setIsDeleting(false);
        }
    };

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
                setAge(data.age != null ? String(data.age) : '');
                setBio(data.bio || '');
                const fetchedRole = data.role ? (data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()) : 'Donor';
                setRole(fetchedRole as 'Donor' | 'Recipient');
                const computedPoints = statsRes?.data?.totalPoints ?? data.starPoints ?? data.star_points ?? 0;
                setPoints(computedPoints);
                setReferralCode(data.referralCode || data.referral_code || '---');
                setAvatarUrl(getAvatarUrl(data.profile_photo_url || data.profilePhotoUrl));
                setHasRedeemed(!!(data.referredBy || data.referred_by || data.has_redeemed_code || data.hasRedeemedCode));
            }
        } catch (error: any) {
            CustomAlert.alert('Error', 'Failed to fetch profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemCode = async () => {
        if (!otherReferralCode.trim()) return;
        setIsRedeeming(true);
        try {
            await api.post('/referral/', { referral_code: otherReferralCode });
            setOtherReferralCode('');
            await fetchProfile();
            setShowReferralSuccess(true);
        } catch (error: any) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Invalid referral code.';
            CustomAlert.alert('Redeem Failed', msg);
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
                age: age ? parseInt(age, 10) : null,
                bio: bio || null,
            });

            CustomAlert.alert('Success', 'Profile updated successfully! ✨');
            setEditMode(false);
            fetchProfile();
        } catch (error: any) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to update profile.';
            CustomAlert.alert('Update Failed', msg);
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
            CustomAlert.alert('Error', 'Failed to pick image');
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
            CustomAlert.alert('Success', 'Profile picture updated! ✨');
        } catch (error: any) {
            console.error('Upload error:', error);
            CustomAlert.alert('Upload Error', 'Failed to upload image to server.');
        } finally {
            setUpdating(false);
        }
    };

    const copyReferral = async () => {
        await Clipboard.setStringAsync(referralCode);
        CustomAlert.alert('Copied', 'Referral code copied to clipboard!');
    };

    // Role switcher removed — keep `role` state because it still drives the
    // hero gradient + a few labels, but it is no longer user-mutable.

    if (loading) {
        return <ProfileSkeleton role={role} insetsTop={insets.top} />;
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
                                readOnly
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
                            <View style={styles.divider} />
                            <InfoRow
                                icon="calendar"
                                label="Age"
                                value={age}
                                isEdit={editMode}
                                onChange={setAge}
                                keyboardType="number-pad"
                            />
                            <View style={styles.divider} />
                            <InfoRow
                                icon="edit-2"
                                label="Quick Bio"
                                value={bio}
                                isEdit={editMode}
                                onChange={setBio}
                                multiline
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
                                Share your code with friends. You earn 5 stars per donor referred — and they earn 3 stars too!
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
                                        {hasRedeemed ? 'Referral code successfully redeemed!' : 'Enter another donor\'s code — you earn 3 stars and they earn 5.'}
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

                    {/* Change Password Action */}
                    <TouchableOpacity
                        style={styles.changePwBtn}
                        onPress={() => {
                            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
                            setShowOldPw(false); setShowNewPw(false); setShowConfirmPw(false);
                            setShowChangePassword(true);
                        }}
                    >
                        <View style={styles.changePwIcon}>
                            <Feather name="lock" size={ms(18)} color="#1D4ED8" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.changePwTitle}>Change Password</Text>
                            <Text style={styles.changePwSub}>Update the password used to sign in</Text>
                        </View>
                        <Feather name="chevron-right" size={ms(20)} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Logout Action */}
                    <TouchableOpacity style={styles.premiumLogout} onPress={onLogout}>
                        <Feather name="log-out" size={ms(18)} color="#C0392B" />
                        <Text style={styles.logoutText}>Sign Out Account</Text>
                    </TouchableOpacity>

                    {/* Delete Account Action */}
                    <TouchableOpacity
                        style={styles.deleteAccountBtn}
                        onPress={() => { setDeleteConfirmText(''); setShowDeleteConfirm(true); }}
                    >
                        <Feather name="trash-2" size={ms(16)} color="#7F1D1D" />
                        <Text style={styles.deleteAccountText}>Delete My Account</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* ── Referral success modal ───────────────────────────── */}
            <Modal
                visible={showReferralSuccess}
                transparent
                animationType="fade"
                onRequestClose={() => setShowReferralSuccess(false)}
            >
                <View style={styles.referralModalBackdrop}>
                    <Animated.View entering={FadeInUp.springify().damping(15)} style={styles.referralModalCard}>
                        <LinearGradient
                            colors={['#FF1493', '#FF66B2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.referralModalIcon}
                        >
                            <Ionicons name="star" size={ms(40)} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.referralModalTitle}>Referral Applied!</Text>
                        <Text style={styles.referralModalMessage}>
                            You earned <Text style={{ fontWeight: '900', color: '#FF1493' }}>3 stars</Text> and your
                            referrer earned <Text style={{ fontWeight: '900', color: '#FF1493' }}>5 stars</Text>.
                            Thank you for spreading the word about HairLink! 🌸
                        </Text>
                        <TouchableOpacity
                            style={styles.referralModalBtn}
                            onPress={() => setShowReferralSuccess(false)}
                        >
                            <Text style={styles.referralModalBtnText}>Awesome!</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>

            {/* ── Change Password modal ──────────────────────────────── */}
            <Modal
                visible={showChangePassword}
                transparent
                animationType="fade"
                onRequestClose={() => { if (!isChangingPassword) setShowChangePassword(false); }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.referralModalBackdrop}
                >
                    <Animated.View entering={FadeInUp.springify().damping(15)} style={styles.changePwCard}>
                        <View style={styles.changePwCardHeader}>
                            <View style={styles.changePwCardIcon}>
                                <Feather name="lock" size={ms(20)} color="#1D4ED8" />
                            </View>
                            <Text style={styles.changePwCardTitle}>Change Password</Text>
                        </View>

                        <Text style={styles.changePwFieldLabel}>Current password</Text>
                        <View style={styles.changePwField}>
                            <TextInput
                                value={oldPassword}
                                onChangeText={setOldPassword}
                                placeholder="Enter current password"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry={!showOldPw}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isChangingPassword}
                                style={styles.changePwInput}
                            />
                            <TouchableOpacity onPress={() => setShowOldPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Feather name={showOldPw ? 'eye-off' : 'eye'} size={ms(16)} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.changePwFieldLabel}>New password</Text>
                        <View style={styles.changePwField}>
                            <TextInput
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="At least 8 chars, 1 number, 1 symbol"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry={!showNewPw}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isChangingPassword}
                                style={styles.changePwInput}
                            />
                            <TouchableOpacity onPress={() => setShowNewPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Feather name={showNewPw ? 'eye-off' : 'eye'} size={ms(16)} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.changePwFieldLabel}>Confirm new password</Text>
                        <View style={styles.changePwField}>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Repeat new password"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry={!showConfirmPw}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isChangingPassword}
                                style={styles.changePwInput}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Feather name={showConfirmPw ? 'eye-off' : 'eye'} size={ms(16)} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={[styles.deleteModalCancel, isChangingPassword && { opacity: 0.5 }]}
                                onPress={() => setShowChangePassword(false)}
                                disabled={isChangingPassword}
                            >
                                <Text style={styles.deleteModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.changePwConfirm, isChangingPassword && { opacity: 0.6 }]}
                                onPress={doChangePassword}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.deleteModalConfirmText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Delete Account confirmation modal ───────────────────── */}
            <Modal
                visible={showDeleteConfirm}
                transparent
                animationType="fade"
                onRequestClose={() => { if (!isDeleting) { setShowDeleteConfirm(false); setDeleteConfirmText(''); } }}
            >
                <View style={styles.referralModalBackdrop}>
                    <Animated.View entering={FadeInUp.springify().damping(15)} style={styles.deleteModalCard}>
                        <View style={styles.deleteModalIconWrap}>
                            <Feather name="alert-triangle" size={ms(32)} color="#DC2626" />
                        </View>
                        <Text style={styles.deleteModalTitle}>Delete account?</Text>
                        <Text style={styles.deleteModalBody}>
                            This action is <Text style={{ fontWeight: '900' }}>irreversible</Text>. Your account,
                            donations, history, and data will be permanently deleted.
                        </Text>
                        <Text style={styles.deleteModalHint}>
                            Type <Text style={{ fontWeight: '900', color: '#DC2626' }}>DELETE</Text> to confirm.
                        </Text>
                        <TextInput
                            value={deleteConfirmText}
                            onChangeText={setDeleteConfirmText}
                            placeholder="DELETE"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            editable={!isDeleting}
                            style={[
                                styles.deleteModalInput,
                                { borderColor: deleteConfirmText === 'DELETE' ? '#DC2626' : '#E5E7EB' },
                            ]}
                        />
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={[styles.deleteModalCancel, isDeleting && { opacity: 0.5 }]}
                                onPress={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                                disabled={isDeleting}
                            >
                                <Text style={styles.deleteModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.deleteModalConfirm,
                                    (deleteConfirmText !== 'DELETE' || isDeleting) && { opacity: 0.5 },
                                ]}
                                onPress={doDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.deleteModalConfirmText}>Delete Forever</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

function InfoRow({ icon, label, value, isEdit, onChange, keyboardType, readOnly, multiline }: any) {
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
                        style={[styles.rowInput, multiline && styles.rowInputMultiline]}
                        value={value}
                        onChangeText={onChange}
                        placeholder={`Enter ${label}`}
                        keyboardType={keyboardType}
                        autoCapitalize={label === 'Email Address' ? 'none' : 'words'}
                        multiline={multiline}
                        numberOfLines={multiline ? 3 : 1}
                        textAlignVertical={multiline ? 'top' : 'center'}
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

// ── Loading skeleton ────────────────────────────────────────────
// A shimmering placeholder that mirrors the profile layout so the
// transition into the loaded view feels seamless.
function SkeletonBlock({ width, height, radius = 8, style }: { width: number | string; height: number; radius?: number; style?: any }) {
    const opacity = useSharedValue(0.55);
    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [opacity]);
    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return (
        <Animated.View
            style={[
                { width: width as any, height, borderRadius: radius, backgroundColor: '#E6E5E3' },
                animatedStyle,
                style,
            ]}
        />
    );
}

function ProfileSkeleton({ role, insetsTop }: { role: 'Donor' | 'Recipient'; insetsTop: number }) {
    const themePale = role === 'Recipient' ? '#F5EEF8' : '#FFF0F5';
    return (
        <View style={[styles.skeletonContainer, { paddingTop: insetsTop }]}>
            {/* Top bar */}
            <View style={styles.skeletonTopBar}>
                <SkeletonBlock width={36} height={36} radius={18} />
                <SkeletonBlock width={120} height={18} radius={6} />
                <SkeletonBlock width={36} height={36} radius={18} />
            </View>

            {/* Hero card */}
            <View style={[styles.skeletonHero, { backgroundColor: themePale }]}>
                <SkeletonBlock width={104} height={104} radius={52} style={{ alignSelf: 'center' }} />
                <View style={{ alignItems: 'center', marginTop: vs(14), gap: vs(8) }}>
                    <SkeletonBlock width={180} height={20} radius={6} />
                    <SkeletonBlock width={140} height={14} radius={5} />
                </View>
                <View style={styles.skeletonStatsRow}>
                    <View style={styles.skeletonStatCol}>
                        <SkeletonBlock width={40} height={20} radius={6} />
                        <SkeletonBlock width={50} height={11} radius={4} style={{ marginTop: vs(6) }} />
                    </View>
                    <View style={styles.skeletonStatDivider} />
                    <View style={styles.skeletonStatCol}>
                        <SkeletonBlock width={40} height={20} radius={6} />
                        <SkeletonBlock width={50} height={11} radius={4} style={{ marginTop: vs(6) }} />
                    </View>
                    <View style={styles.skeletonStatDivider} />
                    <View style={styles.skeletonStatCol}>
                        <SkeletonBlock width={40} height={20} radius={6} />
                        <SkeletonBlock width={50} height={11} radius={4} style={{ marginTop: vs(6) }} />
                    </View>
                </View>
            </View>

            {/* Info card */}
            <View style={styles.skeletonCard}>
                <SkeletonBlock width={100} height={11} radius={4} style={{ marginBottom: vs(14) }} />
                {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.skeletonRow}>
                        <SkeletonBlock width={28} height={28} radius={14} />
                        <View style={{ flex: 1, gap: vs(6), marginLeft: ms(12) }}>
                            <SkeletonBlock width={'40%'} height={11} radius={4} />
                            <SkeletonBlock width={'75%'} height={15} radius={5} />
                        </View>
                    </View>
                ))}
            </View>

            {/* Action tiles */}
            <View style={styles.skeletonActionsRow}>
                <SkeletonBlock width={'48%'} height={68} radius={16} />
                <SkeletonBlock width={'48%'} height={68} radius={16} />
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
    rowInputMultiline: { minHeight: vs(60), fontWeight: '700', textAlignVertical: 'top' },
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

    // ── Referral success modal ──
    referralModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: ms(32),
    },
    referralModalCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: ms(24),
        paddingVertical: vs(28),
        paddingHorizontal: ms(24),
        alignItems: 'center',
    },
    referralModalIcon: {
        width: ms(78),
        height: ms(78),
        borderRadius: ms(39),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: vs(16),
    },
    referralModalTitle: { fontSize: ms(20), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(8) },
    referralModalMessage: {
        fontSize: ms(13.5),
        color: '#6B6470',
        textAlign: 'center',
        lineHeight: ms(20),
        marginBottom: vs(22),
    },
    referralModalBtn: {
        backgroundColor: '#FF1493',
        paddingVertical: vs(13),
        borderRadius: ms(16),
        alignItems: 'center',
        width: '100%',
    },
    referralModalBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(15), letterSpacing: 0.5 },

    // Logout
    premiumLogout: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFF5F5', padding: ms(20), borderRadius: ms(24),
        borderWidth: 2, borderColor: '#FEE2E2', marginBottom: vs(20)
    },
    logoutText: { color: '#C0392B', fontWeight: '900', fontSize: ms(16), marginLeft: ms(12), textTransform: 'uppercase', letterSpacing: 1 },

    // Delete account
    deleteAccountBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: ms(14), borderRadius: ms(14),
        marginBottom: vs(20),
    },
    deleteAccountText: {
        color: '#7F1D1D', fontWeight: '700', fontSize: ms(13),
        marginLeft: ms(8), textDecorationLine: 'underline',
    },
    deleteModalCard: {
        backgroundColor: '#fff', borderRadius: ms(20), padding: ms(22),
        width: '100%', maxWidth: ms(360), alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
    },
    deleteModalIconWrap: {
        width: ms(56), height: ms(56), borderRadius: ms(28),
        backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
        marginBottom: vs(12),
    },
    deleteModalTitle: { fontSize: ms(18), fontWeight: '900', color: '#111827', marginBottom: vs(8) },
    deleteModalBody: { fontSize: ms(13), color: '#4B5563', textAlign: 'center', lineHeight: ms(19), marginBottom: vs(14) },
    deleteModalHint: { fontSize: ms(12), color: '#6B7280', marginBottom: vs(8), alignSelf: 'flex-start' },
    deleteModalInput: {
        width: '100%', borderWidth: 1.5, borderRadius: ms(12),
        paddingHorizontal: ms(14), paddingVertical: ms(12),
        fontSize: ms(15), fontWeight: '700', letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#111827', marginBottom: vs(16),
    },
    deleteModalActions: { flexDirection: 'row', gap: ms(10), width: '100%' },
    deleteModalCancel: {
        flex: 1, paddingVertical: ms(13), borderRadius: ms(12),
        backgroundColor: '#F3F4F6', alignItems: 'center',
    },
    deleteModalCancelText: { color: '#374151', fontWeight: '800', fontSize: ms(14) },
    deleteModalConfirm: {
        flex: 1, paddingVertical: ms(13), borderRadius: ms(12),
        backgroundColor: '#DC2626', alignItems: 'center',
    },
    deleteModalConfirmText: { color: '#fff', fontWeight: '900', fontSize: ms(14) },

    // Change password row
    changePwBtn: {
        flexDirection: 'row', alignItems: 'center', gap: ms(12),
        backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE',
        padding: ms(16), borderRadius: ms(20), marginBottom: vs(12),
    },
    changePwIcon: {
        width: ms(40), height: ms(40), borderRadius: ms(20),
        backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
    },
    changePwTitle: { color: '#1E3A8A', fontWeight: '900', fontSize: ms(14.5), letterSpacing: 0.3 },
    changePwSub: { color: '#3B82F6', fontWeight: '600', fontSize: ms(11.5), marginTop: 2 },

    // Change password modal
    changePwCard: {
        backgroundColor: '#fff', borderRadius: ms(20), padding: ms(20),
        width: '100%', maxWidth: ms(380),
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
    },
    changePwCardHeader: { flexDirection: 'row', alignItems: 'center', gap: ms(10), marginBottom: vs(14) },
    changePwCardIcon: {
        width: ms(40), height: ms(40), borderRadius: ms(20),
        backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
    },
    changePwCardTitle: { fontSize: ms(17), fontWeight: '900', color: '#111827' },
    changePwFieldLabel: { fontSize: ms(12), fontWeight: '800', color: '#374151', marginBottom: vs(6), marginTop: vs(6) },
    changePwField: {
        flexDirection: 'row', alignItems: 'center', gap: ms(8),
        borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: ms(12),
        paddingHorizontal: ms(12), height: vs(46), backgroundColor: '#F9FAFB',
        marginBottom: vs(4),
    },
    changePwInput: { flex: 1, fontSize: ms(14), color: '#111827', paddingVertical: 0, fontWeight: '600' },
    changePwConfirm: {
        flex: 1, paddingVertical: ms(13), borderRadius: ms(12),
        backgroundColor: '#2563EB', alignItems: 'center',
    },

    // Skeleton
    skeletonContainer: { flex: 1, backgroundColor: '#FAFAF9', paddingHorizontal: ms(16) },
    skeletonTopBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: vs(10), marginBottom: vs(10),
    },
    skeletonHero: {
        borderRadius: ms(20), padding: ms(20), paddingBottom: vs(20),
        marginBottom: vs(14),
    },
    skeletonStatsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        marginTop: vs(20), paddingTop: vs(16),
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
    },
    skeletonStatCol: { alignItems: 'center', flex: 1 },
    skeletonStatDivider: { width: 1, height: vs(28), backgroundColor: 'rgba(0,0,0,0.08)' },
    skeletonCard: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEEDEC',
        borderRadius: ms(18), padding: ms(16), marginBottom: vs(14),
    },
    skeletonRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: vs(12),
        borderTopWidth: 1, borderTopColor: '#F4F1ED',
    },
    skeletonActionsRow: {
        flexDirection: 'row', justifyContent: 'space-between',
    },
});

