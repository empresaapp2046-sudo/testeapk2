// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, AlertCircle, CheckCircle2, DollarSign, Printer, FileDown, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CashSession } from '../types';
import { useNavigate } from '../lib/router-compat';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CashSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'open' | 'close';
    isForced?: boolean;
    onSuccess?: () => void;
    targetSession?: CashSession;
}

export const CashSessionModal: React.FC<CashSessionModalProps> = ({ isOpen, onClose, type, isForced, onSuccess, targetSession }) => {
    const store = useStore();
    const cashSession = targetSession || store.cashSession;
    const { openCashSession, closeCashSession, cashTransactions, lastClosedSession, settings, sales } = store;
    const navigate = useNavigate();
    const [value, setValue] = useState('0,00');
    const [keptAmount, setKeptAmount] = useState('0,00');
    const [error, setError] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState<any>(null);
    const hasInitialized = useRef(false);
    const isOpening = type === 'open';

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setShowSummary(false);
                setSummaryData(null);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const currentSessionTransactions = cashTransactions.filter(t => t.sessionId === cashSession?.id);
    
    const totalSales = currentSessionTransactions
        .filter(t => t.type === 'venda')
        .reduce((acc, t) => acc + t.value, 0);
    
    const cashInHand = (cashSession?.initialValue || 0) + 
        currentSessionTransactions
            .filter(t => t.type === 'venda' || t.type === 'suprimento')
            .reduce((acc, t) => acc + t.value, 0) -
        currentSessionTransactions
            .filter(t => t.type === 'sangria')
            .reduce((acc, t) => acc + t.value, 0);

    useEffect(() => {
        if (isOpen && !isOpening && !hasInitialized.current) {
            const timer = setTimeout(() => {
                setValue(cashInHand.toFixed(2));
                hasInitialized.current = true;
            }, 0);
            return () => clearTimeout(timer);
        }
        if (!isOpen) {
            hasInitialized.current = false;
        }
    }, [isOpen, isOpening, cashInHand]);

    if (!isOpen) return null;

    // Auto-calculate keptAmount when value changes
    const handleValueChange = (val: string) => {
        setValue(val);
    };

    const handleKeptAmountChange = (val: string) => {
        setKeptAmount(val);
        // "quero q ao informar o valor do troco ja mostre o Valor Total em Dinheiro no Caixa q ficara"
        // If they want the remaining money shown on value:
        // Actually, if value is the "money that will stay/be left", maybe we don't change value, but we just let them type both.
        // Wait, the user specifically said: "ao informar o valor do troco ja mostre o Valor Total em Dinheiro no Caixa q ficara"
        // Let's just update the value to be cashInHand if it's empty? No, value is prefilled. 
        // If they type keptAmount, maybe we show a text below it? 
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const amountStr = value.trim() === '' ? '0' : value.replace(',', '.');
        const amount = parseFloat(amountStr);
        const keptStr = keptAmount.trim() === '' ? '0' : keptAmount.replace(',', '.');
        const kept = parseFloat(keptStr);
        const totalOpeningAmount = amount + (lastClosedSession?.keptAmount || 0);

        if (isNaN(amount) || amount < 0) {
            setError('Por favor, insira um valor válido.');
            return;
        }

        try {
            if (type === 'open') {
                await openCashSession(
                    totalOpeningAmount, 
                    lastClosedSession?.id, 
                    lastClosedSession?.keptAmount
                );
                onClose();
                onSuccess?.();
            } else {
                // Prepare summary data before closing
                const sessionSales = sales.filter(s => {
                    const saleDate = new Date(s.date).getTime();
                    const sessionStart = new Date(cashSession!.openedAt).getTime();
                    return saleDate >= sessionStart;
                });

                const salesByMethod = {
                    dinheiro: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Dinheiro').reduce((a, p) => a + p.amount, 0)), 0),
                    pix: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Pix').reduce((a, p) => a + p.amount, 0)), 0),
                    credito: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Cartão de Crédito').reduce((a, p) => a + p.amount, 0)), 0),
                    debito: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'Cartão de Débito').reduce((a, p) => a + p.amount, 0)), 0),
                    prazo: sessionSales.reduce((acc, s) => acc + (s.payments.filter(p => p.method === 'A Prazo').reduce((a, p) => a + p.amount, 0)), 0),
                };

                const summary = {
                    id: cashSession!.id,
                    openedAt: cashSession!.openedAt,
                    closedAt: new Date().toISOString(),
                    initialValue: cashSession!.initialValue,
                    totalSales: totalSales,
                    totalSalesCount: sessionSales.length,
                    salesByMethod,
                    suprimentos: currentSessionTransactions.filter(t => t.type === 'suprimento').reduce((a, t) => a + t.value, 0),
                    sangrias: currentSessionTransactions.filter(t => t.type === 'sangria').reduce((a, t) => a + t.value, 0),
                    finalValue: amount,
                    expectedFinal: cashInHand,
                    difference: amount - cashInHand,
                    keptAmount: isNaN(kept) ? 0 : kept
                };

                setSummaryData(summary);
                await closeCashSession(amount, isNaN(kept) ? 0 : kept, cashSession!.id);
                setShowSummary(true);
            }
            setValue('');
            setKeptAmount('');
            setError('');
        } catch (err: any) {
            setError(err.message || 'Erro ao processar operação. Tente novamente.');
        }
    };

    const generatePDF = () => {
        if (!summaryData) return;
        const doc = new jsPDF();
        const title = `Extrato de Fechamento de Caixa #${summaryData.id}`;
        
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        
        doc.setFontSize(10);
        doc.text(`Aberto em: ${new Date(summaryData.openedAt).toLocaleString()}`, 14, 30);
        doc.text(`Fechado em: ${new Date(summaryData.closedAt).toLocaleString()}`, 14, 35);

        autoTable(doc, {
            startY: 45,
            head: [['Descrição', 'Valor']],
            body: [
                ['Valor de Abertura', `R$ ${summaryData.initialValue.toFixed(2)}`],
                ['Vendas em Dinheiro', `R$ ${summaryData.salesByMethod.dinheiro.toFixed(2)}`],
                ['Vendas em Pix', `R$ ${summaryData.salesByMethod.pix.toFixed(2)}`],
                ['Vendas em Crédito', `R$ ${summaryData.salesByMethod.credito.toFixed(2)}`],
                ['Vendas em Débito', `R$ ${summaryData.salesByMethod.debito.toFixed(2)}`],
                ['Vendas a Prazo', `R$ ${summaryData.salesByMethod.prazo.toFixed(2)}`],
                ['Total de Entradas (Suprimentos)', `R$ ${summaryData.suprimentos.toFixed(2)}`],
                ['Total de Saídas (Sangrias)', `R$ ${summaryData.sangrias.toFixed(2)}`],
                ['Valor Esperado (Dinheiro)', `R$ ${summaryData.expectedFinal.toFixed(2)}`],
                ['Valor Informado', `R$ ${summaryData.finalValue.toFixed(2)}`],
                ['Diferença / Quebra (Falta/Sobra)', `R$ ${summaryData.difference.toFixed(2)}`],
                ['Troco para Próxima Abertura', `R$ ${summaryData.keptAmount.toFixed(2)}`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] }
        });

        doc.save(`fechamento_caixa_${summaryData.id}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCloseSummary = () => {
        onClose();
        navigate('/');
    };

    if (showSummary && summaryData) {
        return (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                    <div className="p-6 bg-red-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={24} />
                            <h3 className="text-xl font-bold">Caixa Fechado com Sucesso</h3>
                        </div>
                    </div>
                    
                    <div className="p-6 max-h-[70vh] overflow-y-auto print:max-h-none">
                        <div className="space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">ID do Caixa</span>
                                <span className="font-bold">#{summaryData.id}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Abertura</span>
                                <span className="font-medium">{new Date(summaryData.openedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Fechamento</span>
                                <span className="font-medium">{new Date(summaryData.closedAt).toLocaleString()}</span>
                            </div>

                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Resumo de Vendas</h4>
                                    <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded">Total: {summaryData.totalSalesCount || 0} Vendas</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-3 rounded border">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Dinheiro</p>
                                        <p className="font-bold">R$ {summaryData.salesByMethod.dinheiro.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Pix</p>
                                        <p className="font-bold">R$ {summaryData.salesByMethod.pix.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Crédito</p>
                                        <p className="font-bold">R$ {summaryData.salesByMethod.credito.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Débito</p>
                                        <p className="font-bold">R$ {summaryData.salesByMethod.debito.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border col-span-2">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">A Prazo</p>
                                        <p className="font-bold">R$ {summaryData.salesByMethod.prazo.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Valor de Abertura</span>
                                    <span className="font-bold">R$ {summaryData.initialValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Entradas (Suprimentos)</span>
                                    <span className="font-bold">+ R$ {summaryData.suprimentos.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Saídas (Sangrias)</span>
                                    <span className="font-bold">- R$ {summaryData.sangrias.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                    <span>Troco para Próxima Abertura</span>
                                    <span className="text-blue-600">R$ {summaryData.keptAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button onClick={generatePDF} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
                                <FileDown size={18} /> PDF
                            </button>
                            <button onClick={handlePrint} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
                                <Printer size={18} /> Imprimir
                            </button>
                        </div>
                        <button onClick={handleCloseSummary} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 shadow-lg">
                            Ir para Dashboard <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const displayTotal = (parseFloat(value.replace(',', '.') || '0') + (lastClosedSession?.keptAmount || 0)).toFixed(2);

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                <div className={`p-6 text-white flex justify-between items-center ${isOpening ? 'bg-blue-600' : 'bg-red-600'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            {isOpening ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <h3 className="text-xl font-bold">{isOpening ? 'Abrir Caixa' : 'Fechar Caixa'}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    {isOpening && lastClosedSession && (
                        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg flex gap-3 items-start">
                            <DollarSign className="text-blue-600 shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="text-sm font-bold text-blue-800">Troco do Caixa Anterior</p>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    O caixa anterior <span className="font-bold">#{lastClosedSession.id}</span> foi fechado com um troco de <span className="font-bold">R$ {lastClosedSession.keptAmount?.toFixed(2)}</span>.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isOpening && (
                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Vendas em Dinheiro</p>
                                <p className="text-lg font-bold text-slate-800">R$ {totalSales.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Saldo em Caixa</p>
                                <p className="text-lg font-bold text-green-600">R$ {cashInHand.toFixed(2)}</p>
                            </div>
                        </div>
                    )}

                    {isForced && (
                        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex gap-3 items-start">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Ação Obrigatória</p>
                                <p className="text-xs text-amber-700 leading-relaxed">Você possui um caixa aberto de um dia anterior. É necessário fechá-lo para continuar.</p>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                            {isOpening ? 'Valor Inicial em Caixa (Fundo de Troco)' : 'Valor Total em Dinheiro no Caixa'}
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-blue-600 transition-colors">R$</div>
                            <input
                                type="number"
                                step="0.01"
                                autoFocus
                                className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-xl text-2xl font-bold outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-50'}`}
                                placeholder="0,00"
                                value={value}
                                onChange={(e) => handleValueChange(e.target.value)}
                            />
                        </div>
                        {isOpening && lastClosedSession && (
                            <div className="mt-3 text-sm font-bold text-slate-700">
                                Total a ser aberto: <span className="text-blue-600">R$ {displayTotal}</span>
                            </div>
                        )}
                    </div>

                    {!isOpening && (
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-slate-700 mb-3">
                                Valor para Segurar (Troco para Próxima Abertura)
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-red-600 transition-colors">R$</div>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-xl text-2xl font-bold outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-red-500 focus:bg-white focus:shadow-lg focus:shadow-red-50'}`}
                                    placeholder="0,00"
                                    value={keptAmount}
                                    onChange={(e) => { handleKeptAmountChange(e.target.value); setError(''); }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Este valor será informado automaticamente na próxima abertura de caixa.
                                {!isOpening && keptAmount && (
                                   <span className="block mt-1 font-bold text-blue-600 text-xs">
                                       Retirada do Caixa (Sangria Final): R$ {Math.max(0, (parseFloat(value.replace(',','.'))||0) - (parseFloat(keptAmount.replace(',','.'))||0)).toFixed(2)}
                                   </span>
                                )}
                            </p>
                        </div>
                    )}

                    {error && <p className="text-red-500 text-xs mb-4 font-bold flex items-center gap-1"><AlertCircle size={14} /> {error}</p>}

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                if (isForced) navigate('/');
                            }}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={`flex-1 py-4 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isOpening ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                        >
                            <DollarSign size={20} />
                            {isOpening ? 'Confirmar Abertura' : 'Confirmar Fechamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
