import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { getDB, rowToScan } from './db';
import { syncScanToCloud, deleteScanFromCloud } from './cloudSync';

const OLD_KEY_PREFIX = '@medscan/scans_';
const MIGRATED_FLAG = '@medscan/scans_migrated_v1';

function storageUserId(userId) {
  return userId || 'guest';
}

function oldStorageKey(userId) {
  return `${OLD_KEY_PREFIX}${storageUserId(userId)}`;
}

async function copyImagePermanent(imageUri) {
  if (!imageUri) return null;
  try {
    const dir = `${RNFS.DocumentDirectoryPath}/scans`;
    const exists = await RNFS.exists(dir);
    if (!exists) await RNFS.mkdir(dir);

    const ext = imageUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const filename = `scan_${Date.now()}.${ext}`;
    const dest = `${dir}/${filename}`;

    const src = imageUri.replace('file://', '');
    await RNFS.copyFile(src, dest);
    return `file://${dest}`;
  } catch (e) {
    console.log('Image copy failed, using original uri:', e);
    return imageUri;
  }
}

async function migrateFromAsyncStorageIfNeeded(userId) {
  try {
    const flag = await AsyncStorage.getItem(MIGRATED_FLAG);
    if (flag === '1') return;

    const key = oldStorageKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      await AsyncStorage.setItem(MIGRATED_FLAG, '1');
      return;
    }

    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      await AsyncStorage.setItem(MIGRATED_FLAG, '1');
      return;
    }

    const db = await getDB();
    const uid = storageUserId(userId);

    for (const item of list) {
      if (!item?.id) continue;
      await db.executeSql(
        `INSERT OR IGNORE INTO scans (
          id, user_id, type, name, subtitle, manufacturer, confidence,
          about, on_package, notes, formula, how_it_works, why_in_medicine,
          how_to_use, alternatives, price, image_uri, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id,
          uid,
          item.type || 'unknown',
          item.name || 'Scan',
          item.subtitle || '',
          item.manufacturer || '',
          item.confidence ?? null,
          item.about || '',
          JSON.stringify(item.onPackage || []),
          JSON.stringify(item.notes || []),
          JSON.stringify(item.formula ?? null),
          item.howItWorks || null,
          item.whyInMedicine || null,
          item.howToUse || null,
          JSON.stringify(item.alternatives || []),
          item.price != null ? String(item.price) : null,
          item.imageUri || null,
          item.createdAt || new Date().toISOString(),
        ],
      );
    }

    await AsyncStorage.removeItem(key);
    await AsyncStorage.setItem(MIGRATED_FLAG, '1');
    console.log('[MedScan] Migrated scans from AsyncStorage → SQLite');
  } catch (e) {
    console.log('[MedScan] Migration error:', e);
  }
}

export async function getAllScans(userId) {
  try {
    await migrateFromAsyncStorageIfNeeded(userId);
    const db = await getDB();
    const uid = storageUserId(userId);

    const [result] = await db.executeSql(
      `SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`,
      [uid],
    );

    const rows = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(rowToScan(result.rows.item(i)));
    }
    return rows;
  } catch (e) {
    console.log('getAllScans error:', e);
    return [];
  }
}

export async function saveScan({ imageUri, result, rawText, userId }) {
  const permanentUri = await copyImagePermanent(imageUri);
  const id = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  const uid = storageUserId(userId);

  const item = {
    id,
    userId: uid,
    imageUri: permanentUri,
    createdAt,
    type: result?.type || 'unknown',
    name: result?.name || 'Scan',
    subtitle: result?.subtitle || '',
    manufacturer: result?.manufacturer || '',
    confidence: result?.confidence ?? null,
    about: result?.about || rawText || '',
    onPackage: result?.onPackage || [],
    notes: result?.notes || [],
    formula: result?.formula || null,
    howItWorks: result?.howItWorks || null,
    whyInMedicine: result?.whyInMedicine || null,
    howToUse: result?.howToUse || null,
    alternatives: result?.alternatives || [],
    price: result?.price || null,
  };

  const db = await getDB();
  await db.executeSql(
    `INSERT INTO scans (
      id, user_id, type, name, subtitle, manufacturer, confidence,
      about, on_package, notes, formula, how_it_works, why_in_medicine,
      how_to_use, alternatives, price, image_uri, created_at,
      cloud_image_path, cloud_synced_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      item.id,
      uid,
      item.type,
      item.name,
      item.subtitle,
      item.manufacturer,
      item.confidence,
      item.about,
      JSON.stringify(item.onPackage),
      JSON.stringify(item.notes),
      JSON.stringify(item.formula),
      item.howItWorks,
      item.whyInMedicine,
      item.howToUse,
      JSON.stringify(item.alternatives),
      item.price != null ? String(item.price) : null,
      item.imageUri,
      item.createdAt,
      null, // cloud_image_path — filled in once background sync completes
      null, // cloud_synced_at
    ],
  );

  // Keep max ~100 per user
  await db.executeSql(
    `DELETE FROM scans WHERE user_id = ? AND id NOT IN (
      SELECT id FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
    )`,
    [uid, uid],
  );

  // Local save is already durable at this point — the scan works fully
  // offline. Cloud sync runs in the background and is allowed to fail
  // silently (no internet, guest user, RLS mismatch, etc).
  syncScanInBackground(item, uid);

  return item;
}

async function syncScanInBackground(item, uid) {
  try {
    const result = await syncScanToCloud(item, uid);
    if (result.success) {
      const db = await getDB();
      await db.executeSql(
        `UPDATE scans SET cloud_image_path = ?, cloud_synced_at = ? WHERE id = ? AND user_id = ?`,
        [result.path || null, new Date().toISOString(), item.id, uid],
      );
    }
  } catch (e) {
    console.log('[MedScan] background cloud sync failed:', e?.message || e);
  }
}

export async function getRecentScans(limit = 5, userId) {
  const list = await getAllScans(userId);
  return list.slice(0, limit);
}

export async function deleteScan(id, userId) {
  const db = await getDB();
  const uid = storageUserId(userId);

  // optional: delete local image file + capture cloud path before the row is gone
  let cloudImagePath = null;
  try {
    const [result] = await db.executeSql(
      `SELECT image_uri, cloud_image_path FROM scans WHERE id = ? AND user_id = ?`,
      [id, uid],
    );
    if (result.rows.length > 0) {
      const row = result.rows.item(0);
      cloudImagePath = row.cloud_image_path || null;

      const uri = row.image_uri;
      if (uri && uri.includes('/scans/')) {
        const path = uri.replace('file://', '');
        if (await RNFS.exists(path)) await RNFS.unlink(path);
      }
    }
  } catch (_) {}

  await db.executeSql(`DELETE FROM scans WHERE id = ? AND user_id = ?`, [
    id,
    uid,
  ]);

  // Best-effort — local delete has already completed regardless of this.
  deleteScanFromCloud(id, uid, cloudImagePath).catch(() => {});

  return getAllScans(userId);
}

export async function getScanById(id, userId) {
  try {
    const db = await getDB();
    const uid = storageUserId(userId);
    const [result] = await db.executeSql(
      `SELECT * FROM scans WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, uid],
    );
    if (result.rows.length === 0) return null;
    return rowToScan(result.rows.item(0));
  } catch {
    return null;
  }
}