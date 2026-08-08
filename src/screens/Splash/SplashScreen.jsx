import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export default function SplashScreen() {
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