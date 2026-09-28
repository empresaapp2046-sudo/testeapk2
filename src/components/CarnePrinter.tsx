// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Sale, CompanySettings, Customer } from '../types';
import { Printer, X, QrCode } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { generatePixPayload } from './PaymentModal';

interface CarnePrinterProps {
    sale: Sale;
    settings: CompanySettings;
    customer?: Customer;
    onClose: () => void;
}

export const CarnePrinter: React.FC<CarnePrinterProps> = ({ sale, settings, customer, onClose }) => {
    const { financialRecords = [] } = useStore() || {};
    // Only term payments
    const installments = sale.payments.filter(p => p.method === 'A Prazo');
    const [selectedIndices, setSelectedIndices] = useState<number[]>(installments.map((_, i) => i));
    const [useCorrectedValue, setUseCorrectedValue] = useState(false);

    const toggleSelection = (index: number) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else {
            setSelectedIndices([...selectedIndices, index].sort((a,b) => a-b));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const toPrint = selectedIndices.map(i => installments[i]);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-carne, #printable-carne * { visibility: visible; }
                        #printable-carne { position: absolute; left: 0; top: 0; width: 100%; }
                        @page { margin: 10mm; size: A4 portrait; }
                        .no-print { display: none !important; }
                        .carne-page { page-break-after: always; }
                        .carne-page:last-child { page-break-after: auto; }
                    }
                `}</style>

                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0 no-print">
                    <h2 className="text-lg font-bold text-slate-800">Imprimir Carnê</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-auto flex flex-col md:flex-row no-print">
                    {/* Controls */}
                    <div className="p-4 border-r border-slate-200 w-full md:w-64 shrink-0 bg-white">
                        <h3 className="font-bold text-slate-700 mb-4">Configurações</h3>
                        
                        <div className="mb-6 p-3 bg-blue-50 rounded-xl border border-blue-100">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={useCorrectedValue}
                              onChange={(e) => setUseCorrectedValue(e.target.checked)}
                              className="w-4 h-4 rounded text-blue-600"
                            />
                            <span className="text-xs font-bold text-blue-900 leading-tight">
                              Mostrar saldo restante (Valor Corrigido)
                            </span>
                          </label>
                          <p className="text-[10px] text-blue-700 mt-1">
                            Se marcado, mostra o valor que falta pagar caso já tenha ocorrido abatimento.
                          </p>
                        </div>

                        <h3 className="font-bold text-slate-700 mb-2">Selecionar Parcelas</h3>
                        <button 
                            onClick={() => setSelectedIndices(installments.map((_, i) => i))}
                            className="text-xs text-blue-600 hover:underline mb-2 block"
                        >Selecionar Todas</button>
                        <div className="space-y-2 max-h-60 overflow-auto">
                            {installments.map((inst, idx) => (
                                <label key={idx} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIndices.includes(idx)} 
                                        onChange={() => toggleSelection(idx)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-[11px] leading-tight">
                                        <span className="font-bold block">Parcela {inst.installmentNumber}/{inst.totalInstallments}</span>
                                        R$ {inst.amount.toFixed(2)} - {new Date(inst.dueDate || '').toLocaleDateString('pt-BR')}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Preview Container */}
                    <div className="flex-1 p-8 bg-slate-100 overflow-auto flex items-start justify-center">
                        <div id="printable-carne" className="bg-white text-black print:bg-white w-[210mm] print:w-full min-h-[297mm] print:min-h-0  mx-auto shadow-sm print:shadow-none font-sans text-sm p-4">
                            {Array.from({ length: Math.ceil(toPrint.length / 4) }).map((_, pageIndex) => {
                                const pageItems = toPrint.slice(pageIndex * 4, pageIndex * 4 + 4);
                                return (
                                    <div key={pageIndex} className="carne-page flex flex-col gap-4 box-border pb-4">
                                        {pageItems.map((inst, idx) => {
                                            let isPaid = false;
                                            let paidDate = '';
                                            let currentBalance = inst.amount;

                                            const pDate = inst.dueDate ? new Date(inst.dueDate).toISOString().split('T')[0] : null;
                                            const match = financialRecords.find(r => 
                                                (r.documentNumber === sale.id || r.description.includes(`Venda #${sale.id}`)) &&
                                                Math.abs(r.originalAmount - inst.amount) < 0.05 &&
                                                (!pDate || new Date(r.dueDate).toISOString().split('T')[0] === pDate)
                                            );

                                            if (match) {
                                                currentBalance = match.amount; // Remaining balance in financial record
                                                if (match.status === 'paid') {
                                                    isPaid = true;
                                                    if (match.history && match.history.length > 0) {
                                                        paidDate = new Date(match.history[match.history.length - 1].date).toLocaleDateString('pt-BR');
                                                    } else {
                                                        paidDate = new Date().toLocaleDateString('pt-BR');
                                                    }
                                                }
                                            }

                                            const displayAmount = useCorrectedValue ? currentBalance : inst.amount;
                                            
                                            return (
                                                <div key={idx} className="relative flex border border-dashed border-gray-400 h-[65mm] p-2 overflow-hidden">
                                                    {isPaid && (
                                                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                                            <div className="transform -rotate-12 border-4 border-red-500 text-red-500 font-black text-4xl px-6 py-2 opacity-30 whitespace-nowrap">
                                                                PAGO - {paidDate}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* VIA DO CLIENTE */}
                                                    <div className="w-1/3 border-r border-dashed border-gray-400 flex flex-col p-2 bg-gray-50/50">
                                                        <div className="text-center border-b border-gray-300 pb-2 mb-2">
                                                            <h4 className="font-bold text-xs uppercase">{settings.name || 'Smart PDV PRO'}</h4>
                                                            <p className="text-[9px] text-gray-600">Recibo do Cliente</p>
                                                        </div>
                                                        
                                                        <div className="flex-1 space-y-1 text-[10px]">
                                                            <div className="flex justify-between"><span>Parcela:</span> <strong>{inst.installmentNumber} / {inst.totalInstallments}</strong></div>
                                                            <div className="flex justify-between"><span>Vencimento:</span> <strong>{new Date(inst.dueDate || '').toLocaleDateString('pt-BR')}</strong></div>
                                                            <div className="flex justify-between text-base mt-2 pt-2 border-t border-gray-300">
                                                                <span>Valor:</span> <strong className="whitespace-nowrap">R$ {displayAmount.toFixed(2)}</strong>
                                                            </div>
                                                            
                                                            {settings.pixKey && !isPaid && (
                                                                <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col items-center">
                                                                    <img 
                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatePixPayload(settings.pixKey, settings.name || 'Loja', settings.city || 'BRASIL', displayAmount.toString(), `REC${inst.installmentNumber}S${sale.id.substring(0,8)}`))}`} 
                                                                        alt="PIX QR" 
                                                                        className="w-16 h-16"
                                                                    />
                                                                    <span className="text-[7px] text-gray-400 mt-1 uppercase font-bold">Pague com PIX</span>
                                                                </div>
                                                            )}

                                                            <div className="mt-2 break-words"><span>Para:</span> <br/> <strong>{customer?.name || 'Cliente'}</strong></div>
                                                        </div>
                                                        <div className="mt-auto text-[8px] text-gray-500 pt-1 border-t border-gray-300">
                                                            Emissão: {new Date(sale.date).toLocaleDateString('pt-BR')}
                                                        </div>
                                                    </div>

                                                    {/* VIA DA LOJA */}
                                                    <div className="w-2/3 flex flex-col p-2 ml-2">
                                                        <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-2">
                                                            {settings.logo ? (
                                                                <img src={settings.logo} className="h-6 object-contain" alt="Logo" />
                                                            ) : (
                                                                <h4 className="font-bold text-sm uppercase">{settings.name || 'Smart PDV PRO'}</h4>
                                                            )}
                                                            <div className="text-right text-[9px] text-gray-600">
                                                                {settings.phone && <div>Tel: {settings.phone}</div>}
                                                                {settings.cnpj && <div>CNPJ: {settings.cnpj}</div>}
                                                            </div>
                                                        </div>

                                                        <div className="flex bg-gray-100 p-2 rounded mb-2 text-xs">
                                                            <div className="flex-1">
                                                                <div className="text-[10px] text-gray-500">Sacado</div>
                                                                <div className="font-bold truncate max-w-[200px]">{customer?.name || 'Cliente não identificado'}</div>
                                                                {customer?.cpf && <div className="text-[10px]">CPF: {customer.cpf}</div>}
                                                            </div>
                                                            <div className="text-right ml-4">
                                                                <div className="text-[10px] text-gray-500">Parcela / Venda</div>
                                                                <div className="font-bold">Nº {inst.installmentNumber}/{inst.totalInstallments} - Vd {sale.id.slice(-6)}</div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 flex-1">
                                                            <div className="space-y-3">
                                                                <div className="border-b border-gray-300 pb-1">
                                                                    <div className="text-[10px] text-gray-500">Data da Venda</div>
                                                                    <div className="font-bold text-xs">{new Date(sale.date).toLocaleDateString('pt-BR')}</div>
                                                                </div>
                                                                <div className="border-b border-gray-300 pb-1">
                                                                    <div className="text-[10px] text-gray-500">Valor (=)</div>
                                                                    <div className="font-bold text-base">R$ {displayAmount.toFixed(2)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="border-b border-gray-300 pb-1">
                                                                    <div className="text-[10px] text-gray-500">Vencimento</div>
                                                                    <div className="font-bold text-sm">{new Date(inst.dueDate || '').toLocaleDateString('pt-BR')}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto pt-4 border-t border-dashed border-gray-300 flex justify-between items-end">
                                                            <div className="flex-1 mr-4">
                                                                <div className="w-full border-b border-gray-400 h-6"></div>
                                                                <div className="text-[9px] text-gray-500 text-center mt-1">Assinatura / Carimbo do Estabelecimento</div>
                                                            </div>
                                                            {settings.pixKey && !isPaid && (
                                                                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded border border-gray-200">
                                                                    <div className="text-right">
                                                                        <div className="text-[8px] font-bold text-gray-600">Pague com</div>
                                                                        <div className="text-[10px] font-black text-emerald-600 italic">PIX</div>
                                                                    </div>
                                                                    <img 
                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatePixPayload(settings.pixKey, settings.name || 'Loja', settings.city || 'BRASIL', displayAmount.toString(), `REC${inst.installmentNumber}S${sale.id.substring(0,8)}`))}`} 
                                                                        alt="PIX QR" 
                                                                        className="w-12 h-12"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-end gap-3 no-print">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white font-bold rounded flex items-center gap-2 hover:bg-blue-700">
                        <Printer size={18} /> Imprimir Carnê ({selectedIndices.length})
                    </button>
                </div>
            </div>
        </div>
    );
};
