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
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, vs } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import api from '../../lib/api';

interface StatusHistory {
  id?: string | number;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface DonationDetail {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  scheduledDeliveryAt: string | null;
  donorDeliveryLink: string | null;
  user?: { firstName?: string; lastName?: string; name?: string } | null;
  statusHistories?: StatusHistory[];
}

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

export default function DonorTrackingDetailScreen({ reference, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DonationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/donations/${reference}`);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch donation detail', err);
      Alert.alert('Error', 'Donation not found or you do not have access.');
      onBack();
    } finally {
      setLoading(false);
    }
  }, [reference, onBack]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  
  const [deliveryLink, setDeliveryLink] = useState('');
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  useEffect(() => {
    if (data?.donorDeliveryLink) setDeliveryLink(data.donorDeliveryLink);
  }, [data]);

  const handleScheduleDelivery = async () => {
    if (!scheduleDate) return;
    setIsScheduling(true);
    try {
      const localMidnight = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
      await api.post(`/donations/${reference}/schedule-delivery`, {
        scheduled_delivery_at: localMidnight.toISOString(),
      });
      fetchDetail();
      setScheduleDate(null);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.response?.data?.message || 'Failed to schedule delivery');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSubmitLink = async () => {
    if (!deliveryLink.trim()) return;
    setIsSubmittingLink(true);
    try {
      await api.post(`/donations/${reference}/delivery-link`, { 
        donor_delivery_link: deliveryLink 
      });
      Alert.alert('Success', 'Delivery tracking link submitted successfully!');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit link');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const fullName = data?.user
    ? `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.name || 'Donor'
    : 'Donor';

  const tint = data ? statusTint(data.status) : null;
  const canTrack = !!data?.donorDeliveryLink && data?.status !== 'Cancelled';

  const scheduledAt = data?.scheduledDeliveryAt ? new Date(data.scheduledDeliveryAt) : null;
  const deliveryDue = !!scheduledAt && (() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const scheduledStr = scheduledAt.toLocaleDateString('en-CA');
    return scheduledStr <= todayStr;
  })();

  if (loading || !data) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#D63B8A', '#AD246D']} style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tracking Detail</Text>
            <View style={{ width: ms(44) }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#AD246D" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient colors={['#D63B8A', '#AD246D']} style={[styles.header, { paddingTop: insets.top }]}>
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
            <MaterialCommunityIcons name="pound" size={ms(18)} color="#AD246D" />
            <Text style={styles.summaryLabel}>Reference</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{data.reference}</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="information-outline" size={ms(18)} color="#AD246D" />
            <Text style={styles.summaryLabel}>Status</Text>
            {tint && (
              <View style={[styles.statusPill, { backgroundColor: tint.bg }]}>
                <Text style={[styles.statusPillText, { color: tint.text }]}>{data.status.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="calendar" size={ms(18)} color="#AD246D" />
            <Text style={styles.summaryLabel}>Submitted</Text>
            <Text style={styles.summaryValue}>{new Date(data.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="account" size={ms(18)} color="#AD246D" />
            <Text style={styles.summaryLabel}>Donor</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{fullName}</Text>
          </View>
        </Animated.View>

        {/* Action row — Track Link */}
        {canTrack && (
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.trackBtn]}
              onPress={() => Linking.openURL(data.donorDeliveryLink!)}
              activeOpacity={0.85}
            >
              <Ionicons name="location" size={ms(18)} color="#fff" />
              <Text style={styles.actionBtnText}>Track Donation Shipment</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Roadmap timeline */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="source-branch" size={ms(20)} color="#AD246D" />
            <Text style={styles.cardTitle}>Donation Roadmap</Text>
          </View>
          {(() => {
            const status = (data.status || '').toLowerCase();
            let currentStep = 0;
            if (['verified', 'matched'].includes(status)) currentStep = 1;
            if (['received hair', 'in progress', 'in transit'].includes(status)) currentStep = 2;
            if (['completed', 'wig received'].includes(status)) currentStep = 3;

            const steps = [
              { title: 'Submitted', desc: 'Your donation form is under review.' },
              { title: 'Verified', desc: 'Your donation is approved. Please schedule delivery.' },
              { title: 'Received', desc: 'We have safely received your hair donation.' },
              { title: 'Completed', desc: 'Your donation has been used to craft a wig.' },
            ];

            return (
              <View style={{ marginTop: vs(10) }}>
                {steps.map((step, i) => {
                  const isDone = currentStep >= i;
                  return (
                    <View key={i} style={styles.timelineItem}>
                      <View style={[styles.timelineDot, isDone ? { backgroundColor: '#AD246D' } : { backgroundColor: '#F9E6F0' }]} />
                      <View style={[styles.timelineContent, i === steps.length - 1 && { borderLeftColor: 'transparent' }]}>
                        <View style={styles.timelineMeta}>
                          <Text style={[styles.timelineStatus, !isDone && { color: '#8C7895' }]}>{step.title}</Text>
                        </View>
                        <View style={[styles.timelineDesc, !isDone && { backgroundColor: '#fff', borderColor: '#F9E6F0' }]}>
                          <Text style={[styles.timelineDescText, !isDone && { color: '#8C7895' }]}>
                            {step.desc}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </Animated.View>

        {data.status === 'Verified' && !deliveryDue && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.card, { backgroundColor: '#FDF7FB', borderColor: '#AD246D', borderWidth: 1.5, borderStyle: 'dashed' }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="calendar-check" size={ms(24)} color="#AD246D" />
              <Text style={styles.cardTitle}>{scheduledAt ? 'Delivery Date Scheduled' : 'Schedule Your Hair Delivery'}</Text>
            </View>
            {scheduledAt && !scheduleDate ? (
              <View>
                <Text style={[styles.timelineDescText, { marginBottom: vs(12) }]}>
                  You're scheduled to send your hair donation on <Text style={{ color: '#AD246D', fontWeight: 'bold' }}>{scheduledAt.toLocaleDateString()}</Text>.
                  On that day, this section will let you submit your delivery tracking link.
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#AD246D' }]}
                  onPress={() => setScheduleDate(scheduledAt)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionBtnText}>Reschedule</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.timelineDescText, { marginBottom: vs(12) }]}>
                  Pick the date you plan to send your donated hair to us. On the day you choose, you'll be able to submit your delivery tracking link.
                </Text>
                {Platform.OS === 'android' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(10), marginBottom: vs(10) }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ead7e8' }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#AD246D' }]}>{scheduleDate ? scheduleDate.toLocaleDateString() : 'Select Date'}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={scheduleDate || new Date()}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) setScheduleDate(selectedDate);
                        }}
                      />
                    )}
                  </View>
                ) : (
                  <View style={{ marginBottom: vs(10), alignItems: 'flex-start' }}>
                    <DateTimePicker
                      value={scheduleDate || new Date()}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        if (selectedDate) setScheduleDate(selectedDate);
                      }}
                    />
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', gap: ms(10) }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#AD246D', opacity: !scheduleDate || isScheduling ? 0.7 : 1 }]}
                    onPress={handleScheduleDelivery}
                    disabled={!scheduleDate || isScheduling}
                    activeOpacity={0.85}
                  >
                    {isScheduling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Confirm Date</Text>}
                  </TouchableOpacity>
                  {scheduledAt && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#8c7895' }]}
                      onPress={() => setScheduleDate(null)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {data.status === 'Verified' && deliveryDue && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.card, { backgroundColor: '#FDF7FB', borderColor: '#AD246D', borderWidth: 1.5, borderStyle: 'dashed' }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="package-variant-closed" size={ms(24)} color="#AD246D" />
              <Text style={styles.cardTitle}>Submit Tracking Link</Text>
            </View>
            <Text style={[styles.timelineDescText, { marginBottom: vs(12) }]}>
              Today is your scheduled delivery date! Please provide the tracking URL from your courier (e.g., Grab, Lalamove, LBC) so our staff can monitor the arrival.
            </Text>
            <View style={{ gap: vs(10) }}>
              <TextInput
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ead7e8', padding: ms(12), borderRadius: ms(10), fontSize: ms(14) }}
                placeholder="https://tracking-link.com/..."
                value={deliveryLink}
                onChangeText={setDeliveryLink}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#AD246D', opacity: !deliveryLink.trim() || isSubmittingLink ? 0.7 : 1 }]}
                onPress={handleSubmitLink}
                disabled={!deliveryLink.trim() || isSubmittingLink}
                activeOpacity={0.85}
              >
                {isSubmittingLink ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>{data.donorDeliveryLink ? 'Update Link' : 'Submit Link'}</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF5F8' },
  header: {
    borderBottomLeftRadius: ms(30),
    borderBottomRightRadius: ms(30),
    shadowColor: '#AD246D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
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
    borderWidth: 1, borderColor: '#F9E6F0',
  },
  summaryLabel: { fontSize: ms(11), color: '#8C7895', fontWeight: '800', marginTop: vs(6), textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: ms(14), color: '#1a1a1a', fontWeight: '800', marginTop: vs(2) },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: ms(10), paddingVertical: vs(4), borderRadius: ms(10), marginTop: vs(4) },
  statusPillText: { fontSize: ms(10), fontWeight: '900', letterSpacing: 0.5 },

  actionRow: { flexDirection: 'row', gap: ms(10), marginBottom: vs(14) },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: vs(13), borderRadius: ms(14), gap: ms(6),
  },
  trackBtn: { backgroundColor: '#1565C0' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  card: {
    backgroundColor: '#fff', borderRadius: ms(20), padding: ms(16), marginBottom: vs(14),
    borderWidth: 1, borderColor: '#F9E6F0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(12), gap: ms(6) },
  cardTitle: { fontSize: ms(15), fontWeight: '900', color: '#1a1a1a' },
  emptyHint: { fontSize: ms(12), color: '#8C7895', fontStyle: 'italic' },

  timelineItem: { flexDirection: 'row', marginBottom: vs(14) },
  timelineDot: { width: ms(10), height: ms(10), borderRadius: ms(5), backgroundColor: '#AD246D', marginTop: vs(4), marginRight: ms(12) },
  timelineContent: { flex: 1, borderLeftWidth: 2, borderLeftColor: '#F9E6F0', paddingLeft: ms(12), marginLeft: -ms(7), marginTop: -vs(2), paddingTop: vs(2) },
  timelineMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: vs(4) },
  timelineStatus: { fontSize: ms(13), fontWeight: '800', color: '#AD246D' },
  timelineTime: { fontSize: ms(10), color: '#8C7895', fontWeight: '600' },
  timelineDesc: { backgroundColor: '#FDF7FB', borderRadius: ms(8), borderWidth: 1, borderColor: '#F9E6F0', padding: ms(10) },
  timelineDescText: { fontSize: ms(12), color: '#4D3F56' },
});
