import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, vs } from '../../lib/scaling';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
// expo-file-system v19 split into a new (File/Directory) API and a `/legacy`
// module that still exposes the familiar `readAsStringAsync` + `EncodingType`
// constants we use for base64 reads. Import the legacy surface explicitly so
// `EncodingType.Base64` resolves on SDK 54 without crashing.
import * as FileSystem from 'expo-file-system/legacy';
import api from '../../lib/api';

/**
 * Donor Certificate — "thank you" landing screen.
 *
 * UX
 * ──
 * No more inline certificate preview. Instead the donor sees a warm
 * thank-you message + meta chips + a single Download PDF button. The
 * actual certificate lives in the generated PDF (via `expo-print`) and
 * exactly mirrors the website's `DonorCertificate.tsx` layout — same
 * two-logo header, "CERTIFICATE OF RECOGNITION" wordmark, serif name,
 * appreciation body, and 3-column footer.
 *
 * Why a PDF instead of a screen view
 * ──────────────────────────────────
 * The website's certificate IS the artefact — donors print or PDF-save
 * it. Re-implementing the same visual in mobile RN components was always
 * an approximation and broke the moment the donor wanted to share or
 * print. Generating a real PDF from HTML gives the donor:
 *   - The same look on every device.
 *   - A file they can email, AirDrop, or print directly.
 *   - Zero font drift between web and mobile (HTML uses Georgia, same
 *     fallback the web certificate uses).
 */
interface Props {
  reference: string;
  certificateNo: string;
  dateReceived?: string | null;
  onBack: () => void;
}

const BRAND = {
  pink: '#AD246D',
  pinkSoft: '#FDF7FB',
  pinkLine: '#EAD7E8',
  ink: '#1C1917',
  inkSoft: '#3B2E43',
  mute: '#8C7895',
  cream: '#FAFAF9',
};

/**
 * HTML template for the generated PDF. Mirrors the structure of
 * `frontend/src/pages/DonorCertificate.tsx`: two logos at the top,
 * letterspaced wordmark title, italic subtitle, big serif name, two
 * paragraphs of appreciation copy, and a 3-column footer with the
 * reference, signature block, and cert number / date.
 *
 * Logos are passed in as already-resolved data URIs (base64) so the PDF
 * is fully self-contained — works offline, doesn't depend on the device
 * being able to reach any URL after generation.
 */
function buildCertificateHtml(opts: {
  donorName: string;
  reference: string;
  certificateNo: string;
  issuedDate: string;
  ribbonDataUri: string;
  sufcDataUri: string;
}) {
  const { donorName, reference, certificateNo, issuedDate, ribbonDataUri, sufcDataUri } = opts;
  // Inline logos as data so the PDF stays self-contained even if the
  // device is offline at print time. (Falls back gracefully if the
  // bundle doesn't include them.)
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Donor Certificate</title>
    <style>
      @page { margin: 0; size: A4 landscape; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        color: #1C1917;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: 100vw;
        height: 100vh;
        padding: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .shell {
        width: 100%;
        height: 100%;
        background: #fff;
        border: 1px solid #EAD7E8;
        border-radius: 18px;
        padding: 12px;
        box-shadow: 0 8px 24px rgba(173, 36, 109, 0.06);
      }
      .paper {
        width: 100%;
        height: 100%;
        border: 2px solid ${BRAND.pink};
        border-radius: 12px;
        background: ${BRAND.pinkSoft};
        padding: 32px 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
      }
      .logos {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        margin-bottom: 8px;
      }
      .logo-mark {
        width: 72px;
        height: 72px;
        object-fit: contain;
        display: inline-block;
      }
      .title {
        font-size: 22px;
        font-weight: 900;
        color: ${BRAND.pink};
        letter-spacing: 4px;
        text-align: center;
        margin: 4px 0 6px;
      }
      .subtitle {
        font-size: 13px;
        color: ${BRAND.mute};
        font-style: italic;
        text-align: center;
        margin: 0 0 18px;
      }
      .name {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 48px;
        font-weight: 700;
        letter-spacing: -1px;
        color: ${BRAND.ink};
        text-align: center;
        margin: 8px 0 18px;
      }
      .body {
        font-size: 14px;
        font-weight: 700;
        color: ${BRAND.inkSoft};
        text-align: center;
        line-height: 1.4;
        margin: 0 auto 6px;
        max-width: 640px;
      }
      .body-sub {
        font-size: 12px;
        color: ${BRAND.mute};
        text-align: center;
        line-height: 1.5;
        margin: 0 auto;
        max-width: 640px;
      }
      .footer {
        margin-top: 28px;
        padding-top: 14px;
        border-top: 1px solid ${BRAND.pinkLine};
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        width: 100%;
      }
      .col-left   { text-align: left;   flex: 1; }
      .col-center { text-align: center; flex: 1.1; }
      .col-right  { text-align: right;  flex: 1; }
      .label {
        font-size: 9px;
        color: ${BRAND.mute};
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 2px;
      }
      .value {
        font-size: 12px;
        font-weight: 800;
        color: ${BRAND.ink};
      }
      .sig-line {
        width: 70%;
        height: 1px;
        background: ${BRAND.ink};
        margin: 0 auto 4px;
      }
      .sig-org {
        font-size: 12px;
        font-weight: 800;
        color: ${BRAND.ink};
      }
      .sig-role {
        font-size: 9px;
        color: ${BRAND.mute};
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-top: 1px;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="shell">
        <div class="paper">
          <!-- Header logos: HairLink pink ribbon + SUFC organization mark.
               Both are embedded as base64 data URIs so the PDF stays
               self-contained (works offline, no remote fetch on print). -->
          <div class="logos">
            <img class="logo-mark" src="${ribbonDataUri}" alt="HairLink ribbon" />
            <img class="logo-mark" src="${sufcDataUri}" alt="Strand Up For Cancer" />
          </div>

          <div>
            <div class="title">CERTIFICATE OF RECOGNITION</div>
            <div class="subtitle">This certificate is proudly presented to</div>
          </div>

          <div class="name">${donorName}</div>

          <div>
            <p class="body">In deep appreciation for your selfless and generous hair donation.</p>
            <p class="body-sub">Your contribution provides hope, confidence, and strength to patients experiencing medical hair loss. Thank you for making a beautiful difference.</p>
          </div>

          <div class="footer">
            <div class="col-left">
              <div class="label">Reference</div>
              <div class="value">${reference}</div>
            </div>
            <div class="col-center">
              <div class="sig-line"></div>
              <div class="sig-org">HairLink Foundation</div>
              <div class="sig-role">Authorized Signature</div>
            </div>
            <div class="col-right">
              <div class="label">Cert. No</div>
              <div class="value">${certificateNo}</div>
              <div class="label" style="margin-top:6px">Date</div>
              <div class="value">${issuedDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export default function DonorCertificateScreen({ reference, certificateNo, dateReceived, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [donorName, setDonorName] = useState('Valued Donor');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Logo data URIs — loaded once at mount so the PDF generator can embed
  // them inline. The state stays empty until the asset bundling finishes,
  // which gates the "Download" button to avoid generating a logo-less PDF.
  const [logosReady, setLogosReady] = useState(false);
  const [ribbonDataUri, setRibbonDataUri] = useState('');
  const [sufcDataUri, setSufcDataUri] = useState('');

  // One-shot entrance pop for the trophy chip + headline.
  const heroScale = React.useRef(new Animated.Value(0.8)).current;
  const heroOp = React.useRef(new Animated.Value(0)).current;

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

    // Load the certificate logos and convert them to base64 data URIs.
    // We embed them inline in the generated HTML so the PDF doesn't need
    // network access or local file resolution at print time.
    const loadLogos = async () => {
      try {
        const [ribbonAsset, sufcAsset] = await Promise.all([
          Asset.fromModule(require('../../assets/pink-ribbon.png')).downloadAsync(),
          Asset.fromModule(require('../../assets/sufc-logo.jpg')).downloadAsync(),
        ]);

        // `EncodingType.Base64` is the documented constant but some SDK
        // builds ship it on a different surface — fall back to the plain
        // 'base64' literal which the runtime always accepts.
        const base64Enc: any = (FileSystem as any).EncodingType?.Base64 ?? 'base64';

        const [ribbonB64, sufcB64] = await Promise.all([
          FileSystem.readAsStringAsync(ribbonAsset.localUri || ribbonAsset.uri, {
            encoding: base64Enc,
          }),
          FileSystem.readAsStringAsync(sufcAsset.localUri || sufcAsset.uri, {
            encoding: base64Enc,
          }),
        ]);

        setRibbonDataUri(`data:image/png;base64,${ribbonB64}`);
        setSufcDataUri(`data:image/jpeg;base64,${sufcB64}`);
        setLogosReady(true);
      } catch (err) {
        console.error('Error loading certificate logos:', err);
        // Even if logos fail to load we still let the user download — the
        // <img> tags will simply render empty. Better than blocking the cert.
        setLogosReady(true);
      }
    };
    loadLogos();

    Animated.parallel([
      Animated.timing(heroScale, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.back(1.8)),
        useNativeDriver: true,
      }),
      Animated.timing(heroOp, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroScale, heroOp]);

  const issuedDate = (() => {
    const d = dateReceived ? new Date(dateReceived) : new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  })();

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      // Render the HTML certificate into a real PDF on-device.
      const html = buildCertificateHtml({
        donorName,
        reference,
        certificateNo,
        issuedDate,
        ribbonDataUri,
        sufcDataUri,
      });
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 842,   // A4 landscape pts
        height: 595,
      });

      // Hand the file off to the native share sheet so the donor can
      // save to Files, AirDrop, email, print, etc.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'HairLink Certificate',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'Certificate Saved',
          `Your certificate PDF is ready. File:\n${uri}`,
        );
      }
    } catch (err: any) {
      console.error('Certificate PDF error:', err);
      Alert.alert('Could not generate certificate', err?.message || 'Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top bar */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={ms(24)} color={BRAND.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Certificate</Text>
        <View style={{ width: ms(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: vs(40) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {loadingProfile ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.pink} />
          </View>
        ) : (
          <>
            {/* ── Hero: trophy chip + headline + body ── */}
            <Animated.View
              style={[
                styles.hero,
                { opacity: heroOp, transform: [{ scale: heroScale }] },
              ]}
            >
              <View style={styles.trophyChip}>
                <MaterialCommunityIcons name="trophy" size={ms(38)} color={BRAND.pink} />
              </View>

              <Text style={styles.headline}>Thank you for your donation!</Text>
              <Text style={styles.subheadline}>
                Your generosity gives someone their confidence back.
              </Text>
            </Animated.View>

            {/* ── Meta chips ── */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <Feather name="user" size={ms(13)} color={BRAND.mute} />
                  <Text style={styles.metaLabel}>Donor</Text>
                </View>
                <Text style={styles.metaValue} numberOfLines={1}>{donorName}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <Feather name="hash" size={ms(13)} color={BRAND.mute} />
                  <Text style={styles.metaLabel}>Reference</Text>
                </View>
                <Text style={styles.metaValue} numberOfLines={1}>{reference}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <Feather name="award" size={ms(13)} color={BRAND.mute} />
                  <Text style={styles.metaLabel}>Cert. No</Text>
                </View>
                <Text style={styles.metaValue} numberOfLines={1}>{certificateNo}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <Feather name="calendar" size={ms(13)} color={BRAND.mute} />
                  <Text style={styles.metaLabel}>Issued</Text>
                </View>
                <Text style={styles.metaValue} numberOfLines={1}>{issuedDate}</Text>
              </View>
            </View>

            {/* ── Tip strip ── */}
            <View style={styles.tipStrip}>
              <Feather name="download" size={ms(14)} color={BRAND.pink} />
              <Text style={styles.tipText}>
                To see your certificate, download the PDF below.
              </Text>
            </View>

            {/* ── Primary CTA: real PDF generation + share ── */}
            <TouchableOpacity
              onPress={handleDownloadPdf}
              disabled={downloading || !logosReady}
              style={[styles.primaryBtn, (downloading || !logosReady) && { opacity: 0.7 }]}
              activeOpacity={0.85}
            >
              {downloading || !logosReady ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="download" size={ms(16)} color="#fff" />
                  <Text style={styles.primaryBtnText}>Download PDF Certificate</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.fineprint}>
              The PDF matches the official HairLink certificate format and can be
              printed or shared from your device.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },

  // Top bar
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

  scrollContent: { paddingHorizontal: ms(20), paddingTop: vs(28) },
  loadingContainer: { height: vs(400), justifyContent: 'center', alignItems: 'center' },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    marginBottom: vs(22),
  },
  trophyChip: {
    width: ms(78),
    height: ms(78),
    borderRadius: ms(22),
    backgroundColor: BRAND.pinkSoft,
    borderWidth: 1,
    borderColor: BRAND.pinkLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
    shadowColor: BRAND.pink,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  headline: {
    fontSize: ms(22),
    fontWeight: '800',
    color: BRAND.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: vs(6),
  },
  subheadline: {
    fontSize: ms(13),
    color: BRAND.mute,
    textAlign: 'center',
    lineHeight: vs(18),
    paddingHorizontal: ms(20),
    fontWeight: '500',
  },

  // ── Meta card ──
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: '#F0EDE9',
    paddingHorizontal: ms(16),
    paddingVertical: vs(6),
    marginBottom: vs(14),
    shadowColor: '#1C1917',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: vs(11),
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(7),
  },
  metaLabel: {
    fontSize: ms(11.5),
    color: BRAND.mute,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: ms(12.5),
    color: BRAND.ink,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F4F1ED',
  },

  // ── Tip strip ──
  tipStrip: {
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
  tipText: {
    flex: 1,
    fontSize: ms(12),
    color: BRAND.pink,
    fontWeight: '600',
  },

  // ── Primary CTA ──
  primaryBtn: {
    backgroundColor: BRAND.pink,
    height: vs(50),
    borderRadius: ms(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(10),
    shadowColor: BRAND.pink,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    marginBottom: vs(10),
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: ms(14.5),
    letterSpacing: 0.2,
  },

  fineprint: {
    fontSize: ms(11),
    color: BRAND.mute,
    textAlign: 'center',
    lineHeight: vs(16),
    paddingHorizontal: ms(20),
    marginTop: vs(4),
    fontWeight: '500',
  },
});
