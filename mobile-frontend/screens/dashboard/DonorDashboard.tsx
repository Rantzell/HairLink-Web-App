import React, { useState, useEffect, useCallback, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { launchNativeAR } from '../../lib/launchAR';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Layout,
} from 'react-native-reanimated';
import api from '../../lib/api';

import MonetaryDonationDashboard from './MonetaryDonationDashboard';
import HairDonationScreen from './HairDonationScreen';
import DonorCalendarScreen from './DonorCalendarScreen';
import NotificationScreen from './NotificationScreen';
import DonationHistoryScreen from './DonationHistoryScreen';
import ProfileScreen from './ProfileScreen';
import ARScreen from '../ar/ARScreen';
import CommunityScreen from './CommunityScreen';
import HairCareScreen from './HairCareScreen';
import RewardsScreen from './RewardsScreen';

interface DonorDashboardProps {
  onLogout?: () => void;
  onRoleChange?: (role: 'Donor' | 'Recipient') => void;
  userName?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Reusable animated button for premium feedback
const ScaleButton = ({ children, onPress, onLongPress, style }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={650}
      onPressIn={() => (scale.value = withSpring(0.96, { damping: 10, stiffness: 200 }))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedTouchable>
  );
};

// Live countdown driven by a real ISO target date (the next admin event).
// Falls back to all-zeros if no target is provided.
const CountdownTimer = ({ targetDate }: { targetDate?: string | null }) => {
  const compute = useCallback(() => {
    if (!targetDate) return { days: 0, hours: 0, mins: 0, secs: 0 };
    const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    const secs = Math.floor((diff % 60_000) / 1000);
    return { days, hours, mins, secs };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(compute);

  useEffect(() => {
    setTimeLeft(compute());
    const timer = setInterval(() => setTimeLeft(compute()), 1000);
    return () => clearInterval(timer);
  }, [compute]);

  return (
    <View style={styles.countdownRow}>
      {['DAYS', 'HOURS', 'MINS', 'SECS'].map((unit, idx) => {
        const val = unit === 'DAYS' ? timeLeft.days :
          unit === 'HOURS' ? timeLeft.hours :
            unit === 'MINS' ? timeLeft.mins : timeLeft.secs;
        return (
          <React.Fragment key={unit}>
            <View style={styles.countdownBlock}>
              <Text style={styles.countdownNum}>{val}</Text>
              <Text style={styles.countdownLabel}>{unit}</Text>
            </View>
            {idx < 3 && <Text style={styles.countdownDivider}>:</Text>}
          </React.Fragment>
        )
      })}
    </View>
  );
};

export default function DonorDashboard({ onLogout, onRoleChange, userName = "Donor" }: DonorDashboardProps) {
  const [showMonetary, setShowMonetary] = useState(false);
  const [showHairDonation, setShowHairDonation] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [communityPostId, setCommunityPostId] = useState<string | null>(null);
  const [showHairCare, setShowHairCare] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [starPoints, setStarPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('---');
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingEvent, setUpcomingEvent] = useState<{ title: string; location: string; date: string } | null>(null);
  const notificationsViewedRef = useRef(false); // Track if user has seen notifications



  const fetchPoints = useCallback(async () => {
    try {
      const [meRes, statsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/donations/stats').catch(() => null),
      ]);
      if (meRes.data) {
        setReferralCode(meRes.data.referralCode || meRes.data.referral_code || '---');
      }
      if (statsRes?.data) {
        setStarPoints(statsRes.data.totalPoints || 0);
      } else if (meRes.data) {
        setStarPoints(meRes.data.starPoints || meRes.data.star_points || 0);
      }
    } catch (err) {
      console.log('Error fetching user data:', err);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      const unread = response.data.filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.log('Error fetching unread count:', err);
    }
  }, []);

  const fetchUpcomingEvent = useCallback(async () => {
    try {
      const response = await api.get('/events/next');
      const ev = response.data;
      if (ev && ev.date) {
        setUpcomingEvent({
          title: ev.title || 'Upcoming Event',
          location: ev.location || 'TBA',
          date: ev.date,
        });
      } else {
        setUpcomingEvent(null);
      }
    } catch (err) {
      console.log('Error fetching upcoming event:', err);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
    fetchUnreadCount();
    fetchUpcomingEvent();
  }, [fetchPoints, fetchUnreadCount, fetchUpcomingEvent]);

  useEffect(() => {
    // Only re-fetch unread count when returning from other screens, not notifications
    if (!showMonetary && !showHairDonation && !showCalendar && !showNotifications && !showHistory && !showProfile && !showCommunity && !showHairCare && !showRewards) {
      fetchPoints();
      if (!notificationsViewedRef.current) {
        fetchUnreadCount();
      }
    }
  }, [showMonetary, showHairDonation, showCalendar, showNotifications, showHistory, showProfile, showCommunity, showHairCare, showRewards, fetchPoints, fetchUnreadCount]);

  const navPlaceholder = (screen: string) =>
    Alert.alert('Coming Soon', `${screen} is coming soon!`);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied', `Referral code "${referralCode}" copied to clipboard!`);
  };

  const handleOpenURL = (url: string) => {
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Cannot open link'));
  };

  if (showMonetary) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <MonetaryDonationDashboard
          onBack={() => setShowMonetary(false)}
          onSuccess={() => {
            setShowMonetary(false);
            setShowNotifications(true);
          }}
        />
      </Animated.View>
    );
  }

