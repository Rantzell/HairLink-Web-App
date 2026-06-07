import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { ms, vs } from '../../lib/scaling';
import api from '../../lib/api';

/**
 * Donor rewards screen — backed by the new milestone + voucher API.
 *
 *   GET /api/rewards/milestone        → { progress, threshold, remaining, percent }
 *   GET /api/rewards/vouchers         → Voucher[]
 *   POST /api/rewards/vouchers/:code/redeem → { success, voucher }
 *
 * Donors earn +10 pts per received hair donation, +5 per referral given,
 * and a one-time +3 for using someone else's referral code.
 * Once the milestone counter hits the threshold (100) a saveable free-wig
 * voucher is auto-issued server-side and the counter resets. This screen
 * just visualises that state.
 */

interface Milestone {
  progress: number;
  threshold: number;
  remaining: number;
  percent: number;
}

interface Voucher {
  id: string;
  code: string;
  type: string;
  status: 'active' | 'redeemed' | 'expired' | string;
  issuedAt: string;
  redeemedAt: string | null;
  expiresAt: string | null;
}

export default function RewardsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [detail, setDetail] = useState<Voucher | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [mRes, vRes] = await Promise.all([
        api.get('/rewards/milestone').catch(() => ({ data: null })),
        api.get('/rewards/vouchers').catch(() => ({ data: [] as Voucher[] })),
      ]);
      setMilestone(mRes.data || null);
      setVouchers(Array.isArray(vRes.data) ? vRes.data : []);
    } catch (err) {
      console.warn('[Rewards] fetch failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', `Voucher code ${code} copied to clipboard.`);
  };

  const confirmRedeem = (voucher: Voucher) => {
    Alert.alert(
      'Redeem Voucher',
      `Mark ${voucher.code} as redeemed? This can't be undone — only do this when you're presenting the voucher to staff.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Redeem',
          style: 'destructive',
          onPress: async () => {
            setRedeeming(voucher.code);
            try {
              await api.post(`/rewards/vouchers/${voucher.code}/redeem`);
              Alert.alert('Redeemed', 'Voucher has been marked as used.');
              setDetail(null);
              fetchAll();
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Could not redeem voucher.';
              Alert.alert('Redeem Failed', msg);
            } finally {
              setRedeeming(null);
            }
          },
        },
      ],
    );
  };

  const fmtDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusStyle = (s: string) => {
    switch (s) {
      case 'active':   return { bg: '#FFF0F8', text: '#C2185B' };
      case 'redeemed': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'expired':  return { bg: '#FFEBEE', text: '#C62828' };
      default:         return { bg: '#F5F5F5', text: '#757575' };
    }
  };

  const activeCount = vouchers.filter((v) => v.status === 'active').length;
  const percent = milestone?.percent ?? 0;
  const progress = milestone?.progress ?? 0;
  const threshold = milestone?.threshold ?? 100;
  const remaining = milestone?.remaining ?? threshold;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

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
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Rewards</Text>
            <Text style={styles.headerSub}>{activeCount} active voucher{activeCount === 1 ? '' : 's'}</Text>
          </View>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + vs(30) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1493" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Milestone card */}
        <Animated.View entering={FadeInDown.springify()} style={styles.milestoneCard}>
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneIconBg}>
              <MaterialCommunityIcons name="trophy" size={ms(22)} color="#FF1493" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>Next Free Wig Voucher</Text>
              <Text style={styles.milestoneSub}>
                Earn {threshold} pts to unlock — counter resets after each voucher.
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#FF66B2', '#FF1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.max(percent, 4)}%` }]}
            />
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressValue}>{progress}<Text style={styles.progressOf}> / {threshold} pts</Text></Text>
            <Text style={styles.progressRemaining}>{remaining} pts to go</Text>
          </View>

          <View style={styles.tipsRow}>
            <View style={styles.tipPill}>
              <Ionicons name="cut-outline" size={ms(13)} color="#C2185B" />
              <Text style={styles.tipText}>+10 per donation received</Text>
            </View>
            <View style={styles.tipPill}>
              <Ionicons name="people-outline" size={ms(13)} color="#C2185B" />
              <Text style={styles.tipText}>+5 per referral given</Text>
            </View>
            <View style={styles.tipPill}>
              <Ionicons name="gift-outline" size={ms(13)} color="#C2185B" />
              <Text style={styles.tipText}>+3 for using a code</Text>
            </View>
          </View>
        </Animated.View>

        {/* Vouchers section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Vouchers</Text>
          <Text style={styles.sectionCount}>{vouchers.length} total</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FF1493" />
          </View>
        ) : vouchers.length === 0 ? (
          <Animated.View entering={FadeInUp} style={styles.emptyCard}>
            <MaterialCommunityIcons name="ticket-percent-outline" size={ms(56)} color="#FFD6EF" />
            <Text style={styles.emptyTitle}>No vouchers yet</Text>
            <Text style={styles.emptyDesc}>
              Keep donating and inviting friends — your first free-wig voucher unlocks at {threshold} milestone points.
            </Text>
          </Animated.View>
        ) : (
          vouchers.map((v, i) => {
            const tint = statusStyle(v.status);
            return (
              <Animated.View key={v.id} entering={FadeInUp.delay(i * 60)} style={styles.voucherCard}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => setDetail(v)}>
                  <View style={styles.voucherTop}>
                    <View style={styles.voucherIconBg}>
                      <MaterialCommunityIcons name="ticket-percent" size={ms(22)} color="#FF1493" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.voucherType}>Free Wig Voucher</Text>
                      <Text style={styles.voucherCode}>{v.code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: tint.bg }]}>
                      <Text style={[styles.statusText, { color: tint.text }]}>
                        {v.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.voucherDivider} />

                  <View style={styles.voucherMeta}>
                    <View style={styles.voucherMetaItem}>
                      <Ionicons name="calendar-outline" size={ms(13)} color="#888" />
                      <Text style={styles.voucherMetaText}>Issued {fmtDate(v.issuedAt)}</Text>
                    </View>
                    <View style={styles.voucherMetaItem}>
                      <Ionicons name="time-outline" size={ms(13)} color="#888" />
                      <Text style={styles.voucherMetaText}>
                        {v.status === 'redeemed'
                          ? `Used ${fmtDate(v.redeemedAt)}`
                          : v.expiresAt
                            ? `Expires ${fmtDate(v.expiresAt)}`
                            : 'No expiry'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Detail / redeem modal */}
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          {detail && (
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrap}>
                <MaterialCommunityIcons name="ticket-percent" size={ms(40)} color="#FF1493" />
              </View>
              <Text style={styles.modalTitle}>Free Wig Voucher</Text>
              <View style={[styles.statusBadge, statusStyle(detail.status).bg && { backgroundColor: statusStyle(detail.status).bg, marginTop: vs(6) }]}>
                <Text style={[styles.statusText, { color: statusStyle(detail.status).text }]}>
                  {detail.status.toUpperCase()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.codeBox}
                activeOpacity={0.85}
                onPress={() => copyCode(detail.code)}
              >
                <Text style={styles.codeText}>{detail.code}</Text>
                <Ionicons name="copy-outline" size={ms(18)} color="#C2185B" />
              </TouchableOpacity>
              <Text style={styles.codeHint}>Tap to copy</Text>

              <View style={styles.modalMetaList}>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalMetaLabel}>Issued</Text>
                  <Text style={styles.modalMetaValue}>{fmtDate(detail.issuedAt)}</Text>
                </View>
                {detail.expiresAt && (
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Expires</Text>
                    <Text style={styles.modalMetaValue}>{fmtDate(detail.expiresAt)}</Text>
                  </View>
                )}
                {detail.redeemedAt && (
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Redeemed</Text>
                    <Text style={styles.modalMetaValue}>{fmtDate(detail.redeemedAt)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={() => setDetail(null)}
                >
                  <Text style={styles.modalBtnGhostText}>Close</Text>
                </TouchableOpacity>
                {detail.status === 'active' && (
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSolid, redeeming === detail.code && { opacity: 0.7 }]}
                    onPress={() => confirmRedeem(detail)}
                    disabled={redeeming === detail.code}
                  >
                    {redeeming === detail.code ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalBtnSolidText}>Mark Redeemed</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF5F8' },

  header: {
    borderBottomLeftRadius: ms(28),
    borderBottomRightRadius: ms(28),
    shadowColor: '#FF1493',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(10),
    paddingVertical: vs(14),
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSub: { fontSize: ms(11), color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: vs(2) },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: ms(16), paddingTop: vs(18) },

  // ── Milestone card
  milestoneCard: {
    backgroundColor: '#fff',
    borderRadius: ms(22),
    padding: ms(18),
    marginBottom: vs(20),
    borderWidth: 1,
    borderColor: '#FFE3F1',
    shadowColor: '#FF1493',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  milestoneHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(14), gap: ms(12) },
  milestoneIconBg: {
    width: ms(42), height: ms(42), borderRadius: ms(21),
    backgroundColor: '#FFF0F8',
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneTitle: { fontSize: ms(15), fontWeight: '900', color: '#1a1a1a' },
  milestoneSub: { fontSize: ms(11), color: '#888', fontWeight: '600', marginTop: vs(2), lineHeight: ms(15) },

  progressTrack: {
    height: vs(14),
    backgroundColor: '#FFE3F1',
    borderRadius: ms(8),
    overflow: 'hidden',
    marginBottom: vs(10),
  },
  progressFill: {
    height: '100%',
    borderRadius: ms(8),
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressValue: { fontSize: ms(20), fontWeight: '900', color: '#FF1493' },
  progressOf: { fontSize: ms(12), fontWeight: '700', color: '#999' },
  progressRemaining: { fontSize: ms(12), fontWeight: '700', color: '#999' },

  tipsRow: { flexDirection: 'row', gap: ms(8), marginTop: vs(14), flexWrap: 'wrap' },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    backgroundColor: '#FFF0F8',
    borderRadius: ms(14),
    paddingHorizontal: ms(10),
    paddingVertical: vs(6),
  },
  tipText: { fontSize: ms(11), color: '#C2185B', fontWeight: '800' },

  // ── Voucher list
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: vs(10),
    paddingHorizontal: ms(4),
  },
  sectionTitle: { fontSize: ms(16), fontWeight: '900', color: '#1a1a1a' },
  sectionCount: { fontSize: ms(12), color: '#999', fontWeight: '700' },

  loadingBox: { paddingVertical: vs(40), alignItems: 'center' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: ms(22),
    paddingVertical: vs(40),
    paddingHorizontal: ms(28),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE3F1',
  },
  emptyTitle: { fontSize: ms(16), fontWeight: '900', color: '#1a1a1a', marginTop: vs(14) },
  emptyDesc: {
    fontSize: ms(12),
    color: '#888',
    textAlign: 'center',
    lineHeight: ms(18),
    marginTop: vs(8),
    fontWeight: '600',
  },

  voucherCard: {
    backgroundColor: '#fff',
    borderRadius: ms(20),
    padding: ms(16),
    marginBottom: vs(12),
    borderWidth: 1,
    borderColor: '#FFE3F1',
    shadowColor: '#FF1493',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  voucherTop: { flexDirection: 'row', alignItems: 'center', gap: ms(12) },
  voucherIconBg: {
    width: ms(44), height: ms(44), borderRadius: ms(14),
    backgroundColor: '#FFF0F8',
    alignItems: 'center', justifyContent: 'center',
  },
  voucherType: { fontSize: ms(13), fontWeight: '900', color: '#1a1a1a' },
  voucherCode: { fontSize: ms(12), fontWeight: '700', color: '#888', marginTop: vs(2) },
  statusBadge: {
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    borderRadius: ms(10),
  },
  statusText: { fontSize: ms(10), fontWeight: '900', letterSpacing: 0.5 },

  voucherDivider: { height: 1, backgroundColor: '#F5E6EE', marginVertical: vs(12) },
  voucherMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: ms(8) },
  voucherMetaItem: { flexDirection: 'row', alignItems: 'center', gap: ms(4) },
  voucherMetaText: { fontSize: ms(11), color: '#666', fontWeight: '700' },

  // ── Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(20),
  },
  modalCard: {
    width: '100%',
    maxWidth: ms(360),
    backgroundColor: '#fff',
    borderRadius: ms(24),
    padding: ms(22),
    alignItems: 'center',
  },
  modalIconWrap: {
    width: ms(64), height: ms(64), borderRadius: ms(32),
    backgroundColor: '#FFF0F8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: vs(12),
  },
  modalTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a' },

  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    backgroundColor: '#FFF0F8',
    borderWidth: 1,
    borderColor: '#FFD6EF',
    borderStyle: 'dashed',
    borderRadius: ms(14),
    paddingVertical: vs(14),
    paddingHorizontal: ms(18),
    marginTop: vs(16),
    width: '100%',
  },
  codeText: { fontSize: ms(18), fontWeight: '900', color: '#C2185B', letterSpacing: 1 },
  codeHint: { fontSize: ms(11), color: '#999', fontWeight: '700', marginTop: vs(6) },

  modalMetaList: { width: '100%', marginTop: vs(16), gap: vs(8) },
  modalMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalMetaLabel: { fontSize: ms(12), color: '#888', fontWeight: '700' },
  modalMetaValue: { fontSize: ms(12), color: '#1a1a1a', fontWeight: '900' },

  modalActions: { flexDirection: 'row', gap: ms(10), marginTop: vs(20), width: '100%' },
  modalBtn: { flex: 1, paddingVertical: vs(12), borderRadius: ms(12), alignItems: 'center' },
  modalBtnGhost: { backgroundColor: '#FFF0F8', borderWidth: 1, borderColor: '#FFD6EF' },
  modalBtnGhostText: { color: '#C2185B', fontWeight: '900', fontSize: ms(13) },
  modalBtnSolid: { backgroundColor: '#FF1493' },
  modalBtnSolidText: { color: '#fff', fontWeight: '900', fontSize: ms(13) },
});
