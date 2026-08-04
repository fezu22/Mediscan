import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Config from 'react-native-config';
import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { colors } from '@/theme/colors';

export default function ResultScreen() {
  const route = useRoute();
  const { imageUri } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultText, setResultText] = useState(null);

  useEffect(() => {
    if (imageUri) {
      analyzeImage(imageUri);
    } else {
      setLoading(false);
      setError('Koi image nahi mili.');
    }
  }, [imageUri]);

  const analyzeImage = async (uri) => {
    try {
      setLoading(true);
      setError(null);

      // File path se base64 banao (uri mein "file://" prefix hota hai, RNFS ko clean path chahiye)
      const cleanPath = uri.replace('file://', '');
      const base64Image = await RNFS.readFile(cleanPath, 'base64');

      const prompt = `Ye ek medicine ya lab report ki image hai. Isko dekh kar plain, simple
Urdu + English (mixed, aam bandy ki samajh mein aane wali zubaan) mein batao ke:
1. Ye kya hai (medicine ka naam ya report ka type)
2. Iska sadha matlab kya hai
3. Kya cheez normal ya important hai
Kabhi dosage suggest mat karo jo package/report pe likha na ho, aur kabhi diagnosis mat do —
sirf "apne doctor se consult karein" bolna. Agar image medicine ya report na ho to seedha bata do
ke ye scan nahi ho sakti.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Config.GEMINI_API_KEY}`,
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
        }
      );

      const data = await response.json();

      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setResultText(data.candidates[0].content.parts[0].text);
      } else if (data?.error) {
        setError(data.error.message || 'Gemini se response nahi mila.');
      } else {
        setError('Analysis mein kuch masla hua, dobara try karein.');
      }
    } catch (err) {
      console.log('Analysis error:', err);
      setError('Analysis fail ho gaya. Internet connection check karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Scan Result</Text>

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        )}

        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Analyze ho raha hai...</Text>
          </View>
        )}

        {!loading && error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {!loading && resultText && (
          <Card style={styles.resultCard}>
            <Text style={styles.resultText}>{resultText}</Text>
          </Card>
        )}

        <DisclaimerBanner />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.textDark,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
  },
  centerBox: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textMuted,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#FDECEC',
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
  },
  resultCard: {
    width: '100%',
    marginBottom: 16,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textDark,
  },
});