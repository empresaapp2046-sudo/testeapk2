/**
 * Backup dos dados em uma pasta visível no computador do usuário.
 *
 * Usa a File System Access API (showDirectoryPicker). A permissão da pasta é
 * lembrada entre sessões guardando o handle no IndexedDB. Em navegadores sem
 * suporte, cai automaticamente para download do arquivo na pasta Downloads.
 */
import { snapshotLocalDb, onLocalDbChange } from './local-db';

const HANDLE_DB = 'smartpdv_fs';
const HANDLE_KEY = 'backup_dir';
const FOLDER_NAME_KEY = 'smartpdv_backup_folder_name';
const AUTO_KEY = 'smartpdv_backup_auto';
const LAST_KEY = 'smartpdv_backup_last';

export type BackupResult = { ok: boolean; mode: 'folder' | 'download' | 'none'; message: string };

export const supportsFileSystemAccess = () =>
  typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

/* ---------------- persistência do handle da pasta ---------------- */

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('handles')) req.result.createObjectStore('handles');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle: any) {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readHandle(): Promise<any | null> {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function clearHandle() {
  try {
    const db = await openHandleDb();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete(HANDLE_KEY);
  } catch { /* ignora */ }
}

/* ---------------- conteúdo do backup ---------------- */

function buildBackupJson(): string {
  const data = snapshotLocalDb();
  const parsed: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    try { parsed[key] = JSON.parse(value); } catch { parsed[key] = value; }
  });
  return JSON.stringify(
    { app: 'Smart PDV PRO', version: 1, exportedAt: new Date().toISOString(), data: parsed },
    null,
    2,
  );
}

function backupFileName(withTimestamp = false) {
  if (!withTimestamp) return 'smartpdv-dados.json';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `smartpdv-backup-${stamp}.json`;
}

/* ---------------- pasta escolhida pelo usuário ---------------- */

export function getSavedFolderName(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(FOLDER_NAME_KEY);
}

export function getLastBackupAt(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_KEY);
}

export function isAutoBackupEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AUTO_KEY) === '1';
}

export function setAutoBackupEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTO_KEY, enabled ? '1' : '0');
}

async function ensurePermission(handle: any, request: boolean): Promise<boolean> {
  if (!handle?.queryPermission) return true;
  const opts = { mode: 'readwrite' as const };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if (!request) return false;
  return (await handle.requestPermission(opts)) === 'granted';
}

/** Abre o seletor de pastas do sistema e memoriza a escolha. */
export async function chooseBackupFolder(): Promise<BackupResult> {
  if (!supportsFileSystemAccess()) {
    return { ok: false, mode: 'none', message: 'Seu navegador não permite escolher uma pasta. Os backups serão baixados na pasta Downloads.' };
  }
  try {
    const handle = await (window as any).showDirectoryPicker({ id: 'smartpdv-backup', mode: 'readwrite', startIn: 'documents' });
    if (!(await ensurePermission(handle, true))) {
      return { ok: false, mode: 'none', message: 'Permissão de gravação negada para a pasta escolhida.' };
    }
    await saveHandle(handle);
    window.localStorage.setItem(FOLDER_NAME_KEY, handle.name || 'pasta selecionada');
    setAutoBackupEnabled(true);
    await saveBackupNow();
    return { ok: true, mode: 'folder', message: `Pasta "${handle.name}" conectada. Os dados serão salvos automaticamente nela.` };
  } catch (error: any) {
    if (error?.name === 'AbortError') return { ok: false, mode: 'none', message: 'Nenhuma pasta escolhida.' };
    return { ok: false, mode: 'none', message: `Não foi possível conectar a pasta: ${error?.message || error}` };
  }
}

export async function disconnectBackupFolder() {
  await clearHandle();
  if (typeof window !== 'undefined') window.localStorage.removeItem(FOLDER_NAME_KEY);
  setAutoBackupEnabled(false);
}

function downloadFallback(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Salva o backup agora. Usa a pasta conectada quando disponível;
 * caso contrário baixa o arquivo na pasta Downloads.
 */
export async function saveBackupNow(options?: { forceDownload?: boolean; silentIfNoFolder?: boolean }): Promise<BackupResult> {
  const content = buildBackupJson();

  if (!options?.forceDownload) {
    const handle = await readHandle();
    if (handle && (await ensurePermission(handle, false))) {
      try {
        const file = await handle.getFileHandle(backupFileName(), { create: true });
        const writable = await file.createWritable();
        await writable.write(content);
        await writable.close();
        window.localStorage.setItem(LAST_KEY, new Date().toISOString());
        return { ok: true, mode: 'folder', message: `Dados salvos na pasta "${handle.name}".` };
      } catch (error: any) {
        return { ok: false, mode: 'none', message: `Falha ao gravar na pasta: ${error?.message || error}` };
      }
    }
    if (handle) {
      return { ok: false, mode: 'none', message: 'A permissão da pasta expirou. Conecte a pasta novamente.' };
    }
    if (options?.silentIfNoFolder) {
      return { ok: false, mode: 'none', message: 'Nenhuma pasta conectada.' };
    }
  }

  downloadFallback(content, backupFileName(true));
  window.localStorage.setItem(LAST_KEY, new Date().toISOString());
  return { ok: true, mode: 'download', message: 'Backup baixado na pasta Downloads.' };
}

/** Restaura o conteúdo de um arquivo de backup para o banco local. */
export async function restoreBackupJson(content: string): Promise<BackupResult> {
  try {
    const parsed = JSON.parse(content);
    const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    const { localDb } = await import('./local-db');
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      localDb.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
    return { ok: true, mode: 'folder', message: 'Dados restaurados. Recarregue o sistema para visualizar.' };
  } catch (error: any) {
    return { ok: false, mode: 'none', message: `Arquivo inválido: ${error?.message || error}` };
  }
}

/**
 * Ao abrir o sistema (inclusive sem internet), lê o arquivo da pasta conectada
 * e traz de volta tudo que não estiver no navegador: cadastros, configurações
 * e imagens. Não pede permissão nem apaga nada que já exista localmente.
 */
export async function restoreFromFolderOnBoot(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const handle = await readHandle();
    if (!handle) return;
    if (!(await ensurePermission(handle, false))) return;

    const fileHandle = await handle.getFileHandle(backupFileName(), { create: false }).catch(() => null);
    if (!fileHandle) return;

    const content = await (await fileHandle.getFile()).text();
    const parsed = JSON.parse(content);
    const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;

    const { localDb } = await import('./local-db');
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      const existing = localDb.getItem(key);
      const isEmpty = existing === null || existing === '' || existing === '[]' || existing === '{}';
      if (!isEmpty) return;
      localDb.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  } catch (error) {
    console.warn('Não foi possível ler os dados da pasta conectada', error);
  }
}

/* ---------------- salvamento automático ---------------- */

let autoStarted = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Liga o salvamento automático: grava na pasta ~3s após a última alteração. */
export function startAutoFolderBackup() {
  if (autoStarted || typeof window === 'undefined') return;
  autoStarted = true;

  onLocalDbChange(() => {
    if (!isAutoBackupEnabled()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void saveBackupNow({ silentIfNoFolder: true });
    }, 3000);
  });
}
