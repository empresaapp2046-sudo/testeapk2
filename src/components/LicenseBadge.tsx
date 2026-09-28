// @ts-nocheck
import React from 'react';
import { CloudOff, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';

const formatRemaining = (status) => {
  if (status.daysRemaining === Infinity) return 'Licença sem prazo de expiração';
  if (status.daysRemaining <= 0) return 'Licença vencida';
  if (status.daysRemaining === 1) return 'Licença válida por 1 dia';
  return `Licença válida por ${status.daysRemaining} dias`;
};

export const LicenseBadge = ({ compact = false }: { compact?: boolean }) => {
  const { status, online, syncing, lastSyncLabel, syncNow } = useLicense();

  if (status.status === 'unknown') return null;

  const expired = status.expired;
  const tone = expired
    ? 'bg-red-500/10 text-red-300 border-red-500/30'
    : online
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      : 'bg-amber-500/10 text-amber-300 border-amber-500/30';

  const Icon = expired ? AlertTriangle : online ? ShieldCheck : CloudOff;

  return (
    <div className={`rounded-lg border px-3 py-2 text-[11px] leading-tight ${tone}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Icon size={14} />
        <span>{formatRemaining(status)}</span>
      </div>
      {!compact && (
        <div className="mt-1 flex items-center justify-between gap-2 opacity-80">
          <span>
            {online
              ? `Sincronizado${lastSyncLabel ? ` em ${lastSyncLabel}` : ''}`
              : 'Modo Offline (Aguardando conexão para sincronizar)'}
          </span>
          {online && (
            <button
              type="button"
              onClick={syncNow}
              className="inline-flex items-center gap-1 hover:opacity-100 opacity-70"
              title="Sincronizar agora"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
