import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const DB_NAME = 'medscan.db';

let dbInstance = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
  });

  await dbInstance.executeSql(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      type TEXT,
      name TEXT,
      subtitle TEXT,
      manufacturer TEXT,
      confidence REAL,
      about TEXT,
      on_package TEXT,
      notes TEXT,
      formula TEXT,
      how_it_works TEXT,
      why_in_medicine TEXT,
      how_to_use TEXT,
      alternatives TEXT,
      price TEXT,
      image_uri TEXT,
      created_at TEXT,
      cloud_image_path TEXT,
      cloud_synced_at TEXT
    );
  `);

  await dbInstance.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_scans_user_created
    ON scans (user_id, created_at);
  `);

  // Lightweight migration for installs created before cloud sync existed.
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so we check pragma first.
  try {
    const [cols] = await dbInstance.executeSql(`PRAGMA table_info(scans);`);
    const existing = new Set();
    for (let i = 0; i < cols.rows.length; i++) {
      existing.add(cols.rows.item(i).name);
    }
    if (!existing.has('cloud_image_path')) {
      await dbInstance.executeSql(`ALTER TABLE scans ADD COLUMN cloud_image_path TEXT;`);
    }
    if (!existing.has('cloud_synced_at')) {
      await dbInstance.executeSql(`ALTER TABLE scans ADD COLUMN cloud_synced_at TEXT;`);
    }
  } catch (e) {
    console.log('[MedScan] scans table migration check failed:', e);
  }

  return dbInstance;
}

export function rowToScan(row) {
  const parse = (v, fallback) => {
    if (v == null || v === '') return fallback;
    try {
      return JSON.parse(v);
    } catch {
      return fallback;
    }
  };

  return {
    id: row.id,
    userId: row.user_id || null,
    type: row.type || 'unknown',
    name: row.name || 'Scan',
    subtitle: row.subtitle || '',
    manufacturer: row.manufacturer || '',
    confidence: row.confidence != null ? Number(row.confidence) : null,
    about: row.about || '',
    onPackage: parse(row.on_package, []),
    notes: parse(row.notes, []),
    formula: parse(row.formula, null),
    howItWorks: row.how_it_works || null,
    whyInMedicine: row.why_in_medicine || null,
    howToUse: row.how_to_use || null,
    alternatives: parse(row.alternatives, []),
    price: row.price || null,
    imageUri: row.image_uri || null,
    createdAt: row.created_at || null,
    cloudImagePath: row.cloud_image_path || null,
    cloudSyncedAt: row.cloud_synced_at || null,
  };
}