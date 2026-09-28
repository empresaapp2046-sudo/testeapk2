import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Save, Download, Link2Off, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  chooseBackupFolder,
  disconnectBackupFolder,
  getLastBackupAt,
  getSavedFolderName,
  isAutoBackupEnabled,
  restoreBackupJson,
  saveBackupNow,
  setAutoBackupEnabled,
  supportsFileSystemAccess,
} from '../lib/folder-backup';

export function FolderBackupCard() {
  const [folder, setFolder] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setFolder(getSavedFolderName());
    setAuto(isAutoBackupEnabled());
    setLast(getLastBackupAt());
  };

  useEffect(() => {
    setSupported(supportsFileSystemAccess());
    refresh();
  }, []);

  const run = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(true);
    try {
      const result = await fn();
      setStatus(result);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const onRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    await run(() => restoreBackupJson(text));
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
          <FolderOpen size={18} /> Pasta de dados no computador
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Escolha uma pasta no seu computador para o sistema salvar automaticamente um arquivo
          <code className="mx-1">smartpdv-dados.json</code>
          com todos os cadastros sempre que algo mudar. Você pode abrir, copiar ou levar esse arquivo para outro computador.
        </p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Pasta conectada</span>
            <span className="text-sm font-semibold text-slate-700 break-all">{folder || 'Nenhuma'}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Último salvamento</span>
            <span className="text-sm font-semibold text-slate-700">
              {last ? new Date(last).toLocaleString('pt-BR') : 'Ainda não salvo'}
            </span>
          </div>
        </div>
      </div>

      {!supported && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            Este navegador não permite escolher uma pasta. Use o botão <b>Baixar backup agora</b>: o arquivo vai para a
            pasta <b>Downloads</b>. Para o salvamento automático em pasta, use Chrome ou Edge no computador.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {supported && (
          <button
            disabled={busy}
            onClick={() => run(chooseBackupFolder)}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow"
          >
            <FolderOpen size={18} /> {folder ? 'Trocar pasta' : 'Escolher pasta'}
          </button>
        )}

        <button
          disabled={busy}
          onClick={() => run(() => saveBackupNow())}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow"
        >
          <Save size={18} /> Salvar agora
        </button>

        <button
          disabled={busy}
          onClick={() => run(() => saveBackupNow({ forceDownload: true }))}
          className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Download size={18} /> Baixar backup agora
        </button>

        <button
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Upload size={18} /> Restaurar de arquivo
        </button>

        {folder && (
          <button
            disabled={busy}
            onClick={() => run(async () => {
              await disconnectBackupFolder();
              return { ok: true, message: 'Pasta desconectada.' };
            })}
            className="bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Link2Off size={18} /> Desconectar pasta
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onRestoreFile} />

      {folder && (
        <label className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-sm">
            <b className="block text-slate-800">Salvamento automático</b>
            <span className="text-xs text-slate-500">Grava na pasta poucos segundos após cada alteração.</span>
          </span>
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => { setAutoBackupEnabled(e.target.checked); setAuto(e.target.checked); }}
            className="w-5 h-5 accent-blue-600"
          />
        </label>
      )}

      {status && (
        <div
          className={`rounded-xl p-3 text-xs flex gap-2 ${
            status.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}
        >
          {status.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
          <p>{status.message}</p>
        </div>
      )}
    </div>
  );
}
