import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';

/** Base elevated card used across Home, History, Result, etc. */
export default function Card({ children, style, className, ...rest }) {
  return (
    <View
      style={[styles.card, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0B7A6D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
});
