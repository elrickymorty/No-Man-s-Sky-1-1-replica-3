// ============ localStorage save ============
const KEY = 'nms_replica_save_v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  return !!loadSave();
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
