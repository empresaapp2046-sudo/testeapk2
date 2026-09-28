// @ts-nocheck
import React from 'react';
import { AlertTriangle, CloudOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { useStore } from '../context/StoreContext';

export const LicenseGuard = ({ children }: { children: React.ReactNode }) => {
  const { status, online, syncing, syncNow, lastSyncLabel } = useLicense();
  const { currentUser, isAdmin, settings } = useStore();

  const blocked =
    !!currentUser &&
    currentUser.id !== 'guest_user' &&
    !isAdmin &&
    (status.status === 'expired' || status.status === 'cancelled');

  if (!blocked) return <>{children}</>;

  const whatsapp = (settings?.phone || '').replace(/\D/g, '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold">
            {status.status === 'cancelled' ? 'Licença cancelada' : 'Licença vencida'}
          </h2>
          <p className="text-white/90 text-sm mt-2">
            Para continuar usando o sistema, renove sua licença com o administrador.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex items-start gap-3">
            {online ? <ShieldCheck size={18} className="text-emerald-500 mt-0.5" /> : <CloudOff size={18} className="text-amber-500 mt-0.5" />}
            <div>
              {online
                ? `Conectado${lastSyncLabel ? ` — última sincronização em ${lastSyncLabel}` : ''}.`
                : 'Modo Offline (Aguardando conexão para sincronizar).'}
              <div className="text-xs text-slate-400 mt-1">
                Assim que o administrador renovar, a liberação chega automaticamente na próxima conexão.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={syncNow}
              disabled={!online || syncing}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-3 font-semibold text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              Verificar renovação
            </button>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-500 text-white py-3 font-semibold text-sm"
              >
                Falar para renovar
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('app:soft_reset'))}
            className="w-full text-xs text-slate-400 hover:text-slate-600"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};
