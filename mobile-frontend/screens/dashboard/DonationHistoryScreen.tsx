import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import api from '../../lib/api';

interface DonationRecord {
  id: string;
  type: 'hair' | 'monetary';
  amount: number;
  status: string;
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

export default function DonationHistoryScreen({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const insets = useSafeAreaInsets();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/donations');
      setDonations(response.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getStatusStyle = (status: string, type: string) => {
    const s = status.toLowerCase();
    const isHair = type === 'hair';

    switch (s) {
      case 'approved': 
      case 'completed':
      case 'received hair':
      case 'wig received':
      case 'verified':
      case 'received':
        return { 
          bg: '#E8F5E9', 
          text: '#2E7D32', 
          label: 'Approved' 
        };
      case 'pending': 
      case 'submitted':
        return { bg: '#FFF3E0', text: '#EF6C00', label: 'Pending' };
      case 'rejected': return { bg: '#FFEBEE', text: '#C62828', label: 'Rejected' };
      default: return { bg: '#F5F5F5', text: '#757575', label: status };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#FF66B2', '#FF1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donation History</Text>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: Math.max(vs(40), insets.bottom + vs(20)), flexGrow: 1 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF66B2" />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FF1493" style={{ marginTop: vs(50) }} />
        ) : donations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="heart-multiple-outline" size={ms(80)} color="#FFD6EF" />
            <Text style={styles.emptyTitle}>No Donations Yet</Text>
            <Text style={styles.emptyDesc}>Your kindness will show up here as soon as you make your first donation!</Text>
          </View>
        ) : (
          <>
            <View style={styles.statusHintCard}>
              <Ionicons name="information-circle" size={ms(18)} color="#FF66B2" />
              <Text style={styles.statusHintText}>
                <Text style={{ fontWeight: '800' }}>Note:</Text> Star Points are awarded once your donation status changes from <Text style={{ color: '#EF6C00', fontWeight: '700' }}>Pending</Text> to <Text style={{ color: '#2E7D32', fontWeight: '700' }}>Approved</Text>.
              </Text>
            </View>

            {donations.map((item, idx) => {
              const status = getStatusStyle(item.status, item.type);
              return (
                <Animated.View 
                  key={item.id} 
                  entering={FadeInUp.delay(idx * 100).springify()}
                  style={styles.recordCard}
                >
                   <View style={styles.cardMain}>
                     <View style={[styles.iconCircle, { backgroundColor: item.type === 'hair' ? '#FFF0F8' : '#E3F2FD' }]}>
                        {item.type === 'hair' ? (
                          <MaterialCommunityIcons name="content-cut" size={ms(26)} color="#FF1493" />
                        ) : (
                          <FontAwesome5 name="wallet" size={ms(20)} color="#1976D2" />
                        )}
                     </View>
                     
                     <View style={styles.infoCol}>
                        <Text style={styles.cardTitle}>
                          {item.type === 'hair' ? 'Hair Donation' : 'Monetary Support'}
                        </Text>
                        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                     </View>
  
                     <View style={styles.rightCol}>
                        {item.type === 'monetary' && (
                          <Text style={styles.amountText}>₱{item.amount}</Text>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.statusText, { color: status.text }]}>
                            {status.label.toUpperCase()}
                          </Text>
                        </View>
                     </View>
                  </View>
                   
                   {item.type === 'hair' && item.status.toLowerCase() === 'approved' && (
                     <View style={styles.deliveryContainer}>
                        <View style={styles.deliveryHeader}>
                          <Ionicons name="location" size={ms(16)} color="#FF1493" />
                          <Text style={styles.deliveryTitle}>Delivery Instructions</Text>
                        </View>
                        <Text style={styles.deliveryText}>
                          Deliver your hair to our Strand Up for Cancer Receiving Area:
                        </Text>
                        <View style={styles.addressBox}>
                          <Text style={styles.addressText}>
                            Manila Downtown YMCA (945 Sabino Padilla St., Sta. Cruz, Manila)
                          </Text>
                        </View>
                        <Text style={styles.deliveryNote}>
                          Please present your Reference ID: <Text style={{ fontWeight: '800' }}>{item.id}</Text> upon delivery.
                        </Text>
                     </View>
                   )}
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F0F5' },
  header: {
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowColor: '#FF1493',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(10),
    paddingVertical: vs(15),
  },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff' },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: ms(20), paddingBottom: vs(40) },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: ms(20),
    marginBottom: vs(15),
    padding: ms(16),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#FFF0F8',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: ms(52), height: ms(52), borderRadius: ms(18),
    justifyContent: 'center', alignItems: 'center',
    marginRight: ms(15),
  },
  infoCol: { flex: 1 },
  cardTitle: { fontSize: ms(16), fontWeight: '800', color: '#1a1a1a', marginBottom: vs(2) },
  cardDate: { fontSize: ms(12), color: '#999', fontWeight: '600' },
  
  rightCol: { alignItems: 'flex-end' },
  amountText: { fontSize: ms(16), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(6) },
  statusBadge: {
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    borderRadius: ms(10),
  },
  statusText: { fontSize: ms(11), fontWeight: '800', textTransform: 'uppercase' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: vs(100) },
  emptyTitle: { fontSize: ms(20), fontWeight: '900', color: '#FF66B2', marginTop: vs(20) },
  emptyDesc: { fontSize: ms(14), color: '#999', textAlign: 'center', paddingHorizontal: ms(40), marginTop: vs(10), lineHeight: vs(20) },

  statusHintCard: {
    backgroundColor: '#FFF0F8',
    borderRadius: ms(15),
    padding: ms(12),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(20),
    borderWidth: 1,
    borderColor: '#FFD6EF',
  },
  statusHintText: {
    flex: 1,
    marginLeft: ms(10),
    fontSize: ms(12),
    color: '#666',
    lineHeight: vs(18),
  },

  deliveryContainer: {
    marginTop: vs(16),
    paddingTop: vs(16),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(8),
  },
  deliveryTitle: {
    fontSize: ms(14),
    fontWeight: '900',
    color: '#FF1493',
    marginLeft: ms(6),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryText: {
    fontSize: ms(13),
    color: '#444',
    fontWeight: '600',
    marginBottom: vs(8),
    lineHeight: vs(18),
  },
  addressBox: {
    backgroundColor: '#FFF0F8',
    padding: ms(12),
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: '#FFD6EF',
    marginBottom: vs(8),
  },
  addressText: {
    fontSize: ms(13),
    color: '#FF1493',
    fontWeight: '800',
    lineHeight: vs(18),
    textAlign: 'center',
  },
  deliveryNote: {
    fontSize: ms(11),
    color: '#888',
    fontStyle: 'italic',
    fontWeight: '600',
  },
});

