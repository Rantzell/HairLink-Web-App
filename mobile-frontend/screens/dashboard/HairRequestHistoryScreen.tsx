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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import api from '../../lib/api';

interface RequestRecord {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  wig_length: string;
  wig_color: string;
}

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

export default function HairRequestHistoryScreen({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const insets = useSafeAreaInsets();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/hair-requests');
      setRequests(response.data || []);
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

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'approved': 
      case 'validated':
      case 'matched':
      case 'ready':
      case 'completed':
        return { bg: '#E8F5E9', text: '#2E7D32', label: (status === 'Validated' || status === 'Approved') ? 'Application Approved' : status };
      case 'pending': 
      case 'submitted':
      case 'under review':
        return { bg: '#FFF3E0', text: '#EF6C00', label: (status === 'Submitted' || status === 'Pending') ? 'Application Pending' : status };
      case 'rejected': 
      case 'cancelled':
        return { bg: '#FFEBEE', text: '#C62828', label: status };
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
      
      <LinearGradient
        colors={['#8E44AD', '#9B59B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History</Text>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + vs(20) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9B59B6']} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#9B59B6" />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="history" size={ms(80)} color="#E8DAEF" />
            <Text style={styles.emptyTitle}>No History Found</Text>
            <Text style={styles.emptyDesc}>Your hair requests will appear here once submitted.</Text>
          </View>
        ) : (
          requests.map((item, index) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <Animated.View 
                key={item.id} 
                entering={FadeInUp.delay(index * 100).springify()}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.typeIconBg}>
                    <MaterialCommunityIcons name="ribbon" size={ms(24)} color="#9B59B6" />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.referenceText}>{item.reference}</Text>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Wig Length</Text>
                      <Text style={styles.detailValue}>{item.wig_length}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Wig Color</Text>
                      <Text style={styles.detailValue}>{item.wig_color}</Text>
                    </View>
                  </View>
                </View>

                {/* Footer removed per user request */}
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4FC' },
  header: {
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowColor: '#8E44AD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: ms(10), paddingVertical: vs(15),
  },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: ms(16), paddingTop: vs(20) },
  centerContainer: { marginTop: vs(100), alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(40) },
  emptyTitle: { fontSize: ms(20), fontWeight: '900', color: '#1a1a1a', marginTop: vs(20) },
  emptyDesc: { fontSize: ms(14), color: '#999', textAlign: 'center', marginTop: vs(10), lineHeight: vs(20), fontWeight: '600' },

  card: {
    backgroundColor: '#fff', borderRadius: ms(22), padding: ms(16), marginBottom: vs(16),
    shadowColor: '#8E44AD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(16) },
  typeIconBg: { 
    width: ms(48), height: ms(48), borderRadius: ms(16), 
    backgroundColor: '#F5EEF8', justifyContent: 'center', alignItems: 'center', marginRight: ms(12),
  },
  headerText: { flex: 1 },
  referenceText: { fontSize: ms(15), fontWeight: '800', color: '#1a1a1a' },
  dateText: { fontSize: ms(12), color: '#999', fontWeight: '600', marginTop: vs(2) },
  statusBadge: { paddingHorizontal: ms(10), paddingVertical: vs(4), borderRadius: ms(10) },
  statusText: { fontSize: ms(11), fontWeight: '800', textTransform: 'uppercase' },

  cardBody: { paddingVertical: vs(12), borderTopWidth: 1, borderTopColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: ms(11), color: '#999', fontWeight: '700', textTransform: 'uppercase', marginBottom: vs(4) },
  detailValue: { fontSize: ms(14), fontWeight: '800', color: '#1a1a1a' },

  cardFooter: { marginTop: vs(12), alignItems: 'flex-end' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(4) },
  detailsBtnText: { fontSize: ms(13), fontWeight: '900', color: '#9B59B6', marginRight: ms(4) },
});
