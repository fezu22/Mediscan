import React, { useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import { useLanguage } from '@/context/LanguageContext';
import { colors } from '@/theme/colors';

const OPTIONS = [
  { code: 'en', native: 'English' },
  { code: 'ur', native: 'اردو' },
];

export default function LanguageSelectScreen() {
  const navigation = useNavigation();
  const { t, setLanguage } = useLanguage();
  const [selected, setSelected] = useState('en');

  const handleContinue = async () => {
    await setLanguage(selected);
    navigation.reset({ index: 0, routes: [{ name: 'AuthChoice' }] });
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>{t.languageSelect.title}</Text>
        <Text style={styles.subtitle}>{t.languageSelect.subtitle}</Text>

        <View style={styles.optionsList}>
          {OPTIONS.map((option) => {
            const isSelected = selected === option.code;
            return (
              <Pressable
                key={option.code}
                onPress={() => setSelected(option.code)}
                style={[
                  styles.optionButton,
                  isSelected ? styles.selectedOption : styles.unselectedOption,
                  {
                    shadowColor: '#0B7A6D',
                    shadowOpacity: isSelected ? 0 : 0.05,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: isSelected ? 0 : 2,
                  },
                ]}
              >
                <View>
                  <Text style={styles.optionText}>{option.native}</Text>
                  <Text style={styles.optionSubtext}>
                    {option.code === 'en' ? t.languageSelect.english : t.languageSelect.urdu}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.checkIconContainer}>
                    <Check size={16} color={colors.white} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Button label={t.common.continue} onPress={handleContinue} variant="coral" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
  },
  content: {
    marginTop: 64,
  },
  title: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  optionsList: {
    marginTop: 32,
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.mint,
  },
  unselectedOption: {
    borderColor: 'transparent',
    backgroundColor: colors.card,
  },
  optionText: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: '600',
  },
  optionSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  checkIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginBottom: 16,
  },
});
