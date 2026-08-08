import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Config from 'react-native-config';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { saveScan } from '@/lib/scanStorage';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import VoiceBotModal from '@/components/VoiceBotModal';
import { colors } from '@/theme/colors';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const LANG_NAMES = {
  en: 'English',
  ur: 'Urdu',
  ar: 'Arabic',
  hi: 'Hindi',
  ps: 'Pashto',
  pa: 'Punjabi',
  sd: 'Sindhi',
  fa: 'Persian',
  tr: 'Turkish',
  bn: 'Bengali',
  zh: 'Chinese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  id: 'Indonesian',
  ja: 'Japanese',
  ko: 'Korean',
  th: 'Thai',
};

function buildSystemRules(langCode) {
  const langName = LANG_NAMES[langCode] || 'English';
  return `
You are MedScan — a helpful medical scanner assistant.
You ONLY explain medicines, lab reports, and prescriptions in simple language.

STRICT RULES:
1. Only medical content. Non-medical image → set type "unknown".
2. NEVER invent dosage. If dose not clearly written on pack, write that user should confirm from package/doctor.
3. NEVER diagnose disease or prescribe new treatment.
4. Do NOT say you are AI, chatbot, or Gemini.
5. No markdown, no asterisks (*), no bullet symbols in text values.
6. Prices: approximate Pakistan retail in PKR. Always say "approx".
7. Alternatives: only same/similar salt brands common in Pakistan. Max 3. If unsure → empty array.
8. LANGUAGE: Write ALL text fields (about, notes, howItWorks, whyInMedicine, howToUse, and every sentence) in ${langName} only. Simple clear ${langName}. Brand names can stay as written on pack. Do not mix other languages.
9. about field: 2-3 short useful sentences only. No extra talk.
10. Keep every field focused and practical for a normal user.
`;
}

function FormattedText({ text, style, boldStyle }) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const isDouble =
          part.startsWith('**') && part.endsWith('**') && part.length > 4;
        const isSingle =
          !isDouble &&
          part.startsWith('*') &&
          part.endsWith('*') &&
          part.length > 2;
        if (isDouble || isSingle) {
          const clean = part.replace(/^\*{1,2}|\*{1,2}$/g, '').replace(/\*/g, '');
          return (
            <Text key={i} style={[{ fontWeight: '700' }, boldStyle]}>
              {clean}
            </Text>
          );
        }
        const clean = part.replace(/\*/g, '');
        if (!clean) return null;
        return <Text key={i}>{clean}</Text>;
      })}
    </Text>
  );
}

