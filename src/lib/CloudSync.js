import RNFS from 'react-native-fs';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const SCANS_BUCKET = 'scans';
const SCANS_TABLE = 'scan_records';

// Scan ids the user has deleted locally. If a background sync for one of
// these ids is still in flight, it checks this set right before writing
// and backs out instead of resurrecting a "deleted" scan in the cloud.
// This closes the race: scan → immediately delete → sync finishes late.
const pendingDeletedIds = new Set();

export function markDeletedLocally(scanId) {
  pendingDeletedIds.add(scanId);
  // Auto-expire after 2 minutes — plenty of time for any in-flight sync
  // to finish, no need to hold this in memory forever.
  setTimeout(() => pendingDeletedIds.delete(scanId), 2 * 60 * 1000);
}

/**
 * Cloud sync is best-effort and NEVER blocks the local save flow.
 * - Guests (no real Supabase auth user) are skipped entirely, because our
 *   Storage + table RLS policies require auth.uid() to equal the folder /
 *   row owner. There is no safe way to sync guest data to a shared backend.
 * - Every function here swallows its own errors and returns a
 *   { success, error } shape so callers can log/ignore without crashing
 *   the local-first save path.
 */

function isRealUser(userId) {
  // 'guest' is our local fallback id (see scanStorage.js storageUserId).
  // Supabase auth.uid() is always a uuid, so anything else can't match RLS.
  return !!userId && userId !== 'guest';
}

function extFromPath(path) {
  return path.toLowerCase().includes('.png') ? 'png' : 'jpg';
}

/**
 * Uploads a local scan image to Supabase Storage under the user's own
 * top-level folder, matching the "own folder = uid" RLS policies:
 *   scans/<user_id>/<filename>
 */
export async function uploadScanImage(userId, localImageUri) {
  if (!isRealUser(userId) || !localImageUri) {
    return { success: false, error: 'skipped: not a real user or no image' };
  }

  try {
    const localPath = localImageUri.replace('file://', '');
    const exists = await RNFS.exists(localPath);
    if (!exists) return { success: false, error: 'local file missing' };

    const base64 = await RNFS.readFile(localPath, 'base64');
    const arrayBuffer = decode(base64);
    const ext = extFromPath(localPath);
    const remotePath = `${userId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SCANS_BUCKET)
      .upload(remotePath, arrayBuffer, {
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return { success: true, path: remotePath };
  } catch (e) {
    console.log('[cloudSync] uploadScanImage failed:', e?.message || e);
    return { success: false, error: e?.message || String(e) };
  }
}

/**
 * Upserts scan metadata into the scan_records table. imagePath is the
 * Storage path returned by uploadScanImage (not a local file:// uri).
 */
export async function syncScanRecord(scan, userId, imagePath) {
  if (!isRealUser(userId)) {
    return { success: false, error: 'skipped: not a real user' };
  }

  try {
    let userEmail = null;
    try {
      const { data } = await supabase.auth.getUser();
      userEmail = data?.user?.email || null;
    } catch (_) {}

    const { error } = await supabase.from(SCANS_TABLE).upsert(
      {
        id: scan.id,
        user_id: userId,
        user_email: userEmail,
        type: scan.type,
        name: scan.name,
        subtitle: scan.subtitle,
        manufacturer: scan.manufacturer,
        confidence: scan.confidence,
        about: scan.about,
        on_package: scan.onPackage || [],
        notes: scan.notes || [],
        formula: scan.formula ?? null,
        how_it_works: scan.howItWorks,
        why_in_medicine: scan.whyInMedicine,
        how_to_use: scan.howToUse,
        alternatives: scan.alternatives || [],
        price: scan.price != null ? String(scan.price) : null,
        image_path: imagePath || null,
        created_at: scan.createdAt,
      },
      { onConflict: 'id' },
    );

    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.log('[cloudSync] syncScanRecord failed:', e?.message || e);
    return { success: false, error: e?.message || String(e) };
  }
}

/**
 * Convenience wrapper: upload image (if present) then upsert the row.
 * Call this AFTER the local save has already succeeded — cloud sync is
 * additive, never a precondition for the scan being usable offline.
 */
export async function syncScanToCloud(scan, userId) {
  if (!isRealUser(userId)) return { success: false, error: 'skipped' };
  if (pendingDeletedIds.has(scan.id)) {
    return { success: false, error: 'skipped: deleted before sync started' };
  }

  let imagePath = null;
  if (scan.imageUri) {
    const uploadResult = await uploadScanImage(userId, scan.imageUri);
    if (uploadResult.success) imagePath = uploadResult.path;
    // If upload fails, we still try to sync the metadata row without
    // an image_path rather than losing the sync entirely.
  }

  // Re-check AFTER the (slow) upload — the user may have deleted the scan
  // while the image was still uploading. If so, undo the upload and bail
  // instead of writing a row for a scan that no longer exists locally.
  if (pendingDeletedIds.has(scan.id)) {
    if (imagePath) {
      try {
        await supabase.storage.from(SCANS_BUCKET).remove([imagePath]);
      } catch (_) {}
    }
    return { success: false, error: 'skipped: deleted during sync' };
  }

  const recordResult = await syncScanRecord(scan, userId, imagePath);
  return { ...recordResult, path: imagePath };
}

/**
 * Deletes both the storage object and the table row for a scan.
 * Safe to call even if the scan was never synced (RLS + not-found are
 * both treated as non-fatal).
 */
export async function deleteScanFromCloud(scanId, userId, imagePath) {
  console.log('[cloudSync] deleteScanFromCloud called:', { scanId, userId, imagePath });

  if (!isRealUser(userId)) {
    console.log('[cloudSync] deleteScanFromCloud SKIPPED — not a real user:', userId);
    return { success: false, error: 'skipped' };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUid = sessionData?.session?.user?.id;
    console.log('[cloudSync] current supabase session uid:', sessionUid, '| passed userId:', userId);
    if (sessionUid && sessionUid !== userId) {
      console.log('[cloudSync] WARNING: session uid does not match passed userId — RLS will block this delete');
    }

    if (imagePath) {
      const { error: removeError } = await supabase.storage.from(SCANS_BUCKET).remove([imagePath]);
      if (removeError) {
        console.log('[cloudSync] storage remove error:', removeError.message);
      } else {
        console.log('[cloudSync] storage image removed:', imagePath);
      }
    } else {
      console.log('[cloudSync] no imagePath stored locally — skipping storage remove (scan may not have finished syncing before delete)');
    }

    const { error, count } = await supabase
      .from(SCANS_TABLE)
      .delete({ count: 'exact' })
      .eq('id', scanId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[cloudSync] scan_records rows deleted:', count);
    if (count === 0) {
      console.log('[cloudSync] WARNING: 0 rows deleted — either the row never existed in scan_records, or RLS silently filtered it out (session uid mismatch is the most common cause)');
    }

    return { success: true, rowsDeleted: count };
  } catch (e) {
    console.log('[cloudSync] deleteScanFromCloud failed:', e?.message || e);
    return { success: false, error: e?.message || String(e) };
  }
}

/**
 * Pulls all cloud-synced scans for the given user, newest first.
 * Useful for a future "restore on new device" flow.
 */
export async function fetchCloudScans(userId) {
  if (!isRealUser(userId)) return { success: false, error: 'skipped', data: [] };

  try {
    const { data, error } = await supabase
      .from(SCANS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (e) {
    console.log('[cloudSync] fetchCloudScans failed:', e?.message || e);
    return { success: false, error: e?.message || String(e), data: [] };
  }
}

/**
 * Safety net for orphan cloud rows created before the pending-delete guard
 * existed (or from any other missed race). Pass the full list of scan ids
 * that currently exist in the LOCAL SQLite database — anything in the
 * cloud that isn't in that list gets deleted (row + image).
 *
 * Call this occasionally, e.g. once when the Profile/History screen mounts
 * for a logged-in user, not on every render.
 */
export async function reconcileCloudScans(userId, localScanIds) {
  if (!isRealUser(userId)) return { success: false, error: 'skipped', removed: 0 };

  try {
    const { data, error } = await supabase
      .from(SCANS_TABLE)
      .select('id, image_path')
      .eq('user_id', userId);

    if (error) throw error;

    const localSet = new Set(localScanIds || []);
    const orphans = (data || []).filter((row) => !localSet.has(row.id));

    if (orphans.length === 0) return { success: true, removed: 0 };

    const orphanImagePaths = orphans.map((r) => r.image_path).filter(Boolean);
    if (orphanImagePaths.length > 0) {
      await supabase.storage.from(SCANS_BUCKET).remove(orphanImagePaths);
    }

    const orphanIds = orphans.map((r) => r.id);
    const { error: delError } = await supabase
      .from(SCANS_TABLE)
      .delete()
      .in('id', orphanIds)
      .eq('user_id', userId);

    if (delError) throw delError;

    console.log(`[cloudSync] reconcile removed ${orphans.length} orphan record(s)`);
    return { success: true, removed: orphans.length };
  } catch (e) {
    console.log('[cloudSync] reconcileCloudScans failed:', e?.message || e);
    return { success: false, error: e?.message || String(e), removed: 0 };
  }
}