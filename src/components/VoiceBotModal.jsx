import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Config from 'react-native-config';
import { useLanguage } from '@/context/LanguageContext';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const WHISPER_MODEL = 'whisper-large-v3-turbo';
const LLM_MODEL = 'llama-3.3-70b-versatile';

const RULES = `You are MedScan voice assistant for medicines and lab reports only.
Rules:
- Only medical topics. Non-medical: short refuse in the user's language.
- Never invent dosage not on package. Never diagnose.
- Do not say you are AI. No asterisks or markdown.
- Keep answers SHORT for voice (2-4 short sentences).
- ALWAYS reply in the SAME language the user used (English, Urdu, Arabic, Hindi, Pashto).
- Avoid complex medical jargon.`;

const audioRecorderPlayer = new AudioRecorderPlayer();

function ttsLangCode(appLang, text) {
  if (/[\u0600-\u06FF]/.test(text || '')) {
    if (/[ټډړږښڅځڼېۍ]/.test(text)) return 'ps';
    if (/(ال|في|من|على|هذا)/.test(text)) return 'ar';
    return 'ur';
  }
  if (/[\u0900-\u097F]/.test(text || '')) return 'hi';
  const map = { en: 'en', ur: 'ur', ar: 'ar', hi: 'hi', ps: 'ps' };
  return map[appLang] || 'en';
}

