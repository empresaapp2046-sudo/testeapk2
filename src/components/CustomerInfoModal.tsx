// @ts-nocheck

import React, { useMemo, useState } from 'react';
import { Customer, Sale, FinancialRecord } from '../types';
import { useStore } from '../context/StoreContext';
import { X, User, Calendar, Clock, ShieldCheck, History, TrendingUp, ArrowLeft, Receipt, ShoppingBag, CheckCircle, AlertCircle, ChevronDown, ChevronUp, FileText, CreditCard, MapPin, Printer, Book, Trophy, Ticket, Award, Gift, Key, Send } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { CarnePrinter } from './CarnePrinter';

interface CustomerInfoModalProps {
  customer: Customer;
  sales: Sale[];
  onClose: () => void;
}

export const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({ customer, sales, onClose }) => {
  const { financialRecords, settings, raffleCampaigns, generateCustomerTempPassword } = useStore();
  const [currentView, setCurrentView] = useState<'summary' | 'history' | 'raffles'>('summary');
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);


  // Print Modals State
  const [printingReceiptRef, setPrintingReceiptRef] = useState<Sale | null>(null);
  const [printingCarneRef, setPrintingCarneRef] = useState<Sale | null>(null);

  const raffleWins = customer.raffleWins || [];

  // Raffle Coupons generated for this customer across sales
  const customerCouponsData = useMemo(() => {
      const customerSalesWithCoupons = sales
          .filter(s => s.customerId === customer.id && s.raffleCoupons && s.raffleCoupons.length > 0)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return customerSalesWithCoupons.map(s => {
          const campaign = raffleCampaigns?.find(c => c.id === s.raffleCampaignId);
          return {
              saleId: s.id,
              date: s.date,
              campaignTitle: campaign ? campaign.title : 'Campanha de Sorteio',
              prize: campaign ? campaign.prize : '',
              coupons: s.raffleCoupons || []
          };
      });
  }, [sales, customer.id, raffleCampaigns]);

  // 1. Calculate Registration Date (Prioritize new field, fallback to ID for legacy)
  const registrationDate = useMemo(() => {
      if (customer.registrationDate) {
          return new Date(customer.registrationDate).toLocaleDateString('pt-BR');
      }
      // Fallback to timestamp ID for legacy customers
      const timestamp = parseInt(customer.id);
      if (!isNaN(timestamp) && timestamp > 1577836800000) {
          return new Date(timestamp).toLocaleDateString('pt-BR');
      }
      return 'Data não registrada';
  }, [customer]);

  // 2. Cumulative Plan Logic (Existing)
  const planData = useMemo(() => {
      const customerPlanSales = sales
          .filter(s => s.customerId === customer.id && s.items.some(i => i.category === 'Planos'))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (customerPlanSales.length === 0) {
          return { hasPlan: false, cumulativeDate: null, daysRemaining: 0, totalPlans: 0 };
      }

      let cumulativeEndDate: Date | null = null;

      customerPlanSales.forEach(sale => {
          const saleDate = new Date(sale.date);
          const daysInSale = sale.items
              .filter(i => i.category === 'Planos')
              .reduce((acc, item) => acc + (item.quantity * (item.validityDays || 30)), 0);

          if (!cumulativeEndDate) {
              cumulativeEndDate = new Date(saleDate);
              cumulativeEndDate.setDate(cumulativeEndDate.getDate() + daysInSale);
          } else {
              if (saleDate < cumulativeEndDate) {
                  cumulativeEndDate.setDate(cumulativeEndDate.getDate() + daysInSale);
              } else {
                  cumulativeEndDate = new Date(saleDate);
                  cumulativeEndDate.setDate(cumulativeEndDate.getDate() + daysInSale);
              }
          }
      });

      const today = new Date();
      today.setHours(0,0,0,0);
      
      let diffDays = 0;
      if (cumulativeEndDate) {
          cumulativeEndDate.setHours(0,0,0,0);
          const diffTime = cumulativeEndDate.getTime() - today.getTime();
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
          hasPlan: true,
          cumulativeDate: cumulativeEndDate,
          daysRemaining: diffDays,
          totalPlans: customerPlanSales.length
      };
  }, [sales, customer.id]);

  // 3. History Data Logic (New)
  const historyData = useMemo(() => {
      // Get all sales for this customer, sorted newest first
      const customerSales = sales
          .filter(s => s.customerId === customer.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return customerSales.map(sale => {
          // Find linked financial records (installments/payments)
          const relatedRecords = financialRecords.filter(r => 
              r.documentNumber === sale.id || 
              r.description.includes(`Venda #${sale.id}`)
          ).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

          const totalPaid = relatedRecords.reduce((acc, r) => {
              // If status is paid, assume full amount paid. 
              // If partial, check history or remaining logic. 
              // For simplicity in display:
              if (r.status === 'paid') return acc + r.originalAmount;
              if (r.status === 'partial') return acc + (r.originalAmount - r.amount);
              return acc;
          }, 0);

          // Also account for immediate payments (Cash/Pix/Card) not in financialRecords if they were direct
          // However, StoreContext adds ALL payments to financialRecords now, so relatedRecords covers it.
          
          return {
              sale,
              records: relatedRecords,
              isFullyPaid: Math.abs(totalPaid - sale.total) < 0.1 || relatedRecords.every(r => r.status === 'paid')
          };
      });
  }, [sales, financialRecords, customer.id]);

  const personalDebt = useMemo(() => {
    return financialRecords
      .filter(r => r.customerId === customer.id && r.type === 'personal_receivable' && r.status !== 'paid')
      .reduce((acc, r) => acc + (r.status === 'partial' ? r.amount : r.originalAmount), 0);
  }, [financialRecords, customer.id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-start shrink-0">
            <div className="text-white flex items-center gap-3">
                {currentView !== 'summary' && (
                    <button onClick={() => setCurrentView('summary')} className="mr-1 hover:bg-white/10 p-1 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-blue-600 p-2 rounded-lg hidden sm:block">
                            <User size={24} className="text-white"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{customer.name}</h2>
                            <p className="text-slate-400 text-xs flex items-center gap-1">
                                <ShieldCheck size={12}/> {currentView === 'summary' ? 'Cliente Cadastrado' : currentView === 'history' ? 'Extrato Financeiro' : 'Histórico de Sorteios'}
                            </p>
                            {personalDebt > 0 && (
                                <p className="text-orange-400 text-xs font-bold mt-1">Dívida Pessoal: R$ {personalDebt.toFixed(2)}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                <X size={20} />
            </button>
        </div>

        <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
            
            {/* --- SUMMARY VIEW --- */}
            {currentView === 'summary' && (
                <div className="p-6 space-y-6">
                    {/* TEMP PASSWORD BUTTON */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Key size={18} className="text-blue-500" />
                                    Acesso à Vitrine
                                </h4>
                                <p className="text-xs text-slate-500">Enviar senha temporária via WhatsApp</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (isGeneratingPassword) return;
                                    setIsGeneratingPassword(true);
                                    const res = await generateCustomerTempPassword(customer.id);
                                    setIsGeneratingPassword(false);
                                    
                                    if (res.success && res.password) {
                                        const message = `Olá ${customer.name}! Seu login (${customer.email}) e senha temporária (${res.password}) para conectar à vitrine da loja. Esta senha só valerá por 3 horas. Por favor, altere para uma senha mais segura após o login.`;
                                        const phone = customer.phone.replace(/\D/g, '');
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                                    } else {
                                        alert(res.message);
                                    }
                                }}
                                disabled={isGeneratingPassword || !customer.phone}
                                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                            >
                                <Send size={14} />
                                {isGeneratingPassword ? 'Gerando...' : 'Enviar Senha'}
                            </button>
                        </div>
                        {!customer.phone && (
                            <p className="text-[10px] text-red-500 font-medium">* Adicione um telefone para habilitar o envio.</p>
                        )}
                    </div>

                    {/* Raffle Winner Golden Card */}

                    {raffleWins.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl p-4 border border-amber-600 shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                                    <Trophy size={28} className="text-yellow-100" />
                                </div>
                                <div>
                                    <h4 className="font-black text-white text-base">
                                        🎉 GANHADOR DE SORTEIO!
                                    </h4>
                                    <p className="text-amber-100 text-xs font-medium">
                                        Este cliente ganhou {raffleWins.length} sorteio{raffleWins.length > 1 ? 's' : ''}!
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setCurrentView('raffles')} 
                                className="bg-white text-amber-900 text-xs font-bold px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors shadow-sm shrink-0"
                            >
                                Ver Prêmios
                            </button>
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Cadastrado em</p>
                            <p className="text-slate-700 font-medium flex items-center gap-2">
                                <Calendar size={16} className="text-blue-500"/> {registrationDate}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Planos Adquiridos</p>
                            <p className="text-slate-700 font-medium flex items-center gap-2">
                                <History size={16} className="text-purple-500"/> {planData.totalPlans} total
                            </p>
                        </div>
                    </div>

                    {/* Main Plan Status Card */}
                    <div className={`rounded-xl p-6 border-2 relative overflow-hidden ${planData.daysRemaining > 0 ? 'bg-white border-green-500 shadow-lg shadow-green-500/10' : 'bg-slate-100 border-slate-300'}`}>
                        {planData.daysRemaining > 0 && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                Ativo
                            </div>
                        )}
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className={planData.daysRemaining > 0 ? "text-green-600" : "text-slate-400"} />
                            Projeção de Vencimento
                        </h3>
                        {planData.hasPlan ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Vencimento Acumulado</p>
                                        <p className="text-2xl font-bold text-slate-800">
                                            {planData.cumulativeDate?.toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500 mb-1">Dias Restantes</p>
                                        <p className={`text-2xl font-bold ${planData.daysRemaining > 7 ? 'text-green-600' : planData.daysRemaining > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                                            {planData.daysRemaining > 0 ? planData.daysRemaining : 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed border border-blue-100 flex gap-2">
                                    <Clock size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Nota:</strong> Esta data é uma projeção baseada na soma dos períodos de validade de todas as vendas de planos ativas e consecutivas.
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-400">
                                <p>Este cliente ainda não possui histórico de planos ativos.</p>
                            </div>
                        )}
                    </div>

                    {/* HISTORY BUTTON */}
                    <button 
                        onClick={() => setCurrentView('history')}
                        className="w-full bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md p-4 rounded-xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-50 text-blue-600 p-3 rounded-full group-hover:scale-110 transition-transform">
                                <Receipt size={24} />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-800">Histórico de Compras</h4>
                                <p className="text-xs text-slate-500">Ver pagamentos, parcelas e itens</p>
                            </div>
                        </div>
                        <div className="text-slate-400 group-hover:text-blue-500">
                            <ArrowLeft size={20} className="rotate-180" />
                        </div>
                    </button>

                    {/* RAFFLE HISTORY BUTTON */}
                    <button 
                        onClick={() => setCurrentView('raffles')}
                        className="w-full bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md p-4 rounded-xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-50 text-amber-600 p-3 rounded-full group-hover:scale-110 transition-transform">
                                <Trophy size={24} />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    Histórico de Sorteios
                                    {raffleWins.length > 0 && (
                                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {raffleWins.length} prêmio{raffleWins.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </h4>
                                <p className="text-xs text-slate-500">Ver prêmios ganhos e cupons acumulados</p>
                            </div>
                        </div>
                        <div className="text-slate-400 group-hover:text-amber-500">
                            <ArrowLeft size={20} className="rotate-180" />
                        </div>
                    </button>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Dados de Contato</h4>
                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                            <div className="p-3 flex justify-between">
                                <span className="text-slate-500 text-sm">Telefone</span>
                                <span className="text-slate-800 font-medium text-sm">{customer.phone || '-'}</span>
                            </div>
                            <div className="p-3 flex justify-between">
                                <span className="text-slate-500 text-sm">Email</span>
                                <span className="text-slate-800 font-medium text-sm">{customer.email || '-'}</span>
                            </div>
                            {customer.cpf && (
                                <div className="p-3 flex justify-between">
                                    <span className="text-slate-500 text-sm">CPF</span>
                                    <span className="text-slate-800 font-medium text-sm">{customer.cpf}</span>
                                </div>
                            )}
                            
                            {/* ADDRESS FIELD (If exists) */}
                            {customer.street && (
                                <div className="p-3 flex justify-between items-start">
                                    <span className="text-slate-500 text-sm flex items-center gap-1 mt-0.5"><MapPin size={14}/> Endereço</span>
                                    <span className="text-slate-800 font-medium text-sm text-right">
                                        {customer.street}, {customer.number} 
                                        {customer.apartment && <span>, {customer.apartment}</span>}
                                        <br/>
                                        <span className="text-xs text-slate-500">{customer.city} / {customer.state}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- RAFFLES VIEW --- */}
            {currentView === 'raffles' && (
                <div className="p-6 space-y-6">
                    {/* Section 1: Won Raffles */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                            <Trophy size={18} className="text-amber-500"/> Prêmios Ganhos em Sorteios
                        </h4>
                        {raffleWins.length === 0 ? (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
                                <Award size={32} className="mx-auto mb-2 opacity-30"/>
                                Nenhum prêmio de sorteio registrado até o momento.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {raffleWins.map(win => (
                                    <div key={win.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-amber-500 text-white p-2.5 rounded-xl shadow-sm shrink-0">
                                                    <Trophy size={22} />
                                                </div>
                                                <div>
                                                    <h5 className="font-extrabold text-slate-900 text-base">{win.campaignTitle}</h5>
                                                    <p className="text-amber-900 font-extrabold text-sm mt-0.5">🏆 Prêmio: {win.prize || 'Sorteio Especial'}</p>
                                                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
                                                        {win.couponNumber && (
                                                            <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold border border-amber-300">
                                                                CUPOM Nº: {win.couponNumber}
                                                            </span>
                                                        )}
                                                        <span>Ganhador em: {new Date(win.drawDate).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Accumulated Coupons */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                            <Ticket size={18} className="text-blue-500"/> Cupons Gerados por Compras ({customerCouponsData.reduce((acc, c) => acc + c.coupons.length, 0)})
                        </h4>
                        {customerCouponsData.length === 0 ? (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
                                <Ticket size={32} className="mx-auto mb-2 opacity-30"/>
                                Nenhum cupom gerado em compras para este cliente.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {customerCouponsData.map(group => (
                                    <div key={group.saleId} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
                                            <div>
                                                <span className="font-bold text-slate-800 text-sm">{group.campaignTitle}</span>
                                                {group.prize && <p className="text-xs text-slate-500">Prêmio: {group.prize}</p>}
                                            </div>
                                            <span className="text-xs text-slate-400">{new Date(group.date).toLocaleDateString('pt-BR')} (Venda #{group.saleId})</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {group.coupons.map((coupon, idx) => (
                                                <span key={idx} className="bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs font-bold px-2.5 py-1 rounded-lg">
                                                    Nº {coupon}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {currentView === 'history' && (
                <div className="divide-y divide-slate-100">
                    {historyData.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            <ShoppingBag size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>Nenhuma compra registrada para este cliente.</p>
                        </div>
                    ) : (
                        historyData.map(({ sale, records, isFullyPaid }) => {
                            const isExpanded = expandedSaleId === sale.id;
                            
                            return (
                                <div key={sale.id} className="bg-white transition-colors hover:bg-slate-50">
                                    <div 
                                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                        className="p-4 cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${isFullyPaid ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {isFullyPaid ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">Venda #{sale.id}</span>
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">
                                                        {new Date(sale.date).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    {records.length > 0 && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${records[0].type === 'company_receivable' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                            {records[0].type === 'company_receivable' ? 'Empresa' : 'Pessoal'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {sale.items.length} itens • {sale.paymentMethod}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-800">R$ {sale.total.toFixed(2)}</div>
                                            <div className="text-slate-400 mt-1 flex justify-end">
                                                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-4 animate-fade-in space-y-4">
                                            
                                            {/* Products Section */}
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                    <ShoppingBag size={12}/> Itens Comprados
                                                </h5>
                                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                    {sale.items.map((item, idx) => (
                                                        <div key={idx} className="p-2 text-sm flex justify-between border-b border-slate-100 last:border-0">
                                                            <span className="text-slate-700">
                                                                <span className="font-bold">{item.quantity}x</span> {item.name}
                                                            </span>
                                                            <span className="text-slate-500">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Financial Section */}
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                    <FileText size={12}/> Detalhamento Financeiro
                                                </h5>
                                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                    {records.length === 0 ? (
                                                        <div className="p-3 text-xs text-slate-400 text-center">Pagamento à vista (sem registro detalhado)</div>
                                                    ) : (
                                                        records.map(r => {
                                                            const isPaid = r.status === 'paid';
                                                            const isLate = !isPaid && new Date(r.dueDate) < new Date();
                                                            const payDate = r.history && r.history.length > 0 
                                                                ? new Date(r.history[r.history.length-1].date).toLocaleDateString('pt-BR') 
                                                                : null;

                                                            return (
                                                                <div key={r.id} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-center text-sm">
                                                                    <div>
                                                                        <div className="font-medium text-slate-700">{r.description.replace(`Venda #${sale.id}`, '').trim() || 'Pagamento'}</div>
                                                                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                                            <Calendar size={10}/> Venc: {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                                                                            {payDate && <span className="text-green-600 font-bold ml-1">• Pago em {payDate}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="font-bold text-slate-700">R$ {r.originalAmount.toFixed(2)}</div>
                                                                        <div className={`text-[10px] font-bold uppercase ${isPaid ? 'text-green-600' : isLate ? 'text-red-500' : 'text-orange-500'}`}>
                                                                            {isPaid ? 'PAGO' : isLate ? 'ATRASADO' : 'PENDENTE'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button onClick={() => setPrintingReceiptRef(sale)} className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1 transition-colors">
                                                    <Printer size={14} /> Cupom
                                                </button>
                                                {sale.payments?.some((p:any) => p.method === 'A Prazo') && (
                                                    <button onClick={() => setPrintingCarneRef(sale)} className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1 transition-colors">
                                                        <Book size={14} /> Carnê
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

        </div>
        
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <button onClick={onClose} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                Fechar
            </button>
        </div>
      </div>

      {/* Render Print Modals based on State */}
      {printingReceiptRef && (
          <ReceiptModal 
             sale={printingReceiptRef} 
             settings={settings} 
             customer={customer} 
             onClose={() => setPrintingReceiptRef(null)} 
          />
      )}
      
      {printingCarneRef && (
          <CarnePrinter 
             sale={printingCarneRef} 
             settings={settings} 
             customer={customer} 
             onClose={() => setPrintingCarneRef(null)} 
          />
      )}

    </div>
  );
};
