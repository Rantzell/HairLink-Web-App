import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeIn, 
  FadeOut, 
  ZoomIn,
  Layout, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  location: string;
  time: string;
  date: string; // YYYY-MM-DD
  type: 'drive' | 'meeting' | 'other';
  accepted?: boolean;
  status?: string;
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

export default function RecipientCalendarScreen({ onBack }: { onBack?: () => void }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);
  const [showMonthView, setShowMonthView] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // ── Fetch Calendar ──────────────────────────
  React.useEffect(() => {
    fetchCalendar();
  }, [viewDate]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth() + 1;
      const response = await api.get(`/calendar?year=${year}&month=${month}`);
      const items: any[] = response.data?.items || [];

      const mapped: Event[] = items.map((it) => {
        const dt = new Date(it.datetime);
        const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (it.kind === 'event') {
          return {
            id: it.id,
            title: it.title,
            location: it.location || 'TBA',
            time,
            date: it.date,
            type: 'drive',
            accepted: true,
            status: it.status,
          };
        }
        // hair request (or other aid)
        return {
          id: it.id,
          title: it.title || 'Hair Request',
          location: it.location || 'Medical Review',
          time,
          date: it.date,
          type: 'other',
          accepted: it.decision === 'Approved',
          status: it.decision || it.status,
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Dynamic Date Helpers ─────────────────────
  
  const monthName = useMemo(() => {
    return viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [viewDate]);

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', full: `pad-${i}`, isPadding: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const full = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        days.push({ date: i.toString(), full, isPadding: false });
    }
    return days;
  }, [viewDate]);

  const weekDays = useMemo(() => {
    const sel = new Date(selectedDate);
    const startOfWeek = new Date(sel);
    startOfWeek.setDate(sel.getDate() - sel.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return {
            day: dayNames[i],
            date: d.getDate().toString(),
            full: d.toISOString().split('T')[0]
        };
    });
  }, [selectedDate]);

  const dailyEvents = events.filter((e) => e.date === selectedDate);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleAccept = (eventId: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, accepted: true } : e));
    setShowAcceptedModal(true);
  };

  const getDayNameLong = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('default', { weekday: 'long' });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* ── Compact top bar (replaces full-bleed purple gradient) ── */}
      <View style={[styles.slimTopBar, { paddingTop: insets.top + vs(4) }]}>
        <TouchableOpacity onPress={onBack} style={styles.slimBackBtn}>
          <Ionicons name="chevron-back" size={ms(24)} color="#1C1917" />
        </TouchableOpacity>

        <View style={styles.slimTitleGroup}>
          <Text style={styles.slimMonthTitle}>{monthName}</Text>
          <View style={styles.slimNavArrows}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.slimArrowBtn}>
              <Ionicons name="chevron-back" size={ms(18)} color="#B084CC" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.slimArrowBtn}>
              <Ionicons name="chevron-forward" size={ms(18)} color="#B084CC" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.slimViewToggle}
          onPress={() => setShowMonthView(!showMonthView)}
        >
          <Ionicons
            name={showMonthView ? 'list' : 'calendar'}
            size={ms(18)}
            color="#B084CC"
          />
        </TouchableOpacity>
      </View>

      {/* ── Compact calendar card on white ── */}
      <View style={styles.calCard}>
        <Animated.View layout={Layout.springify()}>
          {showMonthView ? (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(150)}
              style={styles.calMonthGrid}
            >
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={styles.calDayName}>{d}</Text>
              ))}
              {monthDays.map((m, idx) => {
                const isSelected = selectedDate === m.full;
                const hasEvent = !m.isPadding && events.some((e) => e.date === m.full);
                return (
                  <ScaleButton
                    key={`${m.full}-${idx}`}
                    style={[
                      styles.calMonthCell,
                      isSelected && styles.calCellSelected,
                      m.isPadding && { opacity: 0 },
                    ]}
                    onPress={() => !m.isPadding && setSelectedDate(m.full)}
                  >
                    <Text
                      style={[
                        styles.calCellText,
                        isSelected && styles.calCellTextSelected,
                      ]}
                    >
                      {m.date}
                    </Text>
                    {hasEvent && <View style={styles.calEventDot} />}
                  </ScaleButton>
                );
              })}
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(150)}
              style={styles.calWeekRow}
            >
              {weekDays.map((w) => {
                const isSelected = selectedDate === w.full;
                const hasEvent = events.some((e) => e.date === w.full);
                return (
                  <ScaleButton
                    key={w.full}
                    style={[styles.calWeekCell, isSelected && styles.calCellSelected]}
                    onPress={() => setSelectedDate(w.full)}
                  >
                    <Text style={[styles.calWeekDayName, isSelected && styles.calCellTextSelected]}>
                      {w.day}
                    </Text>
                    <Text style={[styles.calWeekDate, isSelected && styles.calCellTextSelected]}>
                      {w.date}
                    </Text>
                    {hasEvent && <View style={styles.calEventDot} />}
                  </ScaleButton>
                );
              })}
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.whiteCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{getDayNameLong(selectedDate)} {selectedDate.split('-')[2]}</Text>
            <TouchableOpacity onPress={() => setSelectedDate(today.toISOString().split('T')[0])} style={styles.todayBtn}>
               <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
            <View style={styles.line} />
          </View>

          {dailyEvents.length > 0 ? (
            <FlatList
              data={dailyEvents}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                // Classify by title/type so each row picks the right icon + accent.
                // Recipients usually see admin-scheduled events and hair-request
                // milestones — but stay generous and map monetary too.
                const title = (item.title || '').toLowerCase();
                const isHair = title.includes('hair') && !title.includes('monetary');
                const isMonetary = title.includes('monetary') || title.includes('cash') || title.includes('₱');
                const isRequest = title.includes('request') || title.includes('wig');
                const isDrive = item.type === 'drive';

                const kind = isHair
                  ? { icon: 'content-cut' as const, tint: '#D63B8A', soft: '#FFE0EE', label: 'HAIR DONATION' }
                  : isMonetary
                  ? { icon: 'heart-multiple' as const, tint: '#16A34A', soft: '#DCFCE7', label: 'MONETARY' }
                  : isRequest
                  ? { icon: 'hand-heart' as const, tint: '#B084CC', soft: '#F3EBFB', label: 'WIG REQUEST' }
                  : isDrive
                  ? { icon: 'calendar-star' as const, tint: '#7C3AED', soft: '#EDE9FE', label: 'EVENT' }
                  : { icon: 'ribbon' as const, tint: '#0EA5E9', soft: '#E0F2FE', label: 'ACTIVITY' };

                const statusLc = (item.status || '').toLowerCase();
                // Treat every post-acceptance status as "done" (green badge).
                // The backend's toDecision maps these up to "Approved" but
                // raw-status strings can still flow through for non-request
                // event types, so we list them here too.
                const isDone = [
                  'approved', 'verified', 'received hair', 'wig received',
                  'matched', 'ready for pickup', 'pickup confirmed',
                  'in queue', 'in progress', 'in production', 'shipped',
                  'ready', 'validated', 'completed', 'received',
                ].includes(statusLc);

                return (
                  <Animated.View entering={FadeInDown.springify()} style={styles.eventItem}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeText}>{item.time.split(' ')[0]}</Text>
                      <Text style={styles.ampmText}>{item.time.split(' ')[1]}</Text>
                    </View>

                    <View style={[styles.eventCard, { borderLeftColor: kind.tint }]}>
                      <View style={[styles.eventIconBg, { backgroundColor: kind.soft }]}>
                        <MaterialCommunityIcons name={kind.icon} size={ms(22)} color={kind.tint} />
                      </View>
                      <View style={styles.eventDetails}>
                        <Text style={[styles.eventKindLabel, { color: kind.tint }]}>{kind.label}</Text>
                        <Text style={styles.eventTitle}>{item.title}</Text>
                        <Text style={styles.eventLoc} numberOfLines={2}>{item.location}</Text>

                        {item.status ? (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: isDone ? '#DCFCE7' : '#FFF7ED' },
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                { backgroundColor: isDone ? '#16A34A' : '#F97316' },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: isDone ? '#15803D' : '#C2410C' },
                              ]}
                            >
                              {item.status}
                            </Text>
                          </View>
                        ) : !item.accepted ? (
                          <ScaleButton style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                            <Text style={styles.acceptBtnText}>Accept Invitation</Text>
                          </ScaleButton>
                        ) : (
                          <View style={styles.acceptedTag}>
                            <Ionicons name="checkmark-circle" size={ms(14)} color="#16A34A" />
                            <Text style={styles.acceptedText}> Accepted</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                );
              }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={ms(60)} color="#E8DAEF" />
              <Text style={styles.emptyText}>No requests or aid for this date.</Text>
            </View>
          )}
        </View>
      </View>

      <Modal visible={showAcceptedModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {/* Snappy OUT-only entry — matches the app's shared modal animation
              language (≤ 220ms scale pop, no ease-in-out, no long slide). */}
          <Animated.View entering={ZoomIn.duration(220)} style={styles.modalContent}>
            <View style={styles.modalIconBg}>
              <Ionicons name="checkmark-done" size={ms(40)} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Request Updated</Text>
            <Text style={styles.modalDesc}>Your application status has been refreshed.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAcceptedModal(false)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },

  // ── New compact top bar (replaces the full-bleed purple gradient) ──
  slimTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingBottom: vs(10),
    backgroundColor: '#FAFAF9',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
  },
  slimBackBtn: {
    width: ms(36),
    height: ms(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(4),
  },
  slimTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: ms(8),
  },
  slimMonthTitle: {
    fontSize: ms(15),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  slimNavArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#F3EBFB',
    borderRadius: 999,
    paddingHorizontal: ms(2),
  },
  slimArrowBtn: {
    padding: ms(5),
  },
  slimViewToggle: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    backgroundColor: '#F3EBFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: ms(8),
  },

  // ── New compact calendar card ──
  calCard: {
    marginHorizontal: ms(14),
    marginTop: vs(12),
    backgroundColor: '#fff',
    borderRadius: ms(18),
    // Extra bottom padding to give the event dots (which now sit slightly
    // below each cell via negative `bottom`) some breathing room before
    // they meet the card's bottom edge.
    paddingTop: vs(12),
    paddingBottom: vs(18),
    paddingHorizontal: ms(8),
    borderWidth: 1,
    borderColor: '#F0EDE9',
    shadowColor: '#1C1917',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  calMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calDayName: {
    width: '14.28%',
    textAlign: 'center',
    color: '#A8A29E',
    fontWeight: '700',
    fontSize: ms(10),
    letterSpacing: 1,
    marginBottom: vs(6),
  },
  calMonthCell: {
    width: '14.28%',
    height: vs(34),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(2),
    borderRadius: ms(10),
  },
  calWeekCell: {
    width: '13%',
    height: vs(50),
    paddingVertical: vs(4),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ms(12),
  },
  calCellSelected: {
    backgroundColor: '#B084CC',
    shadowColor: '#B084CC',
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  calCellText: {
    color: '#1C1917',
    fontWeight: '700',
    fontSize: ms(13),
  },
  calCellTextSelected: {
    color: '#fff',
  },
  calWeekDayName: {
    fontSize: ms(10),
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 0.5,
    marginBottom: vs(3),
  },
  calWeekDate: {
    fontSize: ms(15),
    fontWeight: '800',
    color: '#1C1917',
  },
  // Event dot — pushed BELOW the chip border so it never overlaps the
  // date number. Inside the selected purple chip the old `bottom: 4` made
  // the white dot read as a period right after the date ("1·").
  calEventDot: {
    width: ms(5),
    height: ms(5),
    borderRadius: ms(2.5),
    backgroundColor: '#B084CC',
    position: 'absolute',
    bottom: -vs(7),
    left: '50%',
    marginLeft: -ms(2.5),
  },

  content: { flex: 1, backgroundColor: '#FAFAF9', marginTop: vs(8) },
  whiteCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderRadius: ms(35), 
    marginHorizontal: ms(16), 
    padding: ms(28), 
    marginTop: vs(10), 
    marginBottom: vs(20), 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 4,
    shadowOffset: { width: 0, height: 5 },
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(35) },
  dayTitle: { fontSize: ms(26), fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
  line: { flex: 1, height: 1.5, backgroundColor: '#f0f0f0', marginLeft: ms(15) },
  todayBtn: { marginLeft: ms(15), backgroundColor: '#F4ECF7', paddingHorizontal: ms(14), paddingVertical: vs(8), borderRadius: ms(12) },
  todayBtnText: { fontSize: ms(14), fontWeight: '900', color: '#B084CC', textTransform: 'uppercase', letterSpacing: 0.5 },

  eventItem: { flexDirection: 'row', marginBottom: vs(14) },
  timeCol: { width: ms(60), alignItems: 'flex-start', paddingTop: vs(12) },
  timeText: { fontSize: ms(13), fontWeight: '800', color: '#1C1917', letterSpacing: -0.3 },
  ampmText: { fontSize: ms(9), fontWeight: '700', color: '#A8A29E', textTransform: 'uppercase', marginTop: vs(-1) },

  // ── Clean event card: white surface, coloured icon chip, left accent stripe ──
  eventCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: ms(14),
    padding: ms(14),
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#D63B8A',
    borderWidth: 1,
    borderColor: '#F0EDE9',
    shadowColor: '#1C1917',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
  },
  eventIconBg: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(12),
  },
  eventDetails: { flex: 1 },
  eventKindLabel: {
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: vs(2),
  },
  eventTitle: {
    fontSize: ms(14),
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: vs(2),
    letterSpacing: -0.2,
  },
  eventLoc: {
    fontSize: ms(11),
    color: '#78716C',
    marginBottom: vs(10),
    fontWeight: '500',
    lineHeight: vs(15),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    alignSelf: 'flex-start',
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    borderRadius: ms(10),
  },
  statusDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  statusBadgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  acceptBtn: {
    backgroundColor: '#B084CC',
    borderRadius: ms(10),
    paddingHorizontal: ms(14),
    paddingVertical: vs(8),
    alignSelf: 'flex-start',
  },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(11), letterSpacing: 0.4, textTransform: 'uppercase' },
  acceptedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    borderRadius: ms(10),
    alignSelf: 'flex-start',
  },
  acceptedText: { fontSize: ms(11), color: '#15803D', fontWeight: '800', marginLeft: ms(4) },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: vs(60) },
  emptyText: { fontSize: ms(18), color: '#bbb', fontWeight: '800', marginTop: vs(20), textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: ms(35), padding: ms(35), width: '85%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 25, elevation: 20 },
  modalIconBg: { width: ms(90), height: ms(90), borderRadius: ms(45), backgroundColor: '#B084CC', justifyContent: 'center', alignItems: 'center', marginBottom: vs(25) },
  modalTitle: { fontSize: ms(24), fontWeight: '900', color: '#fff', marginBottom: vs(12), letterSpacing: 0.2 },
  modalDesc: { fontSize: ms(16), color: '#999', textAlign: 'center', marginBottom: vs(35), lineHeight: vs(24), fontWeight: '600' },
  modalBtn: { borderTopWidth: 1, borderTopColor: '#333', width: '100%', paddingTop: vs(25), alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: ms(18), fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
});
