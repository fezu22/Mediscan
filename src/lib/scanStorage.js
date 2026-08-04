import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const STORAGE_KEY = '@medscan/scans';

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

export async function getAllScans() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveScan({ imageUri, result, rawText }) {
  const permanentUri = await copyImagePermanent(imageUri);
  const id = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const item = {
    id,
    imageUri: permanentUri,
    createdAt: new Date().toISOString(),
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

  const list = await getAllScans();
  const next = [item, ...list].slice(0, 100); // max 100
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return item;
}

export async function getRecentScans(limit = 5) {
  const list = await getAllScans();
  return list.slice(0, limit);
}

export async function deleteScan(id) {
  const list = await getAllScans();
  const next = list.filter((s) => s.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}