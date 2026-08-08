import React, { useCallback, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { ScanLine, Lightbulb, Clock, ChevronRight, User2 } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '@/components/Card';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { getRecentScans } from '@/lib/scanStorage';
import { colors } from '@/theme/colors';

const DAILY_FREE_LIMIT = 5;

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      {/* Green header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{t.home.greeting},</Text>
            <Text style={styles.userName}>{user?.name || user?.email?.split('@')[0] || 'there'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Pressable
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <User2 size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.cardWrapper}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.card}>
          {/* Scan CTA */}
          <Pressable
            onPress={() => navigation.navigate('Camera')}
            style={styles.scanButton}
          >
            <View style={styles.scanIconContainer}>
              <ScanLine size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.scanTitle}>{t.home.scanCta}</Text>
            <Text style={styles.scanSubtitle}>{t.home.scanSubtitle}</Text>
          </Pressable>

          <Text style={styles.scanStatus}>
            {scansLeft} {t.home.scansLeft} · {t.home.upgrade}
          </Text>

          {/* Tips */}
          <Text style={styles.sectionTitle}>{t.home.quickTips}</Text>
          {tips.map((tip, idx) => (
            <Card key={idx} style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Lightbulb size={16} color={colors.primary} />
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </Card>
          ))}

          {/* Recent */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.home.recentScan}</Text>
            {recentScans.length > 0 && (
              <Pressable
                style={styles.viewAll}
                onPress={() => navigation.navigate('History')}
              >
                <Text style={styles.viewAllText}>{t.home.viewAll}</Text>
                <ChevronRight size={14} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {recentScans.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Clock size={22} color={colors.primary} />
              <Text style={styles.emptyTitle}>{t.home.noRecentScan}</Text>
              <Text style={styles.emptySub}>{t.home.noRecentScanSubtitle}</Text>
            </Card>
          ) : (
            recentScans.map((scan) => (
              <Pressable key={scan.id} onPress={() => openScan(scan)}>
                <Card style={styles.recentCard}>
                  <View style={styles.recentIcon}>
                    <Clock size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
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

          <View style={{ marginTop: 20 }}>
            <DisclaimerBanner />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F9' },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 24,
    paddingBottom: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 48, height: 48, borderRadius: 12 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: { flex: 1, marginTop: -32 },
  scrollContent: { paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  scanButton: {
    borderRadius: 22,
    backgroundColor: colors.coral,
    paddingVertical: 24,
    alignItems: 'center',
  },
  scanIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  scanTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  scanStatus: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.textDark || '#1F2937',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mint || '#E6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    color: colors.textDark || '#1F2937',
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 4,
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  recentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.mint || '#E6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: {
    color: colors.textDark || '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  recentDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark || '#1F2937',
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});