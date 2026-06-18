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
  pronoun: string;
  leftLogoUri: string;
  rightLogoUri: string;
  pinkRibbonUri: string;
  sigJanelleUri: string;
  sigJhoanaUri: string;
  sigVenusUri: string;
  sigHonorioUri: string;
}) {
  const { 
    donorName, reference, certificateNo, issuedDate, pronoun,
    leftLogoUri, rightLogoUri, pinkRibbonUri, sigJanelleUri, sigJhoanaUri, sigVenusUri, sigHonorioUri 
  } = opts;
  
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
        color: #1a1a1a;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: 100vw;
        height: 100vh;
        padding: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .shell {
        width: 100%;
        height: 100%;
        background: #fff;
        border: 6px solid #cf2f84;
        border-radius: 4px;
        padding: 5px;
      }
      .paper {
        width: 100%;
        height: 100%;
        border: 1.5px solid #f08dbc;
        background: #fff;
        padding: 24px 36px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
      }
      .header-layout {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 8px;
      }
      .logo-col-left {
        width: 110px;
        text-align: left;
      }
      .logo-col-right {
        width: 110px;
        text-align: right;
      }
      .logo-img {
        height: 65px;
        width: auto;
        object-fit: contain;
      }
      .pink-ribbon-img {
        display: block;
        margin: 0 auto 6px;
        height: 55px;
        width: auto;
        object-fit: contain;
      }
      .header-center {
        flex: 1;
        text-align: center;
      }
      .header-chinese {
        font-size: 14px;
        font-weight: 700;
        color: #3b2e43;
        letter-spacing: 2px;
        margin-bottom: 1px;
      }
      .header-english {
        font-size: 16px;
        font-weight: 900;
        color: #3b2e43;
        letter-spacing: 1px;
        margin-bottom: 4px;
      }
      .presents {
        font-style: italic;
        font-family: 'Georgia', serif;
        font-size: 13px;
        color: #7a6a84;
        margin-bottom: 2px;
      }
      .appreciation-title {
        font-family: 'Georgia', serif;
        font-style: italic;
        font-size: 24px;
        font-weight: 600;
        color: #bc2f79;
        margin: 2px 0;
      }
      .to {
        font-size: 12px;
        color: #7a6a84;
        margin-top: 1px;
      }
      .name-container {
        margin: 8px 0;
        text-align: center;
        width: 100%;
      }
      .name {
        font-family: 'Georgia', serif;
        font-size: 36px;
        font-weight: bold;
        color: #cf2f84;
        margin-bottom: 4px;
      }
      .name-line {
        width: 70%;
        height: 1.5px;
        background: #cf2f84;
        margin: 0 auto;
      }
      .body-text {
        text-align: center;
        line-height: 1.5;
        margin: 8px 0;
      }
      .copy {
        font-family: 'Georgia', serif;
        font-style: italic;
        font-size: 16px;
        color: #5f4565;
        margin: 0 0 4px;
      }
      .target {
        font-size: 19px;
        font-weight: 900;
        color: #3b2e43;
        margin: 4px 0;
        letter-spacing: 0.5px;
      }
      .copy-sub {
        font-size: 14px;
        color: #7a6a84;
        margin: 4px 0 0;
      }
      .signatures-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 48px;
        width: 100%;
        margin-top: 16px;
        padding: 0 24px;
      }
      .sig-col {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .sig-img-wrap {
        height: 46px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        margin-bottom: -9px;
        position: relative;
        z-index: 2;
      }
      .sig-img {
        height: 100%;
        object-fit: contain;
      }
      .sig-line {
        width: 80%;
        height: 1px;
        background: #d5a5c4;
        margin: 4px auto 6px;
        position: relative;
        z-index: 1;
      }
      .sig-name {
        font-weight: 700;
        font-size: 12px;
        color: #3b2e43;
        line-height: 1.3;
        margin-bottom: 2px;
      }
      .sig-title {
        font-size: 10.5px;
        color: #7a6a84;
        line-height: 1.3;
        margin-bottom: 1px;
      }
      .sig-org {
        font-size: 10.5px;
        color: #7a6a84;
        line-height: 1.3;
      }
      .meta-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16px;
        padding: 8px 24px 0;
        border-top: 1px solid #f08dbc;
        font-size: 9px;
        color: #7a6a84;
        width: 100%;
      }
      .meta-footer strong {
        color: #5f4565;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="shell">
        <div class="paper">
          <div class="header-layout">
            <div class="logo-col-left">
              <img class="logo-img" src="${leftLogoUri}" alt="Logo Left" />
            </div>
            <div class="header-center">
              <img class="pink-ribbon-img" src="${pinkRibbonUri}" alt="Pink Ribbon Logo" />
              <div class="header-chinese">岷尼拉市區青年會青年組</div>
              <div class="header-english">MANILA DOWNTOWN YMCA YOUTH CLUB</div>
              <div class="presents">presents this</div>
              <div class="appreciation-title">Certificate of Appreciation</div>
              <div class="to">to</div>
            </div>
            <div class="logo-col-right">
              <img class="logo-img" src="${rightLogoUri}" alt="Logo Right" />
            </div>
          </div>

          <div class="name-container">
            <div class="name">${donorName}</div>
            <div class="name-line"></div>
          </div>

          <div class="body-text">
            <div class="copy">for ${pronoun} generous hair donation to</div>
            <div class="target">STRAND UP FOR CANCER;</div>
            <div class="copy-sub">this hair will be made into a wig to give to those who suffer from hair loss.</div>
          </div>

          <div class="signatures-grid">
            <div class="sig-col">
              <div class="sig-img-wrap">
                <img class="sig-img" src="${sigJanelleUri}" alt="Signature" />
              </div>
              <div class="sig-line"></div>
              <div class="sig-name">Ma. Janelle D. Yeo</div>
              <div class="sig-title">VP for Community Development</div>
              <div class="sig-org">MDYMCA Youth Club</div>
            </div>
            <div class="sig-col">
              <div class="sig-img-wrap">
                <img class="sig-img" src="${sigJhoanaUri}" alt="Signature" />
              </div>
              <div class="sig-line"></div>
              <div class="sig-name">Ma. Jhoana D. Yeo</div>
              <div class="sig-title">President</div>
              <div class="sig-org">MDYMCA Youth Club</div>
            </div>
            <div class="sig-col">
              <div class="sig-img-wrap">
                <img class="sig-img" src="${sigVenusUri}" alt="Signature" />
              </div>
              <div class="sig-line"></div>
              <div class="sig-name">Venus May Alinsod</div>
              <div class="sig-title">Executive Director</div>
              <div class="sig-org">Manila Downtown YMCA</div>
            </div>
            <div class="sig-col">
              <div class="sig-img-wrap">
                <img class="sig-img" src="${sigHonorioUri}" alt="Signature" />
              </div>
              <div class="sig-line"></div>
              <div class="sig-name">Dr. Honorio T. Tan</div>
              <div class="sig-title">President</div>
              <div class="sig-org">Manila Downtown YMCA</div>
            </div>
          </div>

          <div class="meta-footer">
            <div>Reference: <strong>${reference}</strong></div>
            <div>Cert. No: <strong>${certificateNo}</strong></div>
            <div>Date: <strong>${issuedDate}</strong></div>
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

  // Logo data URIs — loaded once at mount so the PDF generator can embed them
  const [logosReady, setLogosReady] = useState(false);
  const [leftLogoUri, setLeftLogoUri] = useState('');
  const [rightLogoUri, setRightLogoUri] = useState('');
  const [pinkRibbonUri, setPinkRibbonUri] = useState('');
  const [sigJanelleUri, setSigJanelleUri] = useState('');
  const [sigJhoanaUri, setSigJhoanaUri] = useState('');
  const [sigVenusUri, setSigVenusUri] = useState('');
  const [sigHonorioUri, setSigHonorioUri] = useState('');
  const [gender, setGender] = useState('');

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
        setGender(res.data.gender || '');
      } catch (err) {
        console.error('Error fetching profile for certificate:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();

    // Load the certificate logos and convert them to base64 data URIs.
    const loadLogos = async () => {
      try {
        const [
          leftLogoAsset,
          rightLogoAsset,
          pinkRibbonAsset,
          sigJanelleAsset,
          sigJhoanaAsset,
          sigVenusAsset,
          sigHonorioAsset
        ] = await Promise.all([
          Asset.fromModule(require('../../assets/ymca_left_logo.png')).downloadAsync(),
          Asset.fromModule(require('../../assets/ymca_right_logo.png')).downloadAsync(),
          Asset.fromModule(require('../../assets/pink-ribbon.png')).downloadAsync(),
          Asset.fromModule(require('../../assets/sig_janelle.png')).downloadAsync(),
          Asset.fromModule(require('../../assets/sig_jhoana.png')).downloadAsync(),
          Asset.fromModule(require('../../assets/sig_venus.png')).downloadAsync(),
          Asset.fromModule(require('../../assets/sig_honorio.png')).downloadAsync(),
        ]);

        const base64Enc: any = (FileSystem as any).EncodingType?.Base64 ?? 'base64';

        const [
          leftLogoB64,
          rightLogoB64,
          pinkRibbonB64,
          sigJanelleB64,
          sigJhoanaB64,
          sigVenusB64,
          sigHonorioB64
        ] = await Promise.all([
          FileSystem.readAsStringAsync(leftLogoAsset.localUri || leftLogoAsset.uri, { encoding: base64Enc }),
          FileSystem.readAsStringAsync(rightLogoAsset.localUri || rightLogoAsset.uri, { encoding: base64Enc }),
          FileSystem.readAsStringAsync(pinkRibbonAsset.localUri || pinkRibbonAsset.uri, { encoding: base64Enc }),
          FileSystem.readAsStringAsync(sigJanelleAsset.localUri || sigJanelleAsset.uri, { encoding: base64Enc }),
          FileSystem.readAsStringAsync(sigJhoanaAsset.localUri || sigJhoanaAsset.uri, { encoding: base64Enc }),
          FileSystem.readAsStringAsync(sigVenusAsset.localUri || sigVenusAsset.uri, { encoding: base64Enc }),
          FileSystem.readAsStringAsync(sigHonorioAsset.localUri || sigHonorioAsset.uri, { encoding: base64Enc }),
        ]);

        setLeftLogoUri(`data:image/png;base64,${leftLogoB64}`);
        setRightLogoUri(`data:image/png;base64,${rightLogoB64}`);
        setPinkRibbonUri(`data:image/png;base64,${pinkRibbonB64}`);
        setSigJanelleUri(`data:image/png;base64,${sigJanelleB64}`);
        setSigJhoanaUri(`data:image/png;base64,${sigJhoanaB64}`);
        setSigVenusUri(`data:image/png;base64,${sigVenusB64}`);
        setSigHonorioUri(`data:image/png;base64,${sigHonorioB64}`);
        setLogosReady(true);
      } catch (err) {
        console.error('Error loading certificate logos:', err);
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

  const pronoun = gender.toLowerCase() === 'female' ? 'her' : (gender.toLowerCase() === 'male' ? 'his' : 'his/her');

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      // Render the HTML certificate into a real PDF on-device.
      const html = buildCertificateHtml({
        donorName,
        reference,
        certificateNo,
        issuedDate,
        pronoun,
        leftLogoUri,
        rightLogoUri,
        pinkRibbonUri,
        sigJanelleUri,
        sigJhoanaUri,
        sigVenusUri,
        sigHonorioUri,
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
