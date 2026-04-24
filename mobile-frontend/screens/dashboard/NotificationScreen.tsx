import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import api from '../../lib/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// Reusable animated button for consistency
const ScaleButton = ({ children, onPress, style }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={{ width: '100%' }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationScreen({ onBack, onTrack, role = 'Donor' }: { onBack?: () => void, onTrack?: () => void, role?: 'Donor' | 'Recipient' }) {
  const isRecipient = role === 'Recipient';
  const themeColor = isRecipient ? '#9B59B6' : '#FF1493';
  const themeMedium = isRecipient ? '#8E44AD' : '#FF66B2';
  const themeLight = isRecipient ? '#E8DAEF' : '#FFB3D9';
  const themeBg = isRecipient ? '#F9F4FC' : '#F8F0F5';
  const themePale = isRecipient ? '#FFF0F8' : '#FFF0F5'; // Small adjustment for consistency
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
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
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  React.useEffect(() => {
    const init = async () => {
      await fetchNotifications();
      await markAllAsRead(); // Auto-mark all as read when screen opens
    };
    init();
  }, []);
  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };


  const filteredNotifications = notifications.filter((n) => {
    const matchesTab = activeTab === 'All' || !n.is_read;
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const groupedNotifications = filteredNotifications.reduce((acc: any, n) => {
    const group = getDateGroup(n.created_at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const getNotifStyle = (type: string) => {
    if (isRecipient) {
      switch (type) {
        case 'wig':
        case 'hair_donation':
        case 'donation':
          return { icon: 'ribbon', color: '#8E44AD', bg: '#F5EEF8' };
        case 'monetary_donation':
          return { icon: 'wallet', color: '#9B59B6', bg: '#FDF7FF' };
        case 'announcement':
          return { icon: 'megaphone', color: '#8E44AD', bg: '#F5EEF8' };
        default:
          return { icon: 'mail', color: '#9B59B6', bg: '#FDF7FF' };
      }
    }
    
    switch (type) {
      case 'wig': return { icon: 'ribbon', color: '#8E44AD', bg: '#F3E5F5' };
      case 'hair_donation': return { icon: 'content-cut', color: '#D81B60', bg: '#FCE4EC' };
      case 'monetary_donation': return { icon: 'wallet', color: '#1E88E5', bg: '#E3F2FD' };
      case 'donation': return { icon: 'heart-pulse', color: '#FF1493', bg: '#FFF0F5' };
      case 'announcement': return { icon: 'megaphone', color: '#FB8C00', bg: '#FFF3E0' };
      default: return { icon: 'mail', color: themeMedium, bg: themePale };
    }
  };

  const renderIcon = (type: string) => {
    const style = getNotifStyle(type);
    return <MaterialCommunityIcons name={style.icon as any} size={26} color={style.color} />;
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar style="light" />

      {/* ── Premium Gradient Header ────────────────── */}
      <LinearGradient
        colors={isRecipient ? [themeColor, themeMedium] : ['#FF66B2', '#FF1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { shadowColor: isRecipient ? themeMedium : '#FF1493', paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Search Bar ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.searchContainer}>
          <View style={[styles.searchBar, { borderColor: themeLight }]}>
            <Ionicons name="search-outline" size={20} color={themeMedium} />
            <TextInput
              placeholder="Search notifications..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        </Animated.View>

        {/* ── Filters ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.tabsRow}>
          <View style={styles.tabsGroup}>
            {['All', 'Unread'].map((tab: any) => {
              const count = notifications.filter(n => tab === 'All' ? true : !n.is_read).length;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && [styles.activeTab, { borderColor: themeMedium }]]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && { color: themeColor }]}>{tab}</Text>
                  <View style={[styles.badge, activeTab === tab && { backgroundColor: themeMedium }]}>
                    <Text style={[styles.badgeText, activeTab === tab && styles.activeBadgeText]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAllText, { color: themeColor }]}>Mark all as read</Text>
          </TouchableOpacity>
        </Animated.View>

        {loading && !refreshing && (
          <View style={{ marginTop: 100 }}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={80} color={themeLight} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyDesc}>
              {search ? "No results found for your search." : "You're all caught up! Check back later for updates."}
            </Text>
          </View>
        )}

        {Object.keys(groupedNotifications).map((group, gIdx) => (
          <Animated.View key={group} entering={FadeIn.delay(300 + gIdx * 100)}>
            <Text style={styles.dateHeader}>{group}</Text>
            {groupedNotifications[group].map((n: NotificationItem) => {
              const style = getNotifStyle(n.type);
              const isExpanded = expandedId === n.id;
              
              return (
                <ScaleButton
                  key={n.id}
                  style={[
                    styles.notificationCard, 
                    { borderLeftColor: style.color },
                    n.is_read && { opacity: 0.8 }
                  ]}
                  onPress={() => {
                    setExpandedId(isExpanded ? null : n.id);
                    if (!n.is_read) markAsRead(n.id);
                  }}
                >
                  <View style={styles.cardInner}>
                    <View style={[styles.iconCircle, { backgroundColor: style.bg }]}>
                      {renderIcon(n.type)}
                    </View>
                    
                    <View style={styles.notifContent}>
                      <View style={styles.notifHeader}>
                        <Text style={[styles.notifTitle, n.is_read && styles.readText]}>
                          {n.title || 'Update Available'}
                        </Text>
                        {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: themeMedium }]} />}
                      </View>
                      
                      <Text 
                        style={[
                          styles.notifDesc, 
                          isExpanded && styles.expandedDesc
                        ]} 
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {n.message || 'Check your dashboard for the latest details on your activity.'}
                      </Text>

                      <View style={styles.notifFooter}>
                        <View style={styles.timeRow}>
                          <Ionicons name="time-outline" size={12} color="#999" />
                          <Text style={styles.notifTime}>{getRelativeTime(n.created_at)}</Text>
                        </View>
                        
                        {['donation', 'hair_donation', 'monetary_donation', 'wig'].includes(n.type) && onTrack && (
                          <TouchableOpacity
                            style={[styles.trackBtn, { backgroundColor: themeBg, borderColor: themeLight }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              onTrack();
                            }}
                          >
                            <Text style={[styles.trackBtnText, { color: themeColor }]}>TRACK</Text>
                            <Ionicons name="arrow-forward" size={12} color={themeColor} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
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
  header: {
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(10),
    paddingVertical: vs(15),
  },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: vs(40) },
  searchContainer: { paddingHorizontal: ms(20), paddingTop: vs(24), marginBottom: vs(20) },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: ms(20),
    borderWidth: 1.5,
    paddingHorizontal: ms(16),
    paddingVertical: vs(12),
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: ms(10), fontSize: ms(16), fontWeight: '600', color: '#333' },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(20),
    marginBottom: vs(10),
  },
  tabsGroup: { flexDirection: 'row' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,102,178,0.1)',
    paddingHorizontal: ms(14),
    paddingVertical: vs(8),
    borderRadius: ms(15),
    marginRight: ms(10),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: ms(14), fontWeight: '700', color: '#666', marginRight: ms(6) },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: ms(10),
    paddingHorizontal: ms(6),
    paddingVertical: vs(2),
    minWidth: ms(20),
    alignItems: 'center',
  },
  badgeText: { fontSize: ms(11), fontWeight: '800', color: '#888' },
  activeBadgeText: { color: '#fff' },
  markAllText: { fontSize: ms(13), fontWeight: '700' },

  dateHeader: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', marginHorizontal: ms(24), marginTop: vs(24), marginBottom: vs(12) },
  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: ms(16),
    marginBottom: vs(16),
    borderRadius: ms(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderLeftWidth: 6,
    overflow: 'hidden',
  },
  cardInner: { flexDirection: 'row', padding: ms(16) },
  iconCircle: {
    width: ms(56), height: ms(56), borderRadius: ms(20),
    justifyContent: 'center', alignItems: 'center',
    marginRight: ms(16),
  },
  notifContent: { flex: 1, justifyContent: 'center' },
  notifHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: vs(4) },
  notifTitle: { fontSize: ms(17), fontWeight: '800', color: '#1a1a1a', flex: 1, paddingRight: ms(10), lineHeight: vs(22) },
  readText: { color: '#888', fontWeight: '600' },
  unreadDot: { width: ms(10), height: ms(10), borderRadius: ms(5), marginTop: vs(6) },
  notifDesc: { fontSize: ms(14), color: '#555', lineHeight: vs(20), fontWeight: '500' },
  expandedDesc: { fontSize: ms(16), color: '#222', marginTop: vs(4), marginBottom: vs(12), lineHeight: vs(24) },
  notifFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: vs(10) },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: ms(4) },
  notifTime: { fontSize: ms(12), color: '#999', fontWeight: '700' },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(14),
    paddingVertical: vs(6),
    borderRadius: ms(12),
    borderWidth: 1.5,
    gap: ms(6)
  },
  trackBtnText: { fontSize: ms(12), fontWeight: '900', letterSpacing: 1 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: vs(80), paddingHorizontal: ms(40) },
  emptyTitle: { fontSize: ms(20), fontWeight: '900', color: '#1a1a1a', marginTop: vs(20) },
  emptyDesc: { fontSize: ms(14), color: '#999', textAlign: 'center', marginTop: vs(10), lineHeight: vs(20), fontWeight: '600' },
});


