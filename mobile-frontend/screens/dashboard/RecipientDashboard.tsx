import React, { useState, useEffect } from 'react';
import ProfileScreen from './ProfileScreen';
import ARScreen from '../ar/ARScreen';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
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
  Layout,
} from 'react-native-reanimated';
import api from '../../lib/api';
import MonetaryDonationDashboard from './MonetaryDonationDashboard';
import RecipientCalendarScreen from './RecipientCalendarScreen';
import NotificationScreen from './NotificationScreen';
import HairRequestScreen from './HairRequestScreen';
import HairRequestHistoryScreen from './HairRequestHistoryScreen';
import CommunityScreen from './CommunityScreen';

interface RecipientDashboardProps {
  onLogout?: () => void;
  onRoleChange?: (role: 'Donor' | 'Recipient') => void;
  userName?: string;
}

export default function RecipientDashboard({ onLogout, onRoleChange, userName = "Recipient" }: RecipientDashboardProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMonetary, setShowMonetary] = useState(false);
  const [showHairRequest, setShowHairRequest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [starPoints, setStarPoints] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestRequest, setLatestRequest] = useState<any>(null);
  const notificationsViewedRef = React.useRef(false);

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
          style={{ width: '100%' }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Extracted Countdown Component to prevent entire dashboard re-renders
  const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, mins: 30, secs: 45 });

    useEffect(() => {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
          if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 };
          if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
          if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
          return prev;
        });
      }, 1000);
      return () => clearInterval(timer);
    }, []);

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

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      const unread = response.data.filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.log('Error fetching unread count:', err);
    }
  }, []);

  const fetchLatestRequest = React.useCallback(async () => {
    try {
      const response = await api.get('/me');
      if (response.data && response.data.latest_hair_request) {
        setLatestRequest(response.data.latest_hair_request);
      }
    } catch (err) {
      console.log('Error fetching latest request:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchLatestRequest();
  }, [fetchUnreadCount, fetchLatestRequest]);

  useEffect(() => {
    if (!showCalendar && !showNotifications && !showMonetary && !showProfile && !showHairRequest && !showHistory && !showCommunity) {
      fetchUnreadCount();
      fetchLatestRequest();
      notificationsViewedRef.current = false;
    }
  }, [showCalendar, showNotifications, showMonetary, showProfile, showHairRequest, showHistory, showCommunity, fetchUnreadCount, fetchLatestRequest]);



  const handleOpenURL = (url: string) => {
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Cannot open link'));
  };

  const navPlaceholder = (screen: string) =>
    Alert.alert('Coming Soon', `${screen} is coming soon!`);

  if (showNotifications) {
    return (
      <View style={{ flex: 1 }}>
        <NotificationScreen 
          onBack={() => setShowNotifications(false)} 
          onTrack={() => {
            setShowNotifications(false);
            setShowHistory(true);
          }}
          role="Recipient" 
        />
      </View>
    );
  }

  if (showMonetary) {
    return (
      <View style={{ flex: 1 }}>
        <MonetaryDonationDashboard
          onBack={() => setShowMonetary(false)}
          role="Recipient"
          onSuccess={() => {
            setShowMonetary(false);
            setShowNotifications(true);
          }}
        />
      </View>
    );
  }

  if (showProfile) {
    return (
      <View style={{ flex: 1 }}>
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onLogout={onLogout!}
          onRoleChange={onRoleChange}
        />
      </View>
    );
  }

  if (showHairRequest) {
    return (
      <View style={{ flex: 1 }}>
        <HairRequestScreen
          onBack={() => setShowHairRequest(false)}
          onSuccess={() => {
            setShowHairRequest(false);
            setShowNotifications(true);
          }}
        />
      </View>
    );
  }

  if (showCalendar) {
    return (
      <View style={{ flex: 1 }}>
        <RecipientCalendarScreen onBack={() => setShowCalendar(false)} />
      </View>
    );
  }

  if (showHistory) {
    return (
      <View style={{ flex: 1 }}>
        <HairRequestHistoryScreen onBack={() => setShowHistory(false)} />
      </View>
    );
  }

  if (showCommunity) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <CommunityScreen onBack={() => setShowCommunity(false)} />
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

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      {/* ── Header ─────────────────────────────────── */}
      <View>
        <LinearGradient
          colors={['#8E44AD', '#9B59B6']}
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
            colors={['#F5EEF8', '#E8DAEF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroTitle}>STRAND UP{'\n'}FOR CANCER</Text>
            <Text style={styles.heroSubtitle}>Hope begins, one strand at a time</Text>
            <ScaleButton
              style={styles.heroCTA}
              onPress={() => setShowHairRequest(true)}
            >
              <Text style={styles.heroCTAText}>Request Now →</Text>
            </ScaleButton>
          </LinearGradient>
        </Animated.View>





        {/* ── Status Tracker ────────────────────────── */}
        <Animated.View entering={FadeInRight.springify().delay(200)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color="#9B59B6" />
            <Text style={[styles.cardTitle, { color: '#9B59B6' }]}>  My Request Status</Text>
            <TouchableOpacity onPress={() => setShowHistory(true)}>
              <View style={styles.historyBtnSmall}>
                <MaterialCommunityIcons name="history" size={16} color="#9B59B6" />
                <Text style={styles.historyBtnTextSmall}>View History</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Steps */}
          {!latestRequest ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: '#aaa', fontStyle: 'italic' }}>No active requests. Start your journey below! ✨</Text>
            </View>
          ) : (
            <View style={styles.statusContent}>
               <View style={styles.progressBg}>
                <View style={[styles.progressFill, { 
                  width: latestRequest.status === 'ready' ? '100%' : 
                         (['matched', 'ready'].includes(latestRequest.status) ? '75%' : 
                         (latestRequest.status !== 'pending' ? '50%' : '25%'))
                }]} />
              </View>
              <Text style={styles.progressLabel}>Status: {latestRequest.status.toUpperCase()}</Text>

              { [
                  { label: 'Application Pending', done: true },
                  { label: 'Application Approved', done: !['pending', 'submitted'].includes(latestRequest.status.toLowerCase()) },
                  { label: 'Wig in Production', done: ['matched', 'ready', 'completed'].includes(latestRequest.status.toLowerCase()) },
                  { label: 'Wig Ready for Pickup', done: ['ready', 'completed'].includes(latestRequest.status.toLowerCase()) },
                ].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                    {step.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
                      {step.label}
                    </Text>
                    {step.label === 'Wig Ready for Pickup' && step.done && (
                      <Animated.View entering={FadeIn.delay(300)} style={styles.locationInfo}>
                        <Ionicons name="location" size={12} color="#9B59B6" />
                        <Text style={styles.locationText}>Pick up: Manila Downtown YMCA (945 Sabino Padilla St., Sta. Cruz, Manila)</Text>
                      </Animated.View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* ── How It Works ──────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(300)} style={styles.card}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>
            Apply for a wig or support our mission — we make the process simple.
          </Text>

          <View style={styles.actionsRow}>
            {/* Request Hair */}
            <View style={styles.actionBox}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="ribbon-outline" size={28} color="#9B59B6" />
              </View>
              <Text style={styles.actionTitle}>Request Hair</Text>
              <Text style={styles.actionDesc}>
                Apply for a free wig with health certification.
              </Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowHairRequest(true)}
              >
                <Text style={styles.actionBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Monetary Donation */}
            <View style={styles.actionBox}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="cash-outline" size={28} color="#9B59B6" />
              </View>
              <Text style={styles.actionTitle}>Monetary</Text>
              <Text style={styles.actionDesc}>
                Support our mission with a contribution to help others.
              </Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowMonetary(true)}
              >
                <Text style={styles.actionBtnText}>Donate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Banner ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(400)} style={styles.bannerWrapper}>
          <Image
            source={require('../../assets/group.jpg')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* ── About Us ───────────────────────────────── */}
        <Animated.View entering={FadeInUp.springify().delay(500)} style={styles.aboutUsContainer}>
          <View style={styles.aboutUsHeader}>
            <Text style={styles.aboutUsTitle}>About Us</Text>
            <MaterialCommunityIcons
              name="ribbon"
              size={32}
              color="#9B59B6"
              style={styles.ribbonIcon}
            />
          </View>
          <Text style={styles.aboutUsText}>
            Strand Up for Cancer (SUFC) is a youth-led initiative of the Manila Downtown YMCA (945 Sabino Padilla St., Sta. Cruz, Manila) dedicated to supporting patients who experience long-term hair loss caused by illness and medical treatment. Through hair donations, we craft wigs that restore not only appearance but also a sense of dignity, comfort, and renewed self-confidence. Each strand given is more than just hair—it’s a gift of hope and strength.
          </Text>
        </Animated.View>

        {/* ── Our Partners ───────────────────────────── */}
        <View style={styles.partnersSection}>
          <Text style={styles.sectionTitle}>Our Partners</Text>
          <View style={styles.partnersGrid}>
            {[
              { id: 1, name: 'YMCA Youth Club', img: require('../../assets/ymca.jpg'), url: 'https://web.facebook.com/ManilaDowntownYMCAYouthClub' },
              { id: 2, name: 'Richard D. Manila', img: require('../../assets/RDM.png'), url: 'https://web.facebook.com/Richarddmanilawigmaker' },
              { id: 3, name: 'PGH Hospital', img: require('../../assets/pgh_logo.png'), url: 'https://pgh.gov.ph/' }
            ].map((p, idx) => (
              <ScaleButton
                key={p.id}
                style={styles.partnerCard}
                onPress={() => handleOpenURL(p.url)}
              >
                <View style={styles.partnerLogoPlaceholder}>
                  <Image source={p.img} style={styles.partnerImg} />
                </View>
                <Text style={styles.partnerName}>{p.name}</Text>
              </ScaleButton>
            ))}
          </View>
        </View>

        {/* ── Upcoming Events ────────────────────────── */}
        <Animated.View entering={FadeInUp.springify().delay(600)} style={styles.eventsSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowCalendar(true)}>
            <LinearGradient
              colors={['#C39BD3', '#9B59B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.eventCard}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventLabel}>UPCOMING EVENT</Text>
                <Ionicons name="calendar" size={20} color="#fff" />
              </View>
              <Text style={styles.eventTitle}>Annual Grand Hair Drive</Text>
              <Text style={styles.eventSubtitle}>Manila Downtown YMCA (945 Sabino Padilla St., Sta. Cruz, Manila)</Text>

              <CountdownTimer />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Nav ────────────────────────────── */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + ms(8), height: vs(78) + insets.bottom }]}>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="home" size={ms(26)} color="#9B59B6" />
          <Text style={[styles.navLabel, { color: '#9B59B6' }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setShowCalendar(true)}>
          <Ionicons name="calendar-outline" size={ms(26)} color="#888" />
          <Text style={styles.navLabel}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.arButton, { width: ms(64), height: ms(64), borderRadius: ms(32) }]} onPress={() => setShowAR(true)}>
          <MaterialCommunityIcons name="augmented-reality" size={ms(30)} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setShowCommunity(true)}>
          <Ionicons name="people-outline" size={ms(26)} color={showCommunity ? '#9B59B6' : '#888'} />
          <Text style={[styles.navLabel, showCommunity && { color: '#9B59B6' }]}>Community</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setShowProfile(true)}>
          <Ionicons name="person-outline" size={ms(26)} color={showProfile ? '#9B59B6' : '#888'} />
          <Text style={[styles.navLabel, showProfile && { color: '#9B59B6' }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4FC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingVertical: vs(14),
    borderBottomLeftRadius: ms(24),
    borderBottomRightRadius: ms(24),
    shadowColor: '#9B59B6',
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
    backgroundColor: '#9B59B6',
    borderRadius: ms(10),
    minWidth: ms(18),
    height: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
    borderWidth: ms(2),
    borderColor: '#9B59B6',
  },
  notificationBadgeText: { color: '#fff', fontSize: ms(10), fontWeight: '900' },

  scrollContent: { paddingBottom: vs(110) },

  heroCard: {
    margin: ms(14),
    borderRadius: ms(22),
    padding: ms(22),
    shadowColor: '#9B59B6',
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
  heroSubtitle: { fontSize: ms(13), color: '#9B59B6', fontWeight: '700', marginBottom: vs(18) },
  heroCTA: {
    alignSelf: 'flex-start',
    backgroundColor: '#9B59B6',
    paddingHorizontal: ms(22),
    paddingVertical: vs(10),
    borderRadius: ms(22),
    shadowColor: '#9B59B6',
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
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(14) },
  cardTitle: { fontSize: ms(16), fontWeight: '800', flex: 1 },
  pointsBadge: {
    fontSize: ms(14), fontWeight: '800', color: '#9B59B6',
    backgroundColor: '#F4ECF7', paddingHorizontal: ms(10),
    paddingVertical: vs(4), borderRadius: ms(12),
  },

  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(12) },
  stepDot: {
    width: ms(22), height: ms(22), borderRadius: ms(11),
    backgroundColor: '#E8DAEF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: ms(12),
  },
  stepDotDone: { backgroundColor: '#9B59B6' },
  stepLabel: { fontSize: ms(14), color: '#aaa', fontWeight: '600' },
  stepLabelDone: { color: '#1a1a1a', fontWeight: '700' },

  sectionTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginBottom: vs(4) },
  sectionSubtitle: { fontSize: ms(12), color: '#888', textAlign: 'center', marginBottom: vs(18), lineHeight: vs(18) },

  actionsRow: { flexDirection: 'row' },
  actionBox: {
    flex: 1,
    borderWidth: 1.5, borderColor: '#E8DAEF',
    borderRadius: ms(18),
    padding: ms(14), alignItems: 'center',
    marginHorizontal: ms(4),
    backgroundColor: '#FDFAFF',
  },
  actionIconCircle: {
    width: ms(54), height: ms(54), borderRadius: ms(27),
    backgroundColor: '#F4ECF7',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: vs(10),
  },
  actionTitle: { fontSize: ms(15), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(6), textAlign: 'center' },
  actionDesc: { fontSize: ms(11), color: '#888', textAlign: 'center', lineHeight: vs(16), marginBottom: vs(14), flex: 1 },
  actionBtn: {
    backgroundColor: '#9B59B6', borderRadius: ms(16),
    paddingHorizontal: ms(20), paddingVertical: vs(8),
    alignSelf: 'stretch', alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  aboutUsContainer: {
    paddingHorizontal: ms(20),
    marginBottom: vs(30),
    alignItems: 'center',
  },
  aboutUsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(12),
  },
  aboutUsTitle: {
    fontSize: ms(26),
    fontWeight: '900',
    color: '#1a1a1a',
    marginRight: ms(8),
  },
  ribbonIcon: {
    transform: [{ rotate: '15deg' }],
  },
  aboutUsText: {
    fontSize: ms(14),
    color: '#333',
    textAlign: 'center',
    lineHeight: vs(22),
    fontWeight: '500',
  },
  bannerWrapper: {
    marginHorizontal: ms(14), marginBottom: vs(24),
    borderRadius: ms(18), overflow: 'hidden',
    backgroundColor: '#F4ECF7',
    elevation: 3,
  },
  bannerImage: { width: '100%', height: vs(250) },
  historyBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4ECF7',
    paddingHorizontal: ms(8),
    paddingVertical: vs(4),
    borderRadius: ms(8),
  },
  historyBtnTextSmall: {
    fontSize: ms(11),
    fontWeight: '800',
    color: '#9B59B6',
    marginLeft: ms(4),
  },
  progressBg: { backgroundColor: '#F0F0F0', height: vs(8), borderRadius: ms(8), marginBottom: vs(6) },
  progressFill: { backgroundColor: '#9B59B6', height: vs(8), borderRadius: ms(8) },
  progressLabel: { fontSize: ms(11), color: '#999', fontWeight: '600', marginBottom: vs(12) },
  statusContent: { marginTop: vs(4) },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(4),
    backgroundColor: '#F5EEF8',
    paddingHorizontal: ms(8),
    paddingVertical: vs(4),
    borderRadius: ms(8),
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#9B59B6',
    marginLeft: ms(4),
  },

  partnersSection: { marginBottom: vs(24), paddingHorizontal: ms(14) },
  partnersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: ms(12),
    marginTop: vs(14),
  },
  partnerCard: {
    width: ms(105),
    backgroundColor: '#fff',
    borderRadius: ms(20),
    padding: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5EEF8',
  },
  partnerLogoPlaceholder: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(8),
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  partnerImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  partnerName: { fontSize: ms(11), color: '#444', fontWeight: '700', textAlign: 'center' },

  eventsSection: { marginHorizontal: ms(14), marginBottom: vs(30) },
  eventCard: {
    borderRadius: ms(22), padding: ms(20),
    shadowColor: '#9B59B6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(10) },
  eventLabel: { fontSize: ms(11), fontWeight: '900', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5 },
  eventTitle: { fontSize: ms(22), fontWeight: '900', color: '#fff', marginBottom: vs(4) },
  eventSubtitle: { fontSize: ms(12), color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: vs(20) },
  countdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: ms(16), paddingVertical: vs(12),
  },
  countdownBlock: { alignItems: 'center', width: ms(60) },
  countdownNum: { fontSize: ms(22), fontWeight: '900', color: '#fff' },
  countdownLabel: { fontSize: ms(9), fontWeight: '800', color: 'rgba(255,255,255,0.7)', marginTop: vs(2) },
  countdownDivider: { fontSize: ms(22), color: '#fff', fontWeight: '900', marginHorizontal: ms(4), marginTop: vs(-10) },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    borderTopWidth: 1, borderTopColor: '#E8DAEF',
  },
  navItem: { alignItems: 'center', justifyContent: 'center', width: ms(56) },
  navLabel: { fontSize: ms(10), color: '#888', fontWeight: '600', marginTop: vs(2) },
  arButton: {
    backgroundColor: '#9B59B6',
    alignItems: 'center', justifyContent: 'center',
    marginTop: vs(-28),
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },

});