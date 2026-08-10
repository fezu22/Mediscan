import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
  PermissionsAndroid,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import Config from 'react-native-config';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const SYSTEM_PROMPT = `You are MedScan voice assistant for medicines and lab reports only.

LANGUAGE RULE (STRICT):
- Reply in the SAME language the user used.
- Urdu / Roman Urdu → Urdu
- Pashto → Pashto  
- Hindi → Hindi
- English → English
- Never force English if user spoke another language.

Rules:
- Only medical topics. Non-medical: short refuse in user language.
- Never invent dosage. Never diagnose.
- No asterisks. Short answers (2-4 sentences).
- Simple words.`;

function detectLang(text) {
  const t = (text || '').toLowerCase();
  if (/[\u0600-\u06FF]/.test(text || '')) return 'ur';
  if (/\b(hai|hain|kya|nahi|mujhe|meri|dawai|bukhar|sardi|dard)\b/.test(t)) return 'ur';
  if (/\b(sta|staso|manana|shukria|pashto)\b/.test(t)) return 'ps';
  return 'en';
}

export default function VoiceBotModal({ visible, onClose, scanContext }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(false);

  const cancelled = useRef(false);
  const partialRef = useRef('');
  const finalRef = useRef('');
  const processingRef = useRef(false);
  const listeningRef = useRef(false);

  const stopAll = async () => {
    listeningRef.current = false;
    try {
      await Voice.stop();
    } catch (_) {}
    try {
      await Tts.stop();
    } catch (_) {}
  };

  const askGemini = async (question) => {
    if (!question?.trim() || processingRef.current) return;

    processingRef.current = true;
    setStatus('thinking');
    setError('');
    setTranscript(question);
    setReply('');

    try {
      const key = String(Config.GEMINI_API_KEY || '').trim();
      if (!key) {
        setError('GEMINI_API_KEY missing in .env');
        setStatus('idle');
        processingRef.current = false;
        return;
      }

      const lang = detectLang(question);
      const langName =
        lang === 'ur' ? 'Urdu' : lang === 'ps' ? 'Pashto' : 'English';

      const prompt = `${SYSTEM_PROMPT}

Scan context:
${scanContext || 'No scan context'}

User said: "${question}"

Reply ONLY in ${langName}. Short for voice.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      const data = await res.json();
      console.log('Gemini response:', JSON.stringify(data)?.slice(0, 300));

      if (data?.error) {
        setError(data.error.message || 'Gemini error');
        setStatus('idle');
        processingRef.current = false;
        return;
      }

      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Jawab nahi mil saka.';

      const clean = String(answer).replace(/\*/g, '').trim();
      setReply(clean);
      setStatus('speaking');

      try {
        if (lang === 'ur' || lang === 'ps') {
          try {
            await Tts.setDefaultLanguage('ur-PK');
          } catch (_) {
            try {
              await Tts.setDefaultLanguage('hi-IN');
            } catch (__) {
              await Tts.setDefaultLanguage('en-US');
            }
          }
        } else {
          await Tts.setDefaultLanguage('en-US');
        }
        await Tts.setDefaultRate(0.48);
      } catch (_) {}

      if (!cancelled.current) {
        Tts.speak(clean);
      }
    } catch (e) {
      console.log('Gemini fetch error', e);
      setError('Network error. Internet check karein.');
      setStatus('idle');
    } finally {
      processingRef.current = false;
    }
  };

  const startListening = async () => {
    if (processingRef.current || listeningRef.current) return;

    setError('');
    setTranscript('');
    setReply('');
    partialRef.current = '';
    finalRef.current = '';

    if (Platform.OS === 'android') {
      const g = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (g !== PermissionsAndroid.RESULTS.GRANTED) {
        setError('Mic permission allow karein');
        return;
      }
    }

    try {
      await Tts.stop();
      listeningRef.current = true;
      setStatus('listening');

      // en-US pehle — Android pe sab se reliable
      // Urdu/Roman Urdu bhi aksar en-US se catch ho jata hai
      try {
        await Voice.start('en-US', {
          EXTRA_PARTIAL_RESULTS: true,
          REQUEST_PERMISSIONS_AUTO: true,
        });
      } catch (_) {
        try {
          await Voice.start('ur-PK');
        } catch (__) {
          await Voice.start('en-US');
        }
      }
    } catch (e) {
      console.log('start listen error', e);
      listeningRef.current = false;
      setStatus('idle');
      setError('Mic start nahi hua');
    }
  };

  const stopListening = async () => {
    listeningRef.current = false;
    try {
      await Voice.stop();
    } catch (_) {}

    const text = (finalRef.current || partialRef.current || '').trim();
    if (text) {
      await askGemini(text);
    } else {
      setStatus('idle');
      setError('Kuch sunai nahi diya. Phir se bolo ya type karo.');
    }
  };

  useEffect(() => {
    if (!visible) return;

    cancelled.current = false;
    processingRef.current = false;
    listeningRef.current = false;
    setStatus('idle');
    setTranscript('');
    setReply('');
    setError('');
    setTyped('');
    setShowType(false);

    Voice.onSpeechPartialResults = (e) => {
      const t = e?.value?.[0];
      if (t) {
        partialRef.current = t;
        setTranscript(t);
      }
    };

    Voice.onSpeechResults = (e) => {
      const t = e?.value?.[0];
      if (t) {
        finalRef.current = t;
        setTranscript(t);
      }
    };

    Voice.onSpeechError = (e) => {
      console.log('Speech error', e);
      if (cancelled.current || processingRef.current) return;

      listeningRef.current = false;
      const code = String(e?.error?.code || '');
      // 7 = no match — normal hai, spam mat karo
      if (code === '7') {
        setStatus('idle');
        setError('Samajh nahi aaya. Phir se bolo ya type karo.');
        return;
      }
      setStatus('idle');
      setError('Mic error. Type karke pooch sakte ho.');
    };

    Voice.onSpeechEnd = () => {
      // manual stop pe handle hoga
    };

    const onTtsFinish = () => {
      if (!cancelled.current) setStatus('idle');
    };

    Tts.addEventListener('tts-finish', onTtsFinish);
    Tts.addEventListener('tts-cancel', onTtsFinish);

    return () => {
      cancelled.current = true;
      listeningRef.current = false;
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      Tts.stop();
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    };
  }, [visible]);

  const onMainPress = async () => {
    if (status === 'listening') {
      await stopListening();
    } else if (status === 'idle' || status === 'speaking') {
      await stopAll();
      await startListening();
    }
  };

  const onSendTyped = async () => {
    const q = typed.trim();
    if (!q) return;
    setShowType(false);
    setTyped('');
    await stopAll();
    await askGemini(q);
  };

  const handleClose = async () => {
    cancelled.current = true;
    await stopAll();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MedScan Voice</Text>
            <Text style={styles.sub}>Urdu · English · Type bhi chalega</Text>
          </View>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status ring */}
          <View
            style={[
              styles.ring,
              status === 'listening' && styles.ringListen,
              status === 'thinking' && styles.ringThink,
              status === 'speaking' && styles.ringSpeak,
            ]}
          >
            <Text style={styles.micIcon}>
              {status === 'thinking'
                ? '💭'
                : status === 'speaking'
                ? '🔊'
                : '🎤'}
            </Text>
          </View>

          <Text style={styles.statusText}>
            {status === 'idle' && 'Mic dabao aur bolo'}
            {status === 'listening' && 'Listening... bolo phir Stop dabao'}
            {status === 'thinking' && 'Soch raha hai...'}
            {status === 'speaking' && 'Jawab de raha hai...'}
          </Text>

          {/* Transcript / Reply */}
          <View style={styles.card}>
            {!!transcript && (
              <>
                <Text style={styles.label}>You</Text>
                <Text style={styles.text}>{transcript}</Text>
              </>
            )}
            {!!transcript && !!reply && <View style={styles.divider} />}
            {!!reply && (
              <>
                <Text style={[styles.label, styles.labelBot]}>MedScan</Text>
                <Text style={styles.text}>{reply}</Text>
              </>
            )}
            {!!error && <Text style={styles.err}>{error}</Text>}
            {!transcript && !reply && !error && (
              <Text style={styles.hint}>
                Mic se bolo ya neeche Type dabao. Roman Urdu bhi chalega.
              </Text>
            )}
          </View>

          {/* Type box */}
          {showType && (
            <View style={styles.typeBox}>
              <TextInput
                style={styles.input}
                placeholder="Apna sawal type karo..."
                placeholderTextColor="#9CA3AF"
                value={typed}
                onChangeText={setTyped}
                multiline
              />
              <Pressable style={styles.sendBtn} onPress={onSendTyped}>
                <Text style={styles.sendText}>Send</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Buttons */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {status === 'thinking' ? (
            <ActivityIndicator color="#0E9F8E" size="large" />
          ) : (
            <Pressable
              style={[
                styles.mainBtn,
                status === 'listening' && styles.mainBtnStop,
              ]}
              onPress={onMainPress}
            >
              <Text style={styles.mainBtnText}>
                {status === 'listening'
                  ? '⏹️  Stop & Get Answer'
                  : '🎤  Start Talking'}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.typeBtn}
            onPress={() => setShowType((v) => !v)}
          >
            <Text style={styles.typeBtnText}>
              {showType ? 'Hide Type' : '⌨️  Type instead'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18 },
  body: {
    paddingHorizontal: 18,
    alignItems: 'center',
    paddingBottom: 20,
  },
  ring: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(14,159,142,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  ringListen: {
    borderColor: '#0E9F8E',
    backgroundColor: 'rgba(14,159,142,0.12)',
  },
  ringThink: { borderColor: '#FF7A59' },
  ringSpeak: { borderColor: '#63dac7' },
  micIcon: { fontSize: 40 },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    minHeight: 80,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
  },
  labelBot: { color: '#63dac7' },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  err: { color: '#F87171', fontSize: 13, marginTop: 6 },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  typeBox: { width: '100%', marginTop: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  sendBtn: {
    marginTop: 8,
    backgroundColor: '#0E9F8E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 10,
  },
  mainBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0E9F8E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtnStop: { backgroundColor: '#D64545' },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  typeBtn: { alignItems: 'center', paddingVertical: 8 },
  typeBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
});