import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.white },
    iconColor: colors.white,
  },
  coral: {
    container: { backgroundColor: colors.coral },
    text: { color: colors.white },
    iconColor: colors.white,
  },
  outline: {
    container: { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 },
    text: { color: colors.primary },
    iconColor: colors.primary,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary },
    iconColor: colors.primary,
  },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
}) {
  const variantStyle = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        variantStyle.container,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white} />
      ) : (
        <View style={styles.contentRow}>
          {icon}
          <Text style={[styles.label, variantStyle.text]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B7A6D',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    shadowOpacity: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
