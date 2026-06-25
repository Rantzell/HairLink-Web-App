import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, vs } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import api from '../../lib/api';

/**
 * Mirrors frontend/src/pages/RecipientTrackingDetail.tsx — same data
 * source (GET /api/requests/:reference), same actions
 * (Track My Wig URL + Confirm Wig Received), same roadmap timeline.
 */

interface StatusHistory {
  id?: string | number;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface RequestDetail {
  id: string;
  reference: string;
  status: string;
  wigLength: string | null;
  wigColor: string | null;
  story: string | null;
  createdAt: string;
  trackingLink: string | null;
  deliveryMethod?: string | null;
  user?: { firstName?: string; lastName?: string; name?: string } | null;
  statusHistories?: StatusHistory[];
}

// Org pickup / origin address — kept in one place so it's easy to update.
const ORG_NAME = 'Manila Downtown YMCA';
const ORG_ADDRESS = '945 Sabino Padilla St., Sta. Cruz, Manila';

const statusTint = (status: string) => {
  const s = (status || '').toLowerCase();
  if (['completed', 'received', 'validated', 'approved', 'verified', 'matched'].includes(s))
    return { bg: '#E8F5E9', text: '#2E7D32' };
  if (['rejected', 'cancelled'].includes(s)) return { bg: '#FFEBEE', text: '#C62828' };
  if (['in transit', 'in production', 'in progress'].includes(s)) return { bg: '#E3F2FD', text: '#1565C0' };
  return { bg: '#FFF3E0', text: '#EF6C00' };
};

interface Props {
  reference: string;
  onBack: () => void;
}

export default function RecipientTrackingDetailScreen({ reference, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Which confirmation flow is active — delivery (In Transit) or pickup (Ready for Pickup).
  const [confirmKind, setConfirmKind] = useState<'delivery' | 'pickup'>('delivery');

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/requests/${reference}`);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch request detail', err);
      Alert.alert('Error', 'Request not found or you do not have access.');
      onBack();
    } finally {
      setLoading(false);
    }
  }, [reference, onBack]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const doConfirm = async () => {
    if (!data?.reference) return;
    setConfirming(true);
    try {
      const endpoint = confirmKind === 'pickup' ? 'confirm-pickup' : 'confirm-received';
      await api.post(`/requests/${data.reference}/${endpoint}`);
      setConfirmOpen(false);
      // Optimistic — update UI immediately so the user sees the new status.
      setData({ ...data, status: 'Completed' });
      Alert.alert(
        'Confirmed',
        confirmKind === 'pickup'
          ? 'Thank you! Your wig pickup has been confirmed.'
          : 'Thank you! Your wig request has been marked as received.',
      );
      fetchDetail();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to confirm.';
      Alert.alert('Error', msg);
    } finally {
      setConfirming(false);
    }
  };

  const fullName = data?.user
    ? `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.name || 'Recipient'
    : 'Recipient';

  const tint = data ? statusTint(data.status) : null;
  const canConfirm = data?.status === 'In Transit';
  const canConfirmPickup =
    data?.status === 'Ready for Pickup' && (data?.deliveryMethod || 'delivery').toLowerCase() === 'pickup';
  const canTrack = !!data?.trackingLink && data?.status === 'In Transit';

  if (loading || !data) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#9B6BBF', '#B084CC']} style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tracking Detail</Text>
            <View style={{ width: ms(44) }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#B084CC" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient colors={['#9B6BBF', '#B084CC']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Tracking Detail</Text>
            <Text style={styles.headerRef}>{data.reference}</Text>
          </View>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + vs(20) }]}>
        {/* Summary grid */}
        <Animated.View entering={FadeInUp.springify()} style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="pound" size={ms(18)} color="#B084CC" />
            <Text style={styles.summaryLabel}>Reference</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{data.reference}</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="information-outline" size={ms(18)} color="#B084CC" />
            <Text style={styles.summaryLabel}>Status</Text>
            {tint && (
              <View style={[styles.statusPill, { backgroundColor: tint.bg }]}>
                <Text style={[styles.statusPillText, { color: tint.text }]}>{data.status.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="calendar" size={ms(18)} color="#B084CC" />
            <Text style={styles.summaryLabel}>Submitted</Text>
            <Text style={styles.summaryValue}>{new Date(data.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="account" size={ms(18)} color="#B084CC" />
            <Text style={styles.summaryLabel}>Recipient</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{fullName}</Text>
          </View>
        </Animated.View>

        {/* Delivery method — surface the recipient's choice so they always know
            whether to wait for shipping or visit the org for pickup. */}
        {(() => {
          const method = (data.deliveryMethod || 'delivery').toLowerCase();
          const isPickup = method === 'pickup';
          return (
            <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <View style={[styles.methodIconWrap, isPickup ? styles.methodIconPickup : styles.methodIconDelivery]}>
                  <Ionicons
                    name={isPickup ? 'storefront' : 'rocket'}
                    size={ms(18)}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>Fulfillment Method</Text>
                  <Text style={styles.methodValue}>
                    {isPickup ? 'Pickup at Organization' : 'Delivery to Recipient'}
                  </Text>
                </View>
              </View>

              <View style={styles.methodAddressBox}>
                <View style={styles.methodAddressHeader}>
                  <Ionicons name="location" size={ms(14)} color="#B084CC" />
                  <Text style={styles.methodAddressTitle}>
                    {isPickup ? 'Pickup Location' : 'Shipping From'}
                  </Text>
                </View>
                <Text style={styles.methodOrgName}>{ORG_NAME}</Text>
                <Text style={styles.methodOrgAddr}>{ORG_ADDRESS}</Text>
                {isPickup && (
                  <Text style={styles.methodHint}>
                    Once your wig is ready, please visit the address above to collect it.
                  </Text>
                )}
                {!isPickup && (
                  <Text style={styles.methodHint}>
                    Your wig will be shipped to your registered address. Track the courier link below once it ships.
                  </Text>
                )}
              </View>
            </Animated.View>
          );
        })()}

        {/* Action row — Track + Confirm (delivery) + Confirm (pickup) */}
        {(canTrack || canConfirm || canConfirmPickup) && (
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.actionRow}>
            {canTrack && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.trackBtn]}
                onPress={() => Linking.openURL(data.trackingLink!)}
                activeOpacity={0.85}
              >
                <Ionicons name="location" size={ms(18)} color="#fff" />
                <Text style={styles.actionBtnText}>Track My Wig</Text>
              </TouchableOpacity>
            )}
            {canConfirm && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => { setConfirmKind('delivery'); setConfirmOpen(true); }}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={ms(18)} color="#fff" />
                <Text style={styles.actionBtnText}>Confirm Wig Received</Text>
              </TouchableOpacity>
            )}
            {canConfirmPickup && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => { setConfirmKind('pickup'); setConfirmOpen(true); }}
                activeOpacity={0.85}
              >
                <Ionicons name="bag-check" size={ms(18)} color="#fff" />
                <Text style={styles.actionBtnText}>Confirm Pickup</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Roadmap timeline */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="source-branch" size={ms(20)} color="#B084CC" />
            <Text style={styles.cardTitle}>Request Roadmap</Text>
          </View>
          {data.statusHistories && data.statusHistories.length > 0 ? (
            data.statusHistories.map((h, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineMeta}>
                    <Text style={styles.timelineStatus}>{h.status}</Text>
                    <Text style={styles.timelineTime}>{new Date(h.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.timelineDesc}>
                    <Text style={styles.timelineDescText}>
                      {h.notes || `Status changed to ${h.status}`}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyHint}>No status updates yet — staff will update as your request progresses.</Text>
          )}
        </Animated.View>

        {/* Wig info */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="ribbon" size={ms(20)} color="#B084CC" />
            <Text style={styles.cardTitle}>Wig Info</Text>
          </View>
          <View style={styles.wigInfoRow}>
            <View style={styles.wigInfoCell}>
              <Text style={styles.wigInfoLabel}>Wig Length</Text>
              <Text style={styles.wigInfoValue}>{data.wigLength?.toUpperCase() || '—'}</Text>
            </View>
            <View style={styles.wigInfoCell}>
              <Text style={styles.wigInfoLabel}>Wig Color</Text>
              <Text style={styles.wigInfoValue}>{data.wigColor?.toUpperCase() || '—'}</Text>
            </View>
          </View>
          <View style={styles.storyBox}>
            <Text style={styles.storyText}>"{data.story || 'No story provided'}"</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Confirm modal */}
      <Modal transparent visible={confirmOpen} animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle" size={ms(40)} color="#2E7D32" />
            </View>
            <Text style={styles.modalTitle}>
              {confirmKind === 'pickup' ? 'Confirm Pickup' : 'Confirm Wig Received'}
            </Text>
            <Text style={styles.modalMsg}>
              {confirmKind === 'pickup'
                ? 'Please confirm only after you have personally collected your wig from the Binondo office. This will finalize your request.'
                : 'Please confirm that you have received your wig. This action cannot be undone and will finalize your request.'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setConfirmOpen(false)}
                disabled={confirming}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn, confirming && { opacity: 0.7 }]}
                onPress={doConfirm}
                disabled={confirming}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {confirmKind === 'pickup' ? 'Yes, I Collected My Wig' : 'Yes, I Received It'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4FC' },
  header: {
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowColor: '#9B6BBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: ms(10), paddingVertical: vs(15),
  },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerRef: { fontSize: ms(11), color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginTop: vs(2) },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: ms(16), paddingTop: vs(20) },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  summaryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: ms(10), marginBottom: vs(14),
  },
  summaryCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff',
    borderRadius: ms(16), padding: ms(14),
    borderWidth: 1, borderColor: '#EFE6F5',
  },
  summaryLabel: { fontSize: ms(11), color: '#8C7895', fontWeight: '800', marginTop: vs(6), textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: ms(14), color: '#1a1a1a', fontWeight: '800', marginTop: vs(2) },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: ms(10), paddingVertical: vs(4), borderRadius: ms(10), marginTop: vs(4) },
  statusPillText: { fontSize: ms(10), fontWeight: '900', letterSpacing: 0.5 },

  methodCard: {
    backgroundColor: '#fff',
    borderRadius: ms(20),
    padding: ms(16),
    marginBottom: vs(14),
    borderWidth: 1,
    borderColor: '#EFE6F5',
  },
  methodHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(12), gap: ms(12) },
  methodIconWrap: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconDelivery: { backgroundColor: '#1565C0' },
  methodIconPickup: { backgroundColor: '#B084CC' },
  methodLabel: { fontSize: ms(10), color: '#8C7895', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  methodValue: { fontSize: ms(15), color: '#1a1a1a', fontWeight: '900', marginTop: vs(2) },
  methodAddressBox: {
    backgroundColor: '#FDF7FB',
    borderRadius: ms(12),
    padding: ms(12),
    borderLeftWidth: 3,
    borderLeftColor: '#B084CC',
  },
  methodAddressHeader: { flexDirection: 'row', alignItems: 'center', gap: ms(6), marginBottom: vs(6) },
  methodAddressTitle: { fontSize: ms(11), color: '#B084CC', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  methodOrgName: { fontSize: ms(14), color: '#1a1a1a', fontWeight: '900' },
  methodOrgAddr: { fontSize: ms(12), color: '#4D3F56', fontWeight: '600', marginTop: vs(2), lineHeight: ms(17) },
  methodHint: { fontSize: ms(11), color: '#8C7895', fontWeight: '600', fontStyle: 'italic', marginTop: vs(8), lineHeight: ms(16) },

  actionRow: { flexDirection: 'row', gap: ms(10), marginBottom: vs(14) },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: vs(13), borderRadius: ms(14), gap: ms(6),
  },
  trackBtn: { backgroundColor: '#1565C0' },
  confirmBtn: { backgroundColor: '#2E7D32' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  card: {
    backgroundColor: '#fff', borderRadius: ms(20), padding: ms(16), marginBottom: vs(14),
    borderWidth: 1, borderColor: '#EFE6F5',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(12), gap: ms(6) },
  cardTitle: { fontSize: ms(15), fontWeight: '900', color: '#1a1a1a' },
  emptyHint: { fontSize: ms(12), color: '#8C7895', fontStyle: 'italic' },

  timelineItem: { flexDirection: 'row', marginBottom: vs(14) },
  timelineDot: { width: ms(10), height: ms(10), borderRadius: ms(5), backgroundColor: '#B084CC', marginTop: vs(4), marginRight: ms(12) },
  timelineContent: { flex: 1, borderLeftWidth: 2, borderLeftColor: '#F2EBF4', paddingLeft: ms(12), marginLeft: -ms(7), marginTop: -vs(2), paddingTop: vs(2) },
  timelineMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: vs(4) },
  timelineStatus: { fontSize: ms(13), fontWeight: '800', color: '#B084CC' },
  timelineTime: { fontSize: ms(10), color: '#8C7895', fontWeight: '600' },
  timelineDesc: { backgroundColor: '#FDF7FB', borderRadius: ms(8), borderWidth: 1, borderColor: '#F2EBF4', padding: ms(10) },
  timelineDescText: { fontSize: ms(12), color: '#4D3F56' },

  wigInfoRow: { flexDirection: 'row', gap: ms(12) },
  wigInfoCell: { flex: 1, backgroundColor: '#FDF7FB', borderRadius: ms(12), padding: ms(12) },
  wigInfoLabel: { fontSize: ms(11), color: '#8C7895', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  wigInfoValue: { fontSize: ms(14), color: '#1a1a1a', fontWeight: '900', marginTop: vs(4) },
  storyBox: { backgroundColor: '#FDF7FB', borderRadius: ms(12), padding: ms(14), marginTop: vs(12), borderLeftWidth: 3, borderLeftColor: '#B084CC' },
  storyText: { fontSize: ms(13), color: '#4D3F56', fontStyle: 'italic', lineHeight: ms(20) },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: ms(20) },
  modalCard: { backgroundColor: '#fff', borderRadius: ms(22), padding: ms(24), width: '100%', maxWidth: ms(360), alignItems: 'center' },
  modalIconWrap: { width: ms(64), height: ms(64), borderRadius: ms(32), backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: vs(12) },
  modalTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(8) },
  modalMsg: { fontSize: ms(13), color: '#666', textAlign: 'center', marginBottom: vs(20), lineHeight: ms(20) },
  modalActions: { flexDirection: 'row', gap: ms(10), width: '100%' },
  modalBtn: { flex: 1, paddingVertical: vs(12), borderRadius: ms(12), alignItems: 'center' },
  modalCancelBtn: { backgroundColor: '#EEE' },
  modalCancelText: { color: '#666', fontWeight: '800', fontSize: ms(14), textAlign: 'center' },
  modalConfirmBtn: { backgroundColor: '#2E7D32' },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: ms(14), textAlign: 'center' },
});
