import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';

export default function SplashScreen() {
  const navigation = useNavigation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (authLoading || done.current) return;

    let cancelled = false;

    const go = async () => {
      // Min 600ms taake white flash na aaye
      await new Promise((r) => setTimeout(r, 600));

      if (cancelled || done.current) return;
      done.current = true;

      const target = isAuthenticated ? 'Main' : 'Login';

      navigation.reset({
        index: 0,
        routes: [{ name: target }],
      });
    };

    go();

    // Safety: agar auth hang ho to 1.5s baad force
    const safety = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: isAuthenticated ? 'Main' : 'Login' }],
        });
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [authLoading, isAuthenticated, navigation]);

  return (
    <LinearGradient
      colors={['#0E9F8E', '#0B7A6D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.center}>
        <Image
          source={require('../../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Understand your medicines & reports
        </Text>
        <ActivityIndicator
          color="rgba(255,255,255,0.7)"
          style={{ marginTop: 28 }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 280,
    height: 280,
    marginBottom: 4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});