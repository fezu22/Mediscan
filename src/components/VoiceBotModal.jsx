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
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import Config from 'react-native-config';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const RULES = `
You are MedScan voice assistant for medicines and lab reports only.
Rules:
- Only medical topics. Non-medical: short refuse.
- Never invent dosage not on package. Never diagnose.
- Do not say you are AI. No asterisks.
- Keep answers SHORT for voice (2-4 short sentences).
- If user speaks Urdu / Roman Urdu, reply in simple Urdu (Urdu script preferred).
- If user speaks English, reply in simple English.
- Avoid complex English medical jargon when replying in Urdu.
`;

/** Prefer Urdu, then Hindi (often better on Android), then English */
async function pickTtsLanguage() {
  try {
    const voices = await Tts.voices();
    const list = Array.isArray(voices) ? voices : [];

    const find = (prefix) =>
      list.find(
        (v) =>
          typeof v?.language === 'string' &&
          v.language.toLowerCase().startsWith(prefix) &&
          v.networkConnectionRequired !== true,
      );

    const ur = find('ur');
    if (ur?.language) return ur.language;

    const hi = find('hi');
    if (hi?.language) return hi.language;

    const en = find('en');
    if (en?.language) return en.language;

    return 'ur-PK';
  } catch {
    return 'ur-PK';
  }
}

function detectReplyLang(text) {
  if (/[\u0600-\u06FF]/.test(text || '')) return 'ur';
  return 'en';
}

