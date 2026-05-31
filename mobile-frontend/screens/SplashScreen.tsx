import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    Image,
    Animated,
    Easing,
    StyleSheet,
    StatusBar,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { s, vs, ms } from "../lib/scaling";

/**
 * Branded loading / splash screen shown briefly before the landing page
 * (and as the loading state during auth checks). Mirrors the website’s
 * brand: cream backdrop with soft pink orbs, the pink-ribbon mark from
 * the LandingPage, and a serif “HairLink” wordmark.
 *
 * Behaviour
 * ─────────
 * - Plays a one-shot intro (ribbon scales/fades in, wordmark fades up).
 * - Then loops a gentle ribbon float + a sweeping pink shimmer under the
 *   wordmark to read as a loading indicator (no spinner — by design,
 *   matches the soft brand language).
 * - Calls `onDone` after `minDurationMs` so it never flashes too quickly.
 *   Parent decides when to actually unmount it (e.g. once auth resolves).
 */
interface SplashScreenProps {
    /**
     * Fires once the intro animation has finished AND the optional
     * minimum duration has elapsed. Parent should hide the splash when
     * its own “ready” state is true *and* this has fired.
     */
    onDone?: () => void;
    /** Minimum time the splash stays on screen. Default 4000ms. */
    minDurationMs?: number;
    /** Tagline under the wordmark. */
    tagline?: string;
}

const BRAND = {
    pink: "#D63B8A",
    pinkDark: "#B52B72",
    pinkSoft: "#FFF0F8",
    pinkSofter: "#FFE0EE",
    pinkLight: "#FFB8E4",
    cream: "#FAFAF9",
    ink: "#1C1917",
    inkSoft: "#44403C",
    mute: "#78716C",
};

const { width: SCREEN_W } = Dimensions.get("window");