  if (showHairDonation) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <HairDonationScreen
          onBack={() => setShowHairDonation(false)}
          onSuccess={() => {
            setShowHairDonation(false);
            setShowNotifications(true);
          }}
        />
      </Animated.View>
    );
  }

  if (showCalendar) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <DonorCalendarScreen onBack={() => setShowCalendar(false)} />
      </Animated.View>
    );
  }

  if (showNotifications) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <NotificationScreen
          onBack={() => setShowNotifications(false)}
          onTrack={() => {
            setShowNotifications(false);
            setShowHistory(true);
          }}
          onOpenPost={(postId: string) => {
            setShowNotifications(false);
            setCommunityPostId(postId);
            setShowCommunity(true);
          }}
          role="Donor"
        />
      </Animated.View>
    );
  }

  if (showHistory) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <DonationHistoryScreen onBack={() => setShowHistory(false)} />
      </Animated.View>
    );
  }

  if (showProfile) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onLogout={onLogout!}
          onRoleChange={onRoleChange}
        />
      </Animated.View>
    );
  }

  if (showAR) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <ARScreen onBack={() => setShowAR(false)} />
      </Animated.View>
    );
  }


  if (showCommunity) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <CommunityScreen
          onBack={() => { setShowCommunity(false); setCommunityPostId(null); }}
          openPostId={communityPostId}
        />
      </Animated.View>
    );
  }

  if (showHairCare) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <HairCareScreen role="Donor" onBack={() => setShowHairCare(false)} />
      </Animated.View>
    );
  }

  if (showRewards) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <RewardsScreen
          onBack={() => {
            setShowRewards(false);
            // Refresh star points display in case a voucher was just redeemed.
            fetchPoints();
          }}
        />
      </Animated.View>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      {/* ── Header ─────────────────────────────────── */}
      <View>
        <LinearGradient
          colors={['rgba(255, 102, 204, 0.88)', 'rgba(255, 153, 221, 0.88)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerGreeting}>Welcome back 👋</Text>
            <Text style={styles.headerRole} numberOfLines={1}>{userName}</Text>
          </View>
          
          <ScaleButton 
            onPress={() => {
              setShowNotifications(true);
              setUnreadCount(0); // Clear badge immediately
              notificationsViewedRef.current = true; // Prevent re-fetch after returning
            }} 
            style={styles.notificationBtn}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons name="notifications" size={26} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadgeHeader}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </ScaleButton>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(100)}>
          <LinearGradient
            colors={['#FFF0F8', '#FFD6EF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroTitle}>STRAND UP{'\n'}FOR CANCER</Text>
            <Text style={styles.heroSubtitle}>Hope begins, one strand at a time</Text>
            <ScaleButton
              style={styles.heroCTA}
              onPress={() => setShowHairDonation(true)}
            >
              <Text style={styles.heroCTAText}>Donate Now →</Text>
            </ScaleButton>
          </LinearGradient>
        </Animated.View>

        {/* ── Star Points Card ──────────────────────── */}
        <Animated.View entering={FadeInRight.springify().delay(200)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={20} color="#FF1493" />
            <Text style={styles.cardTitle}>  Star Points</Text>
            <TouchableOpacity onPress={() => setShowHistory(true)}>
              <View style={styles.historyBtnSmall}>
                <MaterialCommunityIcons name="history" size={16} color="#FF1493" />
                <Text style={styles.historyBtnTextSmall}>View History</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.pointsBadge}>{starPoints} ⭐</Text>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min((starPoints / 100) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{starPoints} / 100 pts — Free wig at 100!</Text>

          <View style={styles.starsRow}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Text key={i} style={styles.star}>⭐</Text>
            ))}
          </View>

          <TouchableOpacity
            style={styles.viewRewardsBtn}
            activeOpacity={0.85}
            onPress={() => setShowRewards(true)}
          >
            <MaterialCommunityIcons name="trophy" size={ms(14)} color="#fff" />
            <Text style={styles.viewRewardsBtnText}>View Rewards & Vouchers</Text>
            <Ionicons name="chevron-forward" size={ms(14)} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Referral ──────────────────────────────── */}
        <Animated.View entering={FadeInRight.springify().delay(300)} style={styles.referralRow}>
          <Text style={styles.referralLabel}>Referral Code:</Text>
          <ScaleButton
            style={styles.referralBox}
            onPress={copyToClipboard}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingRight: 16 }}>
              <Text style={styles.referralCode}>{referralCode}</Text>
              <Ionicons name="copy-outline" size={18} color="#FF1493" />
            </View>
          </ScaleButton>
        </Animated.View>

        {/* ── How It Works ──────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(400)} style={styles.card}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>
            Give the gift of confidence — donate hair or support financially.
          </Text>

          <View style={styles.actionsRow}>
            <View style={styles.actionBox}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="cut-outline" size={28} color="#FF1493" />
              </View>
              <Text style={styles.actionTitle}>Donate Hair</Text>
              <Text style={styles.actionDesc}>
                Give your hair to someone in need.
              </Text>
              <ScaleButton
                style={styles.actionBtn}
                onPress={() => setShowHairDonation(true)}
              >
                <Text style={styles.actionBtnText}>Donate</Text>
              </ScaleButton>
            </View>

            <View style={styles.actionBox}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="cash-outline" size={28} color="#FF1493" />
              </View>
              <Text style={styles.actionTitle}>Monetary</Text>
              <Text style={styles.actionDesc}>
                Support our mission and earn points.
              </Text>
              <ScaleButton
                style={styles.actionBtn}
                onPress={() => setShowMonetary(true)}
              >
                <Text style={styles.actionBtnText}>Give</Text>
              </ScaleButton>
            </View>
          </View>
        </Animated.View>

        {/* ── Hair Care Hub ────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(450)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color="#FF1493" />
            <Text style={styles.cardTitle}>  Hair Care Hub</Text>
          </View>
          <Text style={{ fontSize: ms(13), color: '#666', lineHeight: vs(18), marginBottom: vs(14), fontWeight: '500' }}>
            Keep your wig fresh and vibrant. Access expert guides on styling, washing, and long-term storage.
          </Text>
          <ScaleButton
            style={styles.actionBtn}
            onPress={() => setShowHairCare(true)}
          >
            <Text style={styles.actionBtnText}>Explore Tips & Care</Text>
          </ScaleButton>
        </Animated.View>

        {/* ── Banner ─────────────────────────────────── */}
        {/* ── About Us — image + card combined into one rounded panel ── */}
        <Animated.View
          entering={FadeInUp.springify().delay(500)}
          style={styles.aboutPanel}
        >
          <View style={styles.aboutImageWrap}>
            <Image
              source={require('../../assets/group.jpg')}
              style={styles.aboutImage}
              resizeMode="cover"
            />
            {/* Soft gradient scrim so the section pill reads cleanly */}
            <LinearGradient
              colors={['transparent', 'rgba(28,25,23,0.55)']}
              style={styles.aboutImageScrim}
            />
            <View style={styles.aboutPill}>
              <MaterialCommunityIcons name="ribbon" size={ms(12)} color="#D63B8A" />
              <Text style={styles.aboutPillText}>Strand Up for Cancer</Text>
            </View>
          </View>

          <View style={styles.aboutBody}>
            <View style={styles.aboutHeaderRow}>
              <Text style={styles.aboutEyebrow}>OUR STORY</Text>
              <View style={styles.aboutDivider} />
            </View>
            <Text style={styles.aboutTitle}>About Us</Text>
            <Text style={styles.aboutText}>
              <Text style={{ fontWeight: '800', color: '#1C1917' }}>Strand Up for Cancer (SUFC)</Text> is a youth-led initiative of the Manila Downtown YMCA dedicated to supporting patients experiencing long-term hair loss from illness and medical treatment.
            </Text>
            <Text style={[styles.aboutText, { marginTop: vs(8) }]}>
              Through hair donations, we craft wigs that restore dignity, comfort, and renewed self-confidence — each strand is a gift of hope and strength.
            </Text>
          </View>
        </Animated.View>

        {/* ── Our Partners — clean section header + card grid ── */}
        <View style={styles.partnersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>TRUSTED PARTNERS</Text>
            <Text style={styles.sectionH2}>Organizations behind our cause</Text>
          </View>

          <View style={styles.partnersGrid}>
            {[
              { id: 1, name: 'YMCA Youth',  tag: 'Community',   img: require('../../assets/ymca.jpg'),    url: 'https://web.facebook.com/ManilaDowntownYMCAYouthClub' },
              { id: 2, name: 'Richard D.',  tag: 'Wigmaker',    img: require('../../assets/RDM.png'),     url: 'https://web.facebook.com/Richarddmanilawigmaker' },
              { id: 3, name: 'PGH Hospital', tag: 'Medical',    img: require('../../assets/pgh_logo.png'), url: 'https://pgh.gov.ph/' },
            ].map((p) => (
              <ScaleButton
                key={p.id}
                style={styles.partnerCard}
                onPress={() => handleOpenURL(p.url)}
              >
                <View style={styles.partnerLogoBox}>
                  <Image source={p.img} style={styles.partnerImg} />
                </View>
                {/* Allow up to 2 lines so longer names don't truncate
                    with an ellipsis in narrow columns. */}
                <Text style={styles.partnerName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.partnerTag} numberOfLines={1}>{p.tag}</Text>
              </ScaleButton>
            ))}
          </View>
        </View>

        {/* ── Upcoming Events ────────────────────────── */}
        <Animated.View entering={FadeInUp.springify().delay(800)} style={styles.eventsSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowCalendar(true)}>
            <LinearGradient
              colors={['#FF66B2', '#FF1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.eventCard}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventLabel}>UPCOMING EVENT</Text>
                <Ionicons name="calendar" size={20} color="#fff" />
              </View>
              <Text style={styles.eventTitle}>{upcomingEvent?.title || 'No upcoming events'}</Text>
              <Text style={styles.eventSubtitle}>{upcomingEvent?.location || 'Check back soon for the next drive.'}</Text>

              <CountdownTimer targetDate={upcomingEvent?.date} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Nav ────────────────────────────── */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + ms(8), height: vs(78) + insets.bottom }]}>
        <ScaleButton style={styles.navItem} onPress={() => { }}>
          <Feather name="home" size={ms(26)} color="#e91e63" />
          <Text style={[styles.navLabel, { color: '#e91e63' }]}>Home</Text>
        </ScaleButton>

        <ScaleButton style={styles.navItem} onPress={() => setShowCalendar(true)}>
          <Ionicons name="calendar-outline" size={ms(26)} color="#888" />
          <Text style={styles.navLabel}>Schedule</Text>
        </ScaleButton>

        <ScaleButton
          style={[styles.arButton, { width: ms(64), height: ms(64), borderRadius: ms(32) }]}
          onPress={async () => {
            // Try the native HairLink AR app first (real face tracking + GLB / USDZ wig).
            // Falls back to the in-Expo camera preview if the native app isn't installed.
            const opened = await launchNativeAR();
            if (!opened) setShowAR(true);
          }}
        >
          <MaterialCommunityIcons name="augmented-reality" size={ms(30)} color="#fff" />
        </ScaleButton>

        <ScaleButton style={styles.navItem} onPress={() => setShowCommunity(true)}>
          <Ionicons name="people-outline" size={ms(26)} color={showCommunity ? '#e91e63' : '#888'} />
          <Text style={[styles.navLabel, showCommunity && { color: '#e91e63' }]}>Community</Text>
        </ScaleButton>

        <ScaleButton style={styles.navItem} onPress={() => setShowProfile(true)}>
          <Ionicons name="person-outline" size={ms(26)} color={showProfile ? '#e91e63' : '#888'} />
          <Text style={[styles.navLabel, showProfile && { color: '#e91e63' }]}>Profile</Text>
        </ScaleButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F0F5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingVertical: vs(14),
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomLeftRadius: ms(24),
    borderBottomRightRadius: ms(24),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: vs(8),
  },
  logoImage: { 
    width: ms(48), 
    height: ms(48), 
    resizeMode: 'contain',
    borderRadius: ms(24),
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  headerGreeting: { fontSize: ms(12), color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  headerRole: { fontSize: ms(17), color: '#fff', fontWeight: '900' },
  notificationBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: ms(20), padding: ms(6),
    width: ms(42), height: ms(42),
    alignItems: 'center', justifyContent: 'center',
  },
  notificationBadgeHeader: {
    position: 'absolute',
    top: -ms(4),
    right: -ms(6),
    backgroundColor: '#FF1493',
    borderRadius: ms(10),
    minWidth: ms(18),
    height: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
    borderWidth: ms(2),
    borderColor: '#FF66B2',
  },
  notificationBadgeText: { color: '#fff', fontSize: ms(10), fontWeight: '900' },

  scrollContent: { paddingBottom: vs(110) },

  heroCard: {
    margin: ms(14),
    borderRadius: ms(22),
    padding: ms(22),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTitle: {
    fontSize: ms(26),
    fontWeight: '900',
    color: '#1a1a1a',
    lineHeight: vs(32),
    marginBottom: vs(6),
  },
  heroSubtitle: { fontSize: ms(13), color: '#FF1493', fontWeight: '700', marginBottom: vs(18) },
  heroCTA: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF66B2',
    paddingHorizontal: ms(22),
    paddingVertical: vs(10),
    borderRadius: ms(22),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  heroCTAText: { color: '#fff', fontWeight: '800', fontSize: ms(14) },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: ms(14),
    marginBottom: vs(14),
    borderRadius: ms(20),
    padding: ms(18),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(14), justifyContent: 'space-between' },
  cardTitle: { fontSize: ms(16), fontWeight: '800', color: '#1a1a1a', flex: 1 },
  historyBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F8',
    paddingHorizontal: ms(8),
    paddingVertical: vs(4),
    borderRadius: ms(8),
    marginRight: ms(10),
  },
  historyBtnTextSmall: {
    fontSize: ms(11),
    fontWeight: '800',
    color: '#FF1493',
    marginLeft: ms(4),
  },
  pointsBadge: {
    fontSize: ms(14), fontWeight: '800', color: '#FF1493',
    backgroundColor: '#FFF0F8', paddingHorizontal: ms(10),
    paddingVertical: vs(4), borderRadius: ms(12),
  },

  progressBg: { backgroundColor: '#F0F0F0', height: vs(8), borderRadius: ms(8), marginBottom: vs(6) },
  progressFill: { backgroundColor: '#FF66CC', height: vs(8), borderRadius: ms(8) },
  progressLabel: { fontSize: ms(11), color: '#999', fontWeight: '600', marginBottom: vs(12) },
  viewRewardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(6),
    backgroundColor: '#FF1493',
    borderRadius: ms(14),
    paddingVertical: vs(10),
    paddingHorizontal: ms(14),
    marginTop: vs(14),
    shadowColor: '#FF1493',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  viewRewardsBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(13), letterSpacing: 0.3 },

  starsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  star: { fontSize: ms(16) },

  referralRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: ms(14), marginBottom: vs(14),
  },
  referralLabel: { fontSize: ms(15), fontWeight: '700', color: '#333', marginRight: ms(10) },
  referralBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#FF66CC', borderRadius: ms(14),
    paddingHorizontal: ms(16), paddingVertical: vs(12), backgroundColor: '#fff',
  },
  referralCode: { fontSize: ms(16), fontWeight: '800', color: '#FF1493', letterSpacing: ms(2) },

  sectionTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginBottom: vs(4) },
  sectionSubtitle: { fontSize: ms(12), color: '#888', textAlign: 'center', marginBottom: vs(18), lineHeight: vs(18) },

  actionsRow: { flexDirection: 'row' },
  actionBox: {
    flex: 1,
    borderWidth: 1.5, borderColor: '#FFD6EF',
    borderRadius: ms(18),
    padding: ms(14), alignItems: 'center',
    marginHorizontal: ms(4),
    backgroundColor: '#FFFAFC',
  },
  actionIconCircle: {
    width: ms(54), height: ms(54), borderRadius: ms(27),
    backgroundColor: '#FFF0F8',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: vs(10),
  },
  actionTitle: { fontSize: ms(15), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(6), textAlign: 'center' },
  actionDesc: { fontSize: ms(11), color: '#888', textAlign: 'center', lineHeight: vs(16), marginBottom: vs(14), flex: 1 },
  actionBtn: {
    backgroundColor: '#FF66B2', borderRadius: ms(16),
    paddingHorizontal: ms(20), paddingVertical: vs(8),
    alignSelf: 'stretch', alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  // ── New About panel: one card containing image header + body + stats ──
  aboutPanel: {
    marginHorizontal: ms(14),
    marginBottom: vs(24),
    borderRadius: ms(22),
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0EDE9',
    shadowColor: '#1C1917',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  aboutImageWrap: {
    position: 'relative',
    width: '100%',
    height: vs(180),
  },
  aboutImage: { width: '100%', height: '100%' },
  aboutImageScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  aboutPill: {
    position: 'absolute',
    bottom: vs(12),
    left: ms(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(10),
    paddingVertical: vs(5),
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  aboutPillText: {
    fontSize: ms(11),
    fontWeight: '800',
    color: '#D63B8A',
    letterSpacing: 0.4,
  },
  aboutBody: {
    paddingHorizontal: ms(20),
    paddingTop: vs(18),
    paddingBottom: vs(18),
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    marginBottom: vs(6),
  },
  aboutEyebrow: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#D63B8A',
    letterSpacing: 1.2,
  },
  aboutDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0EDE9',
  },
  aboutTitle: {
    fontSize: ms(22),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
    marginBottom: vs(10),
  },
  aboutText: {
    fontSize: ms(13.5),
    color: '#57534E',
    lineHeight: ms(20),
    fontWeight: '500',
  },
  aboutStatsRow: {
    marginTop: vs(16),
    paddingTop: vs(14),
    paddingHorizontal: ms(2),
    borderTopWidth: 1,
    borderTopColor: '#F4F1ED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutStat: { flex: 1, alignItems: 'center' },
  aboutStatNum: {
    fontSize: ms(18),
    fontWeight: '800',
    color: '#D63B8A',
    letterSpacing: -0.5,
  },
  aboutStatLbl: {
    marginTop: vs(2),
    fontSize: ms(9.5),
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 0.8,
  },
  aboutStatDivider: {
    width: 1,
    height: vs(28),
    backgroundColor: '#F0EDE9',
  },

  partnersSection: {
    marginBottom: vs(30),
    paddingHorizontal: ms(14),
  },
  // Section header used across the dashboard (eyebrow + H2)
  sectionHeader: {
    marginBottom: vs(14),
    paddingHorizontal: ms(2),
  },
  sectionEyebrow: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#D63B8A',
    letterSpacing: 1.4,
    marginBottom: vs(4),
  },
  sectionH2: {
    fontSize: ms(17),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  partnersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: ms(10),
  },
  partnerCard: {
    flex: 1,
    minWidth: ms(98),
    backgroundColor: '#fff',
    borderRadius: ms(16),
    paddingVertical: vs(14),
    paddingHorizontal: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C1917',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0EDE9',
  },
  partnerLogoBox: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(14),
    // Transparent — the surrounding card is already white, so a second
    // cream box creates an unwanted "framed" look. Let the logo sit on
    // the card directly with just a hairline edge for definition.
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(8),
    overflow: 'hidden',
    padding: ms(4),
  },
  partnerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  partnerName: {
    fontSize: ms(11),
    fontWeight: '800',
    color: '#1C1917',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: vs(14),
  },
  partnerTag: {
    fontSize: ms(9),
    fontWeight: '600',
    color: '#A8A29E',
    textAlign: 'center',
    marginTop: vs(3),
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  eventsSection: {
    marginHorizontal: ms(14),
    marginBottom: vs(30),
  },
  eventCard: {
    borderRadius: ms(22),
    padding: ms(20),
    shadowColor: '#FF1493',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  eventLabel: {
    fontSize: ms(11),
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
  },
  eventTitle: {
    fontSize: ms(22),
    fontWeight: '900',
    color: '#fff',
    marginBottom: vs(4),
  },
  eventSubtitle: {
    fontSize: ms(12),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: vs(20),
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: ms(16),
    paddingVertical: vs(12),
  },
  countdownBlock: {
    alignItems: 'center',
    width: ms(60),
  },
  countdownNum: {
    fontSize: ms(22),
    fontWeight: '900',
    color: '#fff',
  },
  countdownLabel: {
    fontSize: ms(9),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    marginTop: vs(2),
  },
  countdownDivider: {
    fontSize: ms(22),
    color: '#fff',
    fontWeight: '900',
    marginHorizontal: ms(4),
    marginTop: vs(-10),
  },

  scaleButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    borderTopWidth: 1.5, borderTopColor: '#FFD6EF',
    shadowColor: '#FF66B2',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ms(64),
  },
  navLabel: { fontSize: ms(10), color: '#888', fontWeight: '700', marginTop: vs(4) },
  arButton: {
    backgroundColor: '#FF66B2',
    alignItems: 'center', justifyContent: 'center',
    marginTop: vs(-34),
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});