import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { vs, ms } from '../lib/scaling';
import api from '../lib/api';

type PastEvent = {
  title: string;
  description: string;
  date: string;
  imageKey?: string;
};

// Default images bundled with the app. Used when the CMS entry points at the
// web-only relative asset path (e.g. "/assets/images/landing/past-event-1.jpg")
// instead of an absolute URL an admin has uploaded.
const LOCAL_EVENT_IMAGES = [
  require('../assets/events/past-event-1.jpg'),
  require('../assets/events/past-event-2.jpg'),
  require('../assets/events/past-event-3.jpg'),
  require('../assets/events/past-event-4.jpg'),
];

// Same fallback content the web landing page ships with, so the section still
// renders if the CMS request fails.
const FALLBACK_EVENTS: PastEvent[] = [
  { title: 'Hair Donation Drive', description: 'Generous donor sharing hope by gifting her locks for wig crafting at Tau Lambda Alpha, Los Baños.', date: 'April 28, 2026', imageKey: 'eventImg1' },
  { title: 'Strand Up for Cancer Campaign', description: 'Community hair donation drive with our lovely volunteers and donors presenting their certificates of appreciation.', date: 'April 28, 2026', imageKey: 'eventImg2' },
  { title: 'Wig Crafting & Haircut Session', description: 'Professional stylists volunteering to cut and measure hair for custom medical-grade wigs.', date: 'Feb 25, 2026', imageKey: 'eventImg3' },
  { title: 'Donation Celebration', description: 'Donors showcasing their ponytails alongside certificates of appreciation for supporting cancer survivors.', date: 'Feb 2, 2026', imageKey: 'eventImg4' },
];

const resolveImage = (url: string | undefined, index: number) => {
  // Absolute URL (admin-uploaded) → load remotely; otherwise use the bundled copy.
  if (url && /^https?:\/\//i.test(url)) return { uri: url };
  return LOCAL_EVENT_IMAGES[index] ?? LOCAL_EVENT_IMAGES[0];
};

export default function PastEventsSection() {
  const [events, setEvents] = useState<PastEvent[]>(FALLBACK_EVENTS);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    api
      .get('/public/site-settings')
      .then((r) => {
        if (!mounted) return;
        const cms = r.data || {};
        if (Array.isArray(cms.pastEvents) && cms.pastEvents.length > 0) {
          setEvents(cms.pastEvents);
        }
        if (cms.images && typeof cms.images === 'object') {
          setImages(cms.images);
        }
      })
      .catch(() => {
        // Keep the fallback content on any error.
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!events.length) return null;

  return (
    <Animated.View entering={FadeInUp.springify().delay(900)} style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PAST EVENTS</Text>
        <Text style={styles.h2}>Highlighting our community impact.</Text>
        <Text style={styles.subtitle}>
          Take a look back at our past hair donation drives, volunteer campaigns, and charity events.
        </Text>
      </View>

      <View style={styles.list}>
        {events.map((ev, idx) => (
          <View key={`${ev.title}-${idx}`} style={styles.card}>
            <View style={styles.imageWrap}>
              <Image
                source={resolveImage(ev.imageKey ? images[ev.imageKey] : undefined, idx)}
                style={styles.image}
                resizeMode="cover"
              />
              {!!ev.date && (
                <View style={styles.datePill}>
                  <Text style={styles.dateText}>{ev.date}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{ev.title}</Text>
              {!!ev.description && <Text style={styles.cardDesc}>{ev.description}</Text>}
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: ms(14),
    marginTop: vs(4),
    marginBottom: vs(30),
  },
  header: {
    marginBottom: vs(14),
    paddingHorizontal: ms(2),
  },
  eyebrow: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#D63B8A',
    letterSpacing: 1.4,
    marginBottom: vs(4),
  },
  h2: {
    fontSize: ms(20),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
    marginBottom: vs(6),
  },
  subtitle: {
    fontSize: ms(12.5),
    lineHeight: ms(18),
    color: '#78716C',
  },
  list: {
    gap: ms(14),
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: ms(18),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EDE9',
    shadowColor: '#1C1917',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: vs(170),
    backgroundColor: '#F5F5F4',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  datePill: {
    position: 'absolute',
    right: ms(12),
    bottom: ms(12),
    backgroundColor: '#fff',
    paddingHorizontal: ms(12),
    paddingVertical: vs(5),
    borderRadius: ms(20),
    shadowColor: '#1C1917',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dateText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#D63B8A',
  },
  cardBody: {
    paddingHorizontal: ms(16),
    paddingTop: vs(12),
    paddingBottom: vs(16),
  },
  cardTitle: {
    fontSize: ms(15.5),
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: vs(6),
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: ms(12.5),
    lineHeight: ms(18),
    color: '#78716C',
  },
});
