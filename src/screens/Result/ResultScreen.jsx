import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';

import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';

const ChatScreen = () => {
  // State variables
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Setup Voice & TTS Listeners
  useEffect(() => {
    Voice.onSpeechStart = () => setListening(true);
    Voice.onSpeechEnd = () => setListening(false);
    Voice.onSpeechError = (e) => {
      console.log('Speech error:', e);
      setListening(false);
    };
    Voice.onSpeechResults = (e) => {
      const text = e?.value?.[0];
      if (text) {
        setChatInput(text);
      }
      setListening(false);
    };

    Tts.setDefaultLanguage('en-US'); // Urdu support ke liye 'ur-PK' try karein
    const ttsStart = Tts.addEventListener('tts-start', () => setSpeaking(true));
    const ttsFinish = Tts.addEventListener('tts-finish', () => setSpeaking(false));
    const ttsCancel = Tts.addEventListener('tts-cancel', () => setSpeaking(false));

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      Tts.stop();
      ttsStart.remove();
      ttsFinish.remove();
      ttsCancel.remove();
    };
  }, []);

  // Helper functions for Mic & Speech
  const ensureMicPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startListening = async () => {
    if (loading || chatLoading || listening) return;
    try {
      const ok = await ensureMicPermission();
      if (!ok) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'ai', text: 'Mic permission chahiye. Settings se allow karein.' },
        ]);
        return;
      }
      await Voice.start('en-US'); // ya 'ur-PK'
    } catch (e) {
      console.log('Voice start error:', e);
      setListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.log('Voice stop error:', e);
    }
    setListening(false);
  };

  const speakText = (text) => {
    if (!text) return;
    const clean = String(text).replace(/\*/g, '').trim();
    Tts.stop();
    Tts.speak(clean);
  };

  const stopSpeaking = () => {
    Tts.stop();
    setSpeaking(false);
  };

  const sendChat = () => {
    // Apne messaging logic ko yahan handle karein
    if (!chatInput.trim()) return;
    console.log('Sending message:', chatInput);
    setChatInput('');
  };

  return (
    <View style={styles.container}>
      {/* Messages List Area */}
      <View style={styles.messagesContainer}>
        {chatMessages.map((m, index) => (
          <View key={index} style={styles.messageRow}>
            <Text>{m.text}</Text>
            {m.role === 'ai' && (
              <Pressable
                onPress={() => (speaking ? stopSpeaking() : speakText(m.text))}
                style={{ marginTop: 6, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: 16 }}>{speaking ? '⏹️' : '🔊'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {/* Chat Bar Input Area */}
      <View style={styles.chatBar}>
        {/* Mic Button */}
        <Pressable
          onPress={listening ? stopListening : startListening}
          disabled={loading || chatLoading}
          style={[
            styles.micBtn,
            listening && { backgroundColor: '#FF6B6B' }, // Coral active color
          ]}
        >
          <Text style={{ fontSize: 18 }}>{listening ? '⏹️' : '🎤'}</Text>
        </Pressable>

        {/* Text Input */}
        <TextInput
          value={chatInput}
          onChangeText={setChatInput}
          placeholder={listening ? 'Sun raha hai... bolo' : 'Message likhein...'}
          placeholderTextColor="#9CA3AF"
          style={styles.chatInput}
          editable={!chatLoading && !loading && !listening}
          onSubmitEditing={sendChat}
          returnKeyType="send"
        />

        {/* Send Button */}
        <Pressable
          style={[styles.chatSend, (chatLoading || loading) && { opacity: 0.5 }]}
          onPress={sendChat}
          disabled={chatLoading || loading || listening}
        >
          {chatLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, color: '#fff', fontWeight: '700' }}>➤</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageRow: {
    marginBottom: 12,
  },
  chatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
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
    paddingHorizontal: 12,
    color: '#000',
  },
  chatSend: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center', // Fix Applied: Pehle 'justify.content' tha
  },
});