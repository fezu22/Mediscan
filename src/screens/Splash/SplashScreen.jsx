import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { ScanLine } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/context/LanguageContext';

const LANGUAGE_STORAGE_KEY = '@medscan/language';
const APP_NAME = 'MedScan';

function AnimatedLetter({ char, index, start }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    if (start) {
      opacity.value = withDelay(index * 60, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
      translateY.value = withDelay(index * 60, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }));
    }
  }, [start]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.title, style]}>
      {char}
    </Animated.Text>
  );
}

function BouncingIcon() {
  // anime.js "using with vanilla JS" demo jaisa bounce-scale loop
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.elastic(1) })
      ),
      -1, // infinite loop
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconContainer, style]}>
      <ScanLine size={40} color="#FFFFFF" strokeWidth={2.2} />
    </Animated.View>
  );
}

export default function SplashScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    // Lottie aur bouncing icon dono shuru se sath chal rahe hain.
    // 1.6 second baad title animation shuru hogi.
    const titleTimer = setTimeout(() => setShowTitle(true), 1600);

    const navTimer = setTimeout(async () => {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      navigation.reset({
        index: 0,
        routes: [{ name: storedLanguage ? 'AuthChoice' : 'LanguageSelect' }],
      });
    }, 3200);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(navTimer);
    };
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#0E9F8E', '#0B7A6D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.centerContent}>
        <View style={styles.animationRow}>
          <LottieView
            source={{ uri: 'https://lottie.host/465627bb-1849-49aa-93bf-bec32294c3b2/fXlaapZXyA.json' }}
            autoPlay
            loop
            speed={1.3}
            style={styles.lottie}
          />
          {/* <BouncingIcon /> */}
        </View>

        <View style={styles.titleRow}>
          {APP_NAME.split('').map((char, index) => (
            <AnimatedLetter key={`${char}-${index}`} char={char} index={index} start={showTitle} />
          ))}
        </View>

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
  animationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  lottie: {
    width: 140,
    height: 140,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    marginBottom: 12,
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