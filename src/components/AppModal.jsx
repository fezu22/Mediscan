import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';

/**
 * types: 'confirm' | 'success' | 'error' | 'loading' | 'info'
 */
export default function AppModal({
  visible,
  type = 'confirm',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true,
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const translateY = useSharedValue(24);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220 });
      scale.value = withSpring(1, { damping: 16, stiffness: 180 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
    } else {
      opacity.value = withTiming(0, { duration: 160 });
      scale.value = withTiming(0.9, { duration: 160 });
      translateY.value = withTiming(16, { duration: 160 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handleClose = (cb) => {
    opacity.value = withTiming(0, { duration: 150 });
    scale.value = withTiming(0.9, { duration: 150 }, () => {
      if (cb) runOnJS(cb)();
    });
  };

  const iconMap = {
    confirm: '🚪',
    success: '✅',
    error: '⚠️',
    loading: null,
    info: 'ℹ️',
  };

  const accentMap = {
    confirm: colors.danger,
    success: colors.primary,
    error: colors.danger,
    loading: colors.primary,
    info: colors.primary,
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => showCancel && handleClose(onCancel)} />
        </Animated.View>

        <Animated.View style={[styles.card, cardStyle]}>
          {/* Icon circle */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: (accentMap[type] || colors.primary) + '18' },
            ]}
          >
            {type === 'loading' ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <Text style={styles.iconEmoji}>{iconMap[type] || 'ℹ️'}</Text>
            )}
          </View>

          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {type !== 'loading' && (
            <View style={styles.actions}>
              {showCancel && (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => handleClose(onCancel)}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor:
                      type === 'confirm' || type === 'error'
                        ? colors.danger
                        : colors.primaryDark,
                  },
                  !showCancel && { flex: 1 },
                ]}
                onPress={() => handleClose(onConfirm)}
              >
                <Text style={styles.confirmText}>{confirmText}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark || '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted || '#6B7280',
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark || '#1F2937',
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});