// @ts-nocheck
import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, DollarSign, CreditCard, Pix, Calendar, User, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';
import { CashSession, CashTransaction } from '../types';
import { useStore } from '../context/StoreContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CashSessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashSession;
  transactions: CashTransaction[];
}

export const CashSessionSummaryModal = ({ isOpen, onClose, session, transactions }: CashSessionSummaryModalProps) => {
  const { currentUser } = useStore();
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Calculate totals
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'venda') {
      const method = t.paymentMethod || 'dinheiro';
      acc[method] = (acc[method] || 0) + t.value;
      acc.totalSales += t.value;
    } else if (t.type === 'entrada') {
      acc.entries += t.value;
    } else if (t.type === 'saida') {
      acc.exits += t.value;
    } else if (t.type === 'abertura') {
      acc.opening = t.value;
    }
    return acc;
  }, {
    dinheiro: 0,
    pix: 0,
    credito: 0,
    debito: 0,
    prazo: 0,
    totalSales: 0,
    entries: 0,
    exits: 0,
    opening: 0
  });

  const expectedFinal = totals.opening + totals.dinheiro + totals.entries - totals.exits;
  const difference = (session.finalValue || 0) - expectedFinal;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Extrato de Fechamento de Caixa', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Operador: ${currentUser?.username || 'N/A'}`, 15, 25);
    doc.text(`Abertura: ${new Date(session.openedAt).toLocaleString()}`, 15, 30);
    doc.text(`Fechamento: ${session.closedAt ? new Date(session.closedAt).toLocaleString() : 'N/A'}`, 15, 35);
    doc.text(`ID Sessão: ${session.id}`, 15, 40);

    const summaryData = [
      ['Valor de Abertura', `R$ ${totals.opening.toFixed(2)}`],
      ['Vendas em Dinheiro', `R$ ${totals.dinheiro.toFixed(2)}`],
      ['Vendas em PIX', `R$ ${totals.pix.toFixed(2)}`],
      ['Vendas em Crédito', `R$ ${totals.credito.toFixed(2)}`],
      ['Vendas em Débito', `R$ ${totals.debito.toFixed(2)}`],
      ['Vendas a Prazo', `R$ ${totals.prazo.toFixed(2)}`],
      ['Total de Vendas', `R$ ${totals.totalSales.toFixed(2)}`],
      ['Entradas (Suprimentos)', `R$ ${totals.entries.toFixed(2)}`],
      ['Saídas (Sangrias)', `R$ ${totals.exits.toFixed(2)}`],
      ['', ''],
      ['Valor Esperado em Caixa', `R$ ${expectedFinal.toFixed(2)}`],
      ['Valor Informado', `R$ ${session.finalValue?.toFixed(2) || '0.00'}`],
      ['Diferença / Quebra (Falta/Sobra)', `R$ ${difference.toFixed(2)}`],
      ['Troco para Próximo Caixa', `R$ ${session.keptAmount?.toFixed(2) || '0.00'}`]
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Descrição', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [13, 138, 188] }
    });

    doc.save(`fechamento_caixa_${session.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:p-0 print:bg-white print:static">
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:w-full"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0 print:text-black print:bg-white print:border-b print:border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-lg print:hidden">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Caixa Fechado com Sucesso</h2>
              <p className="text-slate-400 text-sm print:text-slate-600">Resumo da sessão #{session.id.slice(-6)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors print:hidden">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 print:overflow-visible">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3">
              <User className="text-slate-400" size={20} />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Operador</p>
                <p className="font-bold text-slate-800">{currentUser?.username}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3">
              <Calendar className="text-slate-400" size={20} />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Período</p>
                <p className="font-bold text-slate-800 text-xs">
                  {new Date(session.openedAt).toLocaleTimeString()} - {new Date(session.closedAt!).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <History size={16} /> Detalhamento de Vendas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <DollarSign size={14} />
                  <span className="text-[10px] font-bold uppercase">Dinheiro</span>
                </div>
                <p className="text-lg font-black text-slate-800">R$ {totals.dinheiro.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Pix size={14} />
                  <span className="text-[10px] font-bold uppercase">PIX</span>
                </div>
                <p className="text-lg font-black text-slate-800">R$ {totals.pix.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <CreditCard size={14} />
                  <span className="text-[10px] font-bold uppercase">Cartão</span>
                </div>
                <p className="text-lg font-black text-slate-800">R$ {(totals.credito + totals.debito).toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase">A Prazo</span>
                </div>
                <p className="text-lg font-black text-slate-800">R$ {totals.prazo.toFixed(2)}</p>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-lg col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <ShoppingCart size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase text-white">Total Vendas</span>
                </div>
                <p className="text-lg font-black text-white">R$ {totals.totalSales.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Cash Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                Movimentação de Caixa
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-sm text-slate-600">Valor de Abertura</span>
                  <span className="font-bold text-slate-800">R$ {totals.opening.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 text-green-700">
                    <ArrowUpCircle size={16} />
                    <span className="text-sm font-medium">Entradas (Suprimentos)</span>
                  </div>
                  <span className="font-bold text-green-700">+ R$ {totals.entries.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 text-red-700">
                    <ArrowDownCircle size={16} />
                    <span className="text-sm font-medium">Saídas (Sangrias)</span>
                  </div>
                  <span className="font-bold text-red-700">- R$ {totals.exits.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                Conferência Final
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-sm text-blue-700 font-medium">Valor Esperado (Dinheiro)</span>
                  <span className="font-bold text-blue-700">R$ {expectedFinal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-600">Valor Informado</span>
                  <span className="font-bold text-slate-800">R$ {session.finalValue?.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-lg border ${difference === 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                  <span className="text-sm font-bold">Diferença / Quebra</span>
                  <span className="font-black">R$ {difference.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Opening */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <DollarSign size={24} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Troco para Próxima Abertura</p>
                <p className="text-2xl font-black">R$ {session.keptAmount?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Status do Caixa</p>
              <p className="text-green-400 font-bold flex items-center gap-1 justify-end">
                <CheckCircle2 size={14} /> FECHADO
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Printer size={18} /> Imprimir Extrato
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Download size={18} /> Baixar PDF
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            Fechar e Ir para Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

const ShoppingCart = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);
