// @ts-nocheck
/**
 * Licença híbrida (offline/online).
 *
 * A licença fica guardada de forma criptografada no banco local do navegador
 * (IndexedDB). Sem internet o sistema continua funcionando e calcula os dias
 * restantes a partir da última sincronização. Com internet, o app envia o uso
 * atual para a nuvem e recebe renovações/cancelamentos feitos pelo administrador.
 */

import { localDb } from './local-db';

export const LICENSE_STORAGE_KEY = 'smartpdv_license_secure';
const CLOCK_KEY = 'smartpdv_license_clock';
const DEVICE_KEY = 'smartpdv_device_id';
const SECRET = 'smartpdv-pro::license::v1';

export interface LicenseSnapshot {
  userId: string;
  username?: string;
  licenseKey?: string | null;
  licenseExpiry?: string | null;
  status: 'active' | 'expired' | 'cancelled' | 'free';
  lastSyncAt: string | null;
  savedAt: string;
}

/* ------------------------------------------------------------------ */
/* Criptografia simples (AES-GCM quando disponível, com fallback)      */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
};
const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

async function getKey(userId: string): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    const base = await crypto.subtle.importKey('raw', enc.encode(`${SECRET}:${userId}`), 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(SECRET), iterations: 60000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}

function xorScramble(text: string, userId: string) {
  const key = `${SECRET}:${userId}`;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

async function encryptSnapshot(snapshot: LicenseSnapshot): Promise<string> {
  const plain = JSON.stringify(snapshot);
  const key = await getKey(snapshot.userId);
  if (!key) return `x1:${snapshot.userId}:${toB64(enc.encode(xorScramble(plain, snapshot.userId)))}`;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)));
  return `a1:${snapshot.userId}:${toB64(iv)}:${toB64(cipher)}`;
}

async function decryptSnapshot(payload: string): Promise<LicenseSnapshot | null> {
  try {
    const parts = payload.split(':');
    if (parts[0] === 'x1') {
      const userId = parts[1];
      const raw = dec.decode(fromB64(parts.slice(2).join(':')));
      return JSON.parse(xorScramble(raw, userId));
    }
    if (parts[0] === 'a1') {
      const userId = parts[1];
      const key = await getKey(userId);
      if (!key) return null;
      const iv = fromB64(parts[2]);
      const data = fromB64(parts.slice(3).join(':'));
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
      return JSON.parse(dec.decode(plain));
    }
  } catch {
    /* conteúdo adulterado ou ilegível */
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Relógio protegido (evita voltar a data do computador)               */
/* ------------------------------------------------------------------ */

export function protectedNow(): number {
  const stored = Number(localDb.getItem(CLOCK_KEY) || 0);
  const now = Date.now();
  const effective = Number.isFinite(stored) && stored > now ? stored : now;
  if (effective > stored) localDb.setItem(CLOCK_KEY, String(effective));
  return effective;
}

export function getDeviceId(): string {
  let id = localDb.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localDb.setItem(DEVICE_KEY, id);
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* Leitura/gravação local                                              */
/* ------------------------------------------------------------------ */

export async function saveLicenseSnapshot(snapshot: LicenseSnapshot): Promise<void> {
  const payload = await encryptSnapshot({ ...snapshot, savedAt: new Date(protectedNow()).toISOString() });
  localDb.setItem(LICENSE_STORAGE_KEY, payload);
}

export async function readLicenseSnapshot(): Promise<LicenseSnapshot | null> {
  const payload = localDb.getItem(LICENSE_STORAGE_KEY);
  if (!payload) return null;
  return decryptSnapshot(payload);
}

export function clearLicenseSnapshot() {
  localDb.removeItem(LICENSE_STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
/* Cálculo do status                                                   */
/* ------------------------------------------------------------------ */

export interface LicenseStatus {
  status: 'active' | 'expired' | 'cancelled' | 'free' | 'unknown';
  expiry: string | null;
  msRemaining: number;
  daysRemaining: number;
  expired: boolean;
  lastSyncAt: string | null;
}

export function evaluateLicense(snapshot: LicenseSnapshot | null): LicenseStatus {
  if (!snapshot) {
    return { status: 'unknown', expiry: null, msRemaining: 0, daysRemaining: 0, expired: false, lastSyncAt: null };
  }
  if (snapshot.status === 'cancelled') {
    return { status: 'cancelled', expiry: snapshot.licenseExpiry ?? null, msRemaining: 0, daysRemaining: 0, expired: true, lastSyncAt: snapshot.lastSyncAt };
  }
  if (!snapshot.licenseExpiry) {
    // Licença sem data de validade (vitalícia ou versão livre)
    const isFree = !snapshot.licenseKey || snapshot.licenseKey === 'FREE-VERSION' || snapshot.licenseKey === 'FREE-TRIAL';
    return {
      status: isFree ? 'free' : 'active',
      expiry: null,
      msRemaining: Infinity,
      daysRemaining: Infinity,
      expired: false,
      lastSyncAt: snapshot.lastSyncAt,
    };
  }
  const ms = new Date(snapshot.licenseExpiry).getTime() - protectedNow();
  return {
    status: ms > 0 ? 'active' : 'expired',
    expiry: snapshot.licenseExpiry,
    msRemaining: ms,
    daysRemaining: Math.max(0, Math.ceil(ms / 86400000)),
    expired: ms <= 0,
    lastSyncAt: snapshot.lastSyncAt,
  };
}
