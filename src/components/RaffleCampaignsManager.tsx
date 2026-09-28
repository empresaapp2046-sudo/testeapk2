// @ts-nocheck
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Edit2, Trash2, Tag, Calendar, AlertCircle, Play, Image as ImageIcon, Clock, Info, Ticket, Trophy } from 'lucide-react';
import { RaffleCampaign } from '../types';
import { RaffleCampaignInfoModal } from './RaffleCampaignInfoModal';

interface Props {
  onDrawCampaign?: (c: RaffleCampaign) => void;
}

export const RaffleCampaignsManager: React.FC<Props> = ({ onDrawCampaign }) => {
  const { raffleCampaigns, sales, addRaffleCampaign, updateRaffleCampaign, deleteRaffleCampaign } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [infoCampaign, setInfoCampaign] = useState<RaffleCampaign | null>(null);

  const [title, setTitle] = useState('');
  const [prizes, setPrizes] = useState<{ id: string; name: string; imageUrl?: string }[]>([
    { id: '1', name: '', imageUrl: '' }
  ]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [drawTime, setDrawTime] = useState('18:00');
  const [minAmount, setMinAmount] = useState<number>(100);
  const [ruleType, setRuleType] = useState<'per_purchase' | 'multiple'>('multiple');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setTitle('');
    setPrizes([{ id: '1', name: '', imageUrl: '' }]);
    setStartDate('');
    setEndDate('');
    setDrawDate('');
    setDrawTime('18:00');
    setMinAmount(100);
    setRuleType('multiple');
    setAutoGenerate(true);
    setActive(true);
    setEditingId(null);
  };

  const handleAddPrize = () => {
    setPrizes([...prizes, { id: Date.now().toString(), name: '', imageUrl: '' }]);
  };

  const handleRemovePrize = (id: string) => {
    if (prizes.length > 1) {
      setPrizes(prizes.filter(p => p.id !== id));
    }
  };

  const updatePrize = (id: string, field: 'name' | 'imageUrl', value: string) => {
    setPrizes(prizes.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleEdit = (c: RaffleCampaign) => {
    setTitle(c.title);
    setStartDate(c.startDate.split('T')[0]);
    setEndDate(c.endDate.split('T')[0]);
    setDrawDate(c.drawDate ? c.drawDate.split('T')[0] : '');
    setDrawTime(c.drawTime || '18:00');
    setMinAmount(c.minAmount);
    setRuleType(c.ruleType);
    setAutoGenerate(c.autoGenerate);
    setActive(c.active);
    
    if (c.prizes && c.prizes.length > 0) {
      setPrizes(c.prizes);
    } else {
      // Compatibility for older campaigns
      setPrizes([{ id: '1', name: c.prize || '', imageUrl: c.prizeImageUrl || '' }]);
    }
    
    setEditingId(c.id);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const hasValidPrizes = prizes.every(p => p.name.trim() !== '');
    if (!title || !hasValidPrizes || !startDate || !endDate || minAmount <= 0) {
      alert('Preencha todos os campos obrigatórios corretamente. Todos os prêmios devem ter um nome.');
      return;
    }
    if (!drawDate) {
      alert('Por favor, defina a data que o sorteio será realizado.');
      return;
    }

    const payload = {
      title,
      prize: prizes[0].name, // Legacy support
      prizeImageUrl: prizes[0].imageUrl, // Legacy support
      prizes,
      startDate: new Date(startDate + 'T00:00:00').toISOString(),
      endDate: new Date(endDate + 'T23:59:59').toISOString(),
      drawDate: new Date(drawDate + 'T00:00:00').toISOString(),
      drawTime: drawTime || '23:59',
      minAmount,
      ruleType,
      autoGenerate,
      active
    };

    if (editingId) {
      updateRaffleCampaign(editingId, payload);
    } else {
      addRaffleCampaign(payload);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta campanha?')) {
      deleteRaffleCampaign(id);
    }
  };

  const handleDrawClick = (c: RaffleCampaign) => {
      if (c.status === 'finished') {
          if (onDrawCampaign) {
              onDrawCampaign(c);
          }
          return;
      }

      if (!c.drawDate) {
          alert('Esta campanha não possui "Data do Sorteio". Por favor, edite e defina uma data primeiro.');
          return;
      }

      // Check date
      // Fix timezone offsets to compare exactly local dates
      const today = new Date();
      const tStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      
      const drawStr = c.drawDate.split('T')[0];

      if (tStr < drawStr) {
          alert(`Sorteio bloqueado: A data definida para o sorteio é ${drawStr.split('-').reverse().join('/')}.\n\nVocê só pode sortear a partir desta data. Se desejar sortear agora, edite a campanha e altere a Data do Sorteio para hoje.`);
          return;
      }

      if (onDrawCampaign) {
          onDrawCampaign(c);
      }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Campanhas Promocionais (Cupons)</h3>
          <p className="text-sm text-slate-500">Sorteios automáticos no Frente de Caixa (PDV)</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
          <Plus size={18} /> Nova Campanha
        </button>
      </div>

      <div className="space-y-4">
        {(!raffleCampaigns || raffleCampaigns.length === 0) && (
          <div className="text-center py-10 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500">
            Nenhuma campanha cadastrada.
          </div>
        )}
        {raffleCampaigns && raffleCampaigns.map(c => {
          const campaignCouponsCount = sales.reduce((acc, s) => {
            if (s.raffleCampaignId === c.id || (s.raffleCoupons && s.raffleCoupons.length > 0)) {
              const validCount = s.raffleCoupons?.length || 0;
              const invalidCount = s.invalidRaffleCoupons?.length || 0;
              return acc + validCount + invalidCount;
            }
            return acc;
          }, 0);

          return (
            <div key={c.id} className="p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-sm hover:border-slate-300 transition-all">
              <div className="flex items-center gap-4 flex-1">
                {c.prizes?.[0]?.imageUrl || c.prizeImageUrl ? (
                    <img src={c.prizes?.[0]?.imageUrl || c.prizeImageUrl} alt={c.title} className="w-16 h-16 rounded-xl object-cover shadow-sm bg-slate-100 shrink-0 border" />
                ) : (
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${c.active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Tag size={28} />
                    </div>
                )}
                
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    {c.title} 
                    <span className="text-xs font-normal text-slate-500">({c.active ? 'Ativa' : 'Inativa'})</span>
                  </h4>
                  {c.prizes && c.prizes.length > 1 ? (
                    <p className="text-sm text-slate-600">
                      Prêmios: <strong className="text-slate-800">{c.prizes.length} itens</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Prêmio: <strong className="text-slate-800">{c.prizes?.[0]?.name || c.prize}</strong>
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                      {c.ruleType === 'multiple' ? `1 cupom a cada R$ ${c.minAmount.toFixed(2)}` : `1 cupom para compras > R$ ${c.minAmount.toFixed(2)}`}
                    </span>
                    <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                      <Ticket size={12} /> {campaignCouponsCount} cupom(ns) gerado(s)
                    </span>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1">
                      <Calendar size={12} /> {c.startDate.split('T')[0].split('-').reverse().join('/')} - {c.endDate.split('T')[0].split('-').reverse().join('/')}
                    </span>
                    {c.drawDate && (
                        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-md flex items-center gap-1">
                          Sorteio: {c.drawDate.split('T')[0].split('-').reverse().join('/')} {c.drawTime ? `às ${c.drawTime}` : ''}
                        </span>
                    )}
                    {c.winners && c.winners.length > 0 && (
                      <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded-md flex items-center gap-1">
                        <Trophy size={12} /> {c.winners.length} Ganhador(es)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0 md:flex-col lg:flex-row w-full md:w-auto">
                <button
                  onClick={() => setInfoCampaign(c)}
                  className="p-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold flex items-center justify-center gap-1.5 border border-blue-200 shadow-sm"
                  title="Ver Informações e Cupons da Campanha"
                >
                  <Info size={16} /> Info
                </button>
                <button onClick={() => handleDrawClick(c)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 p-2 px-4 rounded-lg font-bold shadow-md ${c.status === 'finished' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                    {c.status === 'finished' ? (
                        <><Trophy size={16} /> Sorteado</>
                    ) : (
                        <><Play size={16} className="fill-current" /> Sortear</>
                    )}
                </button>
                <button onClick={() => handleEdit(c)} className="p-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(c.id)} className="p-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Excluir"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {infoCampaign && (
        <RaffleCampaignInfoModal
          campaign={infoCampaign}
          onClose={() => setInfoCampaign(null)}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">{editingId ? 'Editar Campanha' : 'Nova Campanha'}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Título da Campanha *</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" placeholder="Ex: Sorteio de Fim de Ano" />
                  </div>
              </div>

              <div className="space-y-4 border-t border-b py-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" /> Prêmios da Campanha
                  </h4>
                  <button
                    onClick={handleAddPrize}
                    className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Prêmio
                  </button>
                </div>

                {prizes.map((p, index) => (
                  <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative">
                    {prizes.length > 1 && (
                      <button
                        onClick={() => handleRemovePrize(p.id)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{index + 1}º Nome do Prêmio *</label>
                        <input
                          type="text"
                          value={p.name}
                          onChange={e => updatePrize(p.id, 'name', e.target.value)}
                          className="w-full p-2 border rounded-lg bg-white text-sm"
                          placeholder="Ex: TV SMART 60 POL"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <ImageIcon size={12} /> Link da Imagem / Arquivo
                        </label>
                        <input
                          type="text"
                          value={p.imageUrl || ''}
                          onChange={e => updatePrize(p.id, 'imageUrl', e.target.value)}
                          className="w-full p-2 border rounded-lg bg-white text-sm"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    {p.imageUrl && (
                      <div className="flex justify-center">
                        <img src={p.imageUrl} alt="Preview" className="h-16 rounded border bg-white" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Data Início *</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Data Fim *</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-amber-700 mb-1">Data Sorteio *</label>
                  <input type="date" value={drawDate} onChange={e => setDrawDate(e.target.value)} className="w-full p-3 border-2 border-amber-300 rounded-xl bg-amber-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-amber-700 mb-1 flex items-center gap-1"><Clock size={14}/> Horário Limite *</label>
                  <input type="time" value={drawTime} onChange={e => setDrawTime(e.target.value)} className="w-full p-3 border-2 border-amber-300 rounded-xl bg-amber-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Valor Mínimo (R$) *</label>
                    <input type="number" step="0.01" value={minAmount} onChange={e => setMinAmount(Number(e.target.value))} className="w-full p-3 border rounded-xl bg-slate-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Regra de Geração *</label>
                    <select value={ruleType} onChange={e => setRuleType(e.target.value as any)} className="w-full p-3 border rounded-xl bg-slate-50">
                      <option value="multiple">A cada R$ {minAmount.toFixed(2)} = 1 Cupom</option>
                      <option value="per_purchase">Compras acima de R$ {minAmount.toFixed(2)} = 1 Cupom único</option>
                    </select>
                  </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 cursor-pointer" onClick={() => setAutoGenerate(!autoGenerate)}>
                <input type="checkbox" checked={autoGenerate} onChange={() => {}} className="w-5 h-5 rounded" />
                <label className="text-sm font-medium cursor-pointer">Gerar cupons automaticamente na venda</label>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 text-slate-800 rounded-xl border border-slate-200 cursor-pointer" onClick={() => setActive(!active)}>
                <input type="checkbox" checked={active} onChange={() => {}} className="w-5 h-5 rounded" />
                <label className="text-sm font-medium cursor-pointer">Campanha Ativa para novas vendas</label>
              </div>

            </div>

            <div className="flex justify-end gap-4 mt-8 border-t pt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 hover:text-slate-700 font-bold">Cancelar</button>
              <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold">Salvar Campanha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
