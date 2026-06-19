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
  Layout,
} from 'react-native-reanimated';
import api from '../../lib/api';
import MonetaryDonationDashboard from './MonetaryDonationDashboard';
import RecipientCalendarScreen from './RecipientCalendarScreen';
import NotificationScreen from './NotificationScreen';
import HairRequestScreen from './HairRequestScreen';
import HairRequestHistoryScreen from './HairRequestHistoryScreen';
import CommunityScreen from './CommunityScreen';
import HairCareScreen from './HairCareScreen';
import { CustomAlert } from '../../components/GlobalAlert';

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
  const [communityPostId, setCommunityPostId] = useState<string | null>(null);
  const [showHairCare, setShowHairCare] = useState(false);
  const [starPoints, setStarPoints] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestRequest, setLatestRequest] = useState<any>(null);
  // Real upcoming event (same source as the donor dashboard: GET /events/next)
  const [upcomingEvent, setUpcomingEvent] = useState<{ title: string; location: string; date: string } | null>(null);
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
          style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Real countdown — counts down to the actual upcoming event's date.
  // Matches the donor dashboard's `CountdownTimer`, so the recipient
  // card no longer ticks against a fake "2d 14h 30m" hardcoded start.
  const CountdownTimer = ({ targetDate }: { targetDate?: string | null }) => {
    const compute = React.useCallback(() => {
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
      // The backend returns hair requests newest-first; pick the latest
      // non-terminal one so the stepper reflects the user's current journey
      // (a completed/rejected request shouldn't keep the card "active").
      const response = await api.get('/requests');
      const rows: any[] = Array.isArray(response.data) ? response.data : [];
      const active = rows.find((r: any) => {
        const s = (r.status || '').toLowerCase();
        return !['completed', 'rejected', 'cancelled'].includes(s);
      });
      setLatestRequest(active || null);
    } catch (err) {
      console.log('Error fetching latest request:', err);
    }
  }, []);
  const confirmWigReceived = (reference: string) => {
    CustomAlert.alert(
      'Confirm Wig Received',
      'Please confirm that you have received your wig. This action cannot be undone and will complete your request.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I Received It',
          onPress: async () => {
            try {
              await api.post(`/requests/${reference}/confirm-received`);
              CustomAlert.alert('Success', 'Thank you! Your wig request is now complete.');
              fetchLatestRequest();
            } catch (err: any) {
              const msg = err.response?.data?.message || 'Failed to confirm receipt.';
              CustomAlert.alert('Error', msg);
            }
          }
        }
      ]
    );
  };

  // Same upcoming-event source as the donor dashboard so both surfaces
  // surface the same next admin-scheduled drive (instead of the recipient
  // showing a hardcoded "Annual Grand Hair Drive").
  const fetchUpcomingEvent = React.useCallback(async () => {
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
    fetchUnreadCount();
    fetchLatestRequest();
    fetchUpcomingEvent();
  }, [fetchUnreadCount, fetchLatestRequest, fetchUpcomingEvent]);

  useEffect(() => {
    if (!showCalendar && !showNotifications && !showMonetary && !showProfile && !showHairRequest && !showHistory && !showCommunity && !showHairCare) {
      fetchUnreadCount();
      fetchLatestRequest();
      notificationsViewedRef.current = false;
    }
  }, [showCalendar, showNotifications, showMonetary, showProfile, showHairRequest, showHistory, showCommunity, showHairCare, fetchUnreadCount, fetchLatestRequest]);



  const handleOpenURL = (url: string) => {
    Linking.openURL(url).catch(err => CustomAlert.alert('Error', 'Cannot open link'));
  };

  const navPlaceholder = (screen: string) =>
    CustomAlert.alert('Coming Soon', `${screen} is coming soon!`);

  if (showNotifications) {
    return (
      <View style={{ flex: 1 }}>
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
        <CommunityScreen
          onBack={() => { setShowCommunity(false); setCommunityPostId(null); }}
          openPostId={communityPostId}
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

  if (showHairCare) {
    return (
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.springify().damping(15).stiffness(120)}
        exiting={FadeOut.duration(200)}
      >
        <HairCareScreen role="Recipient" onBack={() => setShowHairCare(false)} />
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
          colors={['#9B6BBF', '#B084CC']}
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
            <Ionicons name="time" size={20} color="#B084CC" />
            <Text style={[styles.cardTitle, { color: '#B084CC' }]}>  My Request Status</Text>
            <TouchableOpacity onPress={() => setShowHistory(true)}>
              <View style={styles.historyBtnSmall}>
                <MaterialCommunityIcons name="history" size={16} color="#B084CC" />
                <Text style={styles.historyBtnTextSmall}>View History</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Horizontal 3-step progress tracker (shared empty / active states) */}
          {(() => {
            const status = latestRequest?.status?.toLowerCase() || '';
            // currentStep: -1 = no request, 0 = pending, 1 = approved/production, 2 = ready, 3 = completed
            let currentStep = -1;
            if (latestRequest) {
              currentStep = 0;
              if (!['pending', 'submitted'].includes(status)) currentStep = 1;
              if (['matched', 'in transit', 'arrived', 'ready'].includes(status)) currentStep = 2;
              if (status === 'completed') currentStep = 3;
            }

            const steps = [
              { title: 'Request Pending', desc: 'Your request has been submitted and is currently undergoing review.' },
              { title: 'Request Approved', desc: 'Application approved! Your custom wig is now being crafted. We will notify you as soon as it is ready.' },
              { title: 'Ready for Delivery or Pickup', desc: 'Your custom wig is ready! Check your dashboard to confirm your preferred delivery or pickup option.' },
            ];

            const activeIdx = Math.min(Math.max(currentStep, 0), 2);

            return (
              <View style={styles.statusContent}>
                {!latestRequest && (
                  <View style={{ alignItems: 'center', paddingVertical: vs(10), marginBottom: vs(4) }}>
                    <Text style={{ color: '#aaa', fontStyle: 'italic', fontSize: ms(13) }}>
                      No active requests. Start your journey below! ✨
                    </Text>
                  </View>
                )}

                {/* Stepper bar — a step is CHECKED (purple + checkmark) the
                    moment the user reaches it. No "active" empty state — once
                    pending/approved/matched lands, the corresponding node
                    flips straight to done. */}
                <View style={styles.stepperWrap}>
                  {steps.map((step, i) => {
                    const isDone = currentStep >= i && currentStep >= 0;
                    return (
                      <React.Fragment key={i}>
                        <View style={styles.stepperItem}>
                          <View style={[
                            styles.stepperNode,
                            isDone && styles.stepperNodeDone,
                          ]}>
                            {isDone ? (
                              <Ionicons name="checkmark" size={ms(14)} color="#fff" />
                            ) : (
                              <Text style={styles.stepperNodeNum}>{i + 1}</Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.stepperLabel,
                              isDone && styles.stepperLabelActive,
                            ]}
                            numberOfLines={3}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {step.title}
                          </Text>
                        </View>
                        {i < steps.length - 1 && (
                          <View style={[
                            styles.stepperConnector,
                            // Connector after step i lights up once step i+1
                            // is also done — i.e. the *next* node is reached.
                            currentStep >= i + 1 && styles.stepperConnectorDone,
                          ]} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>

                {/* Current-step description card — only when there's a real request */}
                {latestRequest && (
                  <View style={styles.stepperDescBox}>
                    <Text style={styles.stepperDescText}>
                      {currentStep === 3
                        ? 'All set — your request is complete. Thank you for trusting HairLink. 💜'
                        : steps[activeIdx].desc}
                    </Text>
                  </View>
                )}

                {latestRequest && ['in transit', 'ready'].includes(status) && (
                  <TouchableOpacity
                    style={styles.dashboardConfirmBtn}
                    onPress={() => confirmWigReceived(latestRequest.reference)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={ms(16)} color="#fff" style={{ marginRight: ms(6) }} />
                    <Text style={styles.dashboardConfirmBtnText}>Confirm Wig Received</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
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
                <Ionicons name="ribbon-outline" size={28} color="#B084CC" />
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
                <Ionicons name="cash-outline" size={28} color="#B084CC" />
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

        {/* ── Hair Care Hub ────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().delay(350)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color="#B084CC" />
            <Text style={[styles.cardTitle, { color: '#B084CC' }]}>  Hair Care Hub</Text>
          </View>
          <Text style={{ fontSize: ms(13), color: '#666', lineHeight: vs(18), marginBottom: vs(14), fontWeight: '500' }}>
            Keep your wig fresh and vibrant. Access expert guides on styling, washing, and long-term storage.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowHairCare(true)}
          >
            <Text style={styles.actionBtnText}>Explore Tips & Care</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── About Us — image + body + stats in a single rounded panel ── */}
        <Animated.View entering={FadeInUp.springify().delay(400)} style={styles.aboutPanel}>
          <View style={styles.aboutImageWrap}>
            <Image
              source={require('../../assets/group.jpg')}
              style={styles.aboutImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(28,25,23,0.55)']}
              style={styles.aboutImageScrim}
            />
            <View style={styles.aboutPill}>
              <MaterialCommunityIcons name="ribbon" size={ms(12)} color="#B084CC" />
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

        {/* ── Our Partners ── */}
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
        <Animated.View entering={FadeInUp.springify().delay(600)} style={styles.eventsSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowCalendar(true)}>
            <LinearGradient
              colors={['#C39BD3', '#B084CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.eventCard}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventLabel}>UPCOMING EVENT</Text>
                <Ionicons name="calendar" size={20} color="#fff" />
              </View>
              <Text style={styles.eventTitle}>
                {upcomingEvent?.title || 'No upcoming events'}
              </Text>
              <Text style={styles.eventSubtitle}>
                {upcomingEvent?.location || 'Check back soon for the next drive.'}
              </Text>

              <CountdownTimer targetDate={upcomingEvent?.date} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Nav (light purple = recipient theme) ────────── */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + ms(8), height: vs(78) + insets.bottom }]}>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="home" size={ms(24)} color="#B084CC" />
          <Text style={[styles.navLabel, { color: '#B084CC' }]} numberOfLines={1}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setShowCalendar(true)}>
          <Ionicons name="calendar-outline" size={ms(24)} color="#888" />
          <Text style={styles.navLabel} numberOfLines={1}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.arButton, { width: ms(60), height: ms(60), borderRadius: ms(30) }]} onPress={async () => {
          // Try the native HairLink AR app first; fall back to the in-Expo
          // camera preview if it isn't installed on this device.
          const opened = await launchNativeAR();
          if (!opened) setShowAR(true);
        }}>
          <MaterialCommunityIcons name="augmented-reality" size={ms(28)} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setShowCommunity(true)}>
          <Ionicons name="people-outline" size={ms(24)} color={showCommunity ? '#B084CC' : '#888'} />
          <Text style={[styles.navLabel, showCommunity && { color: '#B084CC' }]} numberOfLines={1}>Community</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setShowProfile(true)}>
          <Ionicons name="person-outline" size={ms(24)} color={showProfile ? '#B084CC' : '#888'} />
          <Text style={[styles.navLabel, showProfile && { color: '#B084CC' }]} numberOfLines={1}>Profile</Text>
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
    shadowColor: '#B084CC',
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
    backgroundColor: '#B084CC',
    borderRadius: ms(10),
    minWidth: ms(18),
    height: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
    borderWidth: ms(2),
    borderColor: '#B084CC',
  },
  notificationBadgeText: { color: '#fff', fontSize: ms(10), fontWeight: '900' },

  scrollContent: { paddingBottom: vs(110) },

  heroCard: {
    margin: ms(14),
    borderRadius: ms(22),
    padding: ms(22),
    shadowColor: '#B084CC',
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
  heroSubtitle: { fontSize: ms(13), color: '#B084CC', fontWeight: '700', marginBottom: vs(18) },
  heroCTA: {
    alignSelf: 'flex-start',
    backgroundColor: '#B084CC',
    paddingHorizontal: ms(22),
    paddingVertical: vs(10),
    borderRadius: ms(22),
    shadowColor: '#B084CC',
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
    shadowColor: '#B084CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(14) },
  cardTitle: { fontSize: ms(16), fontWeight: '800', flex: 1 },
  pointsBadge: {
    fontSize: ms(14), fontWeight: '800', color: '#B084CC',
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
  stepDotDone: { backgroundColor: '#B084CC' },
  stepLabel: { fontSize: ms(14), color: '#aaa', fontWeight: '600' },
  stepLabelDone: { color: '#1a1a1a', fontWeight: '700' },

  // ── Horizontal Stepper (new 3-step progress tracker) ──
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: ms(4),
    paddingTop: vs(6),
  },
  stepperItem: {
    width: ms(92),
    alignItems: 'center',
  },
  stepperNode: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    backgroundColor: '#F4ECF7',
    borderWidth: 2,
    borderColor: '#E8DAEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNodeActive: {
    backgroundColor: '#FFF',
    borderColor: '#B084CC',
    shadowColor: '#B084CC',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stepperNodeDone: {
    backgroundColor: '#B084CC',
    borderColor: '#B084CC',
  },
  stepperNodeNum: { fontSize: ms(13), fontWeight: '800', color: '#C4A8D9' },
  stepperNodeNumActive: { color: '#B084CC', fontWeight: '900' },
  stepperLabel: {
    fontSize: ms(10),
    fontWeight: '700',
    color: '#999',
    textAlign: 'center',
    marginTop: vs(6),
    lineHeight: ms(13),
    paddingHorizontal: ms(2),
  },
  stepperLabelActive: { color: '#5C3A75', fontWeight: '800' },
  stepperConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E8DAEF',
    marginTop: ms(17),
    marginHorizontal: ms(2),
    borderRadius: 1,
  },
  stepperConnectorDone: { backgroundColor: '#B084CC' },
  stepperDescBox: {
    marginTop: vs(14),
    backgroundColor: '#FAF5FE',
    borderRadius: ms(12),
    paddingVertical: vs(10),
    paddingHorizontal: ms(14),
    borderWidth: 1,
    borderColor: '#F0E4FA',
  },
  stepperDescText: {
    fontSize: ms(12),
    color: '#5C3A75',
    fontWeight: '600',
    lineHeight: ms(17),
    textAlign: 'center',
  },

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
    backgroundColor: '#B084CC', borderRadius: ms(16),
    paddingHorizontal: ms(20), paddingVertical: vs(8),
    alignSelf: 'stretch', alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  // ── New About panel: image header + body + stats (light-purple themed) ──
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
    color: '#B084CC',
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
    color: '#B084CC',
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
    color: '#B084CC',
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
    color: '#B084CC',
    marginLeft: ms(4),
  },
  progressBg: { backgroundColor: '#F0F0F0', height: vs(8), borderRadius: ms(8), marginBottom: vs(6) },
  progressFill: { backgroundColor: '#B084CC', height: vs(8), borderRadius: ms(8) },
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
    color: '#B084CC',
    marginLeft: ms(4),
  },

  partnersSection: { marginBottom: vs(24), paddingHorizontal: ms(14) },
  sectionHeader: {
    marginBottom: vs(14),
    paddingHorizontal: ms(2),
  },
  sectionEyebrow: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#B084CC',
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
    // Transparent so the logo sits cleanly on the card instead of inside
    // a second framed cream box.
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(8),
    overflow: 'hidden',
    padding: ms(4),
  },
  partnerImg: { width: '100%', height: '100%', resizeMode: 'contain' },
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

  eventsSection: { marginHorizontal: ms(14), marginBottom: vs(30) },
  eventCard: {
    borderRadius: ms(22), padding: ms(20),
    shadowColor: '#B084CC', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
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
  // Wider nav cell so longer labels (e.g. "Community") never wrap mid-word.
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: ms(2) },
  navLabel: { fontSize: ms(10), color: '#888', fontWeight: '600', marginTop: vs(2), textAlign: 'center' },
  arButton: {
    backgroundColor: '#B084CC',
    alignItems: 'center', justifyContent: 'center',
    marginTop: vs(-28),
    shadowColor: '#B084CC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },

  dashboardConfirmBtn: {
    backgroundColor: '#27AE60',
    borderRadius: ms(12),
    height: vs(42),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(16),
    shadowColor: '#27AE60',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dashboardConfirmBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(13), letterSpacing: 0.5 },

});