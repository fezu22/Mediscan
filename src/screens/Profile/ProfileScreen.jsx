import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert, Linking, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAllScans } from '../../lib/scanStorage';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { LucideIcons } from '../../components/LucideIcons';

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
            routes: [{ name: 'Login' }],
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
      label: 'Privacy Policy',
      value: '',
      onPress: () => Alert.alert('Privacy', 'Aapka data device pe safe hai.'),
    },
    {
      key: 'terms',
      emoji: '📄',
      label: 'Terms of Service',
      value: '',
      onPress: () =>
        Alert.alert(
          'Terms',
          'Yeh app reference ke liye hai. Doctor se confirm karein.',
        ),
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
      emoji: '📧',
      label: 'Support',
      value: '',
      onPress: () => {
        Linking.openURL('mailto:support@medscan.app').catch(() => {
          Alert.alert('Support', 'Email: support@medscan.app');
        });
      },
    },
    {
      key: 'logout',
      emoji: '🚪',
      label: 'Log Out',
      value: '',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(displayName(user), user?.email)}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName(user)}</Text>
          <Text style={styles.contact}>{displayContact(user)}</Text>
        </View>
      </View>

      <Card style={styles.statsCard}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{scanCount}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{isAuthenticated ? 'Online' : 'Offline'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </Card>

      <View style={styles.sectionTitle}>Settings</View>
      <Card style={styles.settingsCard}>
        {rows.map((row) => (
          <Pressable
            key={row.key}
            onPress={row.onPress}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
              row.destructive && styles.destructiveRow,
            ]}
            android_ripple={{ color: colors.border }}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>{row.emoji}</Text>
              <Text style={[styles.rowLabel, row.destructive && styles.destructiveText]}>{row.label}</Text>
            </View>
            {row.value && <Text style={styles.rowValue}>{row.value}</Text>}
            <LucideIcons name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  contact: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsCard: {
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsCard: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.backgroundAlt,
  },
  destructiveRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  destructiveText: {
    color: colors.danger,
  },
  rowValue: {
    fontSize: 14,
    color: colors.textMuted,
    marginRight: 12,
  },
});
