import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import Config from 'react-native-config';

const GEMINI_MODEL = 'gemini-2.0-flash';

const RULES = `
You are MedScan voice assistant for medicines and lab reports only.

CRITICAL LANGUAGE RULE:
- ALWAYS reply in the EXACT same language the user spoke.
- Urdu / Roman Urdu → reply in Urdu
- Pashto → reply in Pashto
- Hindi → reply in Hindi
- Arabic → reply in Arabic
- English → reply in English
- NEVER reply in English if user did not speak English.

Other rules:
- Only medical topics (medicines, lab reports, symptoms).
- Non-medical: short refuse in user's language.
- Never invent dosage. Never diagnose.
- Do not say you are AI.
- No asterisks or markdown.
- Keep answers SHORT (2-4 short sentences).
- Simple words only.
`;

function getDeviceLocale() {
  try {
    const loc =
      Platform.OS === 'android'
        ? NativeModules.I18nManager?.localeIdentifier ||
          NativeModules.I18nManager?.locale ||
          ''
        : NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
          '';
    return String(loc || '').replace('_', '-');
  } catch {
    return '';
  }
}

function getListenLocaleChain() {
  const device = getDeviceLocale();
  const chain = [];

  ['ur-PK', 'ur-IN', 'hi-IN', 'en-US', 'en-GB', 'ps-AF', 'ps-PK', 'ar-SA'].forEach(
    (l) => {
      if (!chain.includes(l)) chain.push(l);
    },
  );

  if (device && !chain.includes(device)) {
    chain.unshift(device);
  }

  return chain;
}

async function pickTtsLanguage(prefer) {
  try {
    const voices = await Tts.voices();
    const list = Array.isArray(voices) ? voices : [];
    const find = (prefix) =>
      list.find(
        (v) =>
          typeof v?.language === 'string' &&
          v.language.toLowerCase().startsWith(prefix.toLowerCase()) &&
          v.networkConnectionRequired !== true,
      );

    if (prefer) {
      const hit = find(prefer);
      if (hit?.language) return hit.language;
    }
    for (const p of ['ur', 'hi', 'ps', 'ar', 'en']) {
      const hit = find(p);
      if (hit?.language) return hit.language;
    }
    return 'en-US';
  } catch {
    return 'en-US';
  }
}

function detectLangHint(text) {
  const t = text || '';

  if (/[\u0600-\u06FF]/.test(t)) {
    if (/[ټډړږښڅځڼېۍ]/.test(t)) return 'ps';
    return 'ur';
  }

  const lower = t.toLowerCase();

  if (
    /\b(sta|staso|nokar|dwa|dre|shukria|manana|meherbani|pashto|pukhto|kha|na|ho)\b/.test(
      lower,
    )
  ) {
    return 'ps';
  }

  if (
    /\b(hai|hain|kya|nahi|nahin|mujhe|meri|mera|kitna|kitni|dawai|dawa|bukhar|sardi|khansi|dard|pet|sir|tablet|capsule|report|khoon|sugar|bp|blood)\b/.test(
      lower,
    )
  ) {
    return 'ur';
  }

  return 'en';
}

