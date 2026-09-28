// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { RaffleCampaign, Sale, Customer, CompanySettings } from '../types';
import { useStore } from '../context/StoreContext';
import { X, Search, Ticket, User, Calendar, Printer, AlertTriangle, CheckCircle2, XCircle, RefreshCw, FileText, Filter, ShieldAlert } from 'lucide-react';
import { generateSingleCouponReceiptContent, printHtml } from '../services/printerService';

interface RaffleCampaignInfoModalProps {
  campaign: RaffleCampaign;
  onClose: () => void;
}

interface CouponEntry {
  saleId: string;
  saleDate: string;
  saleTotal: number;
  couponNumber: string;
  status: 'valid' | 'invalid';
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerBairro: string;
  customerStreet: string;
  customerId: string | null;
  invalidatedAt?: string;
  invalidatedReason?: string;
  isReprint?: boolean;
}

export const RaffleCampaignInfoModal: React.FC<RaffleCampaignInfoModalProps> = ({ campaign, onClose }) => {
  const { sales, customers, settings, updateSale } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  
  // Sub-modal state for reprinting
  const [selectedCouponForReprint, setSelectedCouponForReprint] = useState<CouponEntry | null>(null);
  const [reprintCustomName, setReprintCustomName] = useState('');
  const [reprintOption, setReprintOption] = useState<'fill' | 'blank'>('fill');
  const [isProcessingReprint, setIsProcessingReprint] = useState(false);

  // Collect all coupon entries for this campaign
  const allCoupons = useMemo(() => {
    const list: CouponEntry[] = [];

    const campaignSales = sales.filter(s => s.raffleCampaignId === campaign.id || (s.raffleCoupons && s.raffleCoupons.length > 0));

    campaignSales.forEach(s => {
      // Find customer
      let cName = 'Cliente Balcão';
      let cPhone = '';
      let cCity = '';
      let cBairro = '';
      let cStreet = '';
      let cId: string | null = null;

      if (s.customerId && s.customerId !== 'def') {
        const found = customers.find(c => c.id === s.customerId);
        if (found) {
          cName = found.name;
          cPhone = found.phone || '';
          cCity = found.city || '';
          cBairro = found.apartment || '';
          cStreet = found.street ? `${found.street}${found.number ? ', ' + found.number : ''}` : '';
          cId = found.id;
        }
      } else if (s.unregisteredCustomer && s.unregisteredCustomer.name) {
        cName = s.unregisteredCustomer.name;
        cPhone = s.unregisteredCustomer.phone || '';
      }

      // 1. Process Valid Coupons
      if (s.raffleCoupons && s.raffleCoupons.length > 0) {
        s.raffleCoupons.forEach(cpNumber => {
          const detail = s.raffleCouponDetails?.find(d => d.couponNumber === cpNumber);
          list.push({
            saleId: s.id,
            saleDate: s.date,
            saleTotal: s.total,
            couponNumber: cpNumber,
            status: 'valid',
            customerName: cName,
            customerPhone: cPhone,
            customerCity: cCity,
            customerBairro: cBairro,
            customerStreet: cStreet,
            customerId: cId,
            isReprint: detail?.isReprint
          });
        });
      }

      // 2. Process Invalidated / Canceled Coupons
      if (s.invalidRaffleCoupons && s.invalidRaffleCoupons.length > 0) {
        s.invalidRaffleCoupons.forEach(cpNumber => {
          const detail = s.raffleCouponDetails?.find(d => d.couponNumber === cpNumber);
          list.push({
            saleId: s.id,
            saleDate: s.date,
            saleTotal: s.total,
            couponNumber: cpNumber,
            status: 'invalid',
            customerName: cName,
            customerPhone: cPhone,
            customerCity: cCity,
            customerBairro: cBairro,
            customerStreet: cStreet,
            customerId: cId,
            invalidatedAt: detail?.invalidatedAt,
            invalidatedReason: detail?.invalidatedReason || 'Substituído por Reimpressão / Cancelado'
          });
        });
      }

      // 3. Fallback for details array if invalid coupons were not explicitly separated in array
      if (s.raffleCouponDetails) {
        s.raffleCouponDetails.forEach(detail => {
          const alreadyAdded = list.some(item => item.couponNumber === detail.couponNumber);
          if (!alreadyAdded) {
            list.push({
              saleId: s.id,
              saleDate: s.date,
              saleTotal: s.total,
              couponNumber: detail.couponNumber,
              status: detail.status,
              customerName: cName,
              customerPhone: cPhone,
              customerCity: cCity,
              customerBairro: cBairro,
              customerStreet: cStreet,
              customerId: cId,
              invalidatedAt: detail.invalidatedAt,
              invalidatedReason: detail.invalidatedReason || 'Anulado',
              isReprint: detail.isReprint
            });
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, campaign.id, customers]);

  // Metrics
  const totalCouponsCount = allCoupons.length;
  const validCouponsCount = allCoupons.filter(c => c.status === 'valid').length;
  const invalidCouponsCount = allCoupons.filter(c => c.status === 'invalid').length;
  const uniqueCustomersCount = new Set(allCoupons.map(c => c.customerId || c.customerName)).size;

  // Filtered List
  const filteredCoupons = useMemo(() => {
    return allCoupons.filter(coupon => {
      // Filter by Status
      if (statusFilter === 'valid' && coupon.status !== 'valid') return false;
      if (statusFilter === 'invalid' && coupon.status !== 'invalid') return false;

      // Filter by Search Term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        coupon.couponNumber.toLowerCase().includes(term) ||
        coupon.customerName.toLowerCase().includes(term) ||
        coupon.customerPhone.toLowerCase().includes(term) ||
        coupon.saleId.toLowerCase().includes(term)
      );
    });
  }, [allCoupons, statusFilter, searchTerm]);

  // Open Reprint Submodal
  const handleOpenReprint = (coupon: CouponEntry) => {
    setSelectedCouponForReprint(coupon);
    setReprintCustomName(coupon.customerName !== 'Cliente Balcão' ? coupon.customerName : '');
    setReprintOption(coupon.customerName !== 'Cliente Balcão' ? 'fill' : 'blank');
  };

  // Confirm Reprint Logic
  const handleConfirmReprint = async () => {
    if (!selectedCouponForReprint) return;
    setIsProcessingReprint(true);

    try {
      const targetSale = sales.find(s => s.id === selectedCouponForReprint.saleId);
      if (!targetSale) {
        alert('Venda de origem não encontrada.');
        setIsProcessingReprint(false);
        return;
      }

      // 1. Generate New Coupon Number
      const newCouponNumber = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Update Sale Raffle Coupons
      const oldCouponNumber = selectedCouponForReprint.couponNumber;

      const updatedValidCoupons = (targetSale.raffleCoupons || []).filter(c => c !== oldCouponNumber);
      updatedValidCoupons.push(newCouponNumber);

      const updatedInvalidCoupons = [...(targetSale.invalidRaffleCoupons || [])];
      if (!updatedInvalidCoupons.includes(oldCouponNumber)) {
        updatedInvalidCoupons.push(oldCouponNumber);
      }

      const existingDetails = targetSale.raffleCouponDetails || [];
      const updatedDetails = existingDetails.map(d => {
        if (d.couponNumber === oldCouponNumber) {
          return {
            ...d,
            status: 'invalid' as const,
            invalidatedAt: new Date().toISOString(),
            invalidatedReason: 'Substituído por reimpressão (2ª Via)',
            replacedByCoupon: newCouponNumber
          };
        }
        return d;
      });

      // Add record for old coupon if not in details
      if (!updatedDetails.some(d => d.couponNumber === oldCouponNumber)) {
        updatedDetails.push({
          couponNumber: oldCouponNumber,
          status: 'invalid',
          invalidatedAt: new Date().toISOString(),
          invalidatedReason: 'Substituído por reimpressão (2ª Via)',
          replacedByCoupon: newCouponNumber
        });
      }

      // Add record for new coupon
      updatedDetails.push({
        couponNumber: newCouponNumber,
        status: 'valid',
        printedName: reprintOption === 'fill' ? reprintCustomName : '',
        isReprint: true
      });

      const updatedSale: Sale = {
        ...targetSale,
        raffleCoupons: updatedValidCoupons,
        invalidRaffleCoupons: updatedInvalidCoupons,
        raffleCouponDetails: updatedDetails
      };

      // 3. Save via updateSale
      await updateSale(updatedSale);

      // 4. Print Thermal Receipt for New Coupon
      const customerDataToPrint = {
        name: reprintOption === 'fill' ? (reprintCustomName || selectedCouponForReprint.customerName) : '',
        phone: selectedCouponForReprint.customerPhone,
        city: selectedCouponForReprint.customerCity,
        bairro: selectedCouponForReprint.customerBairro,
        street: selectedCouponForReprint.customerStreet
      };

      const htmlContent = generateSingleCouponReceiptContent(
        newCouponNumber,
        campaign.title,
        campaign.prize,
        settings,
        customerDataToPrint,
        {
          isReprint: true,
          isInvalid: false,
          fillCustomerName: reprintOption === 'fill'
        }
      );

      printHtml(htmlContent);

      alert(`✅ Sucesso! Cupom Nº ${oldCouponNumber} foi INVALIDADO (marcado com X).\n\nNovo Cupom Nº ${newCouponNumber} gerado e enviado para impressão!`);
      setSelectedCouponForReprint(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar reimpressão do cupom.');
    } finally {
      setIsProcessingReprint(false);
    }
  };

  // Print Canceled/Invalidated Proof
  const handlePrintInvalidatedCoupon = (coupon: CouponEntry) => {
    const htmlContent = generateSingleCouponReceiptContent(
      coupon.couponNumber,
      campaign.title,
      campaign.prize,
      settings,
      {
        name: coupon.customerName !== 'Cliente Balcão' ? coupon.customerName : '',
        phone: coupon.customerPhone,
        city: coupon.customerCity,
        bairro: coupon.customerBairro,
        street: coupon.customerStreet
      },
      {
        isReprint: true,
        isInvalid: true,
        fillCustomerName: false
      }
    );

    printHtml(htmlContent);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Ticket size={22} className="text-amber-400" />
              <h2 className="text-xl font-bold">{campaign.title}</h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${campaign.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'}`}>
                {campaign.active ? 'Ativa' : 'Encerrada'}
              </span>
            </div>
            <p className="text-slate-300 text-sm">
              Prêmio: <strong className="text-amber-300">{campaign.prize}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg">
              <Ticket size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Gerado</p>
              <p className="text-lg font-black text-slate-800">{totalCouponsCount}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Válidos</p>
              <p className="text-lg font-black text-emerald-700">{validCouponsCount}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="bg-red-50 text-red-600 p-2.5 rounded-lg">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Anulados (X)</p>
              <p className="text-lg font-black text-red-700">{invalidCouponsCount}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="bg-purple-50 text-purple-600 p-2.5 rounded-lg">
              <User size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Participantes</p>
              <p className="text-lg font-black text-purple-800">{uniqueCustomersCount}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between bg-white shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cliente ou nº do cupom..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Todos ({totalCouponsCount})
            </button>
            <button
              onClick={() => setStatusFilter('valid')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'valid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Válidos ({validCouponsCount})
            </button>
            <button
              onClick={() => setStatusFilter('invalid')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'invalid' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Anulados ({invalidCouponsCount})
            </button>
          </div>
        </div>

        {/* Coupons List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filteredCoupons.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Ticket size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold text-slate-600">Nenhum cupom encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Ajuste a pesquisa ou os filtros acima para visualizar os cupons.</p>
            </div>
          ) : (
            filteredCoupons.map((coupon, idx) => {
              const isValid = coupon.status === 'valid';
              const isRegistered = coupon.customerName !== 'Cliente Balcão';

              return (
                <div
                  key={`${coupon.saleId}_${coupon.couponNumber}_${idx}`}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isValid
                      ? 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                      : 'bg-red-50/40 border-red-200/80 shadow-none'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl shrink-0 font-mono font-bold text-center ${
                      isValid ? 'bg-slate-900 text-amber-400' : 'bg-red-600 text-white line-through opacity-80'
                    }`}>
                      <span className="text-[10px] block opacity-70 font-sans">CUPOM</span>
                      <span className="text-base">{coupon.couponNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${isValid ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
                          {coupon.customerName}
                        </span>
                        
                        {isRegistered && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            Cadastrado
                          </span>
                        )}

                        {isValid ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                            <CheckCircle2 size={10} /> VÁLIDO
                          </span>
                        ) : (
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <XCircle size={10} /> ❌ INVÁLIDO / CANCELADO
                          </span>
                        )}

                        {coupon.isReprint && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                            2ª Via
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span>Venda #{coupon.saleId}</span>
                        <span>•</span>
                        <span>{new Date(coupon.saleDate).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-700">R$ {coupon.saleTotal.toFixed(2)}</span>
                      </div>

                      {!isValid && (
                        <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                          <ShieldAlert size={12} /> {coupon.invalidatedReason || 'Anulado por Reimpressão de 2ª Via'}
                          {coupon.invalidatedAt && ` em ${new Date(coupon.invalidatedAt).toLocaleDateString('pt-BR')}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 justify-end">
                    {isValid ? (
                      <button
                        onClick={() => handleOpenReprint(coupon)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
                        title="Reimprimir Cupom / Gerar 2ª Via"
                      >
                        <Printer size={14} /> Reimprimir Via
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePrintInvalidatedCoupon(coupon)}
                        className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-red-200"
                        title="Imprimir Via Comprovante de Cancelamento"
                      >
                        <Printer size={14} /> Imprimir Comprovante Cancelado
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Submodal for Reprint Confirmation & Options */}
      {selectedCouponForReprint && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Printer size={20} className="text-blue-600" /> Reimprimir Cupom (2ª Via)
              </h3>
              <button
                onClick={() => setSelectedCouponForReprint(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs space-y-1 mb-4">
              <div className="font-bold flex items-center gap-1.5 text-amber-950 text-sm">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                Atenção: Cupom Anterior Será Anulado!
              </div>
              <p className="text-slate-700 leading-relaxed">
                Ao gerar a 2ª via, o cupom original <strong>Nº {selectedCouponForReprint.couponNumber}</strong> será marcado como <strong>INVÁLIDO (com X)</strong> e não poderá mais ser utilizado no sorteio.
              </p>
            </div>

            {/* Print Options */}
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Identificação do Cliente no Cupom Impresso:
              </label>

              <div
                onClick={() => setReprintOption('fill')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  reprintOption === 'fill' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reprintOpt"
                    checked={reprintOption === 'fill'}
                    onChange={() => setReprintOption('fill')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-bold text-sm text-slate-800">Imprimir com Nome do Cliente</span>
                </div>

                {reprintOption === 'fill' && (
                  <div className="mt-2 pl-6">
                    <input
                      type="text"
                      value={reprintCustomName}
                      onChange={e => setReprintCustomName(e.target.value)}
                      placeholder="Nome do cliente no cupom..."
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                )}
              </div>

              <div
                onClick={() => setReprintOption('blank')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  reprintOption === 'blank' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reprintOpt"
                    checked={reprintOption === 'blank'}
                    onChange={() => setReprintOption('blank')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-800">Deixar em Branco (Linha de Caneta)</span>
                    <p className="text-[11px] text-slate-500">Imprime a linha para o cliente preencher à mão.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedCouponForReprint(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={isProcessingReprint}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReprint}
                disabled={isProcessingReprint}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isProcessingReprint ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Printer size={14} /> Anular Anterior e Imprimir 2ª Via
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
