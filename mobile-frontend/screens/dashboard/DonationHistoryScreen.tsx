import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import api from '../../lib/api';
import DonorCertificateScreen from './DonorCertificateScreen';

interface DonationRecord {
  id: string;
  type: 'hair' | 'monetary';
  amount: number;
  status: string;
  createdAt: string;
  reference?: string;
  // Donor-supplied courier tracking URL (mirrors web's DonorTrackingDetail).
  donorDeliveryLink?: string | null;
  // Donor-picked target delivery date (mirrors web's schedule-delivery flow).
  scheduledDeliveryAt?: string | null;
  certificateNo?: string | null;
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

// ── Date helpers (Asia/Manila for parity with the backend due-check) ──────
// Backend computes "due" by comparing scheduled & today as YYYY-MM-DD in
// Asia/Manila, so we use the same yardstick to decide which UI branch to show.
const localYMD = (d: Date) => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = f.find((p) => p.type === 'year')?.value;
  const m = f.find((p) => p.type === 'month')?.value;
  const day = f.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
};

const isDeliveryDue = (scheduledIso?: string | null) => {
  if (!scheduledIso) return false;
  const scheduled = new Date(scheduledIso);
  if (isNaN(scheduled.getTime())) return false;
  return localYMD(scheduled) <= localYMD(new Date());
};