const VOICE_HTML = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<title>MedScan Voice</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%; height: 100%;
    background: #0B1220;
    color: #fff;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  }
  .wrap { display: flex; flex-direction: column; height: 100%; }
  .header {
    padding: 18px 18px 10px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .title { font-size: 22px; font-weight: 700; }
  .sub { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 4px; }
  .close {
    width: 40px; height: 40px; border-radius: 20px;
    background: rgba(255,255,255,0.08);
    border: none; color: #fff; font-size: 18px;
    display: flex; align-items: center; justify-content: center;
  }
  .main {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 8px 16px;
  }
  .ring {
    width: 200px; height: 200px; border-radius: 100px;
    border: 3px solid rgba(14,159,142,0.4);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .ring.listening { border-color: #0E9F8E; box-shadow: 0 0 40px rgba(14,159,142,0.35); animation: pulse 1.4s infinite; }
  .ring.thinking { border-color: #FF7A59; animation: pulse 1s infinite; }
  .ring.speaking { border-color: #63dac7; box-shadow: 0 0 40px rgba(99,218,199,0.3); animation: pulse 1.2s infinite; }
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.06); opacity: 0.85; }
    100% { transform: scale(1); opacity: 1; }
  }
  .mic {
    width: 72px; height: 72px; border-radius: 36px;
    background: linear-gradient(135deg, #0E9F8E, #0B7A6D);
    display: flex; align-items: center; justify-content: center;
    font-size: 30px;
  }
  .status {
    margin-top: 18px; font-size: 16px; font-weight: 600;
    color: rgba(255,255,255,0.85); text-align: center;
  }
  .hint {
    margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.45);
    text-align: center; padding: 0 20px; line-height: 18px;
  }
  .bottom {
    padding: 12px 16px 28px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .glass {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 12px 14px;
    max-height: 120px;
    overflow-y: auto;
  }
  .label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; }
  .label.bot { color: #63dac7; }
  .body { font-size: 14px; line-height: 20px; margin-top: 4px; color: rgba(255,255,255,0.9); }
  .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 10px 0; }
  .btn {
    height: 54px; border: none; border-radius: 27px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; color: #fff;
    background: linear-gradient(135deg, #0E9F8E, #0B7A6D);
  }
  .btn.stop {
    background: linear-gradient(135deg, #D64545, #B91C1C);
  }
  .btn.thinking { opacity: 0.7; }
  .err { color: #F87171; font-size: 13px; margin-top: 4px; }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <div class="title">MedScan Voice</div>
      <div class="sub">Urdu · Pashto · English · Continuous</div>
    </div>
    <button class="close" id="btn-close" type="button">✕</button>
  </div>

  <div class="main">
    <div class="ring" id="ring">
      <div class="mic">🎤</div>
    </div>
    <div class="status" id="status-text">Tap to start talking</div>
    <div class="hint" id="hint-text">Ek baar start karo — baar baar button nahi dabana. Automatically sunega aur jawab dega.</div>
  </div>

  <div class="bottom">
    <div class="glass">
      <div id="you-block" class="hidden">
        <div class="label">You</div>
        <p class="body" id="you-text"></p>
      </div>
      <div id="divider" class="divider hidden"></div>
      <div id="bot-block" class="hidden">
        <div class="label bot">MedScan</div>
        <p class="body" id="bot-text"></p>
      </div>
      <div class="err" id="err-text"></div>
    </div>
    <button class="btn" id="btn-main" type="button">🎤  Start Conversation</button>
  </div>
</div>

<script>
(function() {
  window.__voiceState = 0;

  window.setVoiceState = function(s) {
    window.__voiceState = s;
    var map = {
      0: 'Tap to start talking',
      1: 'Listening... speak now',
      2: 'Thinking...',
      3: 'Speaking...'
    };
    var el = document.getElementById('status-text');
    if (el) el.textContent = map[s] || map[0];

    var hint = document.getElementById('hint-text');
    if (hint) {
      if (s === 0) hint.textContent = 'Ek baar start karo — baar baar button nahi dabana. Automatically sunega aur jawab dega.';
      else if (s === 1) hint.textContent = 'Bolo, phir chup ho jao. Khud process karega.';
      else if (s === 2) hint.textContent = 'Jawab soch raha hai...';
      else hint.textContent = 'Jawab de raha hai. Khatam hone ke baad phir sunega.';
    }

    var ring = document.getElementById('ring');
    if (ring) {
      ring.className = 'ring';
      if (s === 1) ring.classList.add('listening');
      else if (s === 2) ring.classList.add('thinking');
      else if (s === 3) ring.classList.add('speaking');
    }

    var btn = document.getElementById('btn-main');
    if (!btn) return;
    btn.classList.remove('stop','thinking');
    if (s === 1 || s === 3) {
      btn.classList.add('stop');
      btn.textContent = '⏹️  Stop Conversation';
    } else if (s === 2) {
      btn.classList.add('thinking');
      btn.textContent = 'Thinking...';
    } else {
      btn.textContent = '🎤  Start Conversation';
    }
  };

  window.setTranscript = function(you, bot, err) {
    var yb = document.getElementById('you-block');
    var bb = document.getElementById('bot-block');
    var div = document.getElementById('divider');
    var yt = document.getElementById('you-text');
    var bt = document.getElementById('bot-text');
    var et = document.getElementById('err-text');
    if (you) { yb.classList.remove('hidden'); yt.textContent = you; }
    else { yb.classList.add('hidden'); }
    if (bot) { bb.classList.remove('hidden'); bt.textContent = bot; }
    else { bb.classList.add('hidden'); }
    if (you && bot) div.classList.remove('hidden'); else div.classList.add('hidden');
    et.textContent = err || '';
  };

  document.getElementById('btn-close').onclick = function() {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'close'}));
  };
  document.getElementById('btn-main').onclick = function() {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'main'}));
  };

  window.setVoiceState(0);
})();
</script>
</body>
</html>`;

export default function VoiceBotModal({ visible, onClose, scanContext }) {
  const webRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  const cancelled = useRef(false);
  const statusRef = useRef('idle');
  const continuousRef = useRef(false);
  const lastLangRef = useRef('en');
  const partialRef = useRef('');
  const finalRef = useRef('');
  const silenceTimerRef = useRef(null);
  const processingRef = useRef(false);
  const restartTimerRef = useRef(null);
  const noMatchCountRef = useRef(0);

  const inject = (js) => {
    webRef.current?.injectJavaScript(`${js}; true;`);
  };

  const syncUI = (st, you, bot, err) => {
    const map = { idle: 0, listening: 1, thinking: 2, speaking: 3 };
    const n = map[st] ?? 0;
    inject(`
      if (window.setVoiceState) window.setVoiceState(${n});
      if (window.setTranscript) window.setTranscript(
        ${JSON.stringify(you || '')},
        ${JSON.stringify(bot || '')},
        ${JSON.stringify(err || '')}
      );
    `);
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  useEffect(() => {
    statusRef.current = status;
    syncUI(status, transcript, reply, error);
  }, [status, transcript, reply, error]);

  const finishUtterance = async () => {
    if (processingRef.current || cancelled.current) return;

    const text = (finalRef.current || partialRef.current || '').trim();
    if (!text) {
      if (continuousRef.current) {
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => startListenInternal(), 800);
      }
      return;
    }

    processingRef.current = true;
    noMatchCountRef.current = 0;
    clearSilenceTimer();
    clearRestartTimer();

    try {
      await Voice.stop();
    } catch (_) {}

    setTranscript(text);
    lastLangRef.current = detectLangHint(text);
    partialRef.current = '';
    finalRef.current = '';

    await askGemini(text);
    processingRef.current = false;
  };

  const scheduleSilenceEnd = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (statusRef.current === 'listening' && continuousRef.current) {
        finishUtterance();
      }
    }, 1500);
  };

  const startListenInternal = async () => {
    if (cancelled.current || !continuousRef.current) return;
    if (processingRef.current) return;
    if (statusRef.current === 'listening') return;

    try {
      await Tts.stop();
      clearSilenceTimer();
      clearRestartTimer();
      partialRef.current = '';
      finalRef.current = '';
      setStatus('listening');
      setError('');

      const chain = getListenLocaleChain();
      let started = false;

      for (const locale of chain) {
        try {
          await Voice.start(locale, {
            EXTRA_PARTIAL_RESULTS: true,
            REQUEST_PERMISSIONS_AUTO: true,
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1200,
            EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
          });
          started = true;
          break;
        } catch (_) {
          try {
            await Voice.start(locale);
            started = true;
            break;
          } catch (__) {}
        }
      }

      if (!started) {
        await Voice.start('en-US');
      }
    } catch (e) {
      console.log('listen error', e);
      setStatus('idle');
      continuousRef.current = false;
      setError('Mic start nahi hua. Permission check karein.');
    }
  };

  const askGemini = async (question) => {
    setStatus('thinking');
    try {
      const geminiApiKey = String(Config.GEMINI_API_KEY || '').trim();
      if (!geminiApiKey) {
        setError('Gemini API key missing. Set GEMINI_API_KEY in .env');
        setStatus('idle');
        continuousRef.current = false;
        return;
      }

      const langName =
        lastLangRef.current === 'ur'
          ? 'Urdu'
          : lastLangRef.current === 'ps'
          ? 'Pashto'
          : lastLangRef.current === 'hi'
          ? 'Hindi'
          : 'English';

      const prompt = `${RULES}

