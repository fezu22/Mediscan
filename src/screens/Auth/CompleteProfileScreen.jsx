import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Calendar, Phone } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

export default function CompleteProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, signInStub } = useAuth();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 15) {
      Alert.alert('Error', 'Age must be 15 or above');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);

      // Real Supabase user
      if (user?.id && !String(user.id).startsWith('local-')) {
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: name.trim(),
            age: Number(age),
            phone: phone.trim(),
            profileComplete: true,
          },
        });
        if (error) throw error;
      }

      // Local state update
      signInStub({
        name: name.trim(),
        age: Number(age),
        phone: phone.trim(),
        profileComplete: true,
      });

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0E9F8E', '#0B7A6D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Almost Done!</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself so MedScan can personalize your experience
          </Text>

          {/* White Card */}
          <View style={styles.card}>
            {/* Name */}
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <User size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor="#A0AEC0"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Age */}
            <Text style={[styles.label, { marginTop: 16 }]}>Age</Text>
            <View style={styles.inputRow}>
              <Calendar size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Must be 15+"
                placeholderTextColor="#A0AEC0"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            {/* Phone */}
            <Text style={[styles.label, { marginTop: 16 }]}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Phone size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="03XX-XXXXXXX"
                placeholderTextColor="#A0AEC0"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            {/* Continue Button */}
            <Pressable
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Continue</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 70,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 0,
  },
  saveBtn: {
    marginTop: 28,
    backgroundColor: colors.primaryDark,
    height: 54,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});