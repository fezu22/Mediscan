import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    signInWithGoogle,
    signInWithFacebook,
    isAuthenticated,
    loading: authLoading,
    user,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingFacebook, setLoadingFacebook] = useState(false);
  const [pendingAuthRedirect, setPendingAuthRedirect] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (!pendingAuthRedirect || authLoading || !isAuthenticated) return;

    const profileDone =
      user?.profileComplete || user?.user_metadata?.profileComplete;

    navigation.reset({
      index: 0,
      routes: [{ name: profileDone ? 'Main' : 'CompleteProfile' }],
    });
    setPendingAuthRedirect(false);
  }, [pendingAuthRedirect, authLoading, isAuthenticated, user, navigation]);

  const triggerAuthRedirect = () => {
    setPendingAuthRedirect(true);
  };

  const openForgotPassword = () => {
    setForgotEmail(email.trim());
    setForgotPasswordVisible(true);
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = forgotEmail.trim();
    if (!normalizedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setForgotLoading(true);
      await resetPasswordForEmail(normalizedEmail);
      Alert.alert(
        'Check your email',
        'A password reset link has been sent to your inbox.',
      );
      setForgotPasswordVisible(false);
      setForgotEmail('');
    } catch (error) {
      Alert.alert(
        'Reset Failed',
        error?.message || 'Could not send the reset link. Please try again.',
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (isSignUp && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        const result = await signUpWithEmail(email, password);
        const hasSession = !!result?.data?.session;
        if (!hasSession) {
          Alert.alert(
            'Check your email',
            'Please confirm your email address before signing in.',
          );
          return;
        }
      } else {
        await signInWithEmail(email, password);
      }
      triggerAuthRedirect();
    } catch (error) {
      Alert.alert(
        isSignUp ? 'Sign Up Failed' : 'Login Failed',
        error?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoadingGoogle(true);
      const result = await signInWithGoogle();
      if (result?.cancelled) return;
      triggerAuthRedirect();
    } catch (error) {
      Alert.alert(
        'Google Sign-In Failed',
        error?.message || 'Please try again.',
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleFacebook = async () => {
    try {
      setLoadingFacebook(true);
      const result = await signInWithFacebook();
      if (result?.cancelled) return;
      triggerAuthRedirect();
    } catch (error) {
      Alert.alert(
        'Facebook Sign-In Failed',
        error?.message || 'Please try again.',
      );
    } finally {
      setLoadingFacebook(false);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Green Header + Logo */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>
              {isSignUp ? 'Create' : 'Welcome'}
            </Text>
            <Text style={styles.backText}>
              {isSignUp ? 'Account' : 'Back'}
            </Text>
          </View>

          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* White Form Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.cardWrapper}
      >
        <ScrollView
          contentContainerStyle={styles.card}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="JohnDoe@Gmail.Com"
              placeholderTextColor="#A0AEC0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#A0AEC0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={12}
            >
              {showPassword ? (
                <EyeOff size={20} color={colors.textMuted} />
              ) : (
                <Eye size={20} color={colors.textMuted} />
              )}
            </Pressable>
          </View>

          {/* Confirm Password (Sign Up only) */}
          {isSignUp && (
            <>
              <Text style={[styles.label, { marginTop: 18 }]}>
                Confirm Password
              </Text>
              <View style={styles.inputContainer}>
                <Lock
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor="#A0AEC0"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </>
          )}

          {/* Forgot Password (Login only) */}
          {!isSignUp && (
            <Pressable style={styles.forgotBtn} onPress={openForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          )}

          {/* Main Button */}
          <Pressable
            style={[
              styles.loginBtn,
              isSignUp && { marginTop: 24 },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>
                  {isSignUp ? 'Create Account' : 'Log In'}
                </Text>
                <ArrowRight size={20} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Small Circular Social Buttons */}
          <View style={styles.socialRow}>
            {/* Google */}
            <Pressable
              style={[styles.socialCircle, loadingGoogle && { opacity: 0.6 }]}
              onPress={handleGoogle}
              disabled={loadingGoogle}
            >
              {loadingGoogle ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Image
                  source={{
                    uri: 'https://developers.google.com/identity/images/g-logo.png',
                  }}
                  style={styles.socialIcon}
                />
              )}
            </Pressable>

            {/* Facebook */}
            <Pressable
              style={[
                styles.socialCircle,
                styles.facebookCircle,
                loadingFacebook && { opacity: 0.6 },
              ]}
              onPress={handleFacebook}
              disabled={loadingFacebook}
            >
              {loadingFacebook ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.facebookF}>f</Text>
              )}
            </Pressable>
          </View>

          <Modal
            visible={forgotPasswordVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setForgotPasswordVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalText}>
                  Enter your email and we’ll send you a reset link.
                </Text>
                <View style={styles.inputContainer}>
                  <Mail
                    size={18}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#A0AEC0"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => setForgotPasswordVisible(false)}
                    disabled={forgotLoading}
                  >
                    <Text style={styles.modalBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={handleForgotPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>
                        Send Link
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Toggle Login / Sign Up */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isSignUp
                ? 'Already have an account?'
                : "Don't have an account?"}
            </Text>
            <Pressable onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.toggleLink}>
                {isSignUp ? 'Log In' : 'Sign Up'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F9',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 28,
    paddingBottom: 55,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 38,
  },
  backText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 38,
  },
  headerLogo: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  cardWrapper: {
    flex: 1,
    marginTop: -36,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  loginBtn: {
    backgroundColor: colors.primaryDark,
    height: 54,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5EAEA',
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  facebookCircle: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  facebookF: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark || '#1F2937',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  modalBtnSecondary: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark || '#1F2937',
  },
  modalBtnTextPrimary: {
    color: '#FFFFFF',
  },
});