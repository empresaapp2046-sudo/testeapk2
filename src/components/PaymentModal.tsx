// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { FinancialRecord, SalePayment } from '../types';
import { 
  Check, Clock, MessageCircle, X, History, QrCode, Copy, 
  Receipt, ChevronDown, ChevronUp, Printer, Calendar, AlertCircle, 
  CheckCircle, AlertTriangle, Book, DollarSign, CreditCard, 
  Wallet, Plus, Trash2, Package, Layers
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { PaymentMethod } from '../types';
import { CarnePrinter } from './CarnePrinter';

export const crc16 = (buffer: string) => {
  let crc = 0xFFFF;
  const length = buffer.length;
  for (let i = 0; i < length; i++) {
    crc ^= buffer.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

export const formatField = (id: string, value: string) => {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
};

export const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase();
};

export const generatePixPayload = (key: string, name: string, city: string, amount: string, txid: string = '***') => {
  const cleanKey = key.replace(/[^a-zA-Z0-9@.+]/g, ""); 
  const cleanAmount = parseFloat(amount).toFixed(2);
  const cleanName = removeAccents(name || 'Recebedor').substring(0, 25);
  const cleanCity = removeAccents(city || 'BRASIL').substring(0, 15);
  let cleanTxid = txid === '***' ? '***' : txid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleanTxid) cleanTxid = '***';

  const payload = 
    formatField('00', '01') + 
    formatField('01', '12') + 
    formatField('26', 
      formatField('00', 'BR.GOV.BCB.PIX') +
      formatField('01', cleanKey)
    ) +
    formatField('52', '0000') + 
    formatField('53', '986') + 
    formatField('54', cleanAmount) + 
    formatField('58', 'BR') + 
    formatField('59', cleanName) + 
    formatField('60', cleanCity) + 
    formatField('62', 
       formatField('05', cleanTxid)
    ) + 
    '6304'; 

  return payload + crc16(payload);
};

export const getPaymentMethodInfo = (methodName?: string, note?: string) => {
  let m = (methodName || '').toLowerCase().trim();
  if (!m && note) {
    const match = note.match(/\(([^)]+)\)/);
    if (match) {
      m = match[1].toLowerCase().trim();
    } else if (note.toLowerCase().includes('dinheiro')) {
      m = 'dinheiro';
    } else if (note.toLowerCase().includes('pix')) {
      m = 'pix';
    } else if (note.toLowerCase().includes('crédito') || note.toLowerCase().includes('credito')) {
      m = 'crédito';
    } else if (note.toLowerCase().includes('débito') || note.toLowerCase().includes('debito')) {
      m = 'débito';
    } else if (note.toLowerCase().includes('prazo') || note.toLowerCase().includes('carnê')) {
      m = 'a prazo';
    }
  }

  if (m.includes('pix')) {
    return {
      label: 'Pix',
      icon: 'pix',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  }
  if (m.includes('dinheiro') || m.includes('cash')) {
    return {
      label: 'Dinheiro',
      icon: 'dinheiro',
      badgeClass: 'bg-green-100 text-green-800 border-green-300'
    };
  }
  if (m.includes('crédito') || m.includes('credito') || m.includes('credit')) {
    return {
      label: 'Cartão de Crédito',
      icon: 'credito',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300'
    };
  }
  if (m.includes('débito') || m.includes('debito') || m.includes('debit')) {
    return {
      label: 'Cartão de Débito',
      icon: 'debito',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    };
  }
  if (m.includes('prazo') || m.includes('carnê') || m.includes('carne') || m.includes('fiado')) {
    return {
      label: 'A Prazo / Carnê',
      icon: 'prazo',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  }
  return {
    label: methodName || 'Outro',
    icon: 'outro',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
  };
};

export const PaymentMethodBadgeView: React.FC<{ method?: string; note?: string; amount?: number; showIcon?: boolean }> = ({
  method,
  note,
  amount,
  showIcon = true
}) => {
  const info = getPaymentMethodInfo(method, note);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${info.badgeClass}`}>
      {showIcon && (
        <>
          {info.icon === 'dinheiro' && <DollarSign size={13} className="text-green-700" />}
          {info.icon === 'pix' && <QrCode size={13} className="text-emerald-700" />}
          {info.icon === 'credito' && <CreditCard size={13} className="text-blue-700" />}
          {info.icon === 'debito' && <CreditCard size={13} className="text-indigo-700" />}
          {info.icon === 'prazo' && <Calendar size={13} className="text-amber-700" />}
          {info.icon === 'outro' && <Wallet size={13} className="text-slate-700" />}
        </>
      )}
      <span>{info.label}</span>
      {amount !== undefined && (
        <span className="font-bold border-l border-current/20 pl-1.5 ml-0.5">
          R$ {amount.toFixed(2)}
        </span>
      )}
    </span>
  );
};

interface PaymentModalProps {
  record: FinancialRecord;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ record, onClose }) => {
  const { registerPayment, registerSplitPayment, settings, customers, sales, products, financialRecords } = useStore();
  
  // Payment mode: 'single' | 'split'
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  
  // Single payment states
  const [paymentAmount, setPaymentAmount] = useState<string>(record.amount.toString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'Dinheiro'>('Dinheiro');
  const [interestPercent, setInterestPercent] = useState<string>('');
  const [discountType, setDiscountType] = useState<'%' | 'R$'>('%');
  const [discountValue, setDiscountValue] = useState<string>('');

  // Split payment state
  interface SplitRow {
    method: 'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito';
    amount: string;
  }
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { method: 'Dinheiro', amount: '' },
    { method: 'Cartão de Débito', amount: '' }
  ]);

  const computedInterest = useMemo(() => {
    if (paymentMode === 'single' && paymentMethod === 'Crédito' && interestPercent) {
      const rate = parseFloat(interestPercent);
      if (!isNaN(rate) && rate > 0) {
        return record.amount * (rate / 100);
      }
    }
    return 0;
  }, [paymentMode, paymentMethod, interestPercent, record.amount]);

  const computedDiscount = useMemo(() => {
    if (paymentMode === 'single' && discountValue) {
      const val = parseFloat(discountValue);
      if (!isNaN(val) && val > 0) {
        if (discountType === '%') {
          return record.amount * (val / 100);
        } else {
          return val;
        }
      }
    }
    return 0;
  }, [paymentMode, discountType, discountValue, record.amount]);

  const totalToPay = useMemo(() => {
    return Math.max(0, record.amount + computedInterest - computedDiscount).toFixed(2);
  }, [record.amount, computedInterest, computedDiscount]);

  React.useEffect(() => {
    if (paymentMode === 'single') {
      setPaymentAmount(totalToPay);
    }
  }, [totalToPay, paymentMode]);

  // Split payment sums and balance calculations
  const splitTotalPaid = useMemo(() => {
    return splitRows.reduce((acc, row) => {
      const val = parseFloat(row.amount);
      return acc + (isNaN(val) || val <= 0 ? 0 : val);
    }, 0);
  }, [splitRows]);

  const splitRemainingDebt = useMemo(() => {
    return Math.max(0, record.amount - splitTotalPaid);
  }, [record.amount, splitTotalPaid]);

  const [showHistory, setShowHistory] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const [pixPayload, setPixPayload] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // State for Receipt Modal
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCarnePrinter, setShowCarnePrinter] = useState(false);
  const [expandSaleDetails, setExpandSaleDetails] = useState(false);

  // Check if fully paid
  const isFullyPaid = record.status === 'paid' || record.amount <= 0.01;

  // Find linked sale for the selected record
  const linkedSaleForRecord = useMemo(() => {
    const match = record.description.match(/Venda #(\d+)/);
    if (match && match[1]) {
      return sales.find(s => s.id === match[1]);
    }
    if (record.documentNumber) {
      const saleByDoc = sales.find(s => s.id === record.documentNumber || s.id.endsWith(record.documentNumber!));
      if (saleByDoc) return saleByDoc;
    }
    return null;
  }, [record, sales]);

  // Find all financial records related to the linked sale to check status of installments
  const linkedSaleRecords = useMemo(() => {
    if (!linkedSaleForRecord) {
      if (record.documentNumber) {
        return financialRecords.filter(r => r.documentNumber === record.documentNumber)
          .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      }
      return [record];
    }
    return financialRecords.filter(r => 
      r.documentNumber === linkedSaleForRecord.id || 
      r.documentNumber === linkedSaleForRecord.id.slice(-6) ||
      r.description.includes(`Venda #${linkedSaleForRecord.id}`) ||
      r.description.includes(`Venda #${linkedSaleForRecord.id.slice(-6)}`)
    ).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [linkedSaleForRecord, financialRecords, record]);

  const handleAddSplitRow = () => {
    setSplitRows(prev => [...prev, { method: 'Pix', amount: '' }]);
  };

  const handleRemoveSplitRow = (index: number) => {
    if (splitRows.length <= 1) return;
    setSplitRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index: number, field: 'method' | 'amount', value: string) => {
    setSplitRows(prev => prev.map((row, i) => {
      if (i === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handlePayment = async () => {
    if (paymentMode === 'single') {
      if (!paymentAmount) return;
      const value = parseFloat(paymentAmount);
      if (isNaN(value) || value < 0) {
        alert("Informe um valor válido.");
        return;
      }
      
      // If there's a discount, we pass it to registerPayment
      await registerPayment(record.id, value, paymentMethod, computedInterest, computedDiscount);

      if (value > (record.amount + computedInterest - computedDiscount) && (record.amount + computedInterest - computedDiscount) > 0) {
        const excess = value - (record.amount + computedInterest - computedDiscount);
        const nextInstallment = linkedSaleRecords.find(r => r.status !== 'paid' && r.id !== record.id);
        if (nextInstallment) {
          await registerPayment(nextInstallment.id, excess, paymentMethod, 0, 0);
          alert(`Pagamento registrado! Excedente de R$ ${excess.toFixed(2)} aplicado à próxima parcela.`);
        } else {
          alert("Pagamento registrado!");
        }
      } else {
        alert("Pagamento registrado com sucesso!");
      }
    } else {
      // Split payment processing
      const validSplits = splitRows.filter(r => {
        const amt = parseFloat(r.amount);
        return !isNaN(amt) && amt > 0;
      }).map(r => ({
        method: r.method,
        amount: parseFloat(r.amount)
      }));

      if (validSplits.length === 0) {
        alert("Informe os valores de pelo menos uma forma de pagamento.");
        return;
      }

      await registerSplitPayment(record.id, validSplits);
      alert("Pagamento misto registrado com sucesso!");
    }
    
    onClose();
  };

  const generatePix = () => {
    if (!settings.pixKey) { alert("Configure a chave Pix."); return; }
    try {
      const payload = generatePixPayload(settings.pixKey, settings.name || 'Smart PDV PRO', 'BRASIL', totalToPay);
      setPixPayload(payload);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(payload)}`);
      setShowPix(true);
    } catch (error) { alert("Erro ao gerar Pix."); }
  };

  const copyPix = () => { navigator.clipboard.writeText(pixPayload); alert("Copiado!"); };

  const getWhatsAppLink = (rec: FinancialRecord, withPix: boolean = false) => {
    const customer = customers.find(c => c.name === rec.entityName);
    const phone = customer?.phone;
    if (!phone) { return null; }
    let msg = settings.whatsappMessageTemplate.replace('{cliente}', rec.entityName).replace('{pedido}', rec.description).replace('{valor}', parseFloat(paymentAmount).toFixed(2));
    if (withPix && pixPayload) msg += `\n\n💰 Pix Copia e Cola:\n${pixPayload}`;
    return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
  };

  const getInstallmentDetails = (payment: SalePayment) => {
    let label = payment.method as string;
    if (payment.method === 'A Prazo') {
      if (payment.installmentNumber && payment.totalInstallments) { 
        label = `A Prazo (${payment.installmentNumber}/${payment.totalInstallments})`; 
      } else { 
        label = `A Prazo`; 
      }
    }
    if (payment.interestRate && payment.interestRate > 0) {
      const installmentsCount = payment.totalInstallments || 1;
      const individualRate = payment.interestRate / installmentsCount;
      label += ` (+${individualRate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% Juros: R$ ${payment.interestAmount?.toFixed(2)})`;
    }
    if (payment.method !== 'A Prazo') { 
      const paidDate = linkedSaleForRecord ? new Date(linkedSaleForRecord.date).toLocaleDateString('pt-BR') : ''; 
      return { text: `${label} - Pago - ${paidDate}`, statusColor: 'text-green-700 font-medium' }; 
    }
    const pDate = payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : null;
    const match = linkedSaleRecords.find(r => { 
      const rDate = new Date(r.dueDate).toISOString().split('T')[0]; 
      const amtMatch = Math.abs(r.originalAmount - payment.amount) < 0.05; 
      if (pDate) { return amtMatch && rDate === pDate; } 
      return amtMatch; 
    });
    if (match) {
      if (match.status === 'paid') { 
        let payDate = ''; 
        let payMethod = '';
        if (match.history && match.history.length > 0) { 
          const lastH = match.history[match.history.length - 1];
          payDate = new Date(lastH.date).toLocaleDateString('pt-BR'); 
          const m = lastH.method || lastH.note?.match(/Pagamento Realizado \((.*?)\)/)?.[1];
          if (m) payMethod = ` - ${m}`;
        } 
        return { text: `${label} - Pago${payMethod} - ${payDate}`, statusColor: 'text-green-700 font-medium' }; 
      } else { 
        const today = new Date(); today.setHours(0,0,0,0); 
        const due = new Date(match.dueDate); due.setHours(0,0,0,0); 
        const dueDateStr = due.toLocaleDateString('pt-BR'); 
        const diffTime = due.getTime() - today.getTime(); 
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays < 0) { 
          return { text: `${label} - Vencido - ${dueDateStr}`, statusColor: 'text-red-600 font-bold' }; 
        } else if (diffDays === 0) { 
          return { text: `${label} - Vencendo Hoje`, statusColor: 'text-orange-600 font-bold' }; 
        } else if (diffDays === 1) { 
          return { text: `${label} - Vence Amanhã`, statusColor: 'text-orange-600 font-bold' }; 
        } else { 
          return { text: `${label} - Vence - ${dueDateStr}`, statusColor: 'text-slate-600' }; 
        } 
      }
    } else { 
      if (payment.dueDate) {
        const due = new Date(payment.dueDate);
        const dueDateStr = due.toLocaleDateString('pt-BR');
        return { text: `${label} - Vence - ${dueDateStr}`, statusColor: 'text-slate-600' };
      }
      return { text: `${label} - N/A`, statusColor: 'text-slate-400' }; 
    }
  };

  const handleReprint = () => { if (linkedSaleForRecord) setShowReceipt(true); };

  if (showReceipt && linkedSaleForRecord) {
    const customer = customers.find(c => c.id === linkedSaleForRecord.customerId);
    return ( 
      <ReceiptModal 
        sale={linkedSaleForRecord} 
        settings={settings} 
        customer={customer} 
        onClose={() => setShowReceipt(false)} 
      /> 
    );
  }

  return (
    <div id="payment_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div id="payment_modal_container" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden border border-slate-100">
        
        {/* MODAL HEADER */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg">
                {record.type === 'receivable' || record.type === 'personal_receivable' ? 'Receber Pagamento' : 'Pagar Despesa'}
              </h3>
              <p className="text-xs text-slate-300">
                {record.entityName} • {record.description}
              </p>
            </div>
          </div>
          <button 
            id="payment_modal_close_btn"
            onClick={onClose} 
            className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 md:p-5 space-y-4 overflow-y-auto bg-slate-50/50">
          {!showHistory ? (
            <>
              {/* SUMMARY OF THE CURRENT PARCEL */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente / Devedor</span>
                    <p className="font-bold text-slate-800 text-sm">{record.entityName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{record.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Desta Parcela</span>
                    <p className="font-bold text-slate-800 text-base">
                      R$ {(record.originalAmount || record.amount).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Venc: {new Date(record.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* BAIXAS / PAGAMENTOS JÁ REALIZADOS NESTA PARCELA */}
                {record.history && record.history.length > 0 && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-emerald-900 border-b border-emerald-200 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-emerald-600" />
                        Baixas Já Registradas Nesta Parcela:
                      </span>
                      <span>
                        Total Pago: R$ {record.history.reduce((a, h) => a + h.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {record.history.map((h, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <div className="flex items-center gap-2">
                            <PaymentMethodBadgeView method={h.method} note={h.note} />
                            <span className="text-[11px] text-slate-500">
                              {new Date(h.date).toLocaleDateString('pt-BR')} às {new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-700 text-sm">
                            + R$ {h.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {!isFullyPaid && (
                      <div className="pt-1 flex justify-between items-center text-xs font-bold text-amber-900 border-t border-emerald-200">
                        <span>Restante Devedor:</span>
                        <span className="text-red-600 font-extrabold text-sm">
                          R$ {record.amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PRODUCTS & ORIGINAL SALE OVERVIEW IF LINKED */}
              {linkedSaleForRecord && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-xs overflow-hidden">
                  <button 
                    onClick={() => setExpandSaleDetails(!expandSaleDetails)} 
                    className="w-full flex items-center justify-between p-3.5 bg-blue-50/70 hover:bg-blue-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-bold text-blue-900 text-xs sm:text-sm">
                      <Receipt size={16} className="text-blue-600" /> 
                      Itens e Formas da Venda Original (#{linkedSaleForRecord.id.slice(-6)})
                    </div>
                    <div className="text-blue-600 flex items-center gap-1 text-xs">
                      <span>{linkedSaleForRecord.items.length} itens</span>
                      {expandSaleDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {expandSaleDetails && (
                    <div className="p-3.5 border-t border-blue-100 space-y-3 animate-fade-in bg-white">
                      {/* Products List with Images */}
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                          <Package size={13} className="text-slate-400" /> Produtos da Venda:
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {linkedSaleForRecord.items.map((item, idx) => {
                            const catalogProd = products.find(p => p.id === item.id || p.name === item.name);
                            const prodImg = item.image || catalogProd?.image;
                            return (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                    {prodImg ? (
                                      <img src={prodImg} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package size={18} className="text-slate-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                                    <p className="text-[11px] text-slate-500">
                                      {item.quantity} un x R$ {item.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-bold text-slate-700">
                                  R$ {(item.quantity * item.price).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment Methods of Sale */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-600 uppercase mb-1.5">
                          Condições / Parcelas da Venda:
                        </p>
                        <div className="space-y-1.5">
                          {linkedSaleForRecord.payments.map((p, i) => {
                            const { text, statusColor } = getInstallmentDetails(p);
                            return (
                              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 text-xs border border-slate-100">
                                <div className="flex items-center gap-2">
                                  <PaymentMethodBadgeView method={p.method} />
                                  <span className={`text-[11px] ${statusColor}`}>{text}</span>
                                </div>
                                <span className="font-bold text-slate-700">R$ {p.amount.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENT REGISTRATION SECTION (IF NOT FULLY PAID) */}
              {!isFullyPaid ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  
                  {/* TABS: FORMA ÚNICA VS PAGAMENTO MISTO / DIVIDIDO */}
                  <div>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Modo de Recebimento
                    </span>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPaymentMode('single')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          paymentMode === 'single'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <DollarSign size={14} /> Forma Única
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode('split')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          paymentMode === 'split'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Layers size={14} /> Pagamento Misto (2+ Formas)
                      </button>
                    </div>
                  </div>

                  {/* 1. SINGLE PAYMENT MODE */}
                  {paymentMode === 'single' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Forma de Baixa</label>
                          <select 
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium text-slate-800"
                          >
                            <option value="Dinheiro">💵 Dinheiro</option>
                            <option value="Pix">💠 PIX</option>
                            <option value="Débito">💳 Cartão de Débito</option>
                            <option value="Crédito">💳 Cartão de Crédito</option>
                          </select>
                        </div>
                        
                        {paymentMethod === 'Crédito' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Juros (%)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="Ex: 5"
                              value={interestPercent}
                              onChange={(e) => setInterestPercent(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                            />
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Desconto</label>
                          <div className="flex gap-2">
                            <select 
                              value={discountType}
                              onChange={(e) => setDiscountType(e.target.value as any)}
                              className="w-20 px-2 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium text-slate-800"
                            >
                              <option value="%">%</option>
                              <option value="R$">R$</option>
                            </select>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="Valor"
                              value={discountValue}
                              onChange={(e) => setDiscountValue(e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Value Input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Valor a Receber (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">R$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-extrabold text-slate-900 text-base" 
                            value={paymentAmount} 
                            onChange={(e) => { setPaymentAmount(e.target.value); setShowPix(false); }} 
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Saldo Restante da Parcela:</span>
                          <span className="font-bold">R$ {record.amount.toFixed(2)}</span>
                        </div>
                        {computedInterest > 0 && (
                          <div className="flex justify-between text-amber-600 font-medium">
                            <span>Juros Cartão:</span>
                            <span>+ R$ {computedInterest.toFixed(2)}</span>
                          </div>
                        )}
                        {computedDiscount > 0 && (
                          <div className="flex justify-between text-blue-600 font-medium">
                            <span>Desconto Aplicado:</span>
                            <span>- R$ {computedDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1">
                          <span>Total Desta Baixa:</span>
                          <span className="text-emerald-600 font-extrabold text-sm">
                            R$ {parseFloat(paymentAmount || '0').toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. SPLIT PAYMENT MODE (MÚLTIPLAS FORMAS NA MESMA PARCELA) */}
                  {paymentMode === 'split' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">
                          Distribuição das Formas de Pagamento:
                        </span>
                        <button
                          type="button"
                          onClick={handleAddSplitRow}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                        >
                          <Plus size={13} /> Adicionar Forma
                        </button>
                      </div>

                      {/* Split Rows */}
                      <div className="space-y-2">
                        {splitRows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <select
                              value={row.method}
                              onChange={(e) => handleSplitChange(idx, 'method', e.target.value)}
                              className="w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                              <option value="Dinheiro">💵 Dinheiro</option>
                              <option value="Pix">💠 PIX</option>
                              <option value="Cartão de Débito">💳 Cartão de Débito</option>
                              <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                            </select>

                            <div className="relative w-1/2">
                              <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={row.amount}
                                onChange={(e) => handleSplitChange(idx, 'amount', e.target.value)}
                                className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                              />
                            </div>

                            {splitRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSplitRow(idx)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Remover Forma"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Split Summary */}
                      <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Valor Total Desta Parcela:</span>
                          <span className="font-bold">R$ {record.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold">
                          <span>Soma das Formas Informadas:</span>
                          <span className="font-extrabold text-sm">R$ {splitTotalPaid.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-emerald-200/80 pt-1 flex justify-between items-center font-bold">
                          <span>Status Após Esta Baixa:</span>
                          {splitRemainingDebt <= 0.01 ? (
                            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                              ✔ Quitado Totalmente
                            </span>
                          ) : (
                            <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                              Falta: R$ {splitRemainingDebt.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                  <CheckCircle size={24} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Esta parcela já foi totalmente quitada!</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Todas as baixas foram registradas com sucesso.</p>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="space-y-2.5 pt-2">
                {!isFullyPaid && (
                  <button 
                    id="payment_modal_confirm_btn"
                    onClick={handlePayment} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all text-sm cursor-pointer"
                  >
                    <Check size={18} /> Confirmar Baixa
                  </button>
                )}

                {(record.type === 'receivable' || record.type === 'personal_receivable') && !isFullyPaid && (
                  <>
                    <button 
                      onClick={generatePix} 
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl font-medium flex justify-center items-center gap-2 text-xs transition-colors"
                    >
                      <QrCode size={16} /> {showPix ? 'Atualizar Chave / QR Code Pix' : 'Gerar QR Code Pix'}
                    </button>

                    {showPix && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col items-center animate-fade-in">
                        <img src={qrCodeUrl} alt="QR Code Pix" className="w-44 h-44 mb-3 bg-white p-2 rounded-lg shadow-xs border border-slate-100" />
                        <div className="w-full grid grid-cols-2 gap-2">
                          <button onClick={copyPix} className="flex justify-center items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg text-xs font-semibold">
                            <Copy size={13} /> Copiar Código
                          </button>
                          <a href={getWhatsAppLink(record, true) || '#'} target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-1 bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg text-xs font-semibold">
                            <MessageCircle size={13} /> Enviar Pix WhatsApp
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {linkedSaleForRecord && (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setShowCarnePrinter(true)} 
                      className="flex justify-center items-center gap-1.5 py-2.5 rounded-xl border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors text-xs font-bold"
                    >
                      <Book size={15} /> Imprimir Carnê
                    </button>
                    <button 
                      onClick={handleReprint} 
                      className="flex justify-center items-center gap-1.5 py-2.5 rounded-xl border border-blue-200 text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors text-xs font-bold"
                    >
                      <Printer size={15} /> Imprimir Cupom
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => setShowHistory(true)} 
                  className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors text-xs font-bold"
                >
                  <History size={16} /> Ver Histórico Completo de Todas as Parcelas
                </button>
              </div>
            </>
          ) : (
            /* HISTÓRICO COMPLETO DA VENDA / CONTA */
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <History size={18} className="text-blue-600" /> Histórico Financeiro Completo
                </div>
                <button 
                  onClick={() => setShowHistory(false)} 
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Voltar para Pagamento
                </button>
              </div>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {linkedSaleRecords.length > 0 ? (
                  linkedSaleRecords.map((r) => {
                    const isPaid = r.status === 'paid' || r.amount <= 0.01;
                    const paidAmt = (r.history || []).reduce((acc, h) => acc + h.amount, 0);
                    const origAmt = r.originalAmount || (r.amount + paidAmt);
                    const remAmt = r.amount;

                    return (
                      <div key={r.id} className={`p-3.5 rounded-xl border ${isPaid ? 'border-emerald-200 bg-emerald-50/50' : r.status === 'partial' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'} space-y-2`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{r.description}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} /> Vencimento: {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-800">
                              R$ {origAmt.toFixed(2)}
                            </span>
                            <div className="mt-0.5">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle size={10} /> Quitado
                                </span>
                              ) : r.status === 'partial' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                  <AlertCircle size={10} /> Parcial
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                  <Clock size={10} /> Pendente
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Baixas / Formas de Pagamento desta parcela */}
                        {r.history && r.history.length > 0 && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Baixas Realizadas Nesta Parcela:
                            </p>
                            {r.history.map((h, hIdx) => (
                              <div key={hIdx} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <PaymentMethodBadgeView method={h.method} note={h.note} />
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(h.date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <span className="font-bold text-emerald-600">
                                  + R$ {h.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            
                            {!isPaid && (
                              <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-red-600">
                                <span>Saldo Devedor / Falta:</span>
                                <span>R$ {remAmt.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Nenhum histórico de parcelas disponível.
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowHistory(false)} 
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Voltar para Pagamento
              </button>
            </div>
          )}
        </div>
      </div>

      {showCarnePrinter && linkedSaleForRecord && (
        <CarnePrinter 
          sale={linkedSaleForRecord} 
          settings={settings} 
          customer={customers.find(c => c.id === linkedSaleForRecord.customerId)} 
          onClose={() => setShowCarnePrinter(false)} 
        />
      )}
    </div>
  );
};
