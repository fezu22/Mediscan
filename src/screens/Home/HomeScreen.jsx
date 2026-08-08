import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Lightbulb, User2, Pill, FileText } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '@/components/Card';

import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_H_PAD = 14;
const CARD_MARGIN = 16;
const BANNER_GAP = 10;
const BANNER_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2 - CARD_H_PAD * 2;
const BANNER_HEIGHT = Math.round(BANNER_WIDTH * 0.60);
const AUTO_SCROLL_MS = 3500;

const BANNERS = [
  {
    id: 'scan',
    image: require('../../assets/Banners/banner_scan.jpg'),
  },
  {
    id: 'family',
    image: require('../../assets/Banners/banner_family.jpg'),
  },
  {
    id: 'history',
    image: require('../../assets/Banners/banner_history.jpg'),
  },
  {
    id: 'verify',
    image: require('../../assets/Banners/banner_verify.jpg'),
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const bannerRef = useRef(null);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  const tips = [t.home?.tip1, t.home?.tip2, t.home?.tip3].filter(Boolean);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const next = (indexRef.current + 1) % BANNERS.length;
      indexRef.current = next;
      setActiveIndex(next);
      try {
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
      } catch (_) {
        bannerRef.current?.scrollToOffset({
          offset: next * (BANNER_WIDTH + BANNER_GAP),
          animated: true,
        });
      }
    }, AUTO_SCROLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const onBannerScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (BANNER_WIDTH + BANNER_GAP));
    if (idx !== indexRef.current && idx >= 0 && idx < BANNERS.length) {
      indexRef.current = idx;
      setActiveIndex(idx);
    }
  };

  const renderBanner = ({ item }) => (
    <View
      style={[styles.bannerSlide, { width: BANNER_WIDTH, height: BANNER_HEIGHT }]}
    >
      <Image
        source={item.image}
        style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT }}
        resizeMode="cover"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.greeting}>{t.home?.greeting || 'Hello'},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.user_metadata?.full_name ||
                user?.name ||
                user?.email?.split('@')[0] ||
                'there'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Image
              source={require('../../assets/images/logo.png')}
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
          {/* Banners */}
          <View style={styles.bannerWrap}>
            <FlatList
              ref={bannerRef}
              data={BANNERS}
              keyExtractor={(item) => item.id}
              renderItem={renderBanner}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={BANNER_WIDTH + BANNER_GAP}
              decelerationRate="fast"
              snapToAlignment="start"
              disableIntervalMomentum
              ItemSeparatorComponent={() => (
                <View style={{ width: BANNER_GAP }} />
              )}
              onScroll={onBannerScroll}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: BANNER_WIDTH + BANNER_GAP,
                offset: (BANNER_WIDTH + BANNER_GAP) * index,
                index,
              })}
            />
            <View style={styles.dotsRow}>
              {BANNERS.map((b, i) => (
                <View
                  key={b.id}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          </View>

          {/* Scan buttons */}
          <View style={styles.scanRow}>
            <Pressable
              style={[styles.scanCard, styles.scanMedicine]}
              onPress={() =>
                navigation.navigate('Camera', { scanType: 'medicine' })
              }
            >
              <Pill size={22} color="#fff" />
              <Text style={styles.scanCardTitle}>Medicine</Text>
              <Text style={styles.scanCardSub}>Pack / strip</Text>
            </Pressable>

            <Pressable
              style={[styles.scanCard, styles.scanReport]}
              onPress={() =>
                navigation.navigate('Camera', { scanType: 'report' })
              }
            >
              <FileText size={22} color="#fff" />
              <Text style={styles.scanCardTitle}>Report</Text>
              <Text style={styles.scanCardSub}>Lab / X-Ray</Text>
            </Pressable>
          </View>

          {/* Quick Tips */}
          <Text style={styles.sectionTitle}>
            {t.home?.quickTips || 'Quick Tips'}
          </Text>
          {tips.map((tip, idx) => (
            <Card key={idx} style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Lightbulb size={16} color={colors.primary} />
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </Card>
          ))}

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
    marginHorizontal: CARD_MARGIN,
    borderRadius: 28,
    paddingHorizontal: CARD_H_PAD,
    paddingTop: 18,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  bannerWrap: { marginBottom: 4 },
  bannerSlide: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E6F5F2',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
  scanRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  scanCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  scanMedicine: { backgroundColor: '#0E9F8E' },
  scanReport: { backgroundColor: '#3B82F6' },
  scanCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  scanCardSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  sectionTitle: {
    color: colors.textDark || '#1F2937',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
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
});