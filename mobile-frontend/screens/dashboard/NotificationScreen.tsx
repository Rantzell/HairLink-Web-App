import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import api from '../../lib/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

// Reusable animated card — gentle scale-down on press for tactile feedback.
const ScaleButton = ({ children, onPress, style }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.985, { damping: 18, stiffness: 320 }))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={{ width: '100%' }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationScreen({ onBack, onTrack, onOpenPost, role = 'Donor' }: { onBack?: () => void, onTrack?: () => void, onOpenPost?: (postId: string) => void, role?: 'Donor' | 'Recipient' }) {
  const isRecipient = role === 'Recipient';

  // ── Role-themed palette ──────────────────────────────────────────────
  // Donor stays pink; Recipient stays light purple. Each role gets a
  // gradient pair (deep → soft) used for the header AND the icon circles.
  const theme = {
    deep: isRecipient ? '#9B6BBF' : '#FF1493',
    soft: isRecipient ? '#B084CC' : '#FF66B2',
    pale: isRecipient ? '#F4ECF7' : '#FFE4EE',
    bg: isRecipient ? '#FAF6FD' : '#FBF4F8',
    ring: isRecipient ? '#E8DAEF' : '#FFD6EF',
  };

  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  React.useEffect(() => {
    const init = async () => {
      await fetchNotifications();
      await markAllAsRead();
    };
    init();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const q = search.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q);
  });

  // Route a notification tap to its target screen based on the deep-link.
  //   post:<id>             → open the community post
  //   track:request:<ref>   → open tracking
  //   track:donation:<ref>  → open tracking
  const handleNotificationPress = (n: NotificationItem) => {
    if (!n.is_read) markAsRead(n.id);
    const link = n.link || '';
    if (link.startsWith('post:') && onOpenPost) {
      onOpenPost(link.slice('post:'.length));
      return;
    }
    if (link.startsWith('track:') && onTrack) {
      onTrack();
      return;
    }
    // No deep-link → just expand/collapse the message.
    setExpandedId(expandedId === n.id ? null : n.id);
  };

  // ── Time formatting ──────────────────────────────────────────────────
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.max(1, Math.floor(diff / 60000));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Full date header — matches reference image style ("Today, June 13 2026").
  const getDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const longFormat = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (date >= today) return `Today, ${longFormat}`;
    if (date >= yesterday) return `Yesterday, ${longFormat}`;
    return longFormat;
  };

  const groupedNotifications = filteredNotifications.reduce((acc: any, n) => {
    const group = getDateGroup(n.created_at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  // ── Per-type styling: icon glyph + accent dot color ────────────────────
  // The accent dot is the small colored marker on the right side of each card
  // (success/info/warning/danger semantics). The icon glyph is the symbol
  // inside the circular badge. Background uses the role's theme gradient.
  const getNotifStyle = (type: string, title?: string) => {
    const t = (type || '').toLowerCase();
    const titleLc = (title || '').toLowerCase();

    // Status-aware icon: titles like "approved", "completed", "rejected",
    // "canceled" override the type-based icon so success/error states are
    // visually obvious (matches the reference image's checkmark / X cues).
    if (titleLc.includes('reject') || titleLc.includes('cancel') || titleLc.includes('missing')) {
      return { glyph: 'close', dot: '#E74C3C', isMaterial: false };
    }
    if (titleLc.includes('approv') || titleLc.includes('complet') || titleLc.includes('received') || titleLc.includes('arrived') || titleLc.includes('success')) {
      return { glyph: 'checkmark', dot: '#3498DB', isMaterial: false };
    }

    switch (t) {
      case 'donation':
      case 'hair_donation':
        return { glyph: 'heart', dot: '#3498DB', isMaterial: true };
      case 'monetary_donation':
      case 'monetary':
        return { glyph: 'wallet-outline', dot: '#3498DB', isMaterial: true };
      case 'wig':
      case 'request':
        return { glyph: 'ribbon', dot: '#9B59B6', isMaterial: true };
      case 'announcement':
        return { glyph: 'bullhorn-outline', dot: '#F39C12', isMaterial: true };
      case 'event':
        return { glyph: 'calendar', dot: '#F39C12', isMaterial: true };
      case 'community':
        return { glyph: 'account-multiple-outline', dot: '#3498DB', isMaterial: true };
      case 'wigmaker':
        return { glyph: 'content-cut', dot: '#9B59B6', isMaterial: true };
      case 'staff_donation':
        return { glyph: 'inbox-arrow-down', dot: '#3498DB', isMaterial: true };
      default:
        return { glyph: 'notifications-outline', dot: theme.deep, isMaterial: false };
    }
  };

  const renderIcon = (type: string, title?: string) => {
    const s = getNotifStyle(type, title);
    if (s.isMaterial) {
      return <MaterialCommunityIcons name={s.glyph as any} size={ms(22)} color="#fff" />;
    }
    return <Ionicons name={s.glyph as any} size={ms(22)} color="#fff" />;
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style="light" />

      {/* ── Header ───────────────────────────────────────── */}
      <LinearGradient
        colors={[theme.deep, theme.soft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { shadowColor: theme.deep, paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={ms(24)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {/* Spacer to keep the title centered (three-dot menu removed). */}
          <View style={styles.iconBtn} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.deep} />
        }
      >
        {/* ── Search Bar ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60)} style={styles.searchContainer}>
          <View style={[styles.searchBar, { borderColor: theme.ring }]}>
            <Ionicons name="search-outline" size={ms(18)} color={theme.soft} />
            <TextInput
              placeholder="Search notifications..."
              placeholderTextColor="#A09AAB"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
                <Ionicons name="close-circle" size={ms(16)} color="#BBB" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Loading / Empty States ───────────────────── */}
        {loading && !refreshing && (
          <View style={{ marginTop: vs(100) }}>
            <ActivityIndicator size="large" color={theme.deep} />
          </View>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.pale }]}>
              <Ionicons name="notifications-off-outline" size={ms(40)} color={theme.deep} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'No results found for your search.' : "You're all caught up! Check back later for updates."}
            </Text>
          </View>
        )}

        {/* ── Date-grouped notification list ───────────── */}
        {Object.keys(groupedNotifications).map((group, gIdx) => (
          <Animated.View key={group} entering={FadeIn.delay(180 + gIdx * 80)}>
            <Text style={styles.dateHeader}>{group}</Text>
            {groupedNotifications[group].map((n: NotificationItem) => {
              const style = getNotifStyle(n.type, n.title);
              const isExpanded = expandedId === n.id;
              const showTrack = ['donation', 'hair_donation', 'wig', 'request'].includes(n.type) && !!onTrack;

              return (
                <ScaleButton
                  key={n.id}
                  style={[styles.notificationCard, !n.is_read && styles.notificationCardUnread]}
                  onPress={() => handleNotificationPress(n)}
                >
                  <View style={styles.cardInner}>
                    {/* Themed icon circle — gradient from deep → soft (role color) */}
                    <LinearGradient
                      colors={[theme.deep, theme.soft]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconCircle}
                    >
                      {renderIcon(n.type, n.title)}
                    </LinearGradient>

                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, n.is_read && styles.readTitle]} numberOfLines={1}>
                        {n.title || 'Update Available'}
                      </Text>
                      <Text
                        style={[styles.notifDesc, isExpanded && styles.expandedDesc]}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {n.message || 'Check your dashboard for the latest details on your activity.'}
                      </Text>

                      <View style={styles.notifFooter}>
                        <View style={styles.timePill}>
                          <Text style={styles.timePillText}>{getRelativeTime(n.created_at)}</Text>
                        </View>
                        {showTrack && (
                          <TouchableOpacity
                            style={[styles.trackBtn, { borderColor: theme.ring }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              onTrack && onTrack();
                            }}
                          >
                            <Text style={[styles.trackBtnText, { color: theme.deep }]}>TRACK</Text>
                            <Ionicons name="arrow-forward" size={ms(12)} color={theme.deep} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {!n.is_read && (
                      <View style={styles.rightAccent}>
                        <View style={[styles.unreadPill, { backgroundColor: theme.deep }]} />
                      </View>
                    )}
                  </View>
                </ScaleButton>
              );
            })}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────────
  header: {
    borderBottomLeftRadius: ms(28),
    borderBottomRightRadius: ms(28),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingVertical: vs(14),
  },
  headerTitle: { fontSize: ms(20), fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  iconBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  scrollContent: { paddingBottom: vs(40) },

  // ── Search ──────────────────────────────────────────
  searchContainer: { paddingHorizontal: ms(20), paddingTop: vs(20), marginBottom: vs(14) },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: ms(16),
    borderWidth: 1.5,
    paddingHorizontal: ms(14),
    paddingVertical: vs(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: ms(8),
  },
  searchInput: { flex: 1, fontSize: ms(14), fontWeight: '600', color: '#333', paddingVertical: 0 },

  // ── Tabs row ────────────────────────────────────────
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(20),
    marginBottom: vs(10),
  },
  tabsGroup: { flexDirection: 'row', gap: ms(8) },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: ms(14),
    paddingVertical: vs(7),
    borderRadius: ms(14),
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: ms(6),
  },
  tabText: { fontSize: ms(13), fontWeight: '700', color: '#666' },
  tabTextActive: { color: '#fff' },
  badge: {
    borderRadius: ms(10),
    paddingHorizontal: ms(7),
    paddingVertical: vs(1),
    minWidth: ms(20),
    alignItems: 'center',
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: ms(11), fontWeight: '800' },
  badgeTextActive: { color: '#fff' },
  markAllText: { fontSize: ms(12), fontWeight: '700' },

  // ── Date headers ────────────────────────────────────
  dateHeader: {
    fontSize: ms(13),
    fontWeight: '700',
    color: '#8C7895',
    marginHorizontal: ms(20),
    marginTop: vs(20),
    marginBottom: vs(10),
    letterSpacing: 0.2,
  },

  // ── Notification cards ──────────────────────────────
  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: ms(16),
    marginBottom: vs(10),
    borderRadius: ms(18),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  notificationCardUnread: {
    shadowOpacity: 0.08,
    elevation: 3,
  },
  cardInner: {
    flexDirection: 'row',
    padding: ms(14),
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(12),
  },
  notifContent: { flex: 1, justifyContent: 'center', minHeight: ms(44) },
  notifTitle: {
    fontSize: ms(14),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: vs(3),
  },
  readTitle: { color: '#666', fontWeight: '700' },
  notifDesc: { fontSize: ms(12), color: '#7C7689', lineHeight: ms(17), fontWeight: '500' },
  expandedDesc: { color: '#3a3a3a', marginBottom: vs(6) },
  notifFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: vs(8),
  },
  timePill: {
    backgroundColor: '#F2EEF5',
    paddingHorizontal: ms(10),
    paddingVertical: vs(3),
    borderRadius: ms(10),
  },
  timePillText: { fontSize: ms(10), color: '#8C7895', fontWeight: '700' },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: ms(12),
    paddingVertical: vs(5),
    borderRadius: ms(10),
    borderWidth: 1.5,
    gap: ms(4),
  },
  trackBtnText: { fontSize: ms(10), fontWeight: '900', letterSpacing: 0.5 },

  // Right-side accent column — colored dot for type + unread strip indicator
  rightAccent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: ms(8),
    paddingTop: vs(4),
    gap: vs(6),
  },
  accentDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  unreadPill: {
    width: ms(4),
    height: vs(20),
    borderRadius: ms(2),
  },

  // ── Empty state ─────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(60),
    paddingHorizontal: ms(40),
  },
  emptyIconWrap: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  emptyTitle: { fontSize: ms(17), fontWeight: '800', color: '#1a1a1a', marginBottom: vs(6) },
  emptyDesc: { fontSize: ms(13), color: '#8C7895', textAlign: 'center', lineHeight: ms(19), fontWeight: '500' },
});
