// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { CashSession, CashTransaction, Sale } from '../types';
import { Calendar, DollarSign, ArrowRight, Filter, Download, Clock, User, CheckCircle, XCircle, ChevronRight, ArrowLeft, Plus, Minus, X, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CashSessionModal } from '../components/CashSessionModal';
import { useNavigate, useLocation } from '../lib/router-compat';
import { PlanGate } from '../components/PlanGate';

export const CashReports = () => {
    return (
        <PlanGate>
            <CashReportsContent />
        </PlanGate>
    );
};

const CashReportsContent = () => {
    const { cashTransactions, cashSessions, sales, users, currentUser, isAdmin, addCashTransaction, settings } = useStore();
    const canViewAllUsers = isAdmin || currentUser?.role === 'DonoLoja' || currentUser?.role === 'AdminGeral';
    const navigate = useNavigate();
    const location = useLocation();
    const [startDate, setStartDate] = useState(() => {
        if (location.state?.selectedUserId) {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedUserId, setSelectedUserId] = useState(() => {
        if (location.state?.selectedUserId) return location.state.selectedUserId;
        return canViewAllUsers ? '' : (currentUser?.id || '');
    });
    const [dateFilterType, setDateFilterType] = useState<'abertura' | 'fechamento'>('abertura');
    const [statusFilter, setStatusFilter] = useState<'all' | 'aberto' | 'fechado'>('all');
    const [selectedTransactionSessionId, setSelectedTransactionSessionId] = useState('');
    const [viewMode, setViewMode] = useState<'sessions' | 'transactions'>('sessions');
    const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
    const [now] = useState(() => Date.now());

    // Transaction Modal State
    const [showTransactionModal, setShowTransactionModal] = useState<{ type: 'sangria' | 'suprimento', active: boolean }>({ type: 'sangria', active: false });
    const [showCloseCashModal, setShowCloseCashModal] = useState(false);
    const [transactionValue, setTransactionValue] = useState('');
    const [transactionDescription, setTransactionDescription] = useState('');

    const filteredSessions = useMemo(() => {
        if (!cashSessions || !Array.isArray(cashSessions)) return [];
        return cashSessions.filter(s => {
            if (!s || !s.openedAt) return false;
            try {
                const targetDate = dateFilterType === 'abertura' ? s.openedAt : (s.closedAt || s.openedAt);
                const dateStr = new Date(targetDate).toISOString().split('T')[0];
                const dateMatch = dateStr >= startDate && dateStr <= endDate;
                
                const userMatch = canViewAllUsers ? (selectedUserId === '' || s.userId === selectedUserId) : (s.userId === currentUser?.id);
                const statusMatch = statusFilter === 'all' ? true : s.status === statusFilter;
                
                return dateMatch && userMatch && statusMatch;
            } catch (e) {
                return false;
            }
        }).sort((a, b) => {
            try {
                return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
            } catch(e) {
                return 0;
            }
        });
    }, [cashSessions, startDate, endDate, selectedUserId, canViewAllUsers, currentUser, dateFilterType, statusFilter]);

    const availableSessionIds = useMemo(() => {
        if (!cashTransactions || !Array.isArray(cashTransactions)) return [];
        return Array.from(new Set(cashTransactions.filter(t => {
            if (!t || !t.timestamp) return false;
            try {
                const date = new Date(t.timestamp).toISOString().split('T')[0];
                const dateMatch = date >= startDate && date <= endDate;
                const userMatch = canViewAllUsers ? (selectedUserId === '' || t.operatorId === selectedUserId) : (t.operatorId === currentUser?.id);
                return dateMatch && userMatch;
            } catch (e) {
                return false;
            }
        }).map(t => t.sessionId))).filter(Boolean);
    }, [cashTransactions, startDate, endDate, selectedUserId, canViewAllUsers, currentUser]);

    const filteredTransactions = useMemo(() => {
        if (!cashTransactions || !Array.isArray(cashTransactions)) return [];
        return cashTransactions.filter(t => {
            if (!t || !t.timestamp) return false;
            try {
                const date = new Date(t.timestamp).toISOString().split('T')[0];
                const dateMatch = date >= startDate && date <= endDate;
                const userMatch = canViewAllUsers ? (selectedUserId === '' || t.operatorId === selectedUserId) : (t.operatorId === currentUser?.id);
                const sessionMatch = selectedTransactionSessionId === '' || t.sessionId === selectedTransactionSessionId;
                return dateMatch && userMatch && sessionMatch;
            } catch (e) {
                return false;
            }
        }).sort((a, b) => {
            try {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            } catch(e) {
                return 0;
            }
        });
    }, [cashTransactions, startDate, endDate, selectedUserId, canViewAllUsers, currentUser, selectedTransactionSessionId]);

    const activeSession = useMemo(() => {
        if (!cashSessions || !Array.isArray(cashSessions)) return null;
        const targetUserId = selectedUserId || currentUser?.id;
        if (!targetUserId) return null; // If 'Todos os usuários' is selected and no current user
        return cashSessions.find(s => s.status === 'aberto' && s.userId === targetUserId);
    }, [cashSessions, currentUser, selectedUserId]);

    const sessionDetails = useMemo(() => {
        if (!selectedSession) return null;
        
        const transactions = (cashTransactions || []).filter(t => t && t.sessionId === selectedSession.id);
        const sessionSales = (sales || []).filter(s => {
            if (!s || !s.date) return false;
            const saleTime = new Date(s.date).getTime();
            const openTime = new Date(selectedSession.openedAt).getTime();
            const closeTime = selectedSession.closedAt ? new Date(selectedSession.closedAt).getTime() : now;
            return saleTime >= openTime && saleTime <= closeTime && (s.employeeId === selectedSession.userId || s.ownerId === selectedSession.userId);
        });

        const totalIn = transactions.filter(t => t.type === 'suprimento' || t.type === 'abertura').reduce((acc, t) => acc + (t.value || 0), 0);
        const totalOut = transactions.filter(t => t.type === 'sangria').reduce((acc, t) => acc + (t.value || 0), 0);
        const totalSales = sessionSales.reduce((acc, s) => acc + (s.total || 0), 0);
        
        const salesByMethod = {
            dinheiro: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Dinheiro').reduce((a, p) => a + p.amount, 0)), 0),
            pix: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Pix').reduce((a, p) => a + p.amount, 0)), 0),
            credito: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Cartão de Crédito').reduce((a, p) => a + p.amount, 0)), 0),
            debito: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Cartão de Débito').reduce((a, p) => a + p.amount, 0)), 0),
            prazo: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'A Prazo').reduce((a, p) => a + p.amount, 0)), 0),
        };

        return { transactions, sales: sessionSales, totalIn, totalOut, totalSales, salesByMethod };
    }, [selectedSession, cashTransactions, sales, now]);

    const handleAddTransaction = async () => {
        const sessionToUse = selectedSession || activeSession;
        if (!sessionToUse || !transactionValue || parseFloat(transactionValue) <= 0) return;
        
        await addCashTransaction({
            sessionId: sessionToUse.id,
            type: showTransactionModal.type,
            value: parseFloat(transactionValue),
            description: transactionDescription || (showTransactionModal.type === 'sangria' ? 'Retirada manual' : 'Entrada manual'),
            operatorId: currentUser?.id || ''
        });
        
        setShowTransactionModal({ ...showTransactionModal, active: false });
        setTransactionValue('');
        setTransactionDescription('');
    };

    const downloadSessionPDF = () => {
        if (!selectedSession || !sessionDetails) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text('Relatório de Fechamento de Caixa', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`ID da Sessão: ${selectedSession.id}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, pageWidth / 2, 34, { align: 'center' });

        // Session Info
        doc.setDrawColor(226, 232, 240);
        doc.line(20, 40, pageWidth - 20, 40);

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo da Sessão', 20, 50);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Operador: ${users.find(u => u.id === selectedSession.userId)?.username || 'N/A'}`, 20, 60);
        doc.text(`Abertura: ${new Date(selectedSession.openedAt).toLocaleString()}`, 20, 66);
        doc.text(`Fechamento: ${selectedSession.closedAt ? new Date(selectedSession.closedAt).toLocaleString() : 'Ainda Aberto'}`, 20, 72);

        // Financial Summary Table
        autoTable(doc, {
            startY: 80,
            head: [['Descrição', 'Valor']],
            body: [
                ['Valor Inicial (Total)', `R$ ${selectedSession.initialValue.toFixed(2)}`],
                ['  - Novo Dinheiro', `R$ ${(selectedSession.initialValue - (selectedSession.previousSessionKeptAmount || 0)).toFixed(2)}`],
                ['  - Troco Anterior', `R$ ${(selectedSession.previousSessionKeptAmount || 0).toFixed(2)}`],
                ['Total de Vendas', `R$ ${sessionDetails.totalSales.toFixed(2)} (${sessionDetails.sales.length} vendas)`],
                ['  - Dinheiro', `R$ ${sessionDetails.salesByMethod.dinheiro.toFixed(2)}`],
                ['  - Pix', `R$ ${sessionDetails.salesByMethod.pix.toFixed(2)}`],
                ['  - Débito', `R$ ${sessionDetails.salesByMethod.debito.toFixed(2)}`],
                ['  - Crédito', `R$ ${sessionDetails.salesByMethod.credito.toFixed(2)}`],
                ['  - A Prazo', `R$ ${sessionDetails.salesByMethod.prazo.toFixed(2)}`],
                ['Total de Entradas (Suprimentos)', `R$ ${sessionDetails.totalIn.toFixed(2)}`],
                ['Total de Saídas (Sangrias)', `R$ ${sessionDetails.totalOut.toFixed(2)}`],
                ['Saldo Final Calculado', `R$ ${(selectedSession.initialValue + sessionDetails.totalSales + sessionDetails.totalIn - sessionDetails.totalOut).toFixed(2)}`],
                ['Valor de Fechamento Informado', selectedSession.finalValue !== undefined ? `R$ ${selectedSession.finalValue.toFixed(2)}` : 'N/A'],
                ['Diferença / Quebra (Falta/Sobra)', selectedSession.finalValue !== undefined ? `R$ ${(selectedSession.finalValue - (selectedSession.initialValue + sessionDetails.totalSales + sessionDetails.totalIn - sessionDetails.totalOut)).toFixed(2)}` : 'N/A'],
                ['Troco Retido p/ Próximo Caixa', selectedSession.keptAmount !== undefined ? `R$ ${selectedSession.keptAmount.toFixed(2)}` : 'R$ 0.00'],
            ],
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59] },
        });

        // Sales Table
        doc.setFont('helvetica', 'bold');
        doc.text('Detalhamento de Vendas', 20, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['ID', 'Data', 'Cliente', 'Total']],
            body: sessionDetails.sales.map(s => [
                s.id.slice(-6),
                new Date(s.date).toLocaleString(),
                s.customerId ? (users.find(u => u.id === s.customerId)?.username || 'Cliente') : 'Cliente Balcão',
                `R$ ${s.total.toFixed(2)}`
            ]),
        });

        // Transactions Table
        doc.setFont('helvetica', 'bold');
        doc.text('Movimentações de Caixa', 20, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Tipo', 'Data', 'Descrição', 'Valor']],
            body: sessionDetails.transactions.map(t => [
                t.type.toUpperCase(),
                new Date(t.timestamp).toLocaleString(),
                t.description,
                `R$ ${t.value.toFixed(2)}`
            ]),
        });

        doc.save(`Relatorio_Caixa_${selectedSession.id.slice(-6)}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (selectedSession && sessionDetails) {
        return (
            <PlanGate>
            <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
                <button 
                    onClick={() => setSelectedSession(null)}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Voltar para Lista</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Detalhes da Sessão</h3>
                                    <p className="text-slate-500 text-sm">ID: {selectedSession.id}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedSession.status === 'aberto' && (
                                        <>
                                            <button 
                                                onClick={() => setShowTransactionModal({ type: 'suprimento', active: true })}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg"
                                            >
                                                <Plus size={18} />
                                                <span>Suprimento</span>
                                            </button>
                                            <button 
                                                onClick={() => setShowTransactionModal({ type: 'sangria', active: true })}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg"
                                            >
                                                <Minus size={18} />
                                                <span>Sangria</span>
                                            </button>
                                            <button 
                                                onClick={() => setShowCloseCashModal(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg"
                                            >
                                                <AlertCircle size={18} />
                                                <span>Fechar Caixa</span>
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        onClick={downloadSessionPDF}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg"
                                    >
                                        <Download size={18} />
                                        <span>Baixar PDF</span>
                                    </button>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedSession.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {selectedSession.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Abertura (Total)</p>
                                    <p className="text-lg font-bold text-slate-800">R$ {selectedSession.initialValue.toFixed(2)}</p>
                                    {selectedSession.previousSessionKeptAmount ? (
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            (R$ {(selectedSession.initialValue - selectedSession.previousSessionKeptAmount).toFixed(2)} novo + R$ {selectedSession.previousSessionKeptAmount.toFixed(2)} troco)
                                        </p>
                                    ) : null}
                                    <p className="text-[10px] text-slate-400">{new Date(selectedSession.openedAt).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl">
                                    <p className="text-xs text-green-600 uppercase font-bold mb-1">Vendas</p>
                                    <p className="text-lg font-bold text-green-700">R$ {sessionDetails.totalSales.toFixed(2)}</p>
                                    <p className="text-[10px] text-green-400">{sessionDetails.sales.length} vendas</p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl">
                                    <p className="text-xs text-blue-600 uppercase font-bold mb-1">Entradas</p>
                                    <p className="text-lg font-bold text-blue-700">R$ {sessionDetails.totalIn.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-xl">
                                    <p className="text-xs text-red-600 uppercase font-bold mb-1">Saídas</p>
                                    <p className="text-lg font-bold text-red-700">R$ {sessionDetails.totalOut.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-xl shadow-lg border border-slate-700">
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">Total em Caixa</p>
                                    <p className="text-lg font-bold text-white">R$ {(selectedSession.initialValue + sessionDetails.totalSales + sessionDetails.totalIn - sessionDetails.totalOut).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <h4 className="font-bold text-slate-800">Movimentações de Caixa</h4>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 font-medium">Horário</th>
                                        <th className="p-4 font-medium">Tipo</th>
                                        <th className="p-4 font-medium">Descrição</th>
                                        <th className="p-4 font-medium text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {sessionDetails.transactions.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-500">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    t.type === 'sangria' ? 'bg-red-100 text-red-700' : 
                                                    t.type === 'suprimento' ? 'bg-blue-100 text-blue-700' : 
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-700">{t.description}</td>
                                            <td className={`p-4 text-right font-bold ${t.type === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                                                {t.type === 'sangria' ? '-' : '+'} R$ {Math.abs(t.value).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {sessionDetails.transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-400 italic">Nenhuma movimentação manual</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800">Vendas do Período</h4>
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {sessionDetails.sales.length}
                                </span>
                            </div>
                            <div className="max-h-[600px] overflow-auto">
                                <div className="divide-y divide-slate-100">
                                    {sessionDetails.sales.map(s => (
                                        <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-slate-800">#{s.id.slice(-6)}</span>
                                                <span className="text-xs font-bold text-green-600">R$ {s.total.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-400">{new Date(s.date).toLocaleTimeString()}</span>
                                                <span className="text-[10px] text-slate-500 italic">{s.paymentMethod}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {sessionDetails.sales.length === 0 && (
                                        <div className="p-8 text-center text-slate-400 italic text-sm">Nenhuma venda realizada</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Modal */}
                {showTransactionModal.active && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                            <div className={`p-6 text-white flex justify-between items-center ${showTransactionModal.type === 'sangria' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    {showTransactionModal.type === 'sangria' ? <Minus size={24} /> : <Plus size={24} />}
                                    {showTransactionModal.type === 'sangria' ? 'Realizar Sangria' : 'Realizar Suprimento'}
                                </h3>
                                <button onClick={() => setShowTransactionModal({ ...showTransactionModal, active: false })} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Valor (R$)</label>
                                    <input 
                                        type="number" 
                                        value={transactionValue}
                                        onChange={(e) => setTransactionValue(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none transition-all text-2xl font-bold"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Descrição / Motivo</label>
                                    <textarea 
                                        value={transactionDescription}
                                        onChange={(e) => setTransactionDescription(e.target.value)}
                                        placeholder="Ex: Pagamento de fornecedor, Troco inicial..."
                                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none transition-all resize-none h-24"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => setShowTransactionModal({ ...showTransactionModal, active: false })}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleAddTransaction}
                                        disabled={!transactionValue || parseFloat(transactionValue) <= 0}
                                        className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${showTransactionModal.type === 'sangria' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'} disabled:opacity-50 disabled:shadow-none`}
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showCloseCashModal && (
                    <CashSessionModal 
                        isOpen={showCloseCashModal} 
                        onClose={() => setShowCloseCashModal(false)} 
                        type="close" 
                        targetSession={selectedSession || undefined}
                        onSuccess={() => {
                            if (selectedSession) {
                                setSelectedSession({...selectedSession});
                            }
                        }}
                    />
                )}
                </div>
            </PlanGate>
        );
    }

    return (
        <PlanGate>
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Relatórios de Caixa</h2>
                    <p className="text-slate-500">Acompanhe as sessões e movimentações financeiras</p>
                </div>
                
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
                    <button 
                        onClick={() => setViewMode('sessions')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'sessions' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Sessões
                    </button>
                    <button 
                        onClick={() => setViewMode('transactions')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'transactions' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Transações
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <Clock size={18} className="text-slate-400" />
                                <select value={dateFilterType} onChange={(e) => setDateFilterType(e.target.value as any)} className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0">
                                    <option value="abertura">Abertura</option>
                                    <option value="fechamento">Fechamento</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 min-w-[150px]">
                                <CheckCircle size={18} className="text-slate-400" />
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 w-full">
                                    <option value="all">Todos Status</option>
                                    <option value="aberto">Abertos</option>
                                    <option value="fechado">Fechados</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <Calendar size={18} className="text-slate-400" />
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0" />
                            </div>
                            <ArrowRight size={16} className="text-slate-300" />
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <Calendar size={18} className="text-slate-400" />
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0" />
                            </div>
                        </div>
                        {canViewAllUsers && (
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 min-w-[200px]">
                                <User size={18} className="text-slate-400" />
                                <select 
                                    value={selectedUserId} 
                                    onChange={(e) => setSelectedUserId(e.target.value)} 
                                    className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 w-full"
                                >
                                    <option value="">Todos os Usuários</option>
                                    {(users || []).map(u => <option key={u.id} value={u.id}>{u.username || u.name}</option>)}
                                </select>
                            </div>
                        )}

                        {viewMode === 'transactions' && (
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 min-w-[200px]">
                                <Filter size={18} className="text-slate-400" />
                                <select 
                                    value={selectedTransactionSessionId} 
                                    onChange={(e) => setSelectedTransactionSessionId(e.target.value)} 
                                    className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 w-full"
                                >
                                    <option value="">Todos os Caixas</option>
                                    {availableSessionIds.map(id => (
                                        <option key={id} value={id}>Caixa #{id?.slice(-6)}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {(settings?.cashRegisterEnabled || (selectedUserId ? users.find(u => u.id === selectedUserId)?.forcedCashOpening : currentUser?.forcedCashOpening)) && activeSession && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="hidden sm:block">
                                <p className="text-[10px] uppercase font-bold text-blue-600">Caixa Atual Aberto</p>
                                <p className="text-xs font-bold text-blue-800">R$ {activeSession.initialValue.toFixed(2)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowTransactionModal({ type: 'suprimento', active: true })}
                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                                    title="Suprimento Rápido"
                                >
                                    <Plus size={18} />
                                </button>
                                <button 
                                    onClick={() => setShowTransactionModal({ type: 'sangria', active: true })}
                                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm"
                                    title="Sangria Rápida"
                                >
                                    <Minus size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {viewMode === 'sessions' ? (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-medium">Caixa ID</th>
                                <th className="p-4 font-medium">Operador</th>
                                <th className="p-4 font-medium">Abertura</th>
                                <th className="p-4 font-medium">Fechamento</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">V. Inicial</th>
                                <th className="p-4 font-medium text-right">V. Final</th>
                                <th className="p-4 font-medium text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredSessions.map(s => {
                                const operator = users.find(u => u.id === s.userId);
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 font-medium text-slate-700">#{s.id.slice(-6)}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                    {(operator?.username || operator?.name || 'U').charAt(0)}
                                                </div>
                                                <span className="font-medium text-slate-700">{operator?.username || operator?.name || 'Usuário'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500">{new Date(s.openedAt).toLocaleString()}</td>
                                        <td className="p-4 text-slate-500">{s.closedAt ? new Date(s.closedAt).toLocaleString() : '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-600">
                                            R$ {s.initialValue.toFixed(2)}
                                            {s.previousSessionKeptAmount ? (
                                                <div className="text-[10px] text-slate-400">
                                                    (Inclui R$ {s.previousSessionKeptAmount.toFixed(2)} troco)
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-600">{s.finalValue ? `R$ ${s.finalValue.toFixed(2)}` : '-'}</td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => setSelectedSession(s)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredSessions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Clock size={48} strokeWidth={1} />
                                            <p className="italic">Nenhuma sessão de caixa encontrada para este período</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-medium">Data/Hora</th>
                                <th className="p-4 font-medium">Operador</th>
                                <th className="p-4 font-medium">Tipo</th>
                                <th className="p-4 font-medium">Descrição</th>
                                <th className="p-4 font-medium text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredTransactions.map(t => {
                                const operator = users.find(u => u.id === t.operatorId);
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-slate-500">{new Date(t.timestamp).toLocaleString()}</td>
                                        <td className="p-4 font-medium text-slate-700">{operator?.username || operator?.name || 'Usuário'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                t.type === 'sangria' ? 'bg-red-100 text-red-700' : 
                                                t.type === 'suprimento' ? 'bg-blue-100 text-blue-700' : 
                                                t.type === 'venda' ? 'bg-green-100 text-green-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">{t.description}</td>
                                        <td className={`p-4 text-right font-bold ${t.type === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                                            {t.type === 'sangria' ? '-' : '+'} R$ {Math.abs(t.value).toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <DollarSign size={48} strokeWidth={1} />
                                            <p className="italic">Nenhuma transação encontrada para este período</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            
            {showCloseCashModal && (
                <CashSessionModal 
                    isOpen={showCloseCashModal} 
                    onClose={() => setShowCloseCashModal(false)} 
                    type="close" 
                    targetSession={selectedSession || undefined}
                    onSuccess={() => {
                        navigate('/pos');
                    }}
                />
            )}
        </div>
        </PlanGate>
    );
};
