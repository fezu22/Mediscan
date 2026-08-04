import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

/** Standard screen wrapper: safe-area aware, app background, horizontal padding. */
export default function ScreenContainer({ children, edges = ['top', 'bottom'], style, ...rest }) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <View style={[styles.content, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