Previous medicine/report scan:
${scanContext || 'No scan context'}

User said: "${question}"

Detected language: ${langName}

Reply ONLY in ${langName}. Short answer for voice.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      const data = await response.json();
      const errorMessage = data?.error?.message || data?.message;
      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        errorMessage ||
        'Jawab nahi mil saka.';

      const clean = String(answer).replace(/\*/g, '').trim();
      setReply(clean);
      setStatus('speaking');

      const hint = detectLangHint(clean) || lastLangRef.current;
      lastLangRef.current = hint;

      try {
        if (hint === 'ps' || hint === 'ur' || hint === 'hi') {
          try {
            await Tts.setDefaultLanguage(await pickTtsLanguage(hint));
          } catch (_) {
            try {
              await Tts.setDefaultLanguage('ur-PK');
            } catch (__) {
              try {
                await Tts.setDefaultLanguage('hi-IN');
              } catch (___) {
                await Tts.setDefaultLanguage('en-US');
              }
            }
          }
        } else {
          await Tts.setDefaultLanguage(await pickTtsLanguage('en'));
        }
      } catch (_) {}

      setTimeout(() => {
        if (!cancelled.current) Tts.speak(clean);
      }, 200);
    } catch (e) {
      setError('Network error. Dobara try karein.');
      processingRef.current = false;
      if (continuousRef.current) {
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => startListenInternal(), 1000);
      } else {
        setStatus('idle');
      }
    }
  };

  useEffect(() => {
    if (!visible) return;

    cancelled.current = false;
    continuousRef.current = false;
    processingRef.current = false;
    noMatchCountRef.current = 0;
    setStatus('idle');
    setTranscript('');
    setReply('');
    setError('');

    Voice.onSpeechStart = () => {
      setStatus('listening');
      clearSilenceTimer();
      noMatchCountRef.current = 0;
    };

    Voice.onSpeechPartialResults = (e) => {
      const t = e?.value?.[0];
      if (t) {
        partialRef.current = t;
        setTranscript(t);
        scheduleSilenceEnd();
      }
    };

    Voice.onSpeechResults = (e) => {
      const t = e?.value?.[0];
      if (t) {
        finalRef.current = t;
        setTranscript(t);
        scheduleSilenceEnd();
      }
    };

    Voice.onSpeechEnd = () => {
      clearSilenceTimer();
      setTimeout(() => finishUtterance(), 300);
    };

    Voice.onSpeechError = (e) => {
      console.log('Speech error', e);
      if (cancelled.current || processingRef.current) return;

      clearSilenceTimer();

      const code = String(e?.error?.code || '');
      const msg = String(e?.error?.message || '');

      // Error 7 = No match (silence / not understood)
      if (code === '7' || msg.includes('No match') || msg.includes('7/')) {
        noMatchCountRef.current += 1;

        // 5 baar se zyada no-match → thoda lamba wait
        const delay = noMatchCountRef.current > 5 ? 2500 : 1500;

        if (continuousRef.current) {
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            if (continuousRef.current && !cancelled.current && !processingRef.current) {
              startListenInternal();
            }
          }, delay);
        } else {
          setStatus('idle');
        }
        return;
      }

      // Baaki errors
      if (continuousRef.current) {
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (continuousRef.current && !cancelled.current) {
            startListenInternal();
          }
        }, 1000);
        return;
      }

      setStatus('idle');
      setError('Sun nahi saka. Dobara try karein.');
    };

    (async () => {
      try {
        const lang = await pickTtsLanguage(lastLangRef.current);
        await Tts.setDefaultLanguage(lang);
        await Tts.setDefaultRate(0.48);
      } catch (_) {}
    })();

    const onTtsStart = () => setStatus('speaking');
    const onTtsEnd = () => {
      if (cancelled.current) return;
      if (continuousRef.current) {
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (continuousRef.current && !cancelled.current) {
            startListenInternal();
          }
        }, 700);
      } else {
        setStatus('idle');
      }
    };

    Tts.addEventListener('tts-start', onTtsStart);
    Tts.addEventListener('tts-finish', onTtsEnd);
    Tts.addEventListener('tts-cancel', onTtsEnd);

    return () => {
      cancelled.current = true;
      continuousRef.current = false;
      clearSilenceTimer();
      clearRestartTimer();
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      Tts.stop();
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    };
  }, [visible]);

  const ensureMic = async () => {
    if (Platform.OS !== 'android') return true;
    const g = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    return g === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startConversation = async () => {
    setError('');
    setTranscript('');
    setReply('');
    noMatchCountRef.current = 0;
    const ok = await ensureMic();
    if (!ok) {
      setError('Mic permission allow karein.');
      return;
    }
    continuousRef.current = true;
    processingRef.current = false;
    await startListenInternal();
  };

  const stopConversation = async () => {
    continuousRef.current = false;
    processingRef.current = false;
    clearSilenceTimer();
    clearRestartTimer();
    try {
      await Voice.stop();
    } catch (_) {}
    try {
      Tts.stop();
    } catch (_) {}
    setStatus('idle');
  };

  const handleClose = async () => {
    cancelled.current = true;
    continuousRef.current = false;
    clearSilenceTimer();
    clearRestartTimer();
    try {
      await Voice.stop();
      await Voice.destroy();
    } catch (_) {}
    Tts.stop();
    onClose();
  };

  const onMainPress = () => {
    if (statusRef.current === 'idle') {
      startConversation();
    } else {
      stopConversation();
    }
  };

  const onWebMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'close') handleClose();
      if (data.type === 'main') onMainPress();
    } catch (_) {}
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: VOICE_HTML }}
          style={styles.webview}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={onWebMessage}
          onLoadEnd={() => {
            syncUI(statusRef.current, transcript, reply, error);
          }}
        />
        <View style={styles.fallbackBar} pointerEvents="box-none">
          {status === 'thinking' && (
            <ActivityIndicator color="#0E9F8E" style={{ marginBottom: 8 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  webview: { flex: 1, backgroundColor: '#0B1220' },
  fallbackBar: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});