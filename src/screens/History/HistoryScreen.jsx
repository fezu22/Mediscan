import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Trash2 } from 'lucide-react-native';
import Card from '@/components/Card';
import { getAllScans, deleteScan } from '@/lib/scanStorage';
import { colors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeLabel(type) {
  if (type === 'report') return 'Lab Report';
  if (type === 'prescription') return 'Prescription';
  if (type === 'medicine') return 'Medicine';
  return 'Other';
}

export default function HistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [scans, setScans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await getAllScans();
    setScans(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openScan = (item) => {
    navigation.navigate('Result', {
      imageUri: item.imageUri,
      savedScan: item,
    });
  };

  const onDelete = (item) => {
    Alert.alert('Delete scan?', item.name || 'Scan', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const next = await deleteScan(item.id);
          setScans(next);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Green header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t.tabs?.history || 'History'}</Text>
            <Text style={styles.subtitle}>{scans.length} saved</Text>
          </View>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.card}>
              <Card style={styles.emptyCard}>
                <Clock size={28} color={colors.primary} />
                <Text style={styles.emptyTitle}>Abhi koi scan nahi</Text>
                <Text style={styles.emptySub}>
                  Medicine ya report scan karo — yahan save ho jayegi
                </Text>
              </Card>
            </View>
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.listItemWrap,
                index === 0 && styles.firstItem,
              ]}
            >
              <Pressable onPress={() => openScan(item)}>
                <Card style={styles.row}>
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Text style={{ fontSize: 20 }}>💊</Text>
                    </View>
                  )}
                  <View style={styles.meta}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name || 'Scan'}
                    </Text>
                    {!!item.subtitle && (
                      <Text style={styles.salt} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    )}
                    <Text style={styles.date}>
                      {formatDate(item.createdAt)} · {typeLabel(item.type)}
                    </Text>
                  </View>
                  <Pressable onPress={() => onDelete(item)} hitSlop={12}>
                    <Trash2 size={18} color={colors.danger} />
                  </Pressable>
                </Card>
              </Pressable>
            </View>
          )}
        />
      </View>
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
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  headerLogo: { width: 52, height: 52, borderRadius: 12 },
  cardWrapper: { flex: 1, marginTop: -32 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  firstItem: {},
  listItemWrap: { marginBottom: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E6F5F2',
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark || '#1F2937',
  },
  salt: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  date: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark || '#1F2937',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});