/** Stitch / DESIGN voice page — WebGL ring + UI */
const VOICE_HTML = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<title>MedScan Voice Assistant</title>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    background: #0d0f17; color: #fff;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  }
  .wrap {
    display: flex; flex-direction: column;
    height: 100%; width: 100%; position: relative;
  }
  .header {
    padding: 20px 16px 8px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .title { font-size: 22px; font-weight: 700; margin: 0; }
  .sub { font-size: 13px; color: rgba(255,255,255,0.65); margin: 6px 0 0; }
  .close {
    width: 44px; height: 44px; border-radius: 999px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff; font-size: 20px;
    display: flex; align-items: center; justify-content: center;
  }
  .main {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 8px 16px 12px;
  }
  .ring-box { width: 260px; height: 260px; position: relative; }
  #shader-canvas { width: 100%; height: 100%; display: block; }
  .status {
    margin-top: 12px; font-size: 16px; font-weight: 600;
    color: rgba(255,255,255,0.75);
  }
  .bottom {
    padding: 12px 16px 28px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .glass {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px;
    padding: 14px;
    max-height: 140px;
    overflow-y: auto;
  }
  .label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; }
  .label.bot { color: #63dac7; }
  .body { font-size: 14px; line-height: 20px; margin: 4px 0 0; }
  .divider { height: 1px; background: rgba(255,255,255,0.1); margin: 10px 0; }
  .btn {
    height: 56px; border: none; border-radius: 999px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 16px; font-weight: 700; color: #fff;
    background: linear-gradient(135deg, #FF7A59 0%, #E65D3E 100%);
    box-shadow: 0 8px 24px -6px rgba(255,122,89,0.5);
  }
  .btn.stop {
    background: linear-gradient(135deg, #D64545 0%, #B91C1C 100%);
    box-shadow: 0 8px 24px -6px rgba(214,69,69,0.45);
  }
  .btn.thinking { opacity: 0.75; }
  .err { color: #F87171; font-size: 13px; margin-top: 6px; }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <h1 class="title">MedScan Voice</h1>
      <p class="sub">Medicine / report sawal — voice mode</p>
    </div>
    <button class="close" id="btn-close" type="button">✕</button>
  </div>

  <div class="main">
    <div class="ring-box">
      <canvas id="shader-canvas" width="512" height="512"></canvas>
    </div>
    <div class="status" id="status-text">Tap to speak</div>
  </div>

  <div class="bottom">
    <div class="glass" id="transcript-card">
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
    <button class="btn" id="btn-main" type="button">🎤  Tap to speak</button>
  </div>
</div>

<script>
(function() {
  window.__voiceState = 0;

  window.setVoiceState = function(s) {
    window.__voiceState = s;
    var map = {0:'Tap to speak',1:'Listening...',2:'Thinking...',3:'Speaking...'};
    var el = document.getElementById('status-text');
    if (el) el.textContent = map[s] || map[0];
    var btn = document.getElementById('btn-main');
    if (!btn) return;
    btn.classList.remove('stop','thinking');
    if (s === 1 || s === 3) {
      btn.classList.add('stop');
      btn.textContent = s === 1 ? '⏹️  Stop' : '⏹️  Stop speaking';
    } else if (s === 2) {
      btn.classList.add('thinking');
      btn.textContent = 'Thinking...';
    } else {
      btn.textContent = '🎤  Tap to speak';
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

  const canvas = document.getElementById('shader-canvas');
  function syncSize() {
    const w = canvas.clientWidth || 512;
    const h = canvas.clientHeight || 512;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncSize).observe(canvas);
  syncSize();

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vs = 'attribute vec2 a_position; varying vec2 v_texCoord; void main(){ v_texCoord=a_position*0.5+0.5; gl_Position=vec4(a_position,0.0,1.0); }';
  const fs = [
    'precision highp float;',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    'uniform float u_state;',
    'vec3 hsv2rgb(vec3 c){',
    '  vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);',
    '  vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);',
    '  return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);',
    '}',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/min(u_resolution.x,u_resolution.y);',
    '  float speed=0.5; float waveAmp=0.015; float pulse=0.0;',
    '  if(u_state<0.5){ speed=0.5; waveAmp=0.015; }',
    '  else if(u_state<1.5){ speed=2.5; waveAmp=0.08; }',
    '  else if(u_state<2.5){ speed=1.2; waveAmp=0.03; pulse=sin(u_time*4.0)*0.05; }',
    '  else { speed=2.0; waveAmp=0.05+sin(u_time*10.0)*0.03; }',
    '  float angle=atan(uv.y,uv.x);',
    '  float dist=length(uv);',
    '  vec3 color=hsv2rgb(vec3(angle/6.28+u_time*0.1*speed,0.8,1.0));',
    '  float wave=sin(angle*8.0+u_time*2.0*speed)*waveAmp;',
    '  float ringRadius=0.6+wave+pulse;',
    '  float ringThickness=0.008;',
    '  float ring=smoothstep(ringThickness,0.0,abs(dist-ringRadius));',
    '  float glow=exp(-pow(dist-ringRadius,2.0)/0.005)*0.3;',
    '  gl_FragColor=vec4(color*(ring+glow), ring+glow);',
    '}'
  ].join('\\n');

  function cs(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uState = gl.getUniformLocation(prog, 'u_state');

  function render(t) {
    syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.06, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    if (uState) gl.uniform1f(uState, window.__voiceState || 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  render(0);
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

  const inject = (js) => {
    webRef.current?.injectJavaScript(`${js}; true;`);
  };

  const syncUI = (st, you, bot, err) => {
    const map = { idle: 0, listening: 1, thinking: 2, speaking: 3 };
    const n = map[st] ?? 0;
    const y = JSON.stringify(you || '');
    const b = JSON.stringify(bot || '');
    const e = JSON.stringify(err || '');
    inject(`
      if (window.setVoiceState) window.setVoiceState(${n});
      if (window.setTranscript) window.setTranscript(${y}, ${b}, ${e});
    `);
  };

  useEffect(() => {
    statusRef.current = status;
    syncUI(status, transcript, reply, error);
  }, [status, transcript, reply, error]);

  useEffect(() => {
    if (!visible) return;
    cancelled.current = false;
    setStatus('idle');
    setTranscript('');
    setReply('');
    setError('');

    Voice.onSpeechStart = () => setStatus('listening');
    Voice.onSpeechEnd = () => {};
    Voice.onSpeechError = () => {
      if (!cancelled.current) {
        setStatus('idle');
        setError('Sun nahi saka. Mic dubara dabao.');
      }
    };
    Voice.onSpeechResults = async (e) => {
      const text = e?.value?.[0];
      if (!text || cancelled.current) return;
      setTranscript(text);
      await Voice.stop().catch(() => {});
      askGemini(text);
    };

    (async () => {
      try {
        const lang = await pickTtsLanguage();
        await Tts.setDefaultLanguage(lang);
        await Tts.setDefaultRate(0.45);
        try {
          await Tts.setDefaultPitch(1.0);
        } catch (_) {}
      } catch (e) {
        console.log('TTS lang setup', e);
        try {
          await Tts.setDefaultLanguage('hi-IN');
        } catch (_) {
          try {
            await Tts.setDefaultLanguage('en-US');
          } catch (__) {}
        }
      }
    })();

    const onStart = () => setStatus('speaking');
    const onEnd = () => {
      if (!cancelled.current) setStatus('idle');
    };
    Tts.addEventListener('tts-start', onStart);
    Tts.addEventListener('tts-finish', onEnd);
    Tts.addEventListener('tts-cancel', onEnd);

    return () => {
      cancelled.current = true;
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

  const startListen = async () => {
    setError('');
    setTranscript('');
    setReply('');
    try {
      await Tts.stop();
      const ok = await ensureMic();
      if (!ok) {
        setError('Mic permission allow karein.');
        return;
      }
      setStatus('listening');

      try {
        await Voice.start('ur-PK');
      } catch (e1) {
        try {
          await Voice.start('ur-IN');
        } catch (e2) {
          await Voice.start('en-US');
        }
      }
    } catch (e) {
      setStatus('idle');
      setError('Mic start nahi hua. Language pack check karein.');
    }
  };

  const stopListen = async () => {
    try {
      await Voice.stop();
    } catch (_) {}
    setStatus('idle');
  };

  const askGemini = async (question) => {
    setStatus('thinking');
    try {
      const prompt = `${RULES}

Previous medicine/report scan:
${scanContext || 'No scan context'}

User said: ${question}

Reply short for speaking aloud.
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
        'Jawab nahi mil saka.';

      const clean = String(answer).replace(/\*/g, '').trim();
      setReply(clean);
      setStatus('speaking');

      try {
        const langHint = detectReplyLang(clean);
        if (langHint === 'ur') {
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
          try {
            await Tts.setDefaultLanguage('en-US');
          } catch (_) {}
        }
      } catch (_) {}

      setTimeout(() => {
        Tts.speak(clean);
      }, 200);
    } catch (e) {
      setError('Network error. Dobara try karein.');
      setStatus('idle');
    }
  };

  const handleClose = async () => {
    cancelled.current = true;
    try {
      await Voice.stop();
      await Voice.destroy();
    } catch (_) {}
    Tts.stop();
    onClose();
  };

  const onMainPress = () => {
    const s = statusRef.current;
    if (s === 'listening') stopListen();
    else if (s === 'speaking') {
      Tts.stop();
      setStatus('idle');
    } else if (s === 'thinking') {
      // ignore
    } else {
      startListen();
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
            <ActivityIndicator color="#FF7A59" style={{ marginBottom: 8 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0f17' },
  webview: { flex: 1, backgroundColor: '#0d0f17' },
  fallbackBar: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});