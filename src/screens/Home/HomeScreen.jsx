import React, { useCallback, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { ScanLine, Lightbulb, Clock, ChevronRight, User2 } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { getRecentScans } from '@/lib/scanStorage';
import { colors } from '@/theme/colors';

const DAILY_FREE_LIMIT = 5;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  const scansUsedToday = recentScans.filter((s) => {
    const d = new Date(s.createdAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;

  const scansLeft = Math.max(DAILY_FREE_LIMIT - scansUsedToday, 0);
  const tips = [t.home.tip1, t.home.tip2, t.home.tip3];

  const loadRecent = useCallback(async () => {
    const list = await getRecentScans(3);
    setRecentScans(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecent();
    }, [loadRecent]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecent();
    setRefreshing(false);
  }, [loadRecent]);

  const openScan = (scan) => {
    navigation.navigate('Result', {
      imageUri: scan.imageUri,
      savedScan: scan,
    });
  };

  return (
    <ScreenContainer edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>{t.home.greeting},</Text>
            <Text style={styles.userName}>{user?.name ?? 'there'}</Text>
          </View>
          <Pressable
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <User2 size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Scan CTA */}
        <Pressable
          onPress={() => navigation.navigate('Camera')}
          style={[
            styles.scanButton,
            {
              shadowColor: '#FF7A59',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 6,
            },
          ]}
        >
          <View style={styles.scanIconContainer}>
            <ScanLine size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.scanTitle}>{t.home.scanCta}</Text>
          <Text style={styles.scanSubtitle}>{t.home.scanSubtitle}</Text>
        </Pressable>

        <Text style={styles.scanStatusText}>
          {scansLeft} {t.home.scansLeft} · {t.home.upgrade}
        </Text>

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.home.quickTips}</Text>
          <View style={styles.quickTipsList}>
            {tips.map((tip, idx) => (
              <Card key={idx} style={styles.quickTipCard}>
                <View style={styles.tipIconContainer}>
                  <Lightbulb size={16} color={colors.primary} />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Recent Scans */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t.home.recentScan}</Text>
            {recentScans.length > 0 && (
              <Pressable
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('History')}
              >
                <Text style={styles.viewAllText}>{t.home.viewAll}</Text>
                <ChevronRight size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {recentScans.length === 0 ? (
            <Card style={styles.emptyStateCard}>
              <View style={styles.recentIconContainer}>
                <Clock size={20} color={colors.primary} />
              </View>
              <Text style={styles.recentTitle}>{t.home.noRecentScan}</Text>
              <Text style={styles.emptyStateSubtitle}>
                {t.home.noRecentScanSubtitle}
              </Text>
            </Card>
          ) : (
            recentScans.map((scan) => (
              <Pressable key={scan.id} onPress={() => openScan(scan)}>
                <Card style={[styles.recentCard, { marginBottom: 10 }]}>
                  <View style={styles.recentIconContainer}>
                    <Clock size={20} color={colors.primary} />
                  </View>
                  <View style={styles.recentDetails}>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {scan.name}
                    </Text>
                    <Text style={styles.recentDate}>
                      {new Date(scan.createdAt).toLocaleString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </Card>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.disclaimerWrapper}>
          <DisclaimerBanner />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  greetingText: { color: colors.textMuted, fontSize: 14 },
  userName: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    marginTop: 24,
    borderRadius: 24,
    backgroundColor: colors.coral,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  scanIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scanTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  scanSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
  },
  scanStatusText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  section: { marginTop: 28 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '700',
  },
  quickTipsList: { gap: 12 },
  quickTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    color: colors.textDark,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 6,
  },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  emptyStateCard: { alignItems: 'center', paddingVertical: 32 },
  recentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentDetails: { flex: 1 },
  recentTitle: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '600',
  },
  recentDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyStateSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  disclaimerWrapper: { marginTop: 28 },
});