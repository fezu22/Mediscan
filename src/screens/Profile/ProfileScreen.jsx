import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getAllScans } from '@/lib/scanStorage';
import { colors } from '@/theme/colors';
import AppModal from '@/components/AppModal';

function getInitials(name, email) {
  const n = (name || '').trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'GU';
}

function displayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Guest User'
  );
}

function displayContact(user) {
  return user?.phone || user?.user_metadata?.phone || user?.email || '—';
}

function getAvatarUrl(user) {
  return (
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.avatar ||
    null
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, session, signOut, isAuthenticated } = useAuth();
  const { language, setLanguage, t, languages } = useLanguage();
  const [scanCount, setScanCount] = useState(0);
  const [langModal, setLangModal] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const showInfo = (title, message) => {
    setInfoModal({ visible: true, title, message });
  };


  useFocusEffect(
    useCallback(() => {
      getAllScans(user?.id)
        .then((list) => setScanCount(list?.length || 0))
        .catch(() => setScanCount(0));
    }, [user?.id]),
  );

  const name = displayName(user);
  const contact = displayContact(user);
  const initials = getInitials(name, user?.email);
  const avatarUrl = getAvatarUrl(user);
  const signedIn = !!(isAuthenticated || session || user);
  const languagesList = Array.isArray(languages) ? languages : [];
  const currentLang =
    languagesList.find((l) => l.code === language) ||
    languagesList[0] || { code: 'en', native: 'English', name: 'English' };
  const p = t?.profile || {};

  const handleLogoutPress = () => {
    setLogoutVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutVisible(false);
    setLoadingVisible(true);
    try {
      await signOut();
    } catch (e) {
      console.log('Sign out error:', e);
    } finally {
      setLoadingVisible(false);
    }
  };

  const privacyPolicyText = `Privacy Policy – MedScan

Last updated: August 2026

MedScan respects your privacy. This policy explains how we collect, use, and protect your information.

1. Information We Collect
• Account information (name, email, phone, age) when you sign up
• Profile picture from Google / Facebook (if you allow)
• Scanned images of medicines and lab reports (stored only on your device unless you enable cloud sync)
• App usage data to improve the service

2. How We Use Your Information
• To provide medicine and report explanations
• To personalize your experience
• To send important notifications (if enabled)
• To improve app performance and features

3. Data Storage
• Scan images and results are stored locally on your device by default
• Account data is stored securely with Supabase
• We do not sell your personal data to third parties

4. Third-Party Services
We use:
• Supabase (authentication & database)
• Google / Facebook (login)
• Google Gemini (AI analysis)

These services have their own privacy policies.

5. Your Rights
You can:
• Update or delete your profile
• Turn off notifications
• Request deletion of your account data
• Contact us for any privacy-related questions

6. Contact
For privacy questions: support@medscan.app

By using MedScan, you agree to this Privacy Policy.`;

  const termsText = `Terms of Service – MedScan

Last updated: August 2026

Please read these terms carefully before using MedScan.

1. Not Medical Advice
MedScan provides general, non-diagnostic explanations of medicines and lab reports. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified doctor.

2. User Responsibilities
• You are responsible for the accuracy of images you scan
• Do not use the app for emergency medical decisions
• You must be 15 years or older to use this app

3. Account
• You are responsible for keeping your login credentials safe
• You may not share your account with others
• We may suspend accounts that misuse the service

4. Intellectual Property
All content, design, and code of MedScan belong to the developers. You may not copy or redistribute the app without permission.

5. Limitation of Liability
MedScan and its developers are not responsible for any decisions made based on the information provided by the app.

6. Changes
We may update these terms from time to time. Continued use of the app means you accept the updated terms.

7. Contact
Questions? Email us at support@medscan.app`;

  const rows = [
    {
      key: 'privacy',
      label: p.privacy || 'Privacy Policy',
      onPress: () => showInfo('Privacy Policy', privacyPolicyText),
    },
    {
      key: 'terms',
      label: p.terms || 'Terms of Service',
      onPress: () => showInfo('Terms of Service', termsText),
    },
    {
      key: 'rate',
      label: p.rate || 'Rate App',
      onPress: () =>
        showInfo(
          'Rate MedScan',
          'Thank you for using MedScan!\n\nIf you like the app, please rate us on the Play Store. Your feedback helps us improve.',
        ),
    },
    {
      key: 'support',
      label: p.support || 'Support',
      onPress: () => {
        Linking.openURL('mailto:support@medscan.app').catch(() => {
          showInfo('Support', 'Email us at: support@medscan.app');
        });
      },
    },
    {
      key: 'logout',
      label: p.logout || 'Log Out',
      destructive: true,
      onPress: handleLogoutPress,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>{p.title || 'My'}</Text>
            <Text style={styles.backText}>{p.subtitle || 'Profile'}</Text>
          </View>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        style={styles.cardWrapper}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Profile Info */}
          <View style={styles.profileBlock}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.contact} numberOfLines={1}>
              {contact}
            </Text>

            <View
              style={[
                styles.statusChip,
                signedIn ? styles.statusIn : styles.statusGuest,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  signedIn ? styles.statusInText : styles.statusGuestText,
                ]}
              >
                {signedIn
                  ? p.signedIn || 'Signed in'
                  : p.guest || 'Guest mode'}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{scanCount}</Text>
            <Text style={styles.statLabel}>{p.totalScans || 'Total Scans'}</Text>
          </View>

          {/* Language */}
          <Text style={styles.sectionTitle}>{p.language || 'Language'}</Text>
          <Pressable style={styles.langBtn} onPress={() => setLangModal(true)}>
            <Text style={styles.langBtnText}>{currentLang.native}</Text>
            <Text style={styles.langBtnHint}>
              {p.selectLanguage || 'Select'}
            </Text>
          </Pressable>

          {/* Notifications Toggle */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            {p.notifications || 'Notifications'}
          </Text>

          {/* Settings */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            {p.settings || 'Settings'}
          </Text>
          <View style={styles.settingsBox}>
            {rows.map((row, index) => (
              <Pressable
                key={row.key}
                onPress={row.onPress}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    row.destructive && styles.destructiveText,
                  ]}
                >
                  {row.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.version}>MedScan · v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Info Modal (Privacy / Terms etc) */}
      <AppModal
        visible={infoModal.visible}
        type="info"
        title={infoModal.title}
        message={infoModal.message}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setInfoModal((m) => ({ ...m, visible: false }))}
        onCancel={() => setInfoModal((m) => ({ ...m, visible: false }))}
      />

      {/* Logout Confirm */}
      <AppModal
        visible={logoutVisible}
        type="confirm"
        title={p.logoutConfirm || 'Log out?'}
        message={p.logoutMsg || 'You will be signed out of your account.'}
        confirmText={p.logout || 'Log Out'}
        cancelText={p.cancel || 'Cancel'}
        onConfirm={confirmLogout}
        onCancel={() => setLogoutVisible(false)}
      />

      {/* Loading */}
      <AppModal
        visible={loadingVisible}
        type="loading"
        title="Please wait"
        message="Signing out…"
        showCancel={false}
      />

      {/* Language Modal */}
      <Modal
        visible={langModal}
        animationType="slide"
        transparent
        onRequestClose={() => setLangModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <Text style={styles.modalTitle}>
              {p.selectLanguage || 'Select Language'}
            </Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.code === language;
                return (
                  <Pressable
                    onPress={async () => {
                      await setLanguage(item.code);
                      setLangModal(false);
                    }}
                    style={[styles.langRow, active && styles.langRowActive]}
                  >
                    <View>
                      <Text
                        style={[
                          styles.langNative,
                          active && styles.langActiveText,
                        ]}
                      >
                        {item.native}
                      </Text>
                      <Text style={styles.langName}>{item.name}</Text>
                    </View>
                    {active && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              }}
            />
            <Pressable
              style={styles.modalClose}
              onPress={() => setLangModal(false)}
            >
              <Text style={styles.modalCloseText}>{p.cancel || 'Cancel'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F9' },
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
  headerLogo: { width: 70, height: 70, borderRadius: 16 },
  cardWrapper: { flex: 1, marginTop: -36 },
  scrollContent: { paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  profileBlock: { alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 24,
    marginBottom: 12,
    backgroundColor: colors.primary,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark || '#1F2937',
  },
  contact: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  statusChip: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusIn: { backgroundColor: colors.mint || '#E6F5F2' },
  statusGuest: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusInText: { color: colors.primaryDark },
  statusGuestText: { color: colors.textMuted },
  statBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: { fontSize: 24, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark || '#1F2937',
    marginBottom: 10,
    marginTop: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border || '#E5EAEA',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  langBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark || '#1F2937',
  },
  langBtnHint: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  settingsBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border || '#E5EAEA',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border || '#E5EAEA',
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark || '#1F2937',
  },
  destructiveText: {
    color: '#D64545',
  },
  version: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark || '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  langRowActive: {
    backgroundColor: colors.mint || '#E6F5F2',
  },
  langNative: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark || '#1F2937',
  },
  langActiveText: {
    color: colors.primaryDark,
  },
  langName: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  check: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  modalClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
});