export default function ResultScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { imageUri, scanMode } = route.params || {};
  const savedScan = route.params?.savedScan;
  const { user } = useAuth();
  const { language } = useLanguage();
  const systemRules = buildSystemRules(language);

  const [loading, setLoading] = useState(!savedScan);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [rawText, setRawText] = useState(null);

  const [expanded, setExpanded] = useState('about');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    if (savedScan) {
      setLoading(false);
      setError(null);
      setResult({
        type: savedScan.type,
        name: savedScan.name,
        subtitle: savedScan.subtitle,
        manufacturer: savedScan.manufacturer,
        confidence: savedScan.confidence,
        about: savedScan.about,
        onPackage: savedScan.onPackage || [],
        notes: savedScan.notes || [],
        formula: savedScan.formula || null,
        howItWorks: savedScan.howItWorks || null,
        whyInMedicine: savedScan.whyInMedicine || null,
        howToUse: savedScan.howToUse || null,
        alternatives: savedScan.alternatives || [],
        price: savedScan.price || null,
      });
      return;
    }
    if (imageUri) {
      analyzeImage(imageUri);
    } else {
      setLoading(false);
      setError('Koi image nahi mili.');
    }
  }, [imageUri, savedScan]);

  const analyzeImage = async (uri) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setRawText(null);
      setChatMessages([]);

      const cleanPath = uri.replace('file://', '');
      const base64Image = await RNFS.readFile(cleanPath, 'base64');

      const modeHint =
        scanMode === 'report'
          ? 'User selected REPORT / TEST mode. Expect lab report, blood test, urine, pathology, X-ray, or prescription. If image is clearly a medicine pack/strip/bottle → set type "mismatch_medicine".'
          : 'User selected MEDICINE mode. Expect medicine pack, strip, bottle or blister. If image is clearly a lab report / test / prescription → set type "mismatch_report".';

      const prompt = `${systemRules}

${modeHint}

Look carefully at this image.

Return ONLY valid JSON (no markdown, no code fences):
{
  "type": "medicine" | "report" | "prescription" | "unknown" | "mismatch_medicine" | "mismatch_report",
  "name": "brand name or report title",
  "subtitle": "salt / generic name OR report type",
  "manufacturer": "company name or empty string",
  "confidence": 0-100,
  "about": "2-3 short clear sentences only",
  "onPackage": ["only text actually visible on the image"],
  "notes": ["important practical cautions if known, else empty array"],
  "formula": "salt composition e.g. Paracetamol 500mg or empty",
  "howItWorks": "simple how this works in body (medicine only) or empty",
  "whyInMedicine": "what problem this targets (medicine only) or empty",
  "howToUse": "general use info. Never invent exact dose. Say package/doctor se confirm karein if needed.",
  "alternatives": [
    {
      "name": "other brand same/similar salt",
      "company": "company",
      "priceApproxPkr": "80-120"
    }
  ],
  "price": {
    "approxPkr": "90-150 per pack",
    "note": "approx Pakistan retail"
  }
}

Extra rules:
- If image is blurry, dark, unreadable or not medical → type "unknown", name "Image issue — clear photo chahiye".
- If user chose Medicine but image is report/test → type "mismatch_report".
- If user chose Report but image is medicine → type "mismatch_medicine".
- Keep about, notes, howToUse short and useful. No repeated or filler text.
- alternatives max 3 items. Empty array if unknown.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${Config.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        setError(data?.error?.message || 'Result nahi mil saka. Dobara try karein.');
        return;
      }

      const cleaned = text.replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);

        if (parsed.type === 'mismatch_report') {
          setError(
            'Yeh image Lab Report / Test lag rahi hai.\n\nAap ne Medicine select kiya tha. Sahi result ke liye peeche jaake "Lab Report" choose karein aur dobara scan karein.',
          );
          setResult(null);
          return;
        }
        if (parsed.type === 'mismatch_medicine') {
          setError(
            'Yeh image Medicine pack/strip lag rahi hai.\n\nAap ne Report / Test select kiya tha. Sahi result ke liye peeche jaake "Medicine" choose karein aur dobara scan karein.',
          );
          setResult(null);
          return;
        }

        if (
          parsed.type === 'unknown' ||
          (parsed.confidence != null && parsed.confidence < 35) ||
          (parsed.name &&
            String(parsed.name).toLowerCase().includes('image issue'))
        ) {
          setError(
            'Image issue — photo clear nahi hai ya medical item detect nahi hua.\n\nBehtar lighting mein seedha aur clear photo lein, phir dobara upload karein.',
          );
          setResult(null);
          return;
        }

        setResult(parsed);
        await saveScan({ imageUri: uri, result: parsed, userId: user?.id });
      } catch {
        setRawText(text);
        await saveScan({
          imageUri: uri,
          result: null,
          rawText: text,
          userId: user?.id,
        });
      }
    } catch (err) {
      console.log('Analysis error:', err);
      setError(
        'Analysis fail ho gaya. Internet check karein ya thodi der baad dobara try karein.',
      );
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);

    try {
      const context = result
        ? JSON.stringify(result)
        : rawText || 'No previous scan available.';

      const prompt = `${systemRules}

Previous scan result:
${context}

User question: ${question}

