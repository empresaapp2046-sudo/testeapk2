// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart3, FileText, Search, Calendar, Filter, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlanGate } from '../components/PlanGate';

export const CorporateReports = () => {
  const { companies, customers, sales, currentUser } = useStore();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [debtStatus, setDebtStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [includePreviousDebts, setIncludePreviousDebts] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // PDF Options Modal State
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfFilterType, setPdfFilterType] = useState<'purchase' | 'installment'>('purchase');
  const [pdfMonth, setPdfMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const filteredSales = useMemo(() => {
    let filtered = sales.filter(s => {
      // Isolation: Employee only sees their own sales, Owner sees all, Admin sees all
      if (currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral') {
        if (s.employeeId !== currentUser?.id) return false;
      }
      const customer = customers.find(c => c.id === s.customerId);
      return customer && customer.companyId && customer.companyId !== 'none' && customer.companyId !== '';
    });
    
    if (selectedCompany !== 'all') {
      const companyCustomerIds = customers
        .filter(c => c.companyId === selectedCompany)
        .map(c => c.id);
      filtered = filtered.filter(s => s.customerId && companyCustomerIds.includes(s.customerId));
    }

    if (debtStatus !== 'all') {
      filtered = filtered.filter(s => s.status === debtStatus);
    }

    if (startDate && !(debtStatus === 'pending' && includePreviousDebts)) {
      const start = new Date(startDate + 'T00:00:00');
      filtered = filtered.filter(s => new Date(s.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      filtered = filtered.filter(s => new Date(s.date) <= end);
    }

    return filtered;
  }, [sales, customers, selectedCompany, debtStatus, startDate, endDate, includePreviousDebts]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + sale.total, 0);
  }, [filteredSales]);

  const totalCustomers = useMemo(() => {
    const customerIdsWithSales = new Set(filteredSales.map(s => s.customerId).filter(id => id !== null));
    return customerIdsWithSales.size;
  }, [filteredSales]);

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const companyName = selectedCompany === 'all' ? 'Todas as Empresas' : companies.find(c => c.id === selectedCompany)?.name || 'Empresa';
    const statusText = debtStatus === 'all' ? 'Todas as Dívidas' : debtStatus === 'pending' ? 'Dívidas Pendentes' : 'Dívidas Quitadas';
    
    const [year, month] = pdfMonth.split('-').map(Number);
    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1));
    const periodText = `Referente a: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} / ${year}`;
    const filterTypeText = pdfFilterType === 'purchase' ? 'Filtro: Data da Compra' : 'Filtro: Data de Vencimento das Parcelas';

    // Filtering logic for PDF
    let pdfSales = sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      return customer && customer.companyId && customer.companyId !== 'none' && customer.companyId !== '';
    });

    if (selectedCompany !== 'all') {
      const companyCustomerIds = customers.filter(c => c.companyId === selectedCompany).map(c => c.id);
      pdfSales = pdfSales.filter(s => s.customerId && companyCustomerIds.includes(s.customerId));
    }

    if (debtStatus !== 'all') {
      pdfSales = pdfSales.filter(s => s.status === debtStatus);
    }

    let finalPdfSales: any[] = [];
    let totalReceivableForMonth = 0;

    if (pdfFilterType === 'purchase') {
      finalPdfSales = pdfSales.filter(s => {
        const d = new Date(s.date);
        const isSameMonth = d.getFullYear() === year && (d.getMonth() + 1) === month;
        
        // If pending and includePreviousDebts, include all sales up to the end of the selected month
        if (debtStatus === 'pending' && includePreviousDebts) {
          const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
          return d <= endOfMonth;
        }
        
        return isSameMonth;
      });
    } else {
      // Filter by installment due date
      pdfSales.forEach(sale => {
        const matchingPayments = sale.payments.filter(p => {
          if (!p.dueDate) return false;
          const d = new Date(p.dueDate);
          return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });

        if (matchingPayments.length > 0) {
          finalPdfSales.push({
            ...sale,
            relevantPayments: matchingPayments
          });
          matchingPayments.forEach(p => totalReceivableForMonth += p.amount);
        }
      });
    }

    // Header
    doc.setFontSize(20);
    doc.text('Relatório Empresarial - SmartPDV Pró', 14, 22);
    doc.setFontSize(12);
    doc.text(`Empresa: ${companyName}`, 14, 32);
    doc.text(`Status: ${statusText}`, 14, 38);
    doc.text(periodText, 14, 44);
    doc.text(filterTypeText, 14, 50);
    
    if (pdfFilterType === 'installment') {
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38); // Red-600
      doc.text(`VALOR TOTAL A RECEBER (MÊS): R$ ${totalReceivableForMonth.toFixed(2)}`, 14, 58);
      doc.setFontSize(8);
      doc.text('Este valor refere-se apenas aos vencimentos programados para o mês selecionado.', 14, 62);
      doc.setTextColor(0, 0, 0);
    }

    // Summary Table
    const totalSalesRevenue = finalPdfSales.reduce((acc, s) => acc + s.total, 0);
    const company = selectedCompany === 'all' ? null : companies.find(c => c.id === selectedCompany);
    
    const summaryData = [
      ['Total de Vendas no Período', finalPdfSales.length.toString()],
      ['Total de Receitas (Vendas)', `R$ ${totalSalesRevenue.toFixed(2)}`],
      ['Dia de Fechamento', company?.closingDay || 'N/A'],
      ['Dia de Vencimento', company?.dueDay || 'N/A']
    ];

    autoTable(doc, {
      startY: pdfFilterType === 'installment' ? 68 : 58,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      foot: [['Aviso:', 'Os valores a receber são referentes apenas ao mês selecionado.']],
      footStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7 }
    });

    // Detailed Section per Customer
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Detalhamento por Funcionário', 14, currentY);
    currentY += 10;

    const customersInReport = customers.filter(c => {
      if (selectedCompany !== 'all' && c.companyId !== selectedCompany) return false;
      return finalPdfSales.some(s => s.customerId === c.id);
    });

    customersInReport.forEach((customer) => {
      const customerSales = finalPdfSales.filter(s => s.customerId === customer.id);
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Funcionário: ${customer.name}`, 14, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 6;
      doc.setFontSize(9);
      doc.text(`CPF: ${customer.cpf || 'N/A'} | Matrícula: ${customer.employeeId || 'N/A'}`, 14, currentY);
      currentY += 8;

      const saleRows: any[] = [];
      customerSales.forEach(sale => {
        const itemsText = sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
        
        // Payment info with Due Date
        const paymentInfo = sale.payments.map(p => {
          let text = `${p.method}: R$ ${p.amount.toFixed(2)}`;
          if (p.dueDate) {
            const d = new Date(p.dueDate);
            const isRelevant = d.getFullYear() === year && (d.getMonth() + 1) === month;
            text += `\nVenc: ${d.toLocaleDateString()}`;
            if (pdfFilterType === 'installment' && isRelevant) {
              text += ' (VENCIMENTO NO MÊS)';
            }
          }
          if (p.installments && p.installments > 1) {
            text += ` (${p.installmentNumber || 1}/${p.totalInstallments || p.installments})`;
          }
          return text;
        }).join('\n---\n');

        saleRows.push([
          `${new Date(sale.date).toLocaleDateString()}\nID: ${sale.id}`,
          itemsText,
          `R$ ${sale.total.toFixed(2)}`,
          paymentInfo
        ]);
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Data / ID', 'Itens', 'Total', 'Pagamento / Vencimento']],
        body: saleRows,
        theme: 'grid',
        headStyles: { fillColor: [100, 116, 139] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 70 },
          3: { cellWidth: 50 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    });

    doc.save(`Relatorio_Empresarial_${companyName.replace(/\s+/g, '_')}_${pdfMonth}.pdf`);
    setShowPdfOptions(false);
  };

  return (
    <PlanGate>
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <BarChart3 className="text-blue-600" /> Relatórios Empresariais
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa</label>
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="w-full p-2 border rounded bg-slate-50">
              <option value="all">Todas as Empresas</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status da Dívida</label>
            <select value={debtStatus} onChange={e => setDebtStatus(e.target.value as any)} className="w-full p-2 border rounded bg-slate-50">
              <option value="all">Todas as Dívidas</option>
              <option value="pending">Dívidas Pendentes</option>
              <option value="completed">Dívidas Quitadas</option>
            </select>
            {debtStatus === 'pending' && (
              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includePreviousDebts} 
                  onChange={e => setIncludePreviousDebts(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Incluir dívidas anteriores</span>
              </label>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Inicial</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Final</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded bg-slate-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700">
            {debtStatus === 'all' ? 'Total de Movimentação (Período)' : 
             debtStatus === 'pending' ? 'Total de Dívidas Pendentes' : 'Total de Receitas (Quitadas)'}
          </h3>
          <p className="text-3xl font-bold text-blue-600">R$ {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700">Total de Clientes</h3>
          <p className="text-3xl font-bold text-blue-600">{totalCustomers}</p>
        </div>
      </div>

      <button 
        onClick={() => setShowPdfOptions(true)} 
        className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all mb-8"
      >
        <FileText size={20} /> Configurar e Gerar PDF
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Detalhamento das Dívidas</h3>
          <span className="text-xs font-bold text-slate-500 uppercase bg-slate-200 px-2 py-1 rounded">
            {filteredSales.length} Registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase">
                <th className="p-4">Data</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Itens</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado para os filtros selecionados.</td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm">{new Date(sale.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-700">{customer?.name || 'Cliente Avulso'}</div>
                        <div className="text-xs text-slate-500">{customer?.cpf || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-xs text-slate-600 max-w-xs truncate">
                        {sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="p-4 text-sm font-bold text-blue-600">R$ {sale.total.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${sale.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {sale.status === 'pending' ? 'Pendente' : 'Quitada'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Options Modal */}
      {showPdfOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-blue-600" /> Opções do Relatório
              </h3>
              <button onClick={() => setShowPdfOptions(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Selecione o Mês de Referência</label>
                <input 
                  type="month" 
                  value={pdfMonth} 
                  onChange={e => setPdfMonth(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Critério de Filtragem</label>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setPdfFilterType('purchase')}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${pdfFilterType === 'purchase' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div>
                      <span className="font-bold block text-slate-800">Pela Data da Compra</span>
                      <span className="text-xs text-slate-500">Mostra clientes que compraram no mês selecionado.</span>
                    </div>
                    {pdfFilterType === 'purchase' && <div className="w-4 h-4 rounded-full bg-blue-600" />}
                  </button>

                  <button 
                    onClick={() => setPdfFilterType('installment')}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${pdfFilterType === 'installment' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div>
                      <span className="font-bold block text-slate-800">Pela Data de Vencimento</span>
                      <span className="text-xs text-slate-500">Mostra clientes com parcelas vencendo no mês selecionado.</span>
                    </div>
                    {pdfFilterType === 'installment' && <div className="w-4 h-4 rounded-full bg-blue-600" />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <Filter size={14} className="inline mr-1 mb-1" />
                  O relatório será gerado para <strong>{selectedCompany === 'all' ? 'todas as empresas' : companies.find(c => c.id === selectedCompany)?.name}</strong>.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setShowPdfOptions(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGeneratePDF}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <FileText size={18} /> Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PlanGate>
  );
};
