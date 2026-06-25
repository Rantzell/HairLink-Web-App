import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    ScrollView,
    Image,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AuthStatusModal from "../../components/AuthStatusModal";
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeInRight,
    Layout,
    useSharedValue,
    useAnimatedStyle,
    withSpring
} from "react-native-reanimated";

// Reusable animated button for tactile feedback
const ScaleButton = ({ children, onPress, style }: any) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[animatedStyle, style]}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                onPressIn={() => (scale.value = withSpring(0.96, { damping: 10, stiffness: 200 }))}
                onPressOut={() => (scale.value = withSpring(1))}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];

interface SignupScreenProps {
    onSignupComplete: (role: "Donor" | "Recipient") => void;
    onNeedsVerification: (email: string, role: "Donor" | "Recipient") => void;
    onSwitchToLogin: () => void;
}

export default function SignupScreen({
    onSignupComplete,
    onNeedsVerification,
    onSwitchToLogin,
}: SignupScreenProps) {
    const insets = useSafeAreaInsets();
    // Field set mirrors the website's RegisterData / backend signupSchema:
    //   first_name, last_name, email, password, phone, age, gender,
    //   country (defaults to PH), region, postal_code.
    // The old mobile-only `city / barangay / address` fields were dropped
    // because the API never accepted them — they were silently discarded.
    const [role, setRole] = useState<"Donor" | "Recipient" | null>(null);
    const [ageText, setAgeText] = useState("");
    const [gender, setGender] = useState("Female");
    const [pickingGender, setPickingGender] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    // Track focus on the password input so we can show the requirement
    // checklist *only* while the user is typing — keeps the form quiet
    // for everyone else.
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [region, setRegion] = useState("");        // e.g. "NCR", "Region IV-A"
    const [postalCode, setPostalCode] = useState(""); // e.g. "1000"
    const [submitting, setSubmitting] = useState(false);

    // Per-rule booleans — mirror the backend's signupSchema regex rules
    // (≥8 chars · contains a number · contains a symbol). Same source of
    // truth as the website's `pwReqs` list in AuthPage.tsx.
    const pwHasMin = password.length >= 8;
    const pwHasNum = /[0-9]/.test(password);
    const pwHasSym = /[!@#$%^&*(),.?":{}|<>_]/.test(password);
    const pwAllOk = pwHasMin && pwHasNum && pwHasSym;
    const pwMatches = confirmPassword.length > 0 && confirmPassword === password;

    const [viewMode, setViewMode] = useState<"form" | "otp">("form");

    const [emailTouched, setEmailTouched] = useState(false);
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const emailError = emailTouched && !isEmailValid;

    const getPasswordStrength = (pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } => {
        if (pw.length === 0) return { level: 0, label: '', color: '#D1D1D1' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 1) return { level: 1, label: 'Weak', color: '#e53e3e' };
        if (score <= 2) return { level: 2, label: 'Fair', color: '#dd6b20' };
        return { level: 3, label: 'Strong', color: '#38a169' };
    };
    const pwStrength = getPasswordStrength(password);

    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const [statusVisible, setStatusVisible] = useState(false);
    const [statusType, setStatusType] = useState<'error' | 'success'>('error');
    const [statusTitle, setStatusTitle] = useState("");
    const [statusMessage, setStatusMessage] = useState("");

    const showError = (title: string, message: string) => {
        setStatusTitle(title);
        setStatusMessage(message);
        setStatusType('error');
        setStatusVisible(true);
    };

    const showSuccess = (title: string, message: string) => {
        setStatusTitle(title);
        setStatusMessage(message);
        setStatusType('success');
        setStatusVisible(true);
    };

    const handleVerifyOtp = async () => {
        if (otpLoading || otp.length !== 6) return;
        setOtpLoading(true);
        setOtpError('');
        const { error } = await supabase.auth.verifyOtp({
            email: pendingEmail,
            token: otp,
            type: 'signup',
        });
        setOtpLoading(false);
        if (error) {
            setOtpError(error.message);
            setOtp('');
        }
        // ✅ On success: App.tsx onAuthStateChange fires → routes dashboard
    };

    const handleResendOtp = async () => {
        setOtp('');
        setOtpError('');
        const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
        if (error) setOtpError(error.message);
    };

    const handleSignUp = async () => {
        setEmailTouched(true);
        if (
            !firstName.trim() ||
            !lastName.trim() ||
            !password.trim() ||
            !region.trim() ||
            !postalCode.trim() ||
            !phone.trim() ||
            !email.trim()
        ) {
            showError("Missing Info", "Please fill in all fields completely.");
            return;
        }
        if (!isEmailValid) { showError("Invalid Email", "Please enter a valid email address."); return; }
        if (pwStrength.level < 2) { showError("Weak Password", "Add uppercase letters, numbers or symbols."); return; }
        if (phone.length < 8 || phone.length > 11) { showError("Invalid Phone", "Phone number must be 8 to 11 digits."); return; }
        if (!role) { showError("Selection Required", "Please select a role (Donor or Recipient)."); return; }

        const numericAge = ageText ? parseInt(ageText, 10) : 18;
        if (ageText && (isNaN(numericAge) || numericAge < 14)) {
            showError("Invalid Age", "Age must be at least 14.");
            return;
        }
        if (ageText && numericAge > 120) {
            showError("Invalid Age", "Age cannot exceed 120.");
            return;
        }

        setSubmitting(true);

        const genderMap: Record<string, string> = {
            'Male': 'male',
            'Female': 'female',
            'Other': 'nonbinary',
            'Prefer not to say': 'prefer_not_say',
        };

        // Same payload shape the website's AuthContext.register sends to
        // Supabase: first/last name, role, contact, age, gender, and the
        // country/region/postal_code triplet used by the backend schema.
        const { data: signUpData, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    role: (role || 'Donor').toLowerCase(),
                    phone: phone,
                    country: 'ph',
                    region: region.trim(),
                    postal_code: postalCode.trim(),
                    age: numericAge,
                    gender: genderMap[gender] || null,
                },
            },
        });
        setSubmitting(false);

        if (error) {
            // Silently ignore rate limits during development if they specifically asked to remove the popup
            if (!error.message.includes("rate limit")) {
                showError("Signup Failed", error.message);
                return;
            }
            console.warn("Email Rate Limit Suppressed:", error.message);
        }

        if (signUpData?.user && !signUpData.session) {
            // Email confirmation required -> delegate to App.tsx / VerificationScreen
            onNeedsVerification(email, role || 'Donor');
        } else if (signUpData?.user && signUpData.session) {
            // Already logged in (Auto-confirm) - App.tsx handles navigation via session
        } else {
            // Possible already registered but unconfirmed? 
            // In development, sometimes this happens. Let's try to verify anyway.
            onNeedsVerification(email, role || 'Donor');
        }
        // If auto-confirmed (email confirm disabled), App.tsx listener handles routing
    };

    const [currentStep, setCurrentStep] = useState<1 | 2>(1);

    const handleNext = () => {
        if (currentStep === 1) {
            if (!firstName || !lastName || !email || !password || !confirmPassword || !role) {
                showError("Incomplete", "Please complete all fields in this step.");
                return;
            }
            if (!pwAllOk) {
                showError("Weak Password", "Password must be 8+ characters, contain a number and a symbol.");
                return;
            }
            if (!pwMatches) {
                showError("Passwords Don't Match", "Re-enter the same password in both fields.");
                return;
            }
            setCurrentStep(2);
        }
    };

    if (pickingGender) {
        return (
            <LinearGradient colors={['#FAFAF9', '#FFF0F8', '#FFEBF5']} style={styles.root}>
                <View style={styles.innerContainer}>
                    <Text style={[styles.title, { marginBottom: 24, color: '#1a1a1a' }]}>Select Gender</Text>
                    <BlurView intensity={60} tint="light" style={{ borderRadius: 24, overflow: "hidden", padding: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.5)" }}>
                        {GENDERS.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={styles.genderItem}
                                onPress={() => { setGender(item); setPickingGender(false); }}
                            >
                                <Text style={styles.genderItemText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </BlurView>
                    <TouchableOpacity onPress={() => setPickingGender(false)} style={{ marginTop: 24, padding: 12 }}>
                        <Text style={{ color: '#1a1a1a', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#FAFAF9', '#FFF0F8', '#FFEBF5']} style={styles.root}>
            {/* Background ambient light effects */}
            <View style={[StyleSheet.absoluteFill, { opacity: 1 }]} pointerEvents='none'>
                <View style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#D63B8A', opacity: 0.15, transform: [{ scale: 2 }] }} />
                <View style={{ position: 'absolute', bottom: -50, right: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: '#FF2A85', opacity: 0.1, transform: [{ scale: 2 }] }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + vs(20) }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                        <Text style={styles.title}>Welcome!</Text>
                        <Text style={styles.subtitle}>Step {currentStep} of 2</Text>
                        <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16 }}>
                            <View style={{ height: 4, width: 40, borderRadius: 2, backgroundColor: "#D63B8A" }} />
                            <View style={{ height: 4, width: 40, borderRadius: 2, backgroundColor: currentStep === 2 ? "#D63B8A" : "rgba(255,255,255,0.2)" }} />
                        </View>
                    </View>

                    {currentStep === 1 ? (
                        <Animated.View layout={Layout.springify()} entering={FadeInRight.delay(200)}>
                            <BlurView intensity={60} tint="light" style={styles.glassCard}>
                                <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>

                                {/* First + Last name — matches the web's register form
                                so the API gets clean first_name / last_name values
                                instead of guessing from a single "Full Name" split. */}
                                <View style={[styles.row, { gap: 12 }]}>
                                    <View style={[styles.inputBox, { flex: 1 }]}>
                                        <Ionicons name="person-outline" size={18} color="#D63B8A" style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={styles.input}
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            autoCapitalize="words"
                                            placeholder="First"
                                            placeholderTextColor="#A8A29E"
                                        />
                                    </View>
                                    <View style={[styles.inputBox, { flex: 1 }]}>
                                        <TextInput
                                            style={styles.input}
                                            value={lastName}
                                            onChangeText={setLastName}
                                            autoCapitalize="words"
                                            placeholder="Last Name"
                                            placeholderTextColor="#A8A29E"
                                        />
                                    </View>
                                </View>

                                {/* Email */}
                                <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                    <View style={[styles.inputBox, {
                                        borderColor: emailError ? '#e53e3e' : emailTouched && isEmailValid ? '#38a169' : '#FFD9EC',
                                    }]}>
                                        <Ionicons name="mail-outline" size={20} color="#D63B8A" style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            keyboardType="email-address"
                                            value={email}
                                            onChangeText={(t) => { setEmail(t); setEmailTouched(true); }}
                                            onBlur={() => setEmailTouched(true)}
                                            autoCapitalize="none"
                                            placeholder="Email Address"
                                        />
                                    </View>
                                    {emailError && <Text style={styles.errorText}>Enter a valid email</Text>}
                                </View>

                                {/* Password */}
                                <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                    <View style={[styles.inputBox, {
                                        borderColor: password.length === 0
                                            ? '#FFD9EC'
                                            : pwAllOk ? '#38a169' : '#dd6b20',
                                    }]}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#D63B8A" style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={styles.input}
                                            secureTextEntry
                                            value={password}
                                            onChangeText={setPassword}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                            placeholder="Password"
                                            placeholderTextColor="#A8A29E"
                                        />
                                    </View>

                                    {/* Strength bar — kept; tiny, only when something's typed. */}
                                    {password.length > 0 && (
                                        <View style={{ marginTop: 8 }}>
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                {[1, 2, 3].map((seg) => (
                                                    <View
                                                        key={seg}
                                                        style={{
                                                            flex: 1,
                                                            height: 4,
                                                            borderRadius: 4,
                                                            backgroundColor: pwStrength.level >= seg ? pwStrength.color : '#EEE',
                                                        }}
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Requirement checklist — appears only while the
                                    password field is focused OR after the user has
                                    typed something but not yet satisfied every rule.
                                    Disappears once all three rules are green AND the
                                    user has tabbed away, so it doesn't clutter. */}
                                    {(passwordFocused || (password.length > 0 && !pwAllOk)) && (
                                        <View style={styles.pwReqsBox}>
                                            {[
                                                { ok: pwHasMin, label: 'At least 8 characters' },
                                                { ok: pwHasNum, label: 'Contains a number' },
                                                { ok: pwHasSym, label: 'Contains a symbol' },
                                            ].map((req) => (
                                                <View key={req.label} style={styles.pwReqRow}>
                                                    <Ionicons
                                                        name={req.ok ? 'checkmark-circle' : 'ellipse-outline'}
                                                        size={14}
                                                        color={req.ok ? '#16A34A' : '#A8A29E'}
                                                    />
                                                    <Text style={[styles.pwReqText, req.ok && { color: '#15803D', fontWeight: '700' }]}>
                                                        {req.label}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Confirm Password */}
                                <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                    <View style={[styles.inputBox, {
                                        borderColor: confirmPassword.length === 0
                                            ? '#FFD9EC'
                                            : pwMatches ? '#38a169' : '#e53e3e',
                                    }]}>
                                        <Ionicons name="shield-checkmark-outline" size={20} color="#D63B8A" style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={styles.input}
                                            secureTextEntry
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            placeholder="Confirm Password"
                                            placeholderTextColor="#A8A29E"
                                        />
                                    </View>
                                    {confirmPassword.length > 0 && !pwMatches && (
                                        <Text style={styles.errorText}>Passwords don't match</Text>
                                    )}
                                </View>

                                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>I WANT TO BE A...</Text>
                                <View style={styles.roleGrid}>
                                    {(["Donor", "Recipient"] as const).map((r) => (
                                        <TouchableOpacity
                                            key={r}
                                            style={[styles.roleCard, role === r && styles.roleCardActive]}
                                            onPress={() => setRole(r)}
                                            activeOpacity={0.9}
                                        >
                                            <View style={[styles.roleIconBg, role === r && styles.roleIconBgActive]}>
                                                <MaterialCommunityIcons
                                                    name={r === 'Donor' ? 'heart-plus' : 'account-heart'}
                                                    size={32}
                                                    color={role === r ? '#fff' : '#E863A1'}
                                                />
                                            </View>
                                            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <ScaleButton style={[styles.signUpBtn, { marginTop: 32 }]} onPress={handleNext}>
                                    <Text style={styles.signUpBtnText}>Continue</Text>
                                </ScaleButton>
                            </BlurView>
                        </Animated.View>
                    ) : (
                        <Animated.View layout={Layout.springify()} entering={FadeInRight.delay(200)}>
                            <BlurView intensity={60} tint="light" style={styles.glassCard}>
                                <Text style={styles.sectionLabel}>CONTACT & LOCATION</Text>

                                {/* Phone */}
                                <View style={styles.fieldWrap}>
                                    <View style={styles.inputBox}>
                                        <Ionicons name="call-outline" size={20} color="#D63B8A" style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                                            maxLength={11}
                                            placeholder="Phone Number"
                                        />
                                    </View>
                                </View>

                                {/* Region (mirrors web's `region` field; e.g. NCR) */}
                                <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                    <View style={styles.inputBox}>
                                        <Ionicons name="location-outline" size={20} color="#D63B8A" style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={styles.input}
                                            value={region}
                                            onChangeText={setRegion}
                                            placeholder="Region (e.g. NCR)"
                                            placeholderTextColor="#A8A29E"
                                        />
                                    </View>
                                </View>

                                {/* Postal Code (mirrors web's `postal_code` field) */}
                                <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                                    <View style={styles.inputBox}>
                                        <Ionicons name="mail-unread-outline" size={20} color="#D63B8A" style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={styles.input}
                                            value={postalCode}
                                            onChangeText={(t) => setPostalCode(t.replace(/[^0-9]/g, ''))}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            placeholder="Postal Code"
                                            placeholderTextColor="#A8A29E"
                                        />
                                    </View>
                                </View>

                                <View style={[styles.row, { marginTop: 16, gap: 12 }]}>
                                    <View style={[styles.inputBox, { flex: 1 }]}>
                                        <TextInput
                                            style={styles.input}
                                            value={ageText}
                                            onChangeText={setAgeText}
                                            keyboardType="number-pad"
                                            placeholder="Age"
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.inputBox, { flex: 1.5, justifyContent: 'space-between' }]}
                                        onPress={() => setPickingGender(true)}
                                    >
                                        <Text style={{ color: gender ? '#000' : '#888', fontSize: 15 }}>{gender || 'Gender'}</Text>
                                        <Ionicons name="chevron-down" size={16} color="#D63B8A" />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
                                    <ScaleButton
                                        style={[styles.signUpBtn, { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.05)' }]}
                                        onPress={() => setCurrentStep(1)}
                                    >
                                        <Text style={[styles.signUpBtnText, { color: '#1a1a1a' }]}>Back</Text>
                                    </ScaleButton>
                                    <ScaleButton
                                        style={[styles.signUpBtn, { flex: 2 }]}
                                        onPress={handleSignUp}
                                    >
                                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpBtnText}>Complete Sign Up</Text>}
                                    </ScaleButton>
                                </View>
                            </BlurView>
                        </Animated.View>
                    )}

                    <TouchableOpacity onPress={onSwitchToLogin} activeOpacity={0.8} style={styles.switchLink}>
                        <Text style={styles.switchLinkText}>Already have an account? <Text style={{ color: '#D63B8A' }}>Log In</Text></Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <AuthStatusModal
                visible={statusVisible}
                type={statusType}
                title={statusTitle}
                message={statusMessage}
                onClose={() => setStatusVisible(false)}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: ms(24),
        paddingBottom: vs(48)
    },
    innerContainer: { flex: 1, paddingHorizontal: ms(24), justifyContent: 'center' },

    // Header
    header: { alignItems: 'center', marginBottom: 32 },
    logo: { width: 80, height: 80, marginBottom: 12 },
    title: { fontSize: 32, fontWeight: '900', color: '#1a1a1a', textAlign: 'center', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: '#D63B8A', fontWeight: '800', textAlign: 'center', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

    // Premium Card
    glassCard: {
        backgroundColor: 'transparent',
        borderRadius: 30,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        overflow: 'hidden'
    },
    sectionLabel: { fontSize: 11, fontWeight: '900', color: '#A8A29E', letterSpacing: 1.5, marginBottom: 16 },

    // Form fields
    fieldWrap: { position: 'relative' },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(232, 99, 161, 0.2)',
        borderRadius: 15,
        height: 56,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.6)'
    },
    input: { color: '#1a1a1a', fontSize: 15, height: 56, flex: 1, fontWeight: '400' },
    errorText: { color: '#e53e3e', fontSize: 11, fontWeight: '700', marginTop: 4, marginLeft: 4 },

    pwReqsBox: {
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FFF5FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFE0EE',
        gap: 6,
    },
    pwReqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pwReqText: { fontSize: 12, color: '#78716C', fontWeight: '500' },

    // Role Selection
    roleGrid: { flexDirection: 'row', gap: 16 },
    roleCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
        paddingVertical: 20,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(232, 99, 161, 0.2)'
    },
    roleCardActive: {
        backgroundColor: '#fff',
        borderColor: '#D63B8A',
        shadowColor: '#D63B8A',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3
    },
    roleIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0, 0, 0, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    roleIconBgActive: { backgroundColor: '#D63B8A' },
    roleText: { fontSize: 14, fontWeight: '800', color: '#A8A29E' },
    roleTextActive: { color: '#1a1a1a' },

    // Layout
    row: { flexDirection: 'row', alignItems: 'center' },

    // Sign Up button
    signUpBtn: { backgroundColor: '#D63B8A', height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    signUpBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    switchLink: { alignSelf: 'center', marginTop: 24, padding: 8 },
    switchLinkText: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },

    // OTP
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },

    // Gender picker items
    genderItem: { padding: 16, width: '100%', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center' },
    genderItemText: { color: '#1a1a1a', fontSize: 18, fontWeight: '700' },
});