Reply in 2-5 short clear sentences. Only medicine/report related. No asterisks, no filler. If price/alternatives asked — give approx Pakistan info and say pharmacy se confirm karein.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${Config.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      const data = await response.json();
      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.error?.message ||
        'Jawab nahi mil saka. Dobara try karein.';

      setChatMessages((prev) => [...prev, { role: 'ai', text: answer }]);
    } catch (e) {
      console.log('Chat error:', e);
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Sawal process nahi ho saka. Internet check karein.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggle = (key) => setExpanded((e) => (e === key ? null : key));

  const isReport =
    result?.type === 'report' || result?.type === 'prescription';
  const isMedicine = result?.type === 'medicine';

  const typeLabel =
    result?.type === 'report'
      ? 'Lab Report'
      : result?.type === 'prescription'
        ? 'Prescription'
        : result?.type === 'medicine'
          ? 'Medicine'
          : 'Other';

  const aboutTitle = isReport ? 'Report ka simple matlab' : 'Medicine ke bare mein';
  const packageTitle = isReport ? 'Report par likha hua' : 'Packaging par likha hua';
  const notesTitle = isReport ? 'Zaroori baatein' : 'Important notes';
  const chatPlaceholder = isReport
    ? 'Report ke bare mein sawal poochhein...'
    : 'Medicine ke bare mein sawal poochhein...';

  const displayImage = imageUri || savedScan?.imageUri;

  const alts = Array.isArray(result?.alternatives) ? result.alternatives : [];
  const hasFormula =
    isMedicine &&
    (result?.formula ||
      result?.howItWorks ||
      result?.whyInMedicine ||
      result?.howToUse);
  const hasPrice = isMedicine && result?.price?.approxPkr;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={20} color={colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Result</Text>
        {result?.confidence != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{result.confidence}% match</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {displayImage ? (
          <Image
            source={{ uri: displayImage }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : null}

        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Result taiyar ho raha hai...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Image Issue</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorActions}>
              <Pressable
                onPress={() =>
                  navigation.navigate('Camera', {
                    scanType:
                      scanMode === 'report' ? 'report' : 'medicine',
                  })
                }
                style={styles.retryBtn}
              >
                <Text style={styles.retryText}>Nayi image upload karein</Text>
              </Pressable>
              {imageUri ? (
                <Pressable
                  onPress={() => analyzeImage(imageUri)}
                  style={styles.secondaryRetryBtn}
                >
                  <Text style={styles.secondaryRetryText}>
                    Isi image se dobara try
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        {!loading && result && (
          <>
            <View style={styles.mainCard}>
              <Text style={styles.medName}>{result.name || 'Unknown'}</Text>
              {!!result.subtitle && (
                <Text style={styles.medSub}>{result.subtitle}</Text>
              )}
              {!!result.manufacturer && (
                <Text style={styles.medMeta}>{result.manufacturer}</Text>
              )}
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>{typeLabel}</Text>
              </View>
              {hasPrice && (
                <Text style={styles.priceLine}>
                  Approx price: Rs. {result.price.approxPkr}
                </Text>
              )}
            </View>

            <Section
              title={aboutTitle}
              open={expanded === 'about'}
              onPress={() => toggle('about')}
            >
              <FormattedText text={result.about} style={styles.bodyText} />
            </Section>

            {hasFormula && (
              <Section
                title="Formula & kaam"
                open={expanded === 'formula'}
                onPress={() => toggle('formula')}
              >
                {!!result.formula && (
                  <>
                    <Text style={styles.fieldLabel}>Formula / salt</Text>
                    <FormattedText text={result.formula} style={styles.bodyText} />
                  </>
                )}
                {!!result.howItWorks && (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                      Yeh formula kaise kaam karta hai
                    </Text>
                    <FormattedText
                      text={result.howItWorks}
                      style={styles.bodyText}
                    />
                  </>
                )}
                {!!result.whyInMedicine && (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                      Is medicine mein kyun dala gaya
                    </Text>
                    <FormattedText
                      text={result.whyInMedicine}
                      style={styles.bodyText}
                    />
                  </>
                )}
                {!!result.howToUse && (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                      Kaise use hota hai
                    </Text>
                    <FormattedText
                      text={result.howToUse}
                      style={styles.bodyText}
                    />
                  </>
                )}
              </Section>
            )}

            {alts.length > 0 && (
              <Section
                title="Alternative medicines"
                open={expanded === 'alts'}
                onPress={() => toggle('alts')}
              >
                <Text style={styles.altIntro}>
                  Same / similar formula — doosri companies (approx)
                </Text>
                {alts.map((a, i) => (
                  <View key={i} style={styles.altRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.altName}>{a.name}</Text>
                      {!!a.company && (
                        <Text style={styles.altCompany}>{a.company}</Text>
                      )}
                    </View>
                    {!!a.priceApproxPkr && (
                      <Text style={styles.altPrice}>
                        Rs. {a.priceApproxPkr}
                      </Text>
                    )}
                  </View>
                ))}
              </Section>
            )}

            {Array.isArray(result.onPackage) && result.onPackage.length > 0 && (
              <Section
                title={packageTitle}
                open={expanded === 'onPackage'}
                onPress={() => toggle('onPackage')}
              >
                {result.onPackage.map((line, i) => (
                  <FormattedText
                    key={i}
                    text={`• ${line}`}
                    style={styles.bullet}
                  />
                ))}
              </Section>
            )}

            {Array.isArray(result.notes) && result.notes.length > 0 && (
              <Section
                title={notesTitle}
                open={expanded === 'notes'}
                onPress={() => toggle('notes')}
              >
                {result.notes.map((line, i) => (
                  <FormattedText
                    key={i}
                    text={`• ${line}`}
                    style={styles.bullet}
                  />
                ))}
              </Section>
            )}
          </>
        )}

        {!loading && rawText && !result && (
          <View style={styles.mainCard}>
            <FormattedText text={rawText} style={styles.bodyText} />
          </View>
        )}

        {chatMessages.length > 0 && (
          <View style={styles.chatList}>
            <Text style={styles.chatListTitle}>Aap ke sawalat</Text>
            {chatMessages.map((m, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <FormattedText
                  text={m.text}
                  style={[
                    styles.bubbleText,
                    m.role === 'user' && styles.bubbleTextUser,
                  ]}
                  boldStyle={m.role === 'user' ? { color: '#fff' } : undefined}
                />
              </View>
            ))}
            {chatLoading && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
              />
            )}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.chatBar}>
        <Pressable
          onPress={() => setVoiceOpen(true)}
          disabled={loading}
          style={[styles.micBtn, loading && { opacity: 0.5 }]}
        >
          <Text style={{ fontSize: 18 }}>🎙️</Text>
        </Pressable>

        <TextInput
          value={chatInput}
          onChangeText={setChatInput}
          placeholder={chatPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.chatInput}
          editable={!chatLoading && !loading}
          onSubmitEditing={sendChat}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.chatSend, (chatLoading || loading) && { opacity: 0.5 }]}
          onPress={sendChat}
          disabled={chatLoading || loading}
        >
          {chatLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, color: '#fff', fontWeight: '700' }}>
              ➤
            </Text>
          )}
        </Pressable>
      </View>

      <VoiceBotModal
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        scanContext={
          result ? JSON.stringify(result) : rawText || 'No scan yet'
        }
      />
    </KeyboardAvoidingView>
  );
}

