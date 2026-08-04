import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { Phone, Mail } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

export default function AuthChoiceScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { signInStub, signInWithGoogle } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const proceedToMain = () => {
    signInStub({});
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      await signInWithGoogle();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      console.error('Google sign-in failed', error);
      Alert.alert(
        'Sign-in Failed',
        error?.message || 'Google sign-in failed. Please try again.',
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Phone size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t.auth.title}</Text>
        <Text style={styles.subtitle}>{t.auth.subtitle}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t.auth.phone}
          onPress={proceedToMain}
          variant="primary"
          icon={<Phone size={18} color={colors.white} />}
        />
        <Button
          label={t.auth.google}
          onPress={handleGoogleSignIn}
          variant="outline"
          loading={loadingGoogle}
        />
        <Button
          label={t.auth.email}
          onPress={proceedToMain}
          variant="ghost"
          icon={<Mail size={18} color={colors.primary} />}
        />

        <Text style={styles.terms}>{t.auth.terms}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 64,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  terms: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
});