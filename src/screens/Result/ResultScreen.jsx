import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ResultScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Result</Text>
      {/* Yahan aap AI analysis, confidence badge, TTS aur follow-up chat ka UI code karenge */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});