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
import { Clock, Trash2 } from 'lucide-react-native';
import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import { getAllScans, deleteScan } from '@/lib/scanStorage';
import { colors } from '@/theme/colors';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
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

function typeEmoji(type) {
  if (type === 'report') return '🧪';
  if (type === 'prescription') return '📄';
  if (type === 'medicine') return '💊';
  return '📋';
}

export default function HistoryScreen() {
  const navigation = useNavigation();
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
    <ScreenContainer edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.subtitle}>{scans.length} saved</Text>
      </View>

      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Clock size={28} color={colors.primary} />
            <Text style={styles.emptyTitle}>Abhi koi scan nahi</Text>
            <Text style={styles.emptySub}>
              Medicine ya report scan karo — yahan save ho jayegi
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          const priceText = item?.price?.approxPkr
            ? `Rs. ${item.price.approxPkr}`
            : null;

          return (
            <Pressable onPress={() => openScan(item)}>
              <Card style={styles.row}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 22 }}>{typeEmoji(item.type)}</Text>
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

                  <View style={styles.metaRow}>
                    <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.type}>{typeLabel(item.type)}</Text>
                  </View>

                  {priceText ? (
                    <Text style={styles.price}>{priceText}</Text>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => onDelete(item)}
                  hitSlop={12}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </Card>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, marginBottom: 12, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark },
  subtitle: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  list: { paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E6F5F2',
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  salt: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  date: { fontSize: 12, color: colors.textMuted },
  dot: { marginHorizontal: 6, color: colors.textMuted },
  type: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  price: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textDark,
  },
  deleteBtn: { padding: 8 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textDark },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});