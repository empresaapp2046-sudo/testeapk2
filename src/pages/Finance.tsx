// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { FinancialRecord, Sale, PaymentMethod, Customer } from '../types';
import { 
  ArrowUpCircle, ArrowDownCircle, Check, Clock, MessageCircle, X, 
  History, QrCode, Copy, Download, Filter, Search, Calendar, ShoppingBag, 
  DollarSign, FileText, ChevronRight, ChevronDown, ChevronUp, Wallet, Receipt, 
  Layers, Pencil, Printer, Eye, Zap, User, Info, Book, Package, CheckCircle, 
  AlertCircle, AlertTriangle, CreditCard 
} from 'lucide-react';
import { PaymentModal, PaymentMethodBadgeView, getPaymentMethodInfo } from '../components/PaymentModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { CustomerInfoModal } from '../components/CustomerInfoModal';
import { CarnePrinter } from '../components/CarnePrinter';
import { PlanGate } from '../components/PlanGate';

type ViewMode = 'overview' | 'revenues' | 'plans' | 'expenses';
type FilterType = 'all' | 'client' | 'product' | 'date_single' | 'date_range';

interface UnifiedRevenueItem {
  id: string;
  type: 'sale' | 'receivable' | 'venda sem cadastro';
  date: string;
  customerName: string;
  description: string;
  total: number;
  remaining: number; 
  status: 'paid' | 'pending' | 'partial';
  originalObject: Sale | FinancialRecord;
  saleId?: string; 
  isPlan: boolean; 
  planExpirationDate?: string; 
}

const getUrgencyStatus = (dueDateStr: string) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const dueDate = new Date(dueDateStr); dueDate.setHours(0,0,0,0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { style: "bg-red-50 border-l-4 border-l-red-500 border-red-200 animate-pulse", text: "Vencido", textColor: "text-red-600" };
  if (diffDays === 0) return { style: "rainbow-blink border-2", text: "Vence hoje", textColor: "text-red-600 font-bold" };
  if (diffDays === 1) return { style: "bg-orange-50 border-l-4 border-l-orange-500 border-orange-200", text: "Amanhã", textColor: "text-orange-600" };
  if (diffDays <= 3) return { style: "bg-yellow-50 border-l-4 border-l-yellow-400 border-yellow-200", text: `${diffDays} dias`, textColor: "text-yellow-700" };
  return { style: "hover:bg-slate-50 border-b border-slate-100", text: `em ${diffDays} dias`, textColor: "text-slate-500" };
};

const getPlanStatus = (expirationDateStr: string) => {
  if (!expirationDateStr) return { text: "Sem Validade", color: "text-slate-400 bg-slate-100 border-slate-200" };
  const today = new Date(); today.setHours(0,0,0,0);
  const dueDate = new Date(expirationDateStr); dueDate.setHours(0,0,0,0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: "Plano Vencido", color: "text-slate-500 bg-slate-100 border-slate-200" }; 
  if (diffDays === 0) return { text: "Vence Hoje", color: "text-red-600 bg-red-50 border-red-200 font-bold" };
  if (diffDays === 1) return { text: "Amanhã", color: "text-orange-600 bg-orange-100 border-orange-200" };
  return { text: `Faltam ${diffDays} dias`, color: "text-blue-600 bg-blue-50 border-blue-100" };
};

export const Finance = () => {
  const { financialRecords, customers, sales, products, updateFinancialRecord, settings, currentUser } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>(currentUser?.permissions?.financeiroOverview === false ? 'revenues' : 'overview');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'product' | 'date_single' | 'date_range' | 'debt_type' | 'unregistered'>('all');
  const [debtTypeFilter, setDebtTypeFilter] = useState<'all' | 'personal' | 'company'>('all');
  const [searchText, setSearchText] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  
  // State for editing date in-line
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [tempDateValue, setTempDateValue] = useState<string>('');

  // State for detailed history of a group / sale
  const [viewHistoryGroup, setViewHistoryGroup] = useState<{ description: string; entityName: string; records: FinancialRecord[]; saleId?: string } | null>(null);
  
  // State for Plan Details modal
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<UnifiedRevenueItem | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // State to handle Print from history
  const [receiptToPrint, setReceiptToPrint] = useState<{ sale: Sale; customer?: Customer } | null>(null);
  const [carneToPrint, setCarneToPrint] = useState<{ sale: Sale; records: FinancialRecord[]; customer?: Customer } | null>(null);

  // Customer Info Modal State
  const [infoCustomer, setInfoCustomer] = useState<Customer | null>(null);

  // State for expanded groups in Overview
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [expandedPayables, setExpandedPayables] = useState<Set<string>>(new Set());

  const toggleSaleExpansion = (saleId: string) => { 
    const newSet = new Set(expandedSales); 
    if (newSet.has(saleId)) newSet.delete(saleId); 
    else newSet.add(saleId); 
    setExpandedSales(newSet); 
  };

  const togglePayableExpansion = (groupId: string) => { 
    const newSet = new Set(expandedPayables); 
    if (newSet.has(groupId)) newSet.delete(groupId); 
    else newSet.add(groupId); 
    setExpandedPayables(newSet); 
  };

  const openRecord = (r: FinancialRecord) => { 
    if (editingDateId) return; 
    if (r.type === 'company_receivable') return;
    setSelectedRecord(r); 
  };

  const handleRevenueClick = (item: UnifiedRevenueItem) => { 
    if (editingDateId) return; 
    
    if (item.originalObject && (item.originalObject as FinancialRecord).type === 'company_receivable') return;
    if (viewMode === 'plans' && item.isPlan) { setSelectedPlanDetails(item); return; } 
    
    if (item.saleId) {
      const shortId = item.saleId.slice(-6);
      const relatedRecords = financialRecords.filter(r => 
        r.documentNumber === item.saleId || 
        r.documentNumber === shortId || 
        (r.description && (r.description.includes(`Venda #${item.saleId}`) || r.description.includes(`Venda #${shortId}`)))
      );
      setViewHistoryGroup({
        description: item.description,
        entityName: item.customerName,
        records: relatedRecords,
        saleId: item.saleId
      });
      return;
    }
    openRecord(item.originalObject as FinancialRecord); 
  };

  const handleStartEditDate = (e: React.MouseEvent, id: string, currentDate: string) => { 
    e.stopPropagation(); 
    setEditingDateId(id); 
    setTempDateValue(currentDate.split('T')[0]); 
  };

  const handleSaveDate = (e: React.MouseEvent, id: string) => { 
    e.stopPropagation(); 
    if (tempDateValue) { 
      const [y, m, d] = tempDateValue.split('-').map(Number); 
      const newDate = new Date(y, m - 1, d, 12, 0, 0, 0); 
      updateFinancialRecord(id, { dueDate: newDate.toISOString() }); 
    } 
    setEditingDateId(null); 
  };

  const handleCancelEditDate = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setEditingDateId(null); 
  };

  const checkIsPlan = useCallback((saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    return sale?.items.some(i => i.category === 'Planos') || false;
  }, [sales]);

  const DateEditor = ({ id, currentDate, alwaysVisible = false }: { id: string, currentDate: string, alwaysVisible?: boolean }) => { 
    if (editingDateId === id) { 
      return ( 
        <div className="flex items-center gap-1 z-10 relative"> 
          <input 
            type="date" 
            value={tempDateValue} 
            onChange={(e) => setTempDateValue(e.target.value)} 
            onClick={(e) => e.stopPropagation()} 
            className="p-1 border rounded bg-white text-xs w-32 shadow-lg" 
          /> 
          <button onClick={(e) => handleSaveDate(e, id)} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
            <Check size={14} />
          </button> 
          <button onClick={handleCancelEditDate} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
            <X size={14} />
          </button> 
        </div> 
      ); 
    } 
    return ( 
      <div className="flex items-center gap-2 group/date"> 
        <span>{new Date(currentDate).toLocaleDateString('pt-BR')}</span> 
        <button 
          onClick={(e) => handleStartEditDate(e, id, currentDate)} 
          className={`p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-blue-500 transition-opacity ${alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover/date:opacity-100'}`} 
          title="Editar data de vencimento"
        > 
          <Pencil size={12} /> 
        </button> 
      </div> 
    ); 
  };

  // --- GROUPING LOGIC FOR OVERVIEW (RECEIVABLES) ---
  const groupedReceivables = useMemo(() => {
    const allReceivables = financialRecords.filter(r => r.type === 'receivable' || r.type === 'company_receivable' || r.type === 'personal_receivable');
    const groups: Record<string, { saleId: string; customerName: string; totalDebt: number; records: FinancialRecord[]; earliestDate: string; hasPending: boolean; isPlan: boolean; }> = {};
    const looseRecords: FinancialRecord[] = [];

    allReceivables.forEach(record => {
      if (debtTypeFilter === 'personal' && record.type !== 'personal_receivable') return;
      if (debtTypeFilter === 'company' && record.type !== 'company_receivable') return;

      const match = record.description.match(/Venda #(\d+)/);
      if (match) {
        const saleId = match[1];
        if (!groups[saleId]) {
          groups[saleId] = { 
            saleId, 
            customerName: record.entityName === 'Cliente Balcão' ? 'Venda Balcão' : record.entityName, 
            totalDebt: 0, 
            records: [], 
            earliestDate: record.dueDate, 
            hasPending: false, 
            isPlan: checkIsPlan(saleId) 
          };
        }
        groups[saleId].records.push(record);
        if (record.status !== 'paid') {
          groups[saleId].totalDebt += record.amount;
          groups[saleId].hasPending = true;
          if (new Date(record.dueDate) < new Date(groups[saleId].earliestDate)) groups[saleId].earliestDate = record.dueDate;
        }
      } else {
        if (record.status !== 'paid' && record.amount > 0.01) looseRecords.push(record);
      }
    });

    const activeGroups = Object.values(groups).filter(g => g.hasPending);
    const sortedGroups = activeGroups.sort((a,b) => new Date(b.earliestDate).getTime() - new Date(a.earliestDate).getTime());
    const sortedLoose = looseRecords.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return { groups: sortedGroups, loose: sortedLoose };
  }, [financialRecords, checkIsPlan, debtTypeFilter]);

  const groupedPayables = useMemo(() => {
    const allPayables = financialRecords.filter(r => r.type === 'payable');
    const groups: Record<string, { groupId: string; entityName: string; baseDescription: string; totalDebt: number; records: FinancialRecord[]; earliestDate: string; hasPending: boolean; }> = {};
    const looseRecords: FinancialRecord[] = [];

    allPayables.forEach(record => {
      let groupId = '';
      let baseDesc = '';
      if (record.documentNumber) {
        groupId = record.documentNumber;
        baseDesc = record.description.replace(/\s\(\d+\/\d+\)$/, '');
      } else {
        const match = record.description.match(/(.*)\s\(\d+\/\d+\)$/);
        if (match) {
          baseDesc = match[1];
          groupId = `${record.entityName}::${baseDesc}`;
        }
      }
      
      if (groupId) {
        if (!groups[groupId]) groups[groupId] = { groupId, entityName: record.entityName, baseDescription: baseDesc, totalDebt: 0, records: [], earliestDate: record.dueDate, hasPending: false };
        groups[groupId].records.push(record);
        if (record.status !== 'paid') {
          groups[groupId].totalDebt += record.amount;
          groups[groupId].hasPending = true;
          if (new Date(record.dueDate) < new Date(groups[groupId].earliestDate)) groups[groupId].earliestDate = record.dueDate;
        }
      } else {
        if (record.status !== 'paid') looseRecords.push(record);
      }
    });

    const activeGroups = Object.values(groups).filter(g => g.hasPending);
    const sortedGroups = activeGroups.sort((a,b) => new Date(a.earliestDate).getTime() - new Date(b.earliestDate).getTime());
    const sortedLoose = looseRecords.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return { groups: sortedGroups, loose: sortedLoose };
  }, [financialRecords]);

  const unifiedRevenues = useMemo(() => {
    const items: UnifiedRevenueItem[] = [];

    sales.forEach(sale => {
      const isPlan = sale.items.some(i => i.category === 'Planos');
      const isUnregistered = !!sale.unregisteredCustomer;
      const displayCustomer = isUnregistered ? sale.unregisteredCustomer!.name : (sale.customerId ? (customers.find(c => c.id === sale.customerId)?.name || 'Cliente') : 'Cliente Balcão');
      const displayType: 'sale' | 'receivable' | 'venda sem cadastro' = isUnregistered ? 'venda sem cadastro' : 'sale';

      const shortId = sale.id.slice(-6);
      const relatedRecords = financialRecords.filter(r => 
        r.documentNumber === sale.id || 
        r.documentNumber === shortId || 
        (r.description && (r.description.includes(`Venda #${sale.id}`) || r.description.includes(`Venda #${shortId}`)))
      );
      const remaining = relatedRecords.reduce((acc, r) => acc + r.amount, 0);
      const totalOriginal = relatedRecords.reduce((acc, r) => acc + r.originalAmount, 0) || sale.total;
      
      const status = remaining <= 0.01 ? 'paid' : (remaining < totalOriginal ? 'partial' : 'pending');

      items.push({
        id: sale.id,
        type: displayType,
        date: sale.date,
        customerName: displayCustomer,
        description: `Venda #${sale.id.slice(-6)}`,
        total: sale.total,
        remaining: remaining,
        status: status,
        originalObject: sale,
        saleId: sale.id,
        isPlan: isPlan,
        planExpirationDate: sale.planExpirationDate
      });
    });

    const looseReceivables = financialRecords.filter(r => 
      (r.type === 'receivable' || r.type === 'personal_receivable' || r.type === 'company_receivable') 
       && (!r.documentNumber && !(r.description && r.description.match(/Venda #/)))
    );

    looseReceivables.forEach(r => {
      const displayCustomer = r.entityName === 'Cliente Balcão' ? 'Venda Balcão' : r.entityName;
      items.push({
        id: r.id,
        type: 'receivable',
        date: r.dueDate,
        customerName: displayCustomer,
        description: r.description,
        total: r.originalAmount,
        remaining: r.amount,
        status: r.status,
        originalObject: r,
        saleId: undefined,
        isPlan: false,
        planExpirationDate: undefined
      });
    });

    return items.filter(item => {
      const itemDate = item.date.split('T')[0];
      if (filterType === 'unregistered' && item.type !== 'venda sem cadastro') return false;
      if (filterType === 'date_single' && dateStart && itemDate !== dateStart) return false;
      if (filterType === 'date_range' && dateStart && dateEnd && (itemDate < dateStart || itemDate > dateEnd)) return false;
      if (searchText) { 
        const lower = searchText.toLowerCase(); 
        if (filterType === 'client' && !item.customerName.toLowerCase().includes(lower)) return false; 
        if (filterType === 'product') return item.description.toLowerCase().includes(lower); 
        if (filterType === 'all' && !item.customerName.toLowerCase().includes(lower) && !item.description.toLowerCase().includes(lower)) return false; 
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [financialRecords, filterType, searchText, dateStart, dateEnd, sales, customers]);

  const filteredExpenses = useMemo(() => {
    return financialRecords.filter(record => {
      if (record.type !== 'payable') return false;
      const recordDate = record.dueDate.split('T')[0];
      if (filterType === 'date_single' && dateStart && recordDate !== dateStart) return false;
      if (filterType === 'date_range' && dateStart && dateEnd && (recordDate < dateStart || recordDate > dateEnd)) return false;
      if (searchText) { 
        const lower = searchText.toLowerCase(); 
        if (!record.entityName.toLowerCase().includes(lower) && !record.description.toLowerCase().includes(lower)) return false; 
      }
      return true;
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()); 
  }, [financialRecords, filterType, searchText, dateStart, dateEnd]);

  const currentList = useMemo(() => {
    if (viewMode === 'revenues') return unifiedRevenues;
    if (viewMode === 'plans') return unifiedRevenues.filter(i => i.isPlan);
    return [];
  }, [viewMode, unifiedRevenues]);

  const clientPlanHistory = useMemo(() => {
    if (!selectedPlanDetails) return [];
    return unifiedRevenues.filter(item => item.isPlan && item.customerName === selectedPlanDetails.customerName && item.id !== selectedPlanDetails.id)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPlanDetails, unifiedRevenues]);

  return (
    <PlanGate>
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* HEADER AND TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Financeiro</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Controle de receitas, despesas, contas e formas de pagamento</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {viewMode === 'overview' && (
            <select 
              className="border border-slate-300 rounded-xl p-2 text-xs md:text-sm bg-white shadow-xs font-semibold text-slate-700 outline-none" 
              value={debtTypeFilter} 
              onChange={(e) => setDebtTypeFilter(e.target.value as any)}
            >
              <option value="all">Todas as Dívidas</option>
              <option value="personal">Dívidas Pessoais</option>
              <option value="company">Dívidas da Empresa</option>
            </select>
          )}
          <div className="flex bg-white p-1 rounded-xl shadow-xs border border-slate-200 w-full md:w-auto overflow-x-auto">
            {(!currentUser?.permissions || currentUser.permissions.financeiroOverview !== false) && (
              <button 
                onClick={() => setViewMode('overview')} 
                className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${viewMode === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Visão Geral
              </button>
            )}
            {(!currentUser?.permissions || currentUser.permissions.financeiroRevenues !== false) && (
              <button 
                onClick={() => setViewMode('revenues')} 
                className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${viewMode === 'revenues' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <ArrowDownCircle size={15} /> Receitas
              </button>
            )}
            {(!currentUser?.permissions || currentUser.permissions.financeiroPlans !== false) && (
              <button 
                onClick={() => setViewMode('plans')} 
                className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${viewMode === 'plans' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Zap size={15} /> Planos
              </button>
            )}
            {(!currentUser?.permissions || currentUser.permissions.financeiroExpenses !== false) && (
              <button 
                onClick={() => setViewMode('expenses')} 
                className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${viewMode === 'expenses' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <ArrowUpCircle size={15} /> Despesas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* OVERVIEW MODE */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 animate-fade-in">
          {/* RECEIVABLES */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 h-fit overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-emerald-50/80">
              <ArrowDownCircle className="text-emerald-600" />
              <h3 className="font-extrabold text-emerald-950 text-base">Contas a Receber (Agrupadas por Venda)</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto p-2">
              {groupedReceivables.groups.map(group => {
                const isExpanded = expandedSales.has(group.saleId);
                const status = getUrgencyStatus(group.earliestDate); 
                return (
                  <div key={group.saleId} className="mb-2 bg-white rounded-xl border border-slate-100 shadow-2xs overflow-hidden">
                    <div 
                      onClick={() => {
                        if (!isExpanded) {
                          toggleSaleExpansion(group.saleId);
                        } else {
                          // When expanded, clicking the header (excluding eye button) expands to show debt details like financial records modal
                          setViewHistoryGroup({ 
                            description: `Venda #${group.saleId.slice(-6)}`, 
                            entityName: group.customerName, 
                            records: group.records, 
                            saleId: group.saleId 
                          }); 
                        }
                      }} 
                      className={`p-4 cursor-pointer flex justify-between items-center transition-all ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-emerald-100 p-2 rounded-full text-emerald-700 mt-1">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                            {group.customerName}
                            {group.isPlan && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                                <Zap size={10} fill="currentColor" /> PLANO
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Layers size={12} /> Venda #{group.saleId.slice(-6)} • {group.records.filter(r => r.status !== 'paid').length} parcela(s) pendente(s)
                          </div>
                          {group.hasPending ? (
                            <div className={`text-[11px] font-bold uppercase mt-1 ${status.textColor}`}>
                              {status.text}
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold uppercase mt-1 text-emerald-600 flex items-center gap-1">
                              <Check size={12} /> Venda Concluída
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 mb-0.5">Total Pendente</div>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setViewHistoryGroup({ 
                                description: `Venda #${group.saleId.slice(-6)}`, 
                                entityName: group.customerName, 
                                records: group.records, 
                                saleId: group.saleId 
                              }); 
                            }} 
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" 
                            title="Ver detalhes da venda e formas de pagamento"
                          >
                            <Eye size={18} />
                          </button>
                          <div className={`text-base font-extrabold ${group.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            R$ {group.totalDebt.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200 divide-y divide-slate-100">
                        {group.records.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(r => { 
                          const isPaid = r.status === 'paid'; 
                          const status = getUrgencyStatus(r.dueDate);
                          
                          return (
                            <div 
                              key={r.id} 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                // Open expansion of debt details for the group instead of single payment modal
                                setViewHistoryGroup({ 
                                  description: `Venda #${group.saleId.slice(-6)}`, 
                                  entityName: group.customerName, 
                                  records: group.records, 
                                  saleId: group.saleId 
                                });
                              }} 
                              className={`p-3 pl-12 flex justify-between items-center transition-colors cursor-pointer ${isPaid ? 'opacity-70 bg-emerald-50/50 hover:bg-emerald-100/50' : 'hover:bg-slate-100'}`}
                            >
                              <div>
                                <div className="font-semibold text-slate-700 text-xs sm:text-sm">
                                  {r.description.replace(`Venda #${group.saleId}`, '').replace('()', '').trim() || 'Parcela'}
                                </div>
                                <div className={`text-[10px] font-bold flex items-center gap-1.5 mt-0.5 ${status.textColor}`}>
                                  {isPaid ? (
                                    <span className="flex items-center gap-1 text-emerald-600 font-bold"><Check size={10} /> PAGO</span>
                                  ) : (
                                    <>
                                      <Clock size={10} /> Venc: {new Date(r.dueDate).toLocaleDateString('pt-BR')} • {status.text}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <span className={`font-bold text-xs sm:text-sm ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  R$ {r.amount.toFixed(2)}
                                </span>
                                <ChevronRight size={14} className="text-slate-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {groupedReceivables.groups.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Nenhuma conta a receber pendente.
                </div>
              )}
            </div>
          </div>

          {/* PAYABLES */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 h-fit overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-rose-50/80">
              <ArrowUpCircle className="text-rose-600" />
              <h3 className="font-extrabold text-rose-950 text-base">Contas a Pagar (Despesas)</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto p-2">
              {groupedPayables.groups.map(group => {
                const isExpanded = expandedPayables.has(group.groupId);
                const status = getUrgencyStatus(group.earliestDate);
                return (
                  <div key={group.groupId} className="mb-2 bg-white rounded-xl border border-slate-100 shadow-2xs overflow-hidden">
                    <div onClick={() => togglePayableExpansion(group.groupId)} className={`p-4 cursor-pointer flex justify-between items-center transition-all ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-start gap-3">
                        <div className="bg-rose-100 p-2 rounded-full text-rose-700 mt-1">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-base">{group.entityName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{group.baseDescription}</div>
                          {group.hasPending && (
                            <div className={`text-[11px] font-bold uppercase mt-1 ${status.textColor}`}>
                              {status.text}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 mb-0.5">Total a Pagar</div>
                        <div className="text-base font-extrabold text-rose-600">
                          R$ {group.totalDebt.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {groupedPayables.groups.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Nenhuma conta a pagar pendente.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVENUES & PLANS TABLE LIST */}
      {(viewMode === 'revenues' || viewMode === 'plans' || viewMode === 'expenses') && (
        <div className="space-y-4 animate-fade-in">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, descrição ou produto..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="all">Todos os Filtros</option>
                <option value="client">Por Cliente</option>
                <option value="product">Por Produto</option>
                <option value="date_single">Data Específica</option>
                <option value="date_range">Período de Datas</option>
                <option value="unregistered">Venda Sem Cadastro</option>
              </select>
            </div>

            {(filterType === 'date_single' || filterType === 'date_range') && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={dateStart} 
                  onChange={(e) => setDateStart(e.target.value)} 
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                />
                {filterType === 'date_range' && (
                  <>
                    <span className="text-xs text-slate-400">até</span>
                    <input 
                      type="date" 
                      value={dateEnd} 
                      onChange={(e) => setDateEnd(e.target.value)} 
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* TABLE OF REVENUES / PLANS */}
          {(viewMode === 'revenues' || viewMode === 'plans') && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">{viewMode === 'plans' ? 'Vencimento do Plano' : 'Data'}</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Descrição & Formas</th>
                      <th className="p-4">{viewMode === 'plans' ? 'Valor a Pagar' : 'Valor Total'}</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {currentList.map(item => {
                      const planStatus = viewMode === 'plans' ? getPlanStatus(item.planExpirationDate || item.date) : null;
                      const isPlanPaid = viewMode === 'plans' && (item.status === 'paid' || item.remaining <= 0.01);
                      
                      // Extract payment methods from sale if available
                      const saleObj = item.type === 'sale' && 'payments' in item.originalObject ? (item.originalObject as Sale) : null;
                      const paymentMethods = saleObj?.payments || [];

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleRevenueClick(item)} 
                          className="hover:bg-blue-50/60 cursor-pointer transition-colors group"
                        >
                          <td className="p-4 text-slate-600 font-medium">
                            {viewMode === 'plans' ? (
                              <span className="font-bold text-slate-700">
                                {item.planExpirationDate ? new Date(item.planExpirationDate).toLocaleDateString('pt-BR') : new Date(item.date).toLocaleDateString('pt-BR')}
                              </span>
                            ) : item.type === 'receivable' ? (
                              <DateEditor id={item.id} currentDate={item.date} alwaysVisible={false} />
                            ) : (
                              <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {item.type === 'sale' ? (
                              item.isPlan ? (
                                <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-bold">
                                  <Zap size={12}/> Plano
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-xs font-bold">
                                  <ShoppingBag size={12}/> Venda
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-xs font-bold">
                                <Wallet size={12}/> Conta
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${item.type === 'sale' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>
                                {item.customerName.charAt(0)}
                              </div>
                              {item.customerName}
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 max-w-xs">
                            <div className="font-semibold text-slate-800">{item.description}</div>
                            {/* Visual Payment Methods badges in the list */}
                            {paymentMethods.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {paymentMethods.map((p, pIdx) => (
                                  <PaymentMethodBadgeView key={pIdx} method={p.method} amount={p.amount} />
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-extrabold text-emerald-600">
                            {viewMode === 'plans' ? (
                              isPlanPaid ? (
                                <span className="text-xs px-2 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200 font-bold uppercase">PAGO</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span>R$ {item.remaining.toFixed(2)}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200 font-bold uppercase">Devendo</span>
                                </div>
                              )
                            ) : (
                              <div className="flex flex-col">
                                <span>R$ {item.total.toFixed(2)}</span>
                                {item.remaining > 0.01 && item.remaining < item.total && (
                                  <span className="text-[11px] text-rose-600 font-bold">Falta: R$ {item.remaining.toFixed(2)}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {viewMode === 'plans' ? (
                              planStatus && <span className={`text-xs px-2 py-1 rounded-full border ${planStatus.color}`}>{planStatus.text}</span>
                            ) : item.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle size={12} /> Recebido
                              </span>
                            ) : item.status === 'partial' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                <AlertCircle size={12} /> Parcial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Clock size={12} /> Pendente
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right text-slate-400 group-hover:text-blue-600">
                            <ChevronRight size={18} className="inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                    {currentList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABLE OF EXPENSES */}
          {viewMode === 'expenses' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">Vencimento</th>
                      <th className="p-4">Registro</th>
                      <th className="p-4">Fornecedor</th>
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {filteredExpenses.map(record => (
                      <tr 
                        key={record.id} 
                        onClick={() => openRecord(record)} 
                        className="hover:bg-rose-50/60 cursor-pointer transition-colors group"
                      >
                        <td className="p-4 text-slate-600 font-medium">
                          <DateEditor id={record.id} currentDate={record.dueDate} />
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-xs">
                          {record.documentNumber ? `#${record.documentNumber}` : '-'}
                        </td>
                        <td className="p-4 font-bold text-slate-800">{record.entityName}</td>
                        <td className="p-4 text-slate-600">{record.description}</td>
                        <td className="p-4 font-extrabold text-rose-600">R$ {record.amount.toFixed(2)}</td>
                        <td className="p-4">
                          {record.status === 'paid' ? (
                            <span className="text-emerald-700 text-xs border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Pago</span>
                          ) : record.status === 'pending' ? (
                            <span className="text-amber-700 text-xs border border-amber-200 bg-amber-50 px-2 py-0.5 rounded-full font-bold">Pendente</span>
                          ) : (
                            <span className="text-blue-700 text-xs border border-blue-200 bg-blue-50 px-2 py-0.5 rounded-full font-bold">Parcial</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-slate-400 group-hover:text-rose-600">
                          <ChevronRight size={18} className="inline-block" />
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma despesa encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PLAN DETAILS MODAL */}
      {selectedPlanDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-blue-50/80 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-lg md:text-xl text-blue-950 flex items-center gap-2">
                  <Zap size={20} className="text-blue-600"/> Detalhes do Plano
                </h3>
                <p className="text-xs text-blue-700 mt-0.5">{selectedPlanDetails.description}</p>
              </div>
              <button 
                onClick={() => setSelectedPlanDetails(null)} 
                className="p-2 bg-white/70 hover:bg-white rounded-full text-blue-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-base">
                    {selectedPlanDetails.customerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Cliente</p>
                    <p className="font-bold text-slate-800 text-base">{selectedPlanDetails.customerName}</p>
                  </div>
                  <button 
                    onClick={() => { 
                      const c = customers.find(cust => cust.name === selectedPlanDetails.customerName); 
                      if (c) setInfoCustomer(c); 
                    }} 
                    className="ml-auto flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors border border-blue-200" 
                    title="Informações do Cliente"
                  >
                    <Info size={15} /> <span>Informações</span>
                  </button>
                </div>
                {(() => { 
                  const originSale = sales.find(s => s.id === selectedPlanDetails.saleId); 
                  const acquisitionDate = originSale ? originSale.date : selectedPlanDetails.date; 
                  const rec = selectedPlanDetails.originalObject as FinancialRecord; 
                  const displayValue = rec.status === 'paid' ? rec.originalAmount : rec.amount; 
                  const planExpiry = selectedPlanDetails.planExpirationDate || selectedPlanDetails.date; 
                  return (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 mb-1 font-bold uppercase">Data de Aquisição</p>
                        <p className="font-bold text-slate-800 flex items-center gap-1 text-sm">
                          <Calendar size={14} className="text-slate-500"/> {new Date(acquisitionDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-1 font-bold uppercase">Vencimento do Plano</p>
                        <p className="font-bold text-slate-800 flex items-center gap-1 text-sm">
                          <Clock size={14} className="text-amber-500"/>{new Date(planExpiry).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-1 font-bold uppercase">Valor do Plano</p>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-900 text-base">R$ {displayValue.toFixed(2)}</p>
                          {selectedPlanDetails.status === 'paid' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 font-bold uppercase">Pago</span>
                          ) : (
                            <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full border border-rose-200 font-bold uppercase">Devendo</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-1 font-bold uppercase">Status</p>
                        {(() => { 
                          const status = getPlanStatus(planExpiry); 
                          return <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${status.color}`}>{status.text}</span>;
                        })()}
                      </div>
                    </div>
                  ); 
                })()}
              </div>

              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History size={16} className="text-blue-600" /> Histórico de Renovações
              </h4>
              <div className="space-y-2">
                {clientPlanHistory.length === 0 ? (
                  <div className="text-center p-6 text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                    Nenhum histórico anterior encontrado para este cliente.
                  </div>
                ) : (
                  clientPlanHistory.map(historyItem => { 
                    const isExpanded = expandedHistoryId === historyItem.id; 
                    let saleDetails = null; 
                    if (historyItem.saleId) { 
                      saleDetails = sales.find(s => s.id === historyItem.saleId); 
                    } 
                    return (
                      <div key={historyItem.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div 
                          onClick={() => setExpandedHistoryId(isExpanded ? null : historyItem.id)} 
                          className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                              {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs sm:text-sm">{historyItem.description}</p>
                              <p className="text-[11px] text-slate-400">{new Date(historyItem.date).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                          <div className="font-extrabold text-emerald-600 text-sm">
                            R$ {historyItem.total.toFixed(2)}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="bg-slate-50 p-3.5 border-t border-slate-100 text-xs space-y-2 animate-fade-in">
                            {saleDetails ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Método de Pagamento:</span>
                                  <span className="font-bold text-slate-700">{saleDetails.paymentMethod}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block mb-1 font-semibold">Itens:</span>
                                  <ul className="pl-2 space-y-1">
                                    {saleDetails.items.map((it, idx) => (
                                      <li key={idx} className="text-slate-700 flex justify-between">
                                        <span>{it.quantity}x {it.name}</span>
                                        <span className="font-bold">R$ {(it.price * it.quantity).toFixed(2)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="pt-2 flex justify-end">
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setReceiptToPrint({sale: saleDetails!, customer: customers.find(c => c.id === saleDetails!.customerId)!}); 
                                    }} 
                                    className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                                  >
                                    <Printer size={13}/> Reimprimir Cupom
                                  </button>
                                </div>
                              </>
                            ) : (
                              <p className="text-slate-400 italic">Detalhes da venda não encontrados.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ); 
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE RECORD PAYMENT MODAL */}
      {selectedRecord && (
        <PaymentModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {/* DETAILED SALE & RECEIVABLES MODAL (WITH PRODUCTS IMAGES AND MULTI-PAYMENT BREAKDOWN) */}
      {viewHistoryGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
            
            {/* MODAL HEADER */}
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base md:text-lg">
                    Detalhes da Venda & Recebimentos
                  </h3>
                  <p className="text-xs text-slate-300">
                    {viewHistoryGroup.description} • {viewHistoryGroup.entityName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setViewHistoryGroup(null)} 
                className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-4 md:p-5 overflow-y-auto flex-1 bg-slate-50 space-y-4">
              {(() => {
                const linkedSale = viewHistoryGroup.saleId ? sales.find(s => s.id === viewHistoryGroup.saleId) : null;
                const linkedCustomer = linkedSale 
                  ? (linkedSale.customerId ? customers.find(c => c.id === linkedSale.customerId) : linkedSale.unregisteredCustomer) 
                  : customers.find(c => c.name === viewHistoryGroup.entityName);

                const totalOriginal = linkedSale 
                  ? linkedSale.total 
                  : viewHistoryGroup.records.reduce((acc: number, r: FinancialRecord) => acc + (r.originalAmount || r.amount), 0);
                
                const totalPaidAcrossRecords = viewHistoryGroup.records.flatMap((r: FinancialRecord) => (r.history || [])).reduce((acc: number, h: any) => acc + h.amount, 0);
                
                // If there are no pending records (sale paid at POS upfront in full)
                const isPaidAtPOS = linkedSale && viewHistoryGroup.records.length === 0;
                const totalPaid = isPaidAtPOS ? totalOriginal : totalPaidAcrossRecords;
                const remainingDebt = isPaidAtPOS ? 0 : Math.max(0, viewHistoryGroup.records.reduce((acc, r) => acc + r.amount, 0));

                // Flatten all payment history entries
                const allPayments = viewHistoryGroup.records.flatMap((r: FinancialRecord) => 
                  (r.history || []).map((h: any) => ({
                    ...h, 
                    origin: r.description,
                    method: h.method || (h.note?.match(/Pagamento Realizado \((.*?)\)/)?.[1])
                  }))
                ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                return (
                  <>
                    {/* QUICK ACTION BUTTONS */}
                    {linkedSale && (
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setReceiptToPrint({ sale: linkedSale, customer: linkedCustomer as any })} 
                          className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-xs font-bold shadow-2xs"
                        >
                          <Printer size={16} /> Imprimir Cupom
                        </button>
                        <button 
                          onClick={() => setCarneToPrint({ sale: linkedSale, records: viewHistoryGroup.records, customer: linkedCustomer as any })} 
                          className="flex items-center justify-center gap-2 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-xs font-bold shadow-2xs"
                        >
                          <Book size={16} /> Imprimir Carnê
                        </button>
                      </div>
                    )}

                    {/* FINANCIAL SUMMARY CARDS */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Valor Total da Venda</span>
                        <span className="font-extrabold text-slate-800 text-sm">R$ {totalOriginal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Total Já Recebido</span>
                        <span className="font-extrabold text-emerald-600 text-sm">+ R$ {totalPaid.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Saldo Devedor / Restante</span>
                        <span className={`font-extrabold text-sm sm:text-base ${remainingDebt > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {remainingDebt > 0.01 ? `R$ ${remainingDebt.toFixed(2)}` : '✔ Totalmente Quitado'}
                        </span>
                      </div>
                    </div>

                    {/* PRODUCTS / ITEMS IN THE SALE (WITH PHOTOS & QUANTITIES) */}
                    {linkedSale && linkedSale.items && linkedSale.items.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Package size={14} className="text-blue-600" />
                            Produtos Comprados ({linkedSale.items.length} itens)
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(linkedSale.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                          {linkedSale.items.map((it, idx) => {
                            const catalogProd = products.find(p => p.id === it.id || p.name === it.name);
                            const itemImage = it.image || catalogProd?.image;
                            return (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                                <div className="flex items-center gap-3">
                                  {/* PRODUCT PHOTO */}
                                  <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                                    {itemImage ? (
                                      <img src={itemImage} alt={it.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package size={18} className="text-slate-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-xs sm:text-sm">{it.name}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {it.quantity} un x R$ {it.price.toFixed(2)} {it.category ? `• ${it.category}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                                  R$ {(it.quantity * it.price).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SALE PAYMENT CONDITIONS & INSTALLMENT BREAKDOWN (WITH SPLIT METHODS) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign size={14} className="text-emerald-600" />
                          Parcelas & Formas de Recebimento
                        </h4>
                      </div>

                      {/* If sale was paid in cash/single at POS without financial records */}
                      {isPaidAtPOS && linkedSale && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-emerald-900">Pago à Vista no Frente de Caixa:</span>
                            <span className="font-extrabold text-emerald-700">R$ {linkedSale.total.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {linkedSale.payments.map((p, pI) => (
                              <PaymentMethodBadgeView key={pI} method={p.method} amount={p.amount} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* If there are installments in financialRecords */}
                      {viewHistoryGroup.records.length > 0 && (
                        <div className="space-y-3">
                          {viewHistoryGroup.records
                            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                            .map((r: FinancialRecord) => {
                              const isPaid = r.status === 'paid' || r.amount <= 0.01;
                              const paidInThisRecord = (r.history || []).reduce((a, h) => a + h.amount, 0);
                              const originalAmt = r.originalAmount || (r.amount + paidInThisRecord);
                              const remainingInThisRecord = r.amount;

                              return (
                                <div 
                                  key={r.id} 
                                  className={`p-3.5 rounded-xl border transition-all ${
                                    isPaid 
                                      ? 'border-emerald-200 bg-emerald-50/40' 
                                      : r.status === 'partial' 
                                      ? 'border-blue-200 bg-blue-50/40' 
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  {/* Installment Top Info */}
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-bold text-slate-800 text-xs sm:text-sm">
                                        {r.description.replace(`Venda #${viewHistoryGroup.saleId}`, '').replace('()', '').trim() || 'Parcela'}
                                      </p>
                                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Calendar size={11} /> Vencimento: <span className="font-semibold text-slate-700">{new Date(r.dueDate).toLocaleDateString('pt-BR')}</span>
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-extrabold text-slate-900">
                                        R$ {originalAmt.toFixed(2)}
                                      </span>
                                      <div className="mt-0.5">
                                        {isPaid ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                            <CheckCircle size={10} /> Quitado
                                          </span>
                                        ) : r.status === 'partial' ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                                            <AlertCircle size={10} /> Pago Parcial
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                            <Clock size={10} /> Pendente
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* BAIXAS / FORMAS DE PAGAMENTO REGISTRADAS NESTA PARCELA */}
                                  {r.history && r.history.length > 0 ? (
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1.5 my-2">
                                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                                        <span>Formas Recebidas Nesta Parcela:</span>
                                        <span className="text-emerald-700 font-extrabold">Total Pago: R$ {paidInThisRecord.toFixed(2)}</span>
                                      </div>
                                      
                                      {/* Individual Payment entries with method badge & amount */}
                                      <div className="space-y-1">
                                        {r.history.map((h, hIdx) => (
                                          <div key={hIdx} className="flex justify-between items-center text-xs py-0.5">
                                            <div className="flex items-center gap-2">
                                              <PaymentMethodBadgeView method={h.method} note={h.note} />
                                              <span className="text-[10px] text-slate-400">
                                                {new Date(h.date).toLocaleDateString('pt-BR')} às {new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>
                                            <span className="font-extrabold text-emerald-700 text-xs">
                                              + R$ {h.amount.toFixed(2)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Remaining balance on this parcel */}
                                      {!isPaid && (
                                        <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                                          <span className="text-rose-700">Saldo Restante Desta Parcela:</span>
                                          <span className="text-rose-700 font-extrabold">R$ {remainingInThisRecord.toFixed(2)}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-400 italic my-1">
                                      Nenhum pagamento registrado nesta parcela ainda.
                                    </div>
                                  )}

                                  {/* Action button if pending */}
                                  {!isPaid && (
                                    <div className="pt-2 flex justify-end">
                                      <button 
                                        onClick={() => {
                                          setViewHistoryGroup(null);
                                          openRecord(r);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                      >
                                        <DollarSign size={13} /> Pagar / Dar Baixa
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* GENERAL PAYMENTS LEDGER (EXTRATO DE TODAS AS BAIXAS) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <History size={14} className="text-blue-600" />
                        Extrato Consolidado de Baixas ({allPayments.length} registros)
                      </h4>

                      {allPayments.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Nenhuma baixa registrada até o momento.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {allPayments.map((h, idx) => (
                            <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <PaymentMethodBadgeView method={h.method} note={h.note} />
                                  <span className="text-[11px] text-slate-500">
                                    {new Date(h.date).toLocaleDateString('pt-BR')} às {new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Ref: {h.origin}
                                </p>
                              </div>
                              <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">
                                + R$ {h.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {receiptToPrint && (
        <ReceiptModal 
          sale={receiptToPrint.sale} 
          customer={receiptToPrint.customer} 
          settings={settings} 
          onClose={() => setReceiptToPrint(null)} 
        />
      )}

      {/* CARNE PRINTER MODAL */}
      {carneToPrint && (
        <div className="fixed inset-0 z-[70]">
          <CarnePrinter 
            sale={carneToPrint.sale}
            customer={carneToPrint.customer}
            records={carneToPrint.records}
            settings={settings}
            onClose={() => setCarneToPrint(null)}
          />
        </div>
      )}

      {/* CUSTOMER INFO MODAL */}
      {infoCustomer && (
        <CustomerInfoModal 
          customer={infoCustomer}
          sales={sales}
          onClose={() => setInfoCustomer(null)}
        />
      )}
    </div>
    </PlanGate>
  );
};