export default function SplashScreen({
    onDone,
    minDurationMs = 4000,
    tagline = "Strand Up for Cancer",
}: SplashScreenProps) {
    // ── Intro animations ──
    const ribbonScale = useRef(new Animated.Value(0.6)).current;
    const ribbonOpacity = useRef(new Animated.Value(0)).current;
    const wordmarkY = useRef(new Animated.Value(16)).current;
    const wordmarkOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;

    // ── Looping animations ──
    const ribbonFloat = useRef(new Animated.Value(0)).current;
    const ribbonRotate = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(0)).current;
    const orb = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // One-shot intro
        const intro = Animated.parallel([
            Animated.spring(ribbonScale, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(ribbonOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(280),
                Animated.parallel([
                    Animated.timing(wordmarkY, {
                        toValue: 0,
                        duration: 520,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(wordmarkOpacity, {
                        toValue: 1,
                        duration: 520,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
            Animated.sequence([
                Animated.delay(620),
                Animated.timing(taglineOpacity, {
                    toValue: 1,
                    duration: 520,
                    useNativeDriver: true,
                }),
            ]),
        ]);

        intro.start();

        // Loops
        const float = Animated.loop(
            Animated.sequence([
                Animated.timing(ribbonFloat, {
                    toValue: 1,
                    duration: 1900,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(ribbonFloat, {
                    toValue: 0,
                    duration: 1900,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        const rot = Animated.loop(
            Animated.sequence([
                Animated.timing(ribbonRotate, {
                    toValue: 1,
                    duration: 2600,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(ribbonRotate, {
                    toValue: 0,
                    duration: 2600,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        const shim = Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 1400,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
            })
        );
        const orbLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(orb, {
                    toValue: 1,
                    duration: 5200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(orb, {
                    toValue: 0,
                    duration: 5200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );

        float.start();
        rot.start();
        shim.start();
        orbLoop.start();

        // Fire onDone after the minimum duration so parent can chain
        const t = setTimeout(() => onDone?.(), minDurationMs);

        return () => {
            clearTimeout(t);
            float.stop();
            rot.stop();
            shim.stop();
            orbLoop.stop();
        };
    }, [
        ribbonScale,
        ribbonOpacity,
        wordmarkY,
        wordmarkOpacity,
        taglineOpacity,
        ribbonFloat,
        ribbonRotate,
        shimmer,
        orb,
        onDone,
        minDurationMs,
    ]);

    // Interpolations
    const floatY = ribbonFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
    const rotate = ribbonRotate.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] });
    const shimmerX = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-s(160), s(160)],
    });
    const orbDrift = orb.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={BRAND.cream} />

            {/* Soft pink wash */}
            <LinearGradient
                colors={["#FFFAFC", BRAND.cream, "#FFF4F8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Floating soft orbs (decor) */}
            <Animated.View
                style={[
                    styles.orb,
                    {
                        top: -vs(80),
                        right: -s(70),
                        width: s(240),
                        height: s(240),
                        opacity: 0.55,
                        transform: [{ translateX: orbDrift }],
                    },
                ]}
            >
                <LinearGradient
                    colors={[BRAND.pinkLight, "transparent"]}
                    style={styles.orbFill}
                />
            </Animated.View>
            <Animated.View
                style={[
                    styles.orb,
                    {
                        bottom: -vs(60),
                        left: -s(80),
                        width: s(220),
                        height: s(220),
                        opacity: 0.35,
                        transform: [{ translateY: orbDrift }],
                    },
                ]}
            >
                <LinearGradient
                    colors={[BRAND.pink, "transparent"]}
                    style={styles.orbFill}
                />
            </Animated.View>

            {/* Dot grid centerpiece (subtle texture) */}
            <View style={styles.dots} pointerEvents="none" />

            {/* Center stack: ribbon + wordmark + shimmer + tagline */}
            <View style={styles.center}>
                <Animated.View
                    style={{
                        transform: [
                            { translateY: floatY },
                            { rotate },
                            { scale: ribbonScale },
                        ],
                        opacity: ribbonOpacity,
                    }}
                >
                    <View style={styles.ribbonGlow}>
                        <Image
                            source={require("../assets/pink-ribbon.png")}
                            style={styles.ribbon}
                            resizeMode="contain"
                        />
                    </View>
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: wordmarkOpacity,
                        transform: [{ translateY: wordmarkY }],
                        marginTop: vs(22),
                    }}
                >
                    <Text style={styles.wordmark}>
                        Hair<Text style={styles.wordmarkAccent}>Link</Text>
                    </Text>
                </Animated.View>

                <Animated.Text
                    style={[
                        styles.tagline,
                        { opacity: taglineOpacity, marginTop: vs(8) },
                    ]}
                >
                    {tagline}
                </Animated.Text>

                {/* Loading shimmer bar */}
                <View style={styles.loadBarTrack}>
                    <Animated.View
                        style={[
                            styles.loadBarFill,
                            { transform: [{ translateX: shimmerX }] },
                        ]}
                    >
                        <LinearGradient
                            colors={["transparent", BRAND.pink, "transparent"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
            </View>

            {/* Bottom credit */}
            <View style={styles.bottom}>
                <Text style={styles.bottomText}>
                    Every strand counts. Every story matters.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BRAND.cream,
        overflow: "hidden",
    },
    orb: {
        position: "absolute",
        borderRadius: 9999,
    },
    orbFill: {
        flex: 1,
        borderRadius: 9999,
        opacity: 0.65,
    },
    dots: {
        position: "absolute",
        top: "30%",
        left: "10%",
        right: "10%",
        height: vs(220),
        opacity: 0.08,
        // dotted feel via a single border-radius dot — kept subtle so
        // we don’t need an SVG dependency. Real texture comes from the
        // gradient + orbs.
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: s(32),
    },
    ribbonGlow: {
        width: s(160),
        height: s(160),
        alignItems: "center",
        justifyContent: "center",
        shadowColor: BRAND.pink,
        shadowOpacity: 0.35,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 12 },
    },
    ribbon: {
        width: s(140),
        height: s(140),
    },
    wordmark: {
        fontSize: ms(38),
        fontWeight: "700",
        color: BRAND.ink,
        letterSpacing: -1,
        textAlign: "center",
    },
    wordmarkAccent: {
        color: BRAND.pink,
        fontStyle: "italic",
    },
    tagline: {
        fontSize: ms(12),
        fontWeight: "700",
        color: BRAND.pinkDark,
        letterSpacing: 2,
        textTransform: "uppercase",
        textAlign: "center",
    },
    loadBarTrack: {
        marginTop: vs(28),
        width: s(160),
        height: vs(3),
        borderRadius: 2,
        backgroundColor: BRAND.pinkSofter,
        overflow: "hidden",
    },
    loadBarFill: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: s(160),
    },
    bottom: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: vs(34),
        alignItems: "center",
    },
    bottomText: {
        fontSize: ms(12),
        color: BRAND.mute,
        letterSpacing: 0.2,
    },
});
