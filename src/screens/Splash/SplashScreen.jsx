import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ScanLine } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/context/LanguageContext';

const LANGUAGE_STORAGE_KEY = '@medscan/language';

export default function SplashScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Skip language selection on subsequent launches if already chosen.
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      navigation.reset({
        index: 0,
        routes: [{ name: storedLanguage ? 'AuthChoice' : 'LanguageSelect' }],
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#0E9F8E', '#0B7A6D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <ScanLine size={44} color="#FFFFFF" strokeWidth={2.2} />
        </View>

        <Text style={styles.title}>MedScan</Text>
        <Text style={styles.tagline}>{t.splash.tagline}</Text>
      </View>

      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotMuted]} />
        <View style={[styles.dot, styles.dotMuted]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dotMuted: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
