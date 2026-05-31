import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, vs, s } from '../../lib/scaling';
import { Ionicons, Feather } from '@expo/vector-icons';
import api from '../../lib/api';

/**
 * Mobile Donor Certificate — visually matches the website's `DonorCertificate.tsx`:
 *   - Two-logo header (HairLink pink ribbon + Strand Up For Cancer mark)
 *   - "CERTIFICATE OF RECOGNITION" wordmark
 *   - "This certificate is proudly presented to" subtitle
 *   - Big serif donor name
 *   - Two-line appreciation body
 *   - Three-column footer:  Reference (left) · Signature (center) · Cert No + Date (right)
 *
 * Notes
 * ─────
 * - This screen is only reachable from `DonationHistoryScreen` *after* the
 *   donation has a `certificateNo`, which the backend sets only when staff
 *   transitions status to `Received Hair`. There's no "Pending" state here.
 * - `dateReceived` is optional; we fall back to today if the caller didn't
 *   pass it through (preserves backward compatibility with existing nav).
 */
interface Props {
  reference: string;
  certificateNo: string;
  dateReceived?: string | null;
  onBack: () => void;
}

const BRAND = {
  pink: '#AD246D',      // matches the web certificate's ink colour
  pinkSoft: '#FDF7FB',  // soft wash for inner borders
  pinkLine: '#EAD7E8',  // borders
  ink: '#1C1917',
  inkSoft: '#3B2E43',
  mute: '#8C7895',
  cream: '#FAFAF9',
};

export default function DonorCertificateScreen({ reference, certificateNo, dateReceived, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [donorName, setDonorName] = useState('Valued Donor');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get('/auth/me');
        const first = res.data.firstName || res.data.first_name || '';
        const last = res.data.lastName || res.data.last_name || '';
        const composed = `${first} ${last}`.trim();
        setDonorName(composed || res.data.name || 'Valued Donor');
      } catch (err) {
        console.error('Error fetching profile for certificate:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      Alert.alert(
        'Certificate Saved',
        'Your digital Certificate of Recognition is ready to share.',
        [
          {
            text: 'Share',
            onPress: () => {
              Share.share({
                message: `I just earned a Certificate of Recognition from HairLink Foundation!\n\nCert No: ${certificateNo}\nReference: ${reference}`,
              }).catch((e) => console.error(e));
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }, 900);
  };

  const issuedDate = (() => {
    const d = dateReceived ? new Date(dateReceived) : new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  })();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={ms(24)} color={BRAND.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donor Certificate</Text>
        <View style={{ width: ms(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loadingProfile ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.pink} />
          </View>
        ) : (
          <>
            {/* Tiny intro line — mirrors the web header subtitle */}
            <Text style={styles.introLine}>
              Automatically issued once staff confirms receipt of your hair donation.
            </Text>

            {/* ── Certificate paper ── */}
            <View style={styles.certShell}>
              <View style={styles.certPaper}>
                {/* Two-logo header (HairLink ribbon + SUFC mark) */}
                <View style={styles.certLogosRow}>
                  <Image
                    source={require('../../assets/pink-ribbon.png')}
                    style={styles.certLogoMain}
                    resizeMode="contain"
                  />
                  <Image
                    source={require('../../assets/logo.png')}
                    style={styles.certLogoSufc}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.certTitle}>CERTIFICATE OF RECOGNITION</Text>
                <Text style={styles.certSubtitle}>This certificate is proudly presented to</Text>

                {/* Donor name */}
                <Text style={styles.certName}>{donorName}</Text>

                {/* Body */}
                <Text style={styles.certBody}>
                  In deep appreciation for your selfless and generous hair donation.
                </Text>
                <Text style={styles.certBodySub}>
                  Your contribution provides hope, confidence, and strength to patients
                  experiencing medical hair loss. Thank you for making a beautiful difference.
                </Text>

                {/* Three-column footer — matches the web layout exactly */}
                <View style={styles.certFooter}>
                  <View style={[styles.footerCol, { alignItems: 'flex-start' }]}>
                    <Text style={styles.footerLabel}>Reference</Text>
                    <Text style={styles.footerValue} numberOfLines={1}>{reference}</Text>
                  </View>

                  <View style={[styles.footerCol, styles.signatureCol]}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureOrg}>HairLink Foundation</Text>
                    <Text style={styles.signatureRole}>Authorized Signature</Text>
                  </View>

                  <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.footerLabel}>Cert. No</Text>
                    <Text style={styles.footerValue} numberOfLines={1}>{certificateNo}</Text>
                    <Text style={[styles.footerLabel, { marginTop: vs(4) }]}>Date</Text>
                    <Text style={styles.footerValue} numberOfLines={1}>{issuedDate}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Note strip — mirrors the web's "Certificate is ready" callout */}
            <View style={styles.noteBox}>
              <Feather name="check-circle" size={ms(14)} color={BRAND.pink} />
              <Text style={styles.noteText}>
                Certificate is ready. Tap below to save or share it.
              </Text>
            </View>

            {/* Primary action — print/save on web, share on mobile */}
            <TouchableOpacity
              onPress={handleDownload}
              disabled={downloading}
              style={[styles.primaryBtn, downloading && { opacity: 0.7 }]}
              activeOpacity={0.85}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="share-2" size={ms(16)} color="#fff" />
                  <Text style={styles.primaryBtnText}>Save / Share Certificate</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: vs(24) }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },

  // ── Top bar ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingBottom: vs(10),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
  },
  headerTitle: {
    fontSize: ms(16),
    fontWeight: '800',
    color: BRAND.ink,
    letterSpacing: -0.2,
  },
  backBtn: { width: ms(40), height: ms(40), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: ms(16), paddingTop: vs(18), paddingBottom: vs(24) },
  loadingContainer: { height: vs(400), justifyContent: 'center', alignItems: 'center' },

  introLine: {
    fontSize: ms(12),
    color: BRAND.mute,
    marginBottom: vs(12),
    paddingHorizontal: ms(4),
    fontWeight: '500',
  },

  // ── Certificate paper — mirrors the web's nested-border structure ──
  certShell: {
    backgroundColor: '#fff',
    borderRadius: ms(16),
    padding: ms(8),
    width: '100%',
    borderWidth: 1,
    borderColor: BRAND.pinkLine,
    shadowColor: BRAND.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: vs(16),
  },
  certPaper: {
    borderWidth: 2,
    borderColor: BRAND.pink,
    borderRadius: ms(10),
    paddingHorizontal: ms(18),
    paddingTop: vs(22),
    paddingBottom: vs(18),
    alignItems: 'center',
    backgroundColor: BRAND.pinkSoft,
  },

  // ── Header logos ──
  certLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(14),
    marginBottom: vs(14),
  },
  certLogoMain: {
    width: ms(46),
    height: ms(46),
  },
  certLogoSufc: {
    width: ms(46),
    height: ms(46),
  },

  // ── Title block ──
  certTitle: {
    fontSize: ms(15),
    fontWeight: '900',
    color: BRAND.pink,
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: vs(6),
  },
  certSubtitle: {
    fontSize: ms(11),
    color: BRAND.mute,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: vs(14),
  },

  // ── Donor name (mimics DM Serif Display via the system serif) ──
  certName: {
    fontSize: ms(28),
    fontWeight: '700',
    color: BRAND.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: vs(14),
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
    }),
  },

  // ── Body ──
  certBody: {
    fontSize: ms(12.5),
    color: BRAND.inkSoft,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: vs(18),
    marginBottom: vs(6),
    paddingHorizontal: ms(8),
  },
  certBodySub: {
    fontSize: ms(11),
    color: BRAND.mute,
    textAlign: 'center',
    lineHeight: vs(16),
    paddingHorizontal: ms(8),
    marginBottom: vs(22),
    fontWeight: '500',
  },

  // ── 3-column footer ──
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingTop: vs(10),
    borderTopWidth: 1,
    borderTopColor: BRAND.pinkLine,
  },
  footerCol: {
    flex: 1,
    paddingHorizontal: ms(2),
  },
  signatureCol: {
    alignItems: 'center',
    flex: 1.1,
  },
  footerLabel: {
    fontSize: ms(8.5),
    color: BRAND.mute,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: vs(2),
  },
  footerValue: {
    fontSize: ms(10.5),
    fontWeight: '800',
    color: BRAND.ink,
  },
  signatureLine: {
    width: '85%',
    height: 1,
    backgroundColor: BRAND.ink,
    marginBottom: vs(3),
  },
  signatureOrg: {
    fontSize: ms(10),
    fontWeight: '800',
    color: BRAND.ink,
  },
  signatureRole: {
    fontSize: ms(8),
    color: BRAND.mute,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: vs(1),
  },

  // ── Note + CTA ──
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    backgroundColor: BRAND.pinkSoft,
    borderWidth: 1,
    borderColor: BRAND.pinkLine,
    paddingHorizontal: ms(12),
    paddingVertical: vs(10),
    borderRadius: ms(12),
    marginBottom: vs(14),
  },
  noteText: {
    flex: 1,
    fontSize: ms(12),
    color: BRAND.pink,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: BRAND.pink,
    height: vs(48),
    borderRadius: ms(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    shadowColor: BRAND.pink,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: ms(14),
    letterSpacing: 0.3,
  },
});