const formatScheduledLong = (scheduledIso?: string | null) => {
  if (!scheduledIso) return '';
  const d = new Date(scheduledIso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// ── ScheduleDeliveryForm ──────────────────────────────────────────────────
// Donor picks the date they plan to drop off the hair. POSTs the date
// (as local-midnight ISO) to /donations/:reference/schedule-delivery so staff
// get notified and the backend tracker can ping the donor on the due date.
function ScheduleDeliveryForm({
  reference,
  scheduledAt,
  onSaved,
}: {
  reference: string;
  scheduledAt?: string | null;
  onSaved: (newIso: string) => void;
}) {
  const [editing, setEditing] = useState(!scheduledAt);
  const [saving, setSaving] = useState(false);
  // Currently-selected YYYY-MM-DD (local). Empty until the donor picks.
  const [picked, setPicked] = useState('');

  const presets: { label: string; daysFromToday: number }[] = [
    { label: 'Today', daysFromToday: 0 },
    { label: 'Tomorrow', daysFromToday: 1 },
    { label: 'In 3 days', daysFromToday: 3 },
    { label: 'In 1 week', daysFromToday: 7 },
    { label: 'In 2 weeks', daysFromToday: 14 },
  ];

  const ymdForOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const submit = async () => {
    if (!picked) {
      Alert.alert('Pick a Date', 'Please choose the date you plan to send your hair donation.');
      return;
    }
    // Build local-midnight ISO — matches the website's localMidnight approach
    // so the backend's PHT comparison treats the donor's chosen calendar day
    // as the due day from 12:00 AM Manila time.
    const [y, m, d] = picked.split('-').map(Number);
    if (!y || !m || !d) {
      Alert.alert('Invalid Date', 'Please use the YYYY-MM-DD format (e.g., 2026-06-20).');
      return;
    }
    const localMidnight = new Date(y, m - 1, d);
    if (isNaN(localMidnight.getTime())) {
      Alert.alert('Invalid Date', 'That date does not look right. Please try again.');
      return;
    }
    // Same past-date guard as backend (which returns 422 anyway, but a friendly
    // upfront error is nicer than a generic axios error).
    const todayYmd = ymdForOffset(0);
    if (picked < todayYmd) {
      Alert.alert('Past Date', 'Scheduled date cannot be in the past.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/donations/${reference}/schedule-delivery`, {
        scheduled_delivery_at: localMidnight.toISOString(),
      });
      onSaved(localMidnight.toISOString());
      setEditing(false);
      setPicked('');
      Alert.alert(
        'Delivery Date Saved',
        `We'll remind you on ${formatScheduledLong(localMidnight.toISOString())} to submit your tracking link.`,
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || 'Failed to schedule delivery.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Already scheduled, not editing — show the locked-in date + Reschedule ──
  if (scheduledAt && !editing) {
    return (
      <View style={styles.scheduleBox}>
        <View style={styles.scheduleHeader}>
          <Ionicons name="calendar" size={ms(14)} color="#AD246D" />
          <Text style={styles.scheduleTitle}>Delivery Date Scheduled</Text>
        </View>
        <Text style={styles.scheduleHint}>
          You&apos;re scheduled to send your hair donation on{' '}
          <Text style={{ fontWeight: '900', color: '#AD246D' }}>{formatScheduledLong(scheduledAt)}</Text>.
          On that day, this card will let you submit your courier tracking link.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setEditing(true);
            setPicked('');
          }}
          style={styles.rescheduleBtn}
        >
          <Text style={styles.rescheduleBtnText}>Reschedule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Picking / editing the date ──
  return (
    <View style={styles.scheduleBox}>
      <View style={styles.scheduleHeader}>
        <Ionicons name="calendar" size={ms(14)} color="#AD246D" />
        <Text style={styles.scheduleTitle}>
          {scheduledAt ? 'Reschedule Delivery' : 'Schedule Your Hair Delivery'}
        </Text>
      </View>
      <Text style={styles.scheduleHint}>
        Pick the date you plan to send your donated hair to us. We&apos;ll notify our staff right
        away, and on the day you choose you&apos;ll be able to submit your delivery tracking link
        here.
      </Text>

      {/* Quick-pick chips */}
      <View style={styles.chipRow}>
        {presets.map((p) => {
          const ymd = ymdForOffset(p.daysFromToday);
          const active = picked === ymd;
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => setPicked(ymd)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Manual entry — donors with a date further out can type it in directly */}
      <Text style={styles.scheduleSubLabel}>Or enter a date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.scheduleInput}
        value={picked}
        onChangeText={setPicked}
        placeholder="2026-06-20"
        placeholderTextColor="#bbb"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />

      <View style={styles.scheduleActions}>
        {scheduledAt && (
          <TouchableOpacity
            onPress={() => {
              setEditing(false);
              setPicked('');
            }}
            style={styles.scheduleCancelBtn}
          >
            <Text style={styles.scheduleCancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={submit}
          disabled={saving || !picked}
          style={[styles.scheduleSubmitBtn, (saving || !picked) && { opacity: 0.5 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.scheduleSubmitText}>Confirm Date</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── DeliveryLinkForm ──────────────────────────────────────────────────────
// Mirrors the website's DonorTrackingDetail flow: input the courier tracking
// URL, POST /donations/:reference/delivery-link, then show the saved link
// with an "Open" button. Lives inline so each approved card carries its own
// form state without inflating the parent screen.
function DeliveryLinkForm({
  reference,
  initialLink,
  onSaved,
}: {
  reference: string;
  initialLink?: string | null;
  onSaved: (link: string) => void;
}) {
  const [link, setLink] = useState(initialLink || '');
  const [editing, setEditing] = useState(!initialLink);
  const [saving, setSaving] = useState(false);

  const validUrl = (() => {
    const trimmed = link.trim();
    if (!trimmed) return false;
    // Basic URL gate — accepts http(s)://… so users can paste Grab, Lalamove,
    // J&T tracking pages without us being too strict about format.
    return /^https?:\/\/\S+\.\S+/i.test(trimmed);
  })();

  const submit = async () => {
    if (!validUrl) {
      Alert.alert('Invalid Link', 'Please paste a valid tracking URL starting with http:// or https://');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/donations/${reference}/delivery-link`, { donor_delivery_link: link.trim() });
      onSaved(link.trim());
      setEditing(false);
      Alert.alert('Saved', 'Delivery link submitted. Staff can now track your shipment.');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save link.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.trackingBox}>
      <View style={styles.trackingHeader}>
        <Ionicons name="cube-outline" size={ms(14)} color="#D63B8A" />
        <Text style={styles.trackingTitle}>
          {initialLink ? 'Tracking' : 'Add Tracking Link'}
        </Text>
      </View>

      {!editing && initialLink ? (
        <View style={styles.trackingLinkRow}>
          <TouchableOpacity
            style={styles.trackingLinkBtn}
            onPress={() => Linking.openURL(initialLink)}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={ms(14)} color="#3b82f6" />
            <Text style={styles.trackingLinkBtnText} numberOfLines={1}>
              Open tracking page
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.trackingEditBtn}>
            <Text style={styles.trackingEditBtnText}>Update</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.trackingHint}>
            Paste your courier tracking URL.
          </Text>
          <TextInput
            style={styles.trackingInput}
            value={link}
            onChangeText={setLink}
            placeholder="https://tracking-link.com/..."
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <View style={styles.trackingActions}>
            {initialLink && (
              <TouchableOpacity onPress={() => { setLink(initialLink); setEditing(false); }} style={styles.trackingCancelBtn}>
                <Text style={styles.trackingCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={submit}
              disabled={saving || !validUrl}
              style={[styles.trackingSubmitBtn, (saving || !validUrl) && { opacity: 0.5 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.trackingSubmitText}>
                  {initialLink ? 'Update Link' : 'Submit Link'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

export default function DonationHistoryScreen({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<{ reference: string; certificateNo: string } | null>(null);
  const insets = useSafeAreaInsets();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      // Hair donations live in the `donations` table; monetary donations in
      // `monetary_donations`. Pull both, tag with type, then merge so the
      // user sees a single timeline labeled correctly.
      const [hairRes, moneyRes] = await Promise.all([
        api.get('/donations').catch(() => ({ data: [] as any[] })),
        api.get('/monetary').catch(() => ({ data: [] as any[] })),
      ]);

      const hair: DonationRecord[] = (hairRes.data || []).map((d: any) => ({
        id: `hair-${d.id}`,
        type: 'hair',
        amount: 0,
        status: d.status || 'Submitted',
        createdAt: d.createdAt || d.created_at,
        reference: d.reference,
        donorDeliveryLink: d.donorDeliveryLink || d.donor_delivery_link || null,
        scheduledDeliveryAt: d.scheduledDeliveryAt || d.scheduled_delivery_at || null,
        certificateNo: d.certificateNo || d.certificate_no || null,
      }));

      const monetary: DonationRecord[] = (moneyRes.data || []).map((m: any) => ({
        id: m.id || `monetary-${m.reference || Date.now()}`,
        type: 'monetary',
        amount: Number(m.amount || 0),
        status: m.status || 'Submitted',
        createdAt: m.createdAt || m.created_at,
        reference: m.reference,
      }));

      const merged = [...hair, ...monetary].sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });

      setDonations(merged);
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

  /**
   * Status pill style for the donation card.
   *
   * Two product rules baked in here:
   *   1. **Monetary** has no "Pending" state from the donor's POV — once
   *      they hit submit, it's just "Submitted". We use a soft neutral
   *      blue, not the alarming orange.
   *   2. **Hair** with a certificate already issued (staff confirmed
   *      receipt → backend generated `certificateNo`) collapses every
   *      downstream status (`In Queue`, `In Progress`, `Wig Received`...)
   *      into one green "Completed" badge. Those downstream statuses are
   *      wigmaker-facing and shouldn't surface in the donor's history.
   */
  const getStatusStyle = (
    status: string,
    type: string,
    hasCertificate: boolean = false,
  ) => {
    const s = (status || '').toLowerCase();

    // Rule 2 — hair with cert: this IS the end of the donor's tracking.
    if (type === 'hair' && hasCertificate) {
      return { bg: '#E8F5E9', text: '#2E7D32', label: 'Completed' };
    }

    // Rule 1 — monetary stays "Submitted" until verified (no Pending tone).
    if (type === 'monetary' && (s === 'pending' || s === 'submitted')) {
      return { bg: '#E0F2FE', text: '#0369A1', label: 'Submitted' };
    }

    switch (s) {
      case 'approved':
      case 'completed':
      case 'received hair':
      case 'wig received':
      case 'verified':
      case 'received':
        return { bg: '#E8F5E9', text: '#2E7D32', label: 'Approved' };
      case 'pending':
      case 'submitted':
        // Only hair hits this branch now — keep the "Pending" tone so the
        // donor knows they still need to deliver / wait for verification.
        return { bg: '#FFF3E0', text: '#EF6C00', label: 'Pending' };
      case 'rejected':
        return { bg: '#FFEBEE', text: '#C62828', label: 'Rejected' };
      default:
        return { bg: '#F5F5F5', text: '#757575', label: status };
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (selectedCertificate) {
    return (
      <DonorCertificateScreen
        reference={selectedCertificate.reference}
        certificateNo={selectedCertificate.certificateNo}
        onBack={() => setSelectedCertificate(null)}
      />
    );
  }

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
                <Text style={{ fontWeight: '800' }}>Note:</Text> Stars are credited once your hair donation reaches <Text style={{ color: '#2E7D32', fontWeight: '700' }}>Approved</Text>. Monetary donations are tracked for transparency and don&apos;t award stars.
              </Text>
            </View>

            {donations.map((item, idx) => {
              // Pass cert presence so hair donations with a generated cert
              // collapse to a single "Completed" badge instead of leaking
              // downstream wigmaker statuses like "In Queue" into the UI.
              const status = getStatusStyle(item.status, item.type, !!item.certificateNo);
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
                        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
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

                   {/* Certificate gate — show ONLY after staff confirms physical
                       receipt of the hair. The backend sets `certificateNo`
                       server-side at the `Received Hair` status transition
                       (see donation.routes.ts), so a non-null cert number is the
                       single source of truth that the hair has been received. */}
                   {item.type === 'hair' && !!item.certificateNo && (
                     <TouchableOpacity
                       style={styles.certificateBtn}
                       onPress={() => setSelectedCertificate({ reference: item.reference || item.id, certificateNo: item.certificateNo as string })}
                     >
                       <Ionicons name="ribbon-outline" size={ms(16)} color="#fff" style={{ marginRight: ms(8) }} />
                       <Text style={styles.certificateBtnText}>VIEW CERTIFICATE</Text>
                     </TouchableOpacity>
                   )}

                   {/* If approved but hair not yet received, surface a small
                       hint so the donor understands why the cert isn't ready. */}
                   {item.type === 'hair' && !item.certificateNo && ['approved', 'verified'].includes(item.status.toLowerCase()) && (
                     <View style={styles.certPendingChip}>
                       <Ionicons name="time-outline" size={ms(13)} color="#A8A29E" />
                       <Text style={styles.certPendingText}>
                         Certificate unlocks once staff confirms receipt
                       </Text>
                     </View>
                   )}
                   
                   {item.type === 'hair' && ['approved', 'verified'].includes(item.status.toLowerCase()) && (
                     <>
                       {/* Trimmed delivery instructions — was a wordy multi-paragraph
                           block. Now: tight header + address pill + one-line ref. */}
                       <View style={styles.deliveryContainer}>
                          <View style={styles.deliveryHeader}>
                            <Ionicons name="location" size={ms(14)} color="#D63B8A" />
                            <Text style={styles.deliveryTitle}>Drop-off</Text>
                          </View>
                          <View style={styles.addressBox}>
                            <Text style={styles.addressText}>
                              Manila Downtown YMCA · 945 Sabino Padilla St., Sta. Cruz, Manila
                            </Text>
                          </View>
                          <Text style={styles.deliveryNote}>
                            Ref: <Text style={{ fontWeight: '800' }}>{item.reference || item.id}</Text>
                          </Text>
                       </View>

                       {/* Verified donations now go through a schedule-first flow that
                           mirrors the website: pick a delivery date → backend notifies
                           staff and pings the donor on the due day → only then does the
                           tracking-link form appear. "Approved" donations keep the
                           legacy direct-link flow so we don't break any in-flight ones. */}
                       {item.reference && item.status.toLowerCase() === 'verified' && !isDeliveryDue(item.scheduledDeliveryAt) && (
                         <ScheduleDeliveryForm
                           reference={item.reference}
                           scheduledAt={item.scheduledDeliveryAt}
                           onSaved={(newIso) => {
                             setDonations((prev) =>
                               prev.map((d) =>
                                 d.id === item.id ? { ...d, scheduledDeliveryAt: newIso } : d,
                               ),
                             );
                           }}
                         />
                       )}

                       {/* Tracking link form — same flow as the website's DonorTrackingDetail.
                           Shown when (a) status is "approved" (legacy path) or
                           (b) status is "verified" AND the donor-picked delivery date
                           has arrived (Asia/Manila). */}
                       {item.reference && (
                         item.status.toLowerCase() === 'approved' ||
                         (item.status.toLowerCase() === 'verified' && isDeliveryDue(item.scheduledDeliveryAt))
                       ) && (
                         <DeliveryLinkForm
                           reference={item.reference}
                           initialLink={item.donorDeliveryLink}
                           onSaved={(link) => {
                             setDonations((prev) =>
                               prev.map((d) =>
                                 d.id === item.id ? { ...d, donorDeliveryLink: link } : d,
                               ),
                             );
                           }}
                         />
                       )}
                     </>
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

  // ── Tracking-link form (matches website's DonorTrackingDetail) ───────
  trackingBox: {
    marginTop: vs(12),
    padding: ms(14),
    backgroundColor: '#FDF7FB',
    borderRadius: ms(14),
    borderWidth: 1.5,
    borderColor: '#E8D5E8',
    borderStyle: 'dashed',
  },
  trackingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(8) },
  trackingTitle: { fontSize: ms(13), fontWeight: '900', color: '#AD246D', marginLeft: ms(6) },
  trackingHint: { fontSize: ms(11), color: '#8C7895', marginBottom: vs(10), lineHeight: ms(16) },
  trackingInput: {
    backgroundColor: '#fff',
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: '#EAD7E8',
    paddingHorizontal: ms(12),
    paddingVertical: vs(10),
    fontSize: ms(13),
    color: '#1a1a1a',
  },
  trackingActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: vs(10), gap: ms(8) },
  trackingSubmitBtn: {
    backgroundColor: '#AD246D',
    paddingHorizontal: ms(18),
    paddingVertical: vs(10),
    borderRadius: ms(10),
    minWidth: ms(110),
    alignItems: 'center',
  },
  trackingSubmitText: { color: '#fff', fontSize: ms(13), fontWeight: '800' },
  trackingCancelBtn: {
    paddingHorizontal: ms(14),
    paddingVertical: vs(10),
    borderRadius: ms(10),
    backgroundColor: '#EEE',
  },
  trackingCancelText: { color: '#666', fontSize: ms(13), fontWeight: '700' },
  trackingLinkRow: { flexDirection: 'row', alignItems: 'center', gap: ms(8) },
  trackingLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: ms(10),
    paddingHorizontal: ms(12),
    paddingVertical: vs(10),
  },
  trackingLinkBtnText: { color: '#3b82f6', fontSize: ms(13), fontWeight: '800', marginLeft: ms(6), textDecorationLine: 'underline' },
  trackingEditBtn: {
    paddingHorizontal: ms(12),
    paddingVertical: vs(10),
    borderRadius: ms(10),
    backgroundColor: '#FCE7F3',
  },
  trackingEditBtnText: { color: '#AD246D', fontSize: ms(12), fontWeight: '800' },
  certificateBtn: {
    backgroundColor: '#AD246D',
    borderRadius: ms(12),
    height: vs(42),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(12),
    shadowColor: '#AD246D',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  certificateBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(13), letterSpacing: 0.5 },
  // ── Schedule-delivery form (mirrors website's schedule UI) ──────────
  scheduleBox: {
    marginTop: vs(12),
    padding: ms(14),
    backgroundColor: '#FDF7FB',
    borderRadius: ms(14),
    borderWidth: 1.5,
    borderColor: '#EAD7E8',
    borderStyle: 'dashed',
  },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(8) },
  scheduleTitle: { fontSize: ms(13), fontWeight: '900', color: '#AD246D', marginLeft: ms(6) },
  scheduleHint: { fontSize: ms(11), color: '#8C7895', lineHeight: ms(17), marginBottom: vs(10) },
  scheduleSubLabel: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#8C7895',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: vs(10),
    marginBottom: vs(6),
  },
  scheduleInput: {
    backgroundColor: '#fff',
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: '#EAD7E8',
    paddingHorizontal: ms(12),
    paddingVertical: vs(10),
    fontSize: ms(13),
    color: '#1a1a1a',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: ms(6) },
  chip: {
    paddingHorizontal: ms(12),
    paddingVertical: vs(7),
    borderRadius: ms(16),
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAD7E8',
  },
  chipActive: { backgroundColor: '#AD246D', borderColor: '#AD246D' },
  chipText: { fontSize: ms(12), fontWeight: '700', color: '#AD246D' },
  chipTextActive: { color: '#fff' },
  scheduleActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: vs(12), gap: ms(8) },
  scheduleSubmitBtn: {
    backgroundColor: '#AD246D',
    paddingHorizontal: ms(18),
    paddingVertical: vs(10),
    borderRadius: ms(10),
    minWidth: ms(120),
    alignItems: 'center',
  },
  scheduleSubmitText: { color: '#fff', fontSize: ms(13), fontWeight: '800' },
  scheduleCancelBtn: {
    paddingHorizontal: ms(14),
    paddingVertical: vs(10),
    borderRadius: ms(10),
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAD7E8',
  },
  scheduleCancelText: { color: '#8C7895', fontSize: ms(13), fontWeight: '700' },
  rescheduleBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: ms(16),
    paddingVertical: vs(8),
    borderRadius: ms(10),
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EAD7E8',
    marginTop: vs(4),
  },
  rescheduleBtnText: { color: '#AD246D', fontSize: ms(12), fontWeight: '800' },

  certPendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(12),
    paddingVertical: vs(8),
    backgroundColor: '#F5F5F0',
    borderRadius: ms(10),
    marginTop: vs(8),
    alignSelf: 'flex-start',
  },
  certPendingText: {
    fontSize: ms(11),
    color: '#78716C',
    fontWeight: '600',
  },
});

