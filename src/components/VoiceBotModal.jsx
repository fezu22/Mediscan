import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Config from 'react-native-config';
import Tts from 'react-native-tts';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const SYSTEM_PROMPT = `You are MedScan assistant. Answer user questions about the current scan in the same language. Keep answers short, simple, and medical.`;

const detectLang = (text) => {
  if (!text) return 'en';
  const lower = text.toLowerCase();
  if (/[\u0600-\u06FF]/.test(lower)) return 'ur';
  if (/^[\u0A00-\u0A7F]/.test(lower)) return 'pa';
  if (/^[\u0900-\u097F]/.test(lower)) return 'hi';
  if (/[\u4E00-\u9FFF]/.test(lower)) return 'zh';
  return 'en';
};

export default function VoiceBotModal({ visible, onClose, scanContext }) {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState('idle');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const processingRef = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!visible) {
      setQuestion('');
      setReply('');
      setError('');
      setTranscript('');
      setStatus('idle');
    }
    return () => {
      cancelled.current = true;
    };
  }, [visible]);

  const askGemini = async (text) => {
    const questionText = String(text || '').trim();
    if (!questionText || processingRef.current) return;

    processingRef.current = true;
    setStatus('thinking');
    setError('');
    setTranscript(questionText);
    setReply('');

    try {
      const key = String(Config.GEMINI_API_KEY || '').trim();
      if (!key) {
        setError('GEMINI_API_KEY missing in .env');
        setStatus('idle');
        processingRef.current = false;
        return;
      }

      const lang = detectLang(questionText);
      const contextText = scanContext
        ? `Scan context:\n${typeof scanContext === 'string' ? scanContext : JSON.stringify(scanContext)}`
        : 'No previous scan available.';

      const prompt = `${SYSTEM_PROMPT}\n\n${contextText}\n\nUser question: ${questionText}\n\nReply in the same language the user used. Keep answer short (2-4 sentences).`;

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
      if (data?.error) {
        setError(data.error.message || 'Gemini error');
        setStatus('idle');
        processingRef.current = false;
        return;
      }

      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (lang === 'ps'
          ? 'ځواب نشو موندلی.'
          : lang === 'ur'
          ? 'جواب نہیں مل سکا۔'
          : 'Could not get answer.');

      const clean = String(answer).replace(/\*/g, '').trim();
      setReply(clean);
      setStatus('speaking');

      try {
        const voices = await Tts.voices();
        let selectedVoice = null;

        if (lang === 'ps' || lang === 'ur') {
          selectedVoice =
            voices.find((v) => v.language?.startsWith('ur')) ||
            voices.find((v) => v.language?.startsWith('hi')) ||
            voices.find((v) => v.language?.startsWith('en'));
        } else if (lang === 'hi') {
          selectedVoice =
            voices.find((v) => v.language?.startsWith('hi')) ||
            voices.find((v) => v.language?.startsWith('en'));
        } else {
          selectedVoice =
            voices.find((v) => v.language === 'en-US' || v.language?.startsWith('en')) ||
            voices[0];
        }

        if (selectedVoice?.id) {
          await Tts.setDefaultVoice(selectedVoice.id);
        }

        try {
          if (lang === 'ps' || lang === 'ur') {
            await Tts.setDefaultLanguage('ur-PK');
          } else if (lang === 'hi') {
            await Tts.setDefaultLanguage('hi-IN');
          } else {
            await Tts.setDefaultLanguage('en-US');
          }
        } catch (_) {
          await Tts.setDefaultLanguage('en-US');
        }

        if (lang === 'ps') {
          await Tts.setDefaultRate(0.46);
          await Tts.setDefaultPitch(0.95);
        } else if (lang === 'ur') {
          await Tts.setDefaultRate(0.48);
          await Tts.setDefaultPitch(1.0);
        } else {
          await Tts.setDefaultRate(0.5);
          await Tts.setDefaultPitch(1.05);
        }
      } catch (_) {
        // ignore TTS setup issues
      }

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Voice Assistant</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Ask about this scan in simple language.
          </Text>

          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Type your question..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={status !== 'thinking'}
            returnKeyType="send"
            onSubmitEditing={() => askGemini(question)}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {reply ? <Text style={styles.replyText}>{reply}</Text> : null}

          <Pressable
            style={[styles.button, status === 'thinking' && styles.buttonDisabled]}
            onPress={() => askGemini(question)}
            disabled={!question || status === 'thinking'}
          >
            {status === 'thinking' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ask Gemini</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#374151',
    lineHeight: 24,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    marginBottom: 12,
    fontSize: 13,
  },
  replyText: {
    color: '#111827',
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#0E9F8E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});