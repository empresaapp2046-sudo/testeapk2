// @ts-nocheck

import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate, useParams } from '../lib/router-compat';
import { DollarSign, AlertCircle, ShoppingBag, Users, ArrowUp, ArrowDown, ChevronDown, ChevronUp, X, Clock, Receipt, CheckCircle, AlertTriangle, Cake, Gift, MessageCircle, RefreshCw, ExternalLink, Store, Copy, Package } from 'lucide-react';
import { FinancialRecord, Sale, Customer } from '../types';
import { PaymentModal } from '../components/PaymentModal';
import { MessageSelectorModal } from '../components/MessageSelectorModal';
import { LowStockModal } from '../components/LowStockModal';

const StatCard = ({ title, value, subtext, icon: Icon, color, onClick, actionIcon, rangeText, className }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-fade-in relative overflow-hidden group transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''} ${className || ''}`}
  >
    <div className="flex justify-between items-start relative z-10">
      <div>
        <div className="flex items-center gap-2 mb-1">
             <p className="text-sm font-medium text-slate-500">{title}</p>
             {rangeText && <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-400 font-medium border border-slate-200">{rangeText}</span>}
        </div>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} shadow-sm transition-colors duration-300`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    {subtext && <p className="text-xs text-slate-400 mt-4 font-medium">{subtext}</p>}
    
    {/* Decor element */}
    <div className={`absolute -right-4 -bottom-4 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={80} className={color.replace('bg-', 'text-')} />
    </div>

    {/* Action Icon (Chevron/Arrow) */}
    {actionIcon}
  </div>
);

// Helper function for Urgency Status
const getUrgencyStatus = (dueDateStr: string) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0,0,0,0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
     return { 
       style: "bg-red-50 border-l-4 border-l-red-500 border-red-200 animate-pulse", 
       text: "Pagamento Vencido",
       textColor: "text-red-600",
       icon: AlertCircle
     };
  }
  if (diffDays === 0) {
     return { 
       style: "rainbow-blink border-2", 
       text: "Pgto vence hoje",
       textColor: "text-red-600 font-bold",
       icon: Clock
     };
  }
  if (diffDays === 1) {
     return { 
       style: "bg-orange-50 border-l-4 border-l-orange-500 border-orange-200", 
       text: "Vence Amanhã",
       textColor: "text-orange-600",
       icon: Clock
     };
  }
  if (diffDays <= 3) {
     return { 
       style: "bg-yellow-50 border-l-4 border-l-yellow-400 border-yellow-200", 
       text: `Vence em ${diffDays} dias`,
       textColor: "text-yellow-700",
       icon: Clock
     };
  }
  
  return { 
    style: "hover:bg-slate-50 border-b border-slate-100", 
    text: `Vence em ${diffDays} dias`,
    textColor: "text-slate-500",
    icon: Clock
  };
};

export const Dashboard = () => {
  const { sales, financialRecords, customers, settings, currentUser, isAdmin, users, products } = useStore();
  const navigate = useNavigate();
  const { storeSlug: urlStoreSlug } = useParams({ strict: false });

  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  
  // State for toggling the Financial Card
  const [financeCardMode, setFinanceCardMode] = useState<'receivable' | 'payable'>('receivable');

  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showStoreOwnersModal, setShowStoreOwnersModal] = useState(false);
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [messageTarget, setMessageTarget] = useState<Customer | null>(null);

  // Default widget configuration
  const widgets = useMemo(() => {
    const defaultWidget = { enabled: true, range: 0 };
    const baseSettings = {
      sales: settings.dashboardWidgets?.sales || defaultWidget,
      receivables: settings.dashboardWidgets?.receivables || defaultWidget,
      payables: settings.dashboardWidgets?.payables || defaultWidget,
      alerts: settings.dashboardWidgets?.alerts || defaultWidget,
      birthdays: settings.dashboardWidgets?.birthdays || defaultWidget,
      lists: settings.dashboardWidgets?.lists ?? true
    };
    
    // Admin/DonoLoja sees all configured widgets
    if (isAdmin || currentUser?.role === 'DonoLoja') {
        return { ...baseSettings, vitrine: true };
    }
    
    // Otherwise filter by permissions
    const perms = currentUser?.permissions;
    return {
        sales: { ...baseSettings.sales, enabled: baseSettings.sales.enabled && !!perms?.dashboardVendas },
        receivables: { ...baseSettings.receivables, enabled: baseSettings.receivables.enabled && !!perms?.dashboardAReceber },
        payables: { ...baseSettings.payables, enabled: baseSettings.payables.enabled && !!perms?.dashboardAPagar },
        alerts: { ...baseSettings.alerts, enabled: baseSettings.alerts.enabled && !!perms?.dashboardAlertas },
        birthdays: { ...baseSettings.birthdays, enabled: baseSettings.birthdays.enabled && !!perms?.dashboardAniversariantes },
        lists: baseSettings.lists && !!perms?.dashboardProximosPagamentos,
        vitrine: !!perms?.dashboardVitrine
    };
  }, [settings.dashboardWidgets, isAdmin, currentUser]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);

    // --- SALES STATS ---
    const salesRangeDate = new Date(today);
    salesRangeDate.setDate(today.getDate() - widgets.sales.range);
    
    const filteredSales = sales.filter(s => {
        // Isolation: If employee, only show their sales
        if (!isAdmin && currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral') {
            if (s.employeeId !== currentUser?.id) return false;
        }
        
        const saleDate = new Date(s.date);
        saleDate.setHours(0,0,0,0);
        return saleDate.getTime() >= salesRangeDate.getTime() && saleDate.getTime() <= today.getTime();
    });
    const totalSales = filteredSales.reduce((acc, curr) => acc + curr.total, 0);

    // --- FINANCIAL STATS ---
    const getFinancialStats = (type: 'receivable' | 'payable', range: number) => {
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + range);

        const records = financialRecords.filter(r => {
             if (r.type !== type || r.status === 'paid') return false;
             const dueDate = new Date(r.dueDate);
             dueDate.setHours(0,0,0,0);
             return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= endDate.getTime();
        });
        
        return {
             total: records.reduce((acc, r) => acc + r.amount, 0),
             count: records.length,
             records
        };
    };

    const receivablesStats = getFinancialStats('receivable', widgets.receivables.range);
    const payablesStats = getFinancialStats('payable', widgets.payables.range);

    // --- ALERTS ---
    const alertEndDate = new Date(today);
    alertEndDate.setDate(today.getDate() + widgets.alerts.range);
    const alertRecords = financialRecords.filter(r => {
        if (r.status === 'paid') return false;
        const due = new Date(r.dueDate);
        due.setHours(0,0,0,0);
        return due.getTime() <= alertEndDate.getTime();
    });
    const alertCount = alertRecords.length;

    // --- BIRTHDAYS ---
    const birthdayCustomers = customers.filter(c => {
         if (!c.birthDate || c.id === 'def') return false;
         const [y, m, d] = c.birthDate.split('-').map(Number);
         const bMonth = m - 1; const bDay = d;
         const nextBday = new Date(today.getFullYear(), bMonth, bDay);
         if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
         const diffTime = nextBday.getTime() - today.getTime();
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         return diffDays <= widgets.birthdays.range;
    }).sort((a,b) => { /* sort logic */ return 0; });

    // --- LOW STOCK ---
    const threshold = settings.vitrineConfig?.lowStockThreshold || 5;
    const lowStockProducts = products.filter(p => {
        const hasVariations = (p.sizes?.length ?? 0) > 1 || (p.colors?.length ?? 0) > 1 || (p.numbers?.length ?? 0) > 1;
        if (hasVariations && p.variationStock) {
            return Object.values(p.variationStock).some(qty => qty <= threshold);
        }
        return (p.stock || 0) <= threshold;
    });
    return { totalSales, filteredSales, receivablesStats, payablesStats, alertCount, alertRecords, birthdayCustomers, lowStockProducts };
  }, [sales, financialRecords, customers, widgets, products, settings.vitrineConfig]);

  // Lists Logic (Show all unpaid for quick access)
  const urgentReceivables = useMemo(() => {
    return financialRecords
      .filter(r => r.type === 'receivable' && r.status !== 'paid')
      .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [financialRecords]);

  const urgentPayables = useMemo(() => {
    return financialRecords
      .filter(r => r.type === 'payable' && r.status !== 'paid')
      .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [financialRecords]);

  // Dynamic Card Props
  const financeCardProps = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const filteredRecords = financialRecords.filter(r => {
          if (r.status === 'paid') return false;
          if (financeCardMode === 'receivable' && (r.type === 'receivable' || r.type === 'personal_receivable' || r.type === 'company_receivable')) {
              const dueDate = new Date(r.dueDate);
              dueDate.setHours(0,0,0,0);
              return dueDate <= today;
          }
          if (financeCardMode === 'payable' && r.type === 'payable') {
              const dueDate = new Date(r.dueDate);
              dueDate.setHours(0,0,0,0);
              return dueDate <= today;
          }
          return false;
      });

      const totalValue = filteredRecords.reduce((acc, r) => acc + r.amount, 0);
      const count = filteredRecords.length;

      if (financeCardMode === 'receivable') {
          return {
              title: "A Receber",
              rangeText: "Vencidos/Hoje",
              value: `R$ ${totalValue.toFixed(2)}`,
              subtext: `${count} contas pendentes`,
              icon: ArrowDown,
              color: "bg-emerald-500",
              route: "/finance",
              toggleIcon: <ArrowDown className="text-emerald-500 transform -rotate-45" size={18} />
          };
      } else {
          return {
              title: "A Pagar",
              rangeText: "Vencidos/Hoje",
              value: `R$ ${totalValue.toFixed(2)}`,
              subtext: `${count} contas a pagar`,
              icon: ArrowUp,
              color: "bg-red-500",
              route: "/payables",
              toggleIcon: <ArrowUp className="text-red-500 transform rotate-45" size={18} />
          };
      }
  }, [financeCardMode, financialRecords]);

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <style>{`
        @keyframes rainbow { 
          0% { border-color: #f97316; background-color: #fff7ed; box-shadow: 0 0 10px rgba(249, 115, 22, 0.2); } 
          20% { border-color: #ef4444; background-color: #fef2f2; box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); } 
          40% { border-color: #eab308; background-color: #fefce8; box-shadow: 0 0 10px rgba(234, 179, 8, 0.2); } 
          60% { border-color: #3b82f6; background-color: #eff6ff; box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); } 
          80% { border-color: #22c55e; background-color: #f0fdf4; box-shadow: 0 0 10px rgba(34, 197, 94, 0.2); } 
          100% { border-color: #f97316; background-color: #fff7ed; box-shadow: 0 0 10px rgba(249, 115, 22, 0.2); } 
        }
        .rainbow-blink {
          animation: rainbow 1.5s infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Visão Geral</h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-700 text-sm font-bold bg-white px-2 py-1 rounded border border-slate-200">
                   Olá, {isAdmin ? 'Maicon Coutinho' : currentUser?.username}
                </p>
                <p className="text-slate-500 text-sm bg-white px-2 py-1 rounded border border-slate-200">
                   Hoje: {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        {widgets.sales.enabled && (
            <StatCard 
                title="Vendas" 
                rangeText={widgets.sales.range === 0 ? 'Hoje' : `${widgets.sales.range} dias`}
                value={`R$ ${stats.totalSales.toFixed(2)}`} 
                subtext={`${stats.filteredSales.length} vendas no período`}
                icon={ShoppingBag} 
                color="bg-blue-600"
                onClick={() => setShowSalesModal(true)}
                actionIcon={<div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronDown size={20} className="text-slate-400"/></div>}
            />
        )}
        
        {/* DYNAMIC FINANCIAL CARD (Toggleable) */}
        <StatCard 
            title={financeCardProps.title} 
            rangeText={financeCardProps.rangeText}
            value={financeCardProps.value} 
            subtext={financeCardProps.subtext}
            icon={financeCardProps.icon} 
            color={financeCardProps.color} 
            onClick={() => navigate(financeCardProps.route)}
            actionIcon={
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        setFinanceCardMode(prev => prev === 'receivable' ? 'payable' : 'receivable');
                    }}
                    className="absolute top-4 right-4 cursor-pointer hover:bg-slate-100 p-1.5 rounded-full transition-colors z-20 bg-white/80 shadow-sm border border-slate-100"
                    title="Alternar Visualização"
                >
                    {financeCardProps.toggleIcon}
                </div>
            }
        />

        {/* ALERTS CARD */}
        {widgets.alerts.enabled && (
            <StatCard 
                title="Alertas" 
                rangeText={widgets.alerts.range === 0 ? 'Hoje' : `${widgets.alerts.range} dias`}
                value={stats.alertCount > 0 ? "Atenção" : "Tudo em dia"} 
                subtext={stats.alertCount > 0 ? `${stats.alertCount} itens vencidos/próximos` : "Nenhuma pendência"}
                icon={AlertTriangle} 
                color={stats.alertCount > 0 ? "bg-amber-500" : "bg-green-500"}
                onClick={() => setShowAlertsModal(true)}
                actionIcon={<div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><AlertCircle size={20} className="text-slate-400"/></div>}
            />
        )}

        {/* LOW STOCK CARD */}
        <StatCard 
            title="Estoque Baixo"
            value={stats.lowStockProducts.length > 0 ? stats.lowStockProducts.length : "OK"}
            subtext={stats.lowStockProducts.length > 0 ? "Atenção necessária" : "Estoque saudável"}
            icon={Package}
            color="bg-orange-500"
            onClick={() => setShowLowStockModal(true)}
            className={stats.lowStockProducts.length > 0 ? "animate-pulse ring-2 ring-orange-500 shadow-orange-100" : ""}
        />

        {/* BIRTHDAYS CARD */}
        {widgets.birthdays.enabled && (
            <StatCard 
                title="Aniversariantes" 
                rangeText={widgets.birthdays.range === 0 ? 'Hoje' : `${widgets.birthdays.range} dias`}
                value={stats.birthdayCustomers.length > 0 ? stats.birthdayCustomers.length : "Nenhum"} 
                subtext={stats.birthdayCustomers.length > 0 ? "Ver lista completa" : "Ninguém festejando"}
                icon={Cake} 
                color="bg-purple-500"
                onClick={() => setShowBirthdaysModal(true)}
                actionIcon={<div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><Gift size={20} className="text-slate-400"/></div>}
            />
        )}
      </div>

      {/* Financial Lists Section - RESTORED SIDE BY SIDE */}
      {widgets.lists && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Receivables List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><ArrowDown size={18} className="text-emerald-500" /> Próximos Recebimentos</h3>
              </div>
              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-96 p-2">
                {urgentReceivables.map(r => {
                   const status = getUrgencyStatus(r.dueDate);
                   return (
                    <div key={r.id} onClick={() => setSelectedRecord(r)} className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex justify-between items-center group rounded-lg mb-1 border-b border-transparent ${status.style}`}>
                      <div>
                        <p className="font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{r.entityName}</p>
                        <p className="text-xs text-slate-400">{r.description}</p>
                        <p className={`text-[10px] font-bold uppercase mt-1 ${status.textColor}`}>{status.text}</p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-slate-800">R$ {r.amount.toFixed(2)}</span>
                      </div>
                    </div>
                   );
                })}
                {urgentReceivables.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 m-2 rounded-lg border border-dashed border-slate-200">
                    Nenhuma conta a receber próxima.
                  </div>
                )}
              </div>
            </div>

            {/* Payables List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><ArrowUp size={18} className="text-red-500" /> Contas a Pagar</h3>
              </div>
              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-96 p-2">
                {urgentPayables.map(r => {
                   const status = getUrgencyStatus(r.dueDate);
                   return (
                    <div key={r.id} onClick={() => setSelectedRecord(r)} className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex justify-between items-center group rounded-lg mb-1 border-b border-transparent ${status.style}`}>
                      <div>
                        <p className="font-bold text-slate-700 group-hover:text-red-600 transition-colors">{r.entityName}</p>
                        <p className="text-xs text-slate-400">{r.description}</p>
                        <p className={`text-[10px] font-bold uppercase mt-1 ${status.textColor}`}>{status.text}</p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-slate-800">R$ {r.amount.toFixed(2)}</span>
                      </div>
                    </div>
                   );
                })}
                {urgentPayables.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 m-2 rounded-lg border border-dashed border-slate-200">
                    Nenhuma conta a pagar pendente.
                  </div>
                )}
              </div>
            </div>
          </div>
      )}

      {/* MODALS */}
      {showStoreOwnersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-900">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><Store size={20} className="text-orange-500"/> Lojistas (Vitrines)</h3>
                <button onClick={() => setShowStoreOwnersModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
                {users.filter(u => u.role === 'DonoLoja').length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Nenhum lojista cadastrado.</div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {users.filter(u => u.role === 'DonoLoja').map(owner => (
                            <div key={owner.id} className="p-4 bg-white hover:bg-slate-50 flex justify-between items-center transition-colors">
                                <div>
                                    <h4 className="font-bold text-slate-800">{owner.name}</h4>
                                    <p className="text-xs text-slate-500">Login: {owner.username}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={async () => {
                                            const link = `${window.location.origin}/#/vitrine/${owner.id}`;
                                            try {
                                                await navigator.clipboard.writeText(link);
                                                alert('Link copiado!');
                                            } catch (err) {
                                                const textArea = document.createElement("textarea");
                                                textArea.value = link;
                                                document.body.appendChild(textArea);
                                                textArea.select();
                                                try {
                                                    document.execCommand('copy');
                                                    alert('Link copiado!');
                                                } catch (e) {
                                                    alert('Link: ' + link);
                                                }
                                                document.body.removeChild(textArea);
                                            }
                                        }}
                                        className="p-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 rounded"
                                        title="Copiar Link"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <a 
                                        href={`${window.location.origin}/#/vitrine/${owner.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded font-medium text-sm flex items-center gap-2"
                                    >
                                        Acessar <ExternalLink size={14}/>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
                <button onClick={() => setShowStoreOwnersModal(false)} className="w-full font-bold py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showSalesModal && (() => {
        const salesByMethod = {
            dinheiro: stats.filteredSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Dinheiro').reduce((a, p) => a + p.amount, 0)), 0),
            pix: stats.filteredSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Pix').reduce((a, p) => a + p.amount, 0)), 0),
            credito: stats.filteredSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Cartão de Crédito').reduce((a, p) => a + p.amount, 0)), 0),
            debito: stats.filteredSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Cartão de Débito').reduce((a, p) => a + p.amount, 0)), 0),
            prazo: stats.filteredSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'A Prazo').reduce((a, p) => a + p.amount, 0)), 0),
        };
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-blue-50 shrink-0">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ShoppingBag size={20} className="text-blue-600"/> Vendas Recentes</h3>
                <button onClick={() => setShowSalesModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-4 bg-white border-b border-slate-100 shrink-0">
                <h4 className="font-bold text-slate-700 text-sm uppercase mb-2">Resumo de Vendas: {stats.filteredSales.length} Total</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Dinheiro</p>
                        <p className="text-sm font-bold text-slate-700">R$ {salesByMethod.dinheiro.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Pix</p>
                        <p className="text-sm font-bold text-slate-700">R$ {salesByMethod.pix.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Débito</p>
                        <p className="text-sm font-bold text-slate-700">R$ {salesByMethod.debito.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Crédito</p>
                        <p className="text-sm font-bold text-slate-700">R$ {salesByMethod.credito.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">A Prazo</p>
                        <p className="text-sm font-bold text-slate-700">R$ {salesByMethod.prazo.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="p-2 overflow-y-auto bg-slate-50 flex-1 space-y-2">
                {stats.filteredSales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(sale => {
                    const op = users.find(u => u.id === sale.employeeId || u.id === sale.ownerId);
                    return (
                    <div key={sale.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                            <p className="font-bold text-slate-700 text-sm">Venda #{sale.id}</p>
                            <p className="text-xs text-slate-400">{new Date(sale.date).toLocaleString('pt-BR')} - <span className="text-slate-600 font-semibold">{op?.name || 'Operador'}</span></p>
                            <p className="text-[11px] text-slate-500 mt-1">Formas: {sale.payments.map(p => p.method).join(', ')}</p>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-green-600">R$ {sale.total.toFixed(2)}</span>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">{sale.items.length} itens</span>
                        </div>
                    </div>
                )})}
                {stats.filteredSales.length === 0 && <p className="text-center text-slate-400 p-8">Nenhuma venda no período.</p>}
            </div>
          </div>
        </div>
      );})()}

      {showAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-600"/> Alertas de Vencimento</h3>
                <button onClick={() => setShowAlertsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-2 overflow-y-auto bg-slate-50 flex-1 space-y-2">
                {stats.alertRecords.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(r => {
                    const status = getUrgencyStatus(r.dueDate);
                    return (
                        <div key={r.id} onClick={() => setSelectedRecord(r)} className={`bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 ${status.style}`}>
                            <div>
                                <p className="font-bold text-slate-700 text-sm">{r.description}</p>
                                <p className="text-xs text-slate-500">{r.entityName}</p>
                                <p className={`text-[10px] font-bold uppercase mt-1 ${status.textColor}`}>{status.text}</p>
                            </div>
                            <div className="text-right">
                                <span className={`block font-bold ${r.type === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>R$ {r.amount.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{r.type === 'receivable' ? 'Receber' : 'Pagar'}</span>
                            </div>
                        </div>
                    );
                })}
                {stats.alertRecords.length === 0 && <p className="text-center text-slate-400 p-8">Tudo em dia!</p>}
            </div>
          </div>
        </div>
      )}

      <LowStockModal isOpen={showLowStockModal} onClose={() => setShowLowStockModal(false)} products={stats.lowStockProducts} />

      {showBirthdaysModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-purple-50">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Cake size={20} className="text-purple-600"/> Aniversariantes</h3>
                      <button onClick={() => setShowBirthdaysModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-2 overflow-y-auto bg-slate-50 flex-1 space-y-2">
                      {stats.birthdayCustomers.length === 0 ? (
                          <div className="text-center text-slate-400 p-8">Nenhum aniversariante próximo.</div>
                      ) : (
                          stats.birthdayCustomers.map(c => {
                              const [y, m, d] = c.birthDate!.split('-').map(Number);
                              const today = new Date(); today.setHours(0,0,0,0);
                              const bday = new Date(today.getFullYear(), m - 1, d);
                              if (bday < today) bday.setFullYear(today.getFullYear() + 1);
                              const isToday = bday.getTime() === today.getTime();

                              return (
                                  <div key={c.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                                      <div>
                                          <p className="font-bold text-slate-800">{c.name}</p>
                                          <p className="text-xs text-slate-500 flex items-center gap-1">
                                              <Gift size={12} className="text-purple-500"/> 
                                              {d}/{m} {isToday && <span className="font-bold text-purple-600 animate-pulse ml-1">- Hoje!</span>}
                                          </p>
                                      </div>
                                      {isToday && c.phone && (
                                          <button 
                                              onClick={() => setMessageTarget(c)}
                                              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-sm transition-colors"
                                              title="Enviar Mensagem"
                                          >
                                              <MessageCircle size={18} />
                                          </button>
                                      )}
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
          </div>
      )}

      {selectedRecord && (
        <PaymentModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {messageTarget && (
          <MessageSelectorModal 
              customer={messageTarget} 
              onClose={() => setMessageTarget(null)} 
          />
      )}
    </div>
  );
};
