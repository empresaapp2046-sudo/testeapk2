// @ts-nocheck
/**
 * Controle híbrido da licença: funciona offline usando a cópia criptografada
 * local e sincroniza com a nuvem sempre que houver internet.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from './StoreContext';
import {
  evaluateLicense,
  getDeviceId,
  protectedNow,
  readLicenseSnapshot,
  saveLicenseSnapshot,
  type LicenseSnapshot,
  type LicenseStatus,
} from '../lib/license';

const SYNC_INTERVAL = 5 * 60 * 1000;

const LicenseContext = createContext<any>(null);

export const useLicense = () => {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    return {
      status: { status: 'unknown', expired: false, daysRemaining: 0, expiry: null, lastSyncAt: null, msRemaining: 0 },
      online: true,
      syncing: false,
      lastSyncLabel: '',
      syncNow: () => {},
    };
  }
  return ctx;
};

export const LicenseProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isAdmin } = useStore();
  const [snapshot, setSnapshot] = useState<LicenseSnapshot | null>(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [tick, setTick] = useState(0);
  const syncingRef = useRef(false);

  const effectiveUserId = currentUser?.ownerId && currentUser.ownerId !== currentUser.id
    ? currentUser.ownerId
    : currentUser?.id;

  // Carrega a cópia local assim que houver usuário
  useEffect(() => {
    let active = true;
    if (!effectiveUserId) { setSnapshot(null); return; }
    readLicenseSnapshot().then((local) => {
      if (!active) return;
      if (local && local.userId === effectiveUserId) {
        setSnapshot(local);
      } else if (currentUser) {
        // Primeira vez neste dispositivo: usa o que veio do login
        const initial: LicenseSnapshot = {
          userId: effectiveUserId,
          username: currentUser.username,
          licenseKey: currentUser.licenseKey ?? null,
          licenseExpiry: currentUser.licenseExpiry ?? null,
          status: 'active',
          lastSyncAt: null,
          savedAt: new Date(protectedNow()).toISOString(),
        };
        setSnapshot(initial);
        saveLicenseSnapshot(initial);
      }
    });
    return () => { active = false; };
  }, [effectiveUserId, currentUser?.licenseKey, currentUser?.licenseExpiry]);

  const syncNow = useCallback(async () => {
    if (!effectiveUserId || effectiveUserId === 'guest_user') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const ref = doc(db, 'users', effectiveUserId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const remote = snap.data() as any;
        const nextStatus = remote.licenseCancelled === true || remote.licenseStatus === 'cancelled'
          ? 'cancelled'
          : 'active';
        const next: LicenseSnapshot = {
          userId: effectiveUserId,
          username: remote.username || currentUser?.username,
          licenseKey: remote.licenseKey ?? null,
          licenseExpiry: remote.licenseExpiry ?? null,
          status: nextStatus,
          lastSyncAt: new Date().toISOString(),
          savedAt: new Date().toISOString(),
        };
        setSnapshot(next);
        await saveLicenseSnapshot(next);

        // Envia o uso atual para o administrador consultar na nuvem
        const evaluated = evaluateLicense(next);
        await updateDoc(ref, {
          licenseDaysRemaining: evaluated.daysRemaining === Infinity ? null : evaluated.daysRemaining,
          licenseLastSync: next.lastSyncAt,
          licenseDeviceId: getDeviceId(),
          licenseLocalStatus: evaluated.status,
          lastSeenAt: next.lastSyncAt,
        }).catch(() => {});
      }
    } catch (error) {
      console.warn('Não foi possível sincronizar a licença agora', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [effectiveUserId, currentUser?.username]);

  // Escuta conexão + checagem periódica em segundo plano
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const goOnline = () => { setOnline(true); syncNow(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine) syncNow();
    const interval = setInterval(() => { if (navigator.onLine) syncNow(); }, SYNC_INTERVAL);
    const clock = setInterval(() => setTick((t) => t + 1), 60000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [syncNow]);

  const status: LicenseStatus = useMemo(() => {
    void tick;
    return evaluateLicense(snapshot);
  }, [snapshot, tick]);

  const lastSyncLabel = useMemo(() => {
    if (!snapshot?.lastSyncAt) return '';
    try {
      return new Date(snapshot.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '';
    }
  }, [snapshot?.lastSyncAt]);

  const value = useMemo(() => ({
    status,
    online,
    syncing,
    lastSyncLabel,
    syncNow,
    isAdmin,
  }), [status, online, syncing, lastSyncLabel, syncNow, isAdmin]);

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};