function Section({ title, open, onPress, children }) {
  return (
    <View style={styles.section}>
      <Pressable onPress={onPress} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {open ? (
          <ChevronUp size={18} color={colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={colors.textMuted} />
        )}
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9F9' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    flex: 1,
  },
  badge: {
    backgroundColor: '#E6F5F2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 14,
  },
  centerBox: { alignItems: 'center', marginVertical: 28 },
  loadingText: { marginTop: 10, color: colors.textMuted },
  errorCard: {
    backgroundColor: '#FDECEC',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  errorActions: {
    marginTop: 16,
    gap: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryRetryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryRetryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    elevation: 1,
  },
  medName: { fontSize: 20, fontWeight: '700', color: colors.textDark },
  medSub: { marginTop: 4, fontSize: 14, color: colors.textMuted },
  medMeta: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  typeChip: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#E6F5F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeChipText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  priceLine: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  altIntro: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    gap: 8,
  },
  altName: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  altCompany: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  altPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16 },
  bodyText: { fontSize: 14, lineHeight: 22, color: colors.textDark },
  bullet: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textDark,
    marginBottom: 4,
  },
  chatList: { marginTop: 12, gap: 8 },
  chatListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '88%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    elevation: 1,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: colors.textDark },
  bubbleTextUser: { color: '#fff' },
  chatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textDark,
  },
  chatSend: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});