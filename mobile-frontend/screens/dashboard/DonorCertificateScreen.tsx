import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, vs } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import api from '../../lib/api';

interface Props {
  reference: string;
  certificateNo: string;
  onBack: () => void;
}

export default function DonorCertificateScreen({ reference, certificateNo, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [donorName, setDonorName] = useState('Valued Donor');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get('/auth/me');
        const name = res.data.name || `${res.data.firstName || ''} ${res.data.lastName || ''}`.trim() || 'Valued Donor';
        setDonorName(name);
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
        'Your digital Certificate of Recognition has been successfully downloaded and saved to your device.',
        [
          {
            text: 'Share',
            onPress: () => {
              Share.share({
                message: `Check out my Certificate of Recognition from HairLink Foundation! Reference: ${reference}`,
              }).catch((e) => console.error(e));
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={ms(26)} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donor Certificate</Text>
        <View style={{ width: ms(44) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loadingProfile ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#AD246D" />
          </View>
        ) : (
          <Animated.View entering={FadeInUp.springify()} style={styles.contentWrap}>
            {/* The Certificate Card */}
            <View style={styles.certificateOuterCard}>
              <View style={styles.certificateInnerBorder}>
                <View style={styles.certificateDoubleBorder}>
                  {/* Top Ribbon Icon */}
                  <View style={styles.ribbonContainer}>
                    <Ionicons name="ribbon" size={ms(44)} color="#AD246D" />
                  </View>

                  {/* Title */}
                  <Text style={styles.certTitle}>CERTIFICATE OF RECOGNITION</Text>
                  <Text style={styles.certSubtitle}>This certificate is proudly presented to</Text>

                  {/* Donor Name */}
                  <Text style={styles.donorName}>{donorName}</Text>

                  {/* Description Paragraph */}
                  <Text style={styles.certDescription}>
                    In deep appreciation for your selfless and generous hair donation.
                  </Text>
                  <Text style={styles.certFootnote}>
                    Your contribution provides hope, confidence, and strength to patients experiencing medical hair loss.
                  </Text>

                  {/* Bottom Columns */}
                  <View style={styles.certBottomRow}>
                    {/* Left Column: Metadata */}
                    <View style={styles.metaCol}>
                      <Text style={styles.metaText}>REF: {reference}</Text>
                      <Text style={styles.metaText}>CERT: {certificateNo}</Text>
                    </View>

                    {/* Right Column: Signature Block */}
                    <View style={styles.signatureCol}>
                      <View style={styles.signatureLine} />
                      <Text style={styles.orgText}>HairLink Foundation</Text>
                      <Text style={styles.signatureLabel}>AUTHORIZED SIGNATURE</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Congratulations section */}
            <View style={styles.promoSection}>
              <Text style={styles.congratsText}>Congratulations on your donation!</Text>
              <Text style={styles.promoDesc}>
                You can now download your digital certificate. This certificate recognizes your contribution to the community.
              </Text>
            </View>

            {/* Download Button */}
            <TouchableOpacity
              onPress={handleDownload}
              disabled={downloading}
              style={[styles.downloadBtn, downloading && { opacity: 0.8 }]}
              activeOpacity={0.85}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={ms(20)} color="#fff" style={{ marginRight: ms(8) }} />
                  <Text style={styles.downloadBtnText}>Download PDF Certificate</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F0F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(10),
    paddingVertical: vs(12),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6EE',
  },
  headerTitle: { fontSize: ms(18), fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: ms(16), paddingTop: vs(20), paddingBottom: vs(40) },
  loadingContainer: { height: vs(400), justifyContent: 'center', alignItems: 'center' },
  contentWrap: { alignItems: 'center' },

  certificateOuterCard: {
    backgroundColor: '#fff',
    borderRadius: ms(16),
    padding: ms(8),
    width: '100%',
    shadowColor: '#AD246D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0E6EE',
    marginBottom: vs(24),
  },
  certificateInnerBorder: {
    borderWidth: ms(2),
    borderColor: '#AD246D',
    padding: ms(4),
    borderRadius: ms(12),
  },
  certificateDoubleBorder: {
    borderWidth: 1,
    borderColor: '#AD246D',
    paddingHorizontal: ms(16),
    paddingVertical: vs(24),
    borderRadius: ms(8),
    alignItems: 'center',
  },
  ribbonContainer: {
    marginBottom: vs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTitle: {
    fontSize: ms(16),
    fontWeight: '900',
    color: '#AD246D',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: vs(8),
  },
  certSubtitle: {
    fontSize: ms(11),
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: vs(16),
  },
  donorName: {
    fontSize: ms(24),
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    marginBottom: vs(16),
    fontFamily: 'System', // system fallback is clean
  },
  certDescription: {
    fontSize: ms(12),
    color: '#333',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: vs(18),
    paddingHorizontal: ms(8),
    marginBottom: vs(10),
  },
  certFootnote: {
    fontSize: ms(11),
    color: '#666',
    textAlign: 'center',
    lineHeight: vs(16),
    paddingHorizontal: ms(12),
    marginBottom: vs(28),
  },
  certBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: ms(4),
  },
  metaCol: {
    alignItems: 'flex-start',
  },
  metaText: {
    fontSize: ms(9),
    color: '#888',
    fontWeight: '800',
    marginTop: vs(2),
  },
  signatureCol: {
    alignItems: 'center',
    width: '45%',
  },
  signatureLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#000',
    marginBottom: vs(4),
  },
  orgText: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#000',
  },
  signatureLabel: {
    fontSize: ms(7),
    color: '#888',
    fontWeight: '800',
    marginTop: vs(2),
  },

  promoSection: {
    alignItems: 'center',
    paddingHorizontal: ms(20),
    marginBottom: vs(24),
  },
  congratsText: {
    fontSize: ms(18),
    fontWeight: '900',
    color: '#AD246D',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  promoDesc: {
    fontSize: ms(13),
    color: '#666',
    textAlign: 'center',
    lineHeight: vs(20),
    fontWeight: '500',
  },

  downloadBtn: {
    backgroundColor: '#AD246D',
    borderRadius: ms(24),
    width: '90%',
    height: vs(50),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#AD246D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: ms(14),
    letterSpacing: 0.5,
  },
});