const VOICE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<title>MedScan Voice</title>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    background: #F7F9F9; color: #1F2937;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  }
  .wrap { display: flex; flex-direction: column; height: 100%; width: 100%; }
  .header {
    background: linear-gradient(135deg, #0E9F8E 0%, #0B7A6D 100%);
    padding: 20px 16px 24px;
    border-bottom-left-radius: 28px;
    border-bottom-right-radius: 28px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .title { font-size: 22px; font-weight: 700; margin: 0; color: #fff; }
  .sub { font-size: 13px; color: rgba(255,255,255,0.85); margin: 6px 0 0; }
  .close {
    width: 44px; height: 44px; border-radius: 14px;
    background: rgba(255,255,255,0.2); border: none; color: #fff; font-size: 20px;
    display: flex; align-items: center; justify-content: center;
  }
  .main {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 8px 16px;
  }
  .ring {
    width: 160px; height: 160px; border-radius: 80px;
    border: 4px solid #0E9F8E;
    display: flex; align-items: center; justify-content: center;
    background: #E6F5F2; font-size: 48px;
    transition: transform 0.2s;
  }
  .ring.listening { border-color: #D64545; background: #FEE2E2; transform: scale(1.05); }
  .ring.thinking { border-color: #F59E0B; background: #FEF3C7; }
  .ring.speaking { border-color: #0E9F8E; background: #D1FAE5; }
  .status { margin-top: 18px; font-size: 16px; font-weight: 600; color: #0B7A6D; text-align: center; }
  .hint { margin-top: 6px; font-size: 12px; color: #6B7280; text-align: center; padding: 0 12px; }
  .bottom { padding: 12px 16px 28px; display: flex; flex-direction: column; gap: 12px; }
  .glass {
    background: #fff; border: 1px solid #E5EAEA; border-radius: 20px;
    padding: 14px; max-height: 150px; overflow-y: auto;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  }
  .label { font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; }
  .label.bot { color: #0E9F8E; }
  .body { font-size: 14px; line-height: 20px; margin: 4px 0 0; color: #1F2937; }
  .divider { height: 1px; background: #E5EAEA; margin: 10px 0; }
  .btn {
    height: 56px; border: none; border-radius: 28px;
    font-size: 16px; font-weight: 700; color: #fff;
    background: linear-gradient(135deg, #0E9F8E 0%, #0B7A6D 100%);
  }
  .btn.stop { background: linear-gradient(135deg, #D64545 0%, #B91C1C 100%); }
  .btn:disabled { opacity: 0.7; }
  .err { color: #D64545; font-size: 13px; margin-top: 6px; }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <h1 class="title">MedScan Voice</h1>
      <p class="sub">Groq Whisper · Llama · TTS</p>
    </div>
    <button class="close" id="btn-close" type="button">✕</button>
  </div>
  <div class="main">
    <div class="ring" id="ring">🎙️</div>
    <div class="status" id="status-text">Hold-free: tap to speak</div>
    <div class="hint" id="hint-text">Tap mic, speak, tap stop — then answer plays</div>
  </div>
  <div class="bottom">
    <div class="glass">
      <div id="you-block" class="hidden"><div class="label">You</div><p class="body" id="you-text"></p></div>
      <div id="divider" class="divider hidden"></div>
      <div id="bot-block" class="hidden"><div class="label bot">MedScan</div><p class="body" id="bot-text"></p></div>
      <div class="err" id="err-text"></div>
    </div>
    <button class="btn" id="btn-main" type="button">🎤  Tap to speak</button>
  </div>
</div>
<audio id="tts-audio" playsinline preload="auto"></audio>
<script>
(function() {
  window.setVoiceState = function(s) {
    var map = {0:'Tap to speak',1:'Recording... tap stop when done',2:'Transcribing & thinking...',3:'Speaking...'};
    var el = document.getElementById('status-text');
    if (el) el.textContent = map[s] || map[0];
    var ring = document.getElementById('ring');
    if (ring) {
      ring.className = 'ring' + (s===1?' listening':s===2?' thinking':s===3?' speaking':'');
      ring.textContent = s===1?'🔴':s===2?'⏳':s===3?'🔊':'🎙️';
    }
    var btn = document.getElementById('btn-main');
    if (!btn) return;
    btn.classList.remove('stop');
    btn.disabled = (s===2);
    if (s===1) { btn.classList.add('stop'); btn.textContent = '⏹️  Stop & answer'; }
    else if (s===2) { btn.textContent = 'Please wait...'; }
    else if (s===3) { btn.classList.add('stop'); btn.textContent = '⏹️  Stop audio'; }
    else { btn.textContent = '🎤  Tap to speak'; }
    var hint = document.getElementById('hint-text');
    if (hint) {
      hint.textContent = s===0
        ? 'Tap mic, speak, tap stop — then answer plays'
        : (s===1 ? 'Speak clearly, then press Stop' : 'Please wait');
    }
  };
  window.setTranscript = function(you, bot, err) {
    var yb=document.getElementById('you-block'), bb=document.getElementById('bot-block');
    var div=document.getElementById('divider'), yt=document.getElementById('you-text');
    var bt=document.getElementById('bot-text'), et=document.getElementById('err-text');
    if (you) { yb.classList.remove('hidden'); yt.textContent=you; } else yb.classList.add('hidden');
    if (bot) { bb.classList.remove('hidden'); bt.textContent=bot; } else bb.classList.add('hidden');
    if (you && bot) div.classList.remove('hidden'); else div.classList.add('hidden');
    if (et) et.textContent = err || '';
  };
  window.playTtsUrl = function(url) {
    var a = document.getElementById('tts-audio');
    a.onended = function() {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'tts_end'}));
    };
    a.onerror = function() {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'tts_error'}));
    };
    a.src = url;
    a.play().catch(function(err) {
      console.log('TTS Error', err);
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'tts_error'}));
    });
  };
  window.stopTts = function() {
    var a = document.getElementById('tts-audio');
    if(a) { a.pause(); a.removeAttribute('src'); }
  };
  document.getElementById('btn-close').onclick = function() {
    window.stopTts();
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
  const langCtx = useLanguage() || {};
  const appLanguage = langCtx.language || langCtx.lang || langCtx.code || 'en';

  const webRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  const statusRef = useRef('idle');
  const recordingRef = useRef(false);
  const cancelled = useRef(false);
  const scanContextRef = useRef(scanContext);
  const appLangRef = useRef(appLanguage);
  const pathRef = useRef('');

  useEffect(() => {
    scanContextRef.current = scanContext;
  }, [scanContext]);
  useEffect(() => {
    appLangRef.current = appLanguage;
  }, [appLanguage]);

  const inject = (js) => webRef.current?.injectJavaScript(`${js}; true;`);

  const syncUI = (st, you, bot, err) => {
    const map = { idle: 0, recording: 1, thinking: 2, speaking: 3 };
    inject(`
      if (window.setVoiceState) window.setVoiceState(${map[st] ?? 0});
      if (window.setTranscript) window.setTranscript(
        ${JSON.stringify(you || '')},
        ${JSON.stringify(bot || '')},
        ${JSON.stringify(err || '')}
      );
    `);
  };

  useEffect(() => {
    statusRef.current = status;
    syncUI(status, transcript, reply, error);
  }, [status, transcript, reply, error]);

  const getGroqKey = () => String(Config.GROQ_API_KEY || '').trim();

  const ensureMic = async () => {
    if (Platform.OS !== 'android') return true;
    const g = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'MedScan needs access to your microphone for voice assistant.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return g === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startRecording = async () => {
    setError('');
    setTranscript('');
    setReply('');
    const ok = await ensureMic();
    if (!ok) {
      setError('Mic permission allow karein.');
      return;
    }
    const key = getGroqKey();
    if (!key) {
      setError('GROQ_API_KEY missing in .env — rebuild after adding.');
      return;
    }

    const path =
      Platform.OS === 'android'
        ? `${RNFS.CachesDirectoryPath}/medscan_voice.mp4`
        : `${RNFS.CachesDirectoryPath}/medscan_voice.m4a`;
    pathRef.current = path;

    try {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
    } catch (_) {}

    try {
      // Clean non-nitro default recording execution
      await audioRecorderPlayer.startRecorder(path);
      recordingRef.current = true;
      setStatus('recording');
    } catch (e) {
      console.log('record start error', e);
      setError('Recording start nahi hui: ' + (e?.message || String(e)));
      setStatus('idle');
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setStatus('thinking');

    let filePath = pathRef.current;
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      if (result) filePath = result.replace('file://', '');
    } catch (e) {
      console.log('stop record', e);
    }

    try {
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        setError('Audio file nahi mili. Dobara try karein.');
        setStatus('idle');
        return;
      }

      // 1) Groq Whisper STT
      const text = await transcribeWithGroq(filePath);
      if (cancelled.current) return;
      if (!text?.trim()) {
        setError('Kuch samajh nahi aaya. Clear bolo, dobara try.');
        setStatus('idle');
        return;
      }
      setTranscript(text.trim());

      // 2) Groq Llama brain
      const answer = await askGroqLlama(text.trim());
      if (cancelled.current) return;
      const clean = String(answer || '')
        .replace(/\*/g, '')
        .trim();
      setReply(clean || 'Jawab nahi mil saka.');

      // 3) TTS
      setStatus('speaking');
      const tl = ttsLangCode(appLangRef.current, clean);
      const ttsUrl =
        'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' +
        encodeURIComponent(tl) +
        '&q=' +
        encodeURIComponent(clean.slice(0, 200));
      inject(`if (window.playTtsUrl) window.playTtsUrl(${JSON.stringify(ttsUrl)});`);
    } catch (e) {
      console.log('process error', e);
      setError(e?.message || 'Voice process failed.');
      setStatus('idle');
    }
  };

  const transcribeWithGroq = async (filePath) => {
    const key = getGroqKey();
    const form = new FormData();
    form.append('file', {
      uri: Platform.OS === 'android' ? 'file://' + filePath : filePath,
      type: Platform.OS === 'android' ? 'audio/mp4' : 'audio/m4a',
      name: Platform.OS === 'android' ? 'audio.mp4' : 'audio.m4a',
    });
    form.append('model', WHISPER_MODEL);
    form.append('response_format', 'json');

    const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Whisper failed');
    }
    return data?.text || '';
  };

  const askGroqLlama = async (question) => {
    const key = getGroqKey();
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.4,
        max_tokens: 300,
        messages: [
          { role: 'system', content: RULES },
          {
            role: 'user',
            content: `App language: ${appLangRef.current}

Scan context:
${scanContextRef.current || 'No scan yet'}

User said: ${question}

Reply in the user's language. Short for voice.`,
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Llama failed');
    }
    return data?.choices?.[0]?.message?.content || '';
  };

  const stopAll = async () => {
    try {
      if (recordingRef.current) {
        recordingRef.current = false;
        await audioRecorderPlayer.stopRecorder();
        audioRecorderPlayer.removeRecordBackListener();
      }
    } catch (_) {}
    inject('if (window.stopTts) window.stopTts();');
    setStatus('idle');
  };

  useEffect(() => {
    if (!visible) return;
    cancelled.current = false;
    recordingRef.current = false;
    setStatus('idle');
    setTranscript('');
    setReply('');
    setError('');

    return () => {
      cancelled.current = true;
      stopAll();
    };
  }, [visible]);

  const onMainPress = async () => {
    const st = statusRef.current;
    if (st === 'idle') {
      await startRecording();
    } else if (st === 'recording') {
      await stopRecordingAndProcess();
    } else if (st === 'speaking') {
      inject('if (window.stopTts) window.stopTts();');
      setStatus('idle');
    }
  };

  const handleClose = async () => {
    cancelled.current = true;
    await stopAll();
    onClose();
  };

  const onWebMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'close') handleClose();
      if (data.type === 'main') onMainPress();
      if (data.type === 'tts_end') setStatus('idle');
      if (data.type === 'tts_error') {
        setError('TTS play failed — text answer visible above.');
        setStatus('idle');
      }
    } catch (_) {}
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.root}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: VOICE_HTML }}
          style={styles.webview}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          onMessage={onWebMessage}
          onLoadEnd={() => syncUI(statusRef.current, transcript, reply, error)}
        />
        {status === 'thinking' && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator color="#0E9F8E" size="large" />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9F9' },
  webview: { flex: 1, backgroundColor: '#F7F9F9' },
  loader: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});