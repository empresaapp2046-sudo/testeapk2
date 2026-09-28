/**
 * Banco de dados local do navegador (IndexedDB via Dexie).
 *
 * Todo o sistema (cadastros, vendas, imagens, configurações) é lido e gravado
 * exclusivamente aqui quando o app está em uso no dia a dia. A nuvem continua
 * sendo usada apenas para login e controle de licença.
 *
 * Exposto como um objeto com a mesma interface do `Storage` (getItem/setItem/...)
 * para que o restante do app continue síncrono: mantemos um espelho em memória
 * e gravamos no IndexedDB de forma assíncrona a cada alteração.
 */

const mirror = new Map<string, string>();
let dbPut: ((key: string, value: string) => void) | null = null;
let dbDelete: ((key: string) => void) | null = null;
let hydrated = false;
let hydrating: Promise<void> | null = null;

export const isLocalDbReady = () => hydrated;

// Quem quiser reagir a alterações (ex.: backup automático em pasta) assina aqui.
const listeners = new Set<() => void>();
export function onLocalDbChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const notify = () => {
  if (!hydrated) return;
  listeners.forEach((l) => {
    try { l(); } catch { /* ignora */ }
  });
};

/** Cópia completa do banco local (usada para backup). */
export function snapshotLocalDb(): Record<string, string> {
  return Object.fromEntries(mirror.entries());
}

export const localDb: Storage = {
  getItem: (key: string) => (mirror.has(key) ? (mirror.get(key) as string) : null),
  setItem: (key: string, value: string) => {
    const v = String(value);
    mirror.set(key, v);
    dbPut?.(key, v);
    notify();
  },
  removeItem: (key: string) => {
    mirror.delete(key);
    dbDelete?.(key);
    notify();
  },
  clear: () => {
    Array.from(mirror.keys()).forEach((k) => {
      mirror.delete(k);
      dbDelete?.(k);
    });
    notify();
  },
  key: (index: number) => Array.from(mirror.keys())[index] ?? null,
  get length() {
    return mirror.size;
  },
} as unknown as Storage;

/**
 * Carrega o conteúdo do IndexedDB para a memória. Deve ser concluído antes de
 * renderizar a aplicação, para que nada apareça vazio na primeira pintura.
 */
export async function hydrateLocalDb(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;

  hydrating = (async () => {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      hydrated = true;
      return;
    }

    try {
      const { default: Dexie } = await import('dexie');
      const db = new Dexie('smartpdv_local');
      db.version(1).stores({ kv: '&key' });
      const table = db.table<{ key: string; value: string }>('kv');

      const rows = await table.toArray();
      rows.forEach((row) => {
        if (typeof row?.key === 'string' && typeof row?.value === 'string') {
          mirror.set(row.key, row.value);
        }
      });

      // Fila de gravação: escreve em segundo plano, sem travar a interface.
      const pending = new Map<string, string | null>();
      let flushing = false;
      const flush = async () => {
        if (flushing) return;
        flushing = true;
        try {
          while (pending.size > 0) {
            const batch = Array.from(pending.entries());
            pending.clear();
            const puts = batch
              .filter(([, v]) => v !== null)
              .map(([key, value]) => ({ key, value: value as string }));
            const dels = batch.filter(([, v]) => v === null).map(([key]) => key);
            if (puts.length) await table.bulkPut(puts);
            if (dels.length) await table.bulkDelete(dels);
          }
        } catch (error) {
          console.error('Falha ao gravar no banco local do navegador', error);
        } finally {
          flushing = false;
        }
      };
      const schedule = () => { void Promise.resolve().then(flush); };

      dbPut = (key, value) => { pending.set(key, value); schedule(); };
      dbDelete = (key) => { pending.set(key, null); schedule(); };

      // Migração única: traz dados antigos que ficaram no armazenamento simples.
      if (rows.length === 0) {
        try {
          const legacy = window.localStorage;
          const migrated: { key: string; value: string }[] = [];
          for (let i = 0; i < legacy.length; i++) {
            const k = legacy.key(i);
            if (!k) continue;
            if (!(k.startsWith('smartpdv_') || k.startsWith('img_') || k === 'current_session_soft')) continue;
            const v = legacy.getItem(k);
            if (typeof v === 'string') {
              mirror.set(k, v);
              migrated.push({ key: k, value: v });
            }
          }
          if (migrated.length) await table.bulkPut(migrated);
        } catch {
          /* ignora: armazenamento antigo indisponível */
        }
      }
    } catch (error) {
      console.error('Não foi possível abrir o banco local do navegador', error);
    } finally {
      hydrated = true;
    }
  })();

  return hydrating;
}
