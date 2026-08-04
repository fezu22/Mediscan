import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';

/** Strong, consistent medical disclaimer used on Result, Home, Report, History detail screens. */
export default function DisclaimerBanner({ message, variant = 'mint' }) {
  const { t } = useLanguage();
  const isDanger = variant === 'danger';

  return (
    <View style={[styles.banner, isDanger ? styles.dangerBanner : styles.mintBanner]}>
      <AlertTriangle size={18} color={isDanger ? colors.danger : colors.primaryDark} />
      <Text style={[styles.text, isDanger ? styles.dangerText : styles.mintText]}>
        {message ?? t.common.consultDoctor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 16,
    padding: 12,
  },
  mintBanner: {
    backgroundColor: colors.mint,
  },
  dangerBanner: {
    backgroundColor: 'rgba(214, 69, 69, 0.1)',
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 20,
  },
  mintText: {
    color: colors.primaryDark,
  },
  dangerText: {
    color: colors.danger,
  },
});
