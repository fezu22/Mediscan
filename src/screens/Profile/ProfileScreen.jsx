import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getAllScans } from '@/lib/scanStorage';
import { colors } from '@/theme/colors';

function getInitials(name, email) {
  const n = (name || '').trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'MS';
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
  return (
    user?.phone ||
    user?.user_metadata?.phone ||
    user?.email ||
    'Not signed in'
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, session, signOut, isAuthenticated } = useAuth();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [scanCount, setScanCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getAllScans().then((list) => setScanCount(list.length));
    }, []),
  );

  const name = displayName(user);
  const contact = displayContact(user);
  const initials = getInitials(name, user?.email);

  const handleLogout = () => {
    Alert.alert('Log out?', 'Aap account se nikal jayenge.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            console.log('Sign out error:', e);
          }
          navigation.reset({
            index: 0,
            routes: [{ name: 'AuthChoice' }],
          });
        },
      },
    ]);
  };

  const rows = [
    {
      key: 'notifications',
      emoji: '🔔',
      label: 'Notifications',
      value: 'On',
      onPress: () => Alert.alert('Notifications', 'Jaldi add hoga.'),
    },
    {
      key: 'privacy',
      emoji: '🔒',
      label: 'Privacy',
      value: 'Protected',
      onPress: () => Alert.alert('Privacy', 'Aapka data device pe safe hai.'),
    },
    {
      key: 'backup',
      emoji: '☁️',
      label: 'Cloud Backup',
      value: 'Local',
      onPress: () =>
        Alert.alert('Backup', 'Abhi scans phone pe save hote hain.'),
    },
    {
      key: 'rate',
      emoji: '⭐',
      label: 'Rate App',
      value: '',
      onPress: () => Alert.alert('Rate App', 'Play Store link baad mein.'),
    },
    {
      key: 'support',
      emoji: '💬',
      label: 'Support',
      value: '',
      onPress: () => {
        Linking.openURL('mailto:support@medscan.app').catch(() => {
          Alert.alert('Support', 'Email: support@medscan.app');
        });
      },
    },
    {
      key: 'terms',
      emoji: '📄',
      label: 'Terms & Privacy',
      value: '',
      onPress: () =>
        Alert.alert(
          'Terms',
          'Yeh app reference ke liye hai. Doctor se confirm karein.',
        ),
    },
  ];

  const langs =
    supportedLanguages ||
    [
      { code: 'en', native: 'English', flag: '🇬🇧' },
      { code: 'ur', native: 'اردو', flag: '🇵🇰' },
    ];

  return (
    <ScreenContainer edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.pageTitle}>Profile</Text>

        <LinearGradient
          colors={['#0E9F8E', '#0B7A6D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.headerContact} numberOfLines={1}>
              {contact}
            </Text>
            <Text style={styles.headerStatus}>
              {isAuthenticated || session ? 'Signed in' : 'Guest mode'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={styles.statNumber}>{scanCount}</Text>
            <Text style={styles.statLabel}>Saved scans</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>🌐</Text>
            <Text style={styles.statNumber}>
              {(language || 'en').toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>Language</Text>
          </Card>
        </View>

        <Text style={styles.sectionLabel}>Language</Text>
        <Card style={styles.langCard}>
          {langs.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => setLanguage(lang.code)}
              style={[
                styles.langBtn,
                language === lang.code && styles.langBtnActive,
              ]}
            >
              <Text style={styles.langEmoji}>{lang.flag}</Text>
              <Text
                style={[
                  styles.langText,
                  language === lang.code && styles.langTextActive,
                ]}
              >
                {lang.native}
              </Text>
            </Pressable>
          ))}
        </Card>

        <Text style={styles.sectionLabel}>Settings</Text>
        <Card style={styles.settingsCard}>
          {rows.map((row, i) => (
            <Pressable
              key={row.key}
              onPress={row.onPress}
              style={[
                styles.settingRow,
                i < rows.length - 1 && styles.settingBorder,
              ]}
            >
              <Text style={styles.settingEmoji}>{row.emoji}</Text>
              <Text style={styles.settingLabel}>{row.label}</Text>
              {!!row.value && (
                <Text style={styles.settingValue}>{row.value}</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </Card>

        {isAuthenticated || session || user ? (
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutEmoji}>🚪</Text>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'AuthChoice' }],
              })
            }
            style={styles.loginBtn}
          >
            <Text style={styles.loginEmoji}>🔑</Text>
            <Text style={styles.loginText}>Sign In</Text>
          </Pressable>
        )}

        <Text style={styles.version}>MedScan · v1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 8,
    marginBottom: 16,
  },
  headerCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  headerMeta: { flex: 1 },
  headerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerContact: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  headerStatus: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
  },
  langCard: {
    flexDirection: 'row',
    padding: 6,
    gap: 6,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F3F4F6',
  },
  langBtnActive: {
    backgroundColor: colors.primary,
  },
  langEmoji: { fontSize: 16 },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  langTextActive: {
    color: '#fff',
  },
  settingsCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  settingBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  settingEmoji: { fontSize: 20 },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
  },
  settingValue: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 20,
    color: '#C4C9D4',
    marginLeft: 4,
  },
  logoutBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutEmoji: { fontSize: 18 },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  loginBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginEmoji: { fontSize: 18 },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  version: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
});