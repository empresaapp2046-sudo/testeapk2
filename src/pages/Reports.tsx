// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, ArrowRight, Filter, Eye, X, Check, History } from 'lucide-react';
import { PaymentModal } from '../components/PaymentModal';
import { FinancialRecord } from '../types';
import { PlanGate } from '../components/PlanGate';

const StatCard = ({ title, value, subValue, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-3 opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
            <Icon size={64} />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-1">
                <Icon size={16} className={colorClass} /> {title}
            </p>
            <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
        </div>
        {subValue && (
            <div className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2">
                {subValue}
            </div>
        )}
    </div>
);

export const Reports = () => {
  const { sales, financialRecords, settings, currentUser, isAdmin } = useStore();
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [viewHistoryGroup, setViewHistoryGroup] = useState<any | null>(null);
  
  // Default to current month start and today
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format matches input type="date"
  });
  
  const [netResultDisplayIdx, setNetResultDisplayIdx] = useState(-1);

  const [endDate, setEndDate] = useState(() => {
    const date = new Date(); // Today
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  });

  const openRecord = (r: FinancialRecord) => { setSelectedRecord(r); };

  // --- CALCULATIONS ENGINE ---
  const reportData = useMemo(() => {
    // 1. Filter Sales in Range
    const filteredSales = sales.filter(s => {
      // Isolation: Employee only sees their own sales, Owner sees all, Admin sees all
      if (!isAdmin && currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral') {
        if (s.employeeId !== currentUser?.id) return false;
      }
      
      const saleDateLocal = new Date(s.date).toLocaleDateString('en-CA');
      return saleDateLocal >= startDate && saleDateLocal <= endDate;
    });

    // 2. Filter Expenses (Payables) in Range
    const filteredExpenses = financialRecords.filter(r => {
      if (r.type !== 'payable') return false;
      
      // Permissions check for Employee
      if (!isAdmin && currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral') {
        if (currentUser?.permissions && !currentUser.permissions.canAccessReportsBusiness) return false;
      }

      const expenseDateLocal = new Date(r.dueDate).toLocaleDateString('en-CA');
      return expenseDateLocal >= startDate && expenseDateLocal <= endDate;
    });

    // 3. Metrics Calculation
    let totalRevenue = 0;
    let totalCost = 0;
    let totalInterest = 0;
    
    filteredSales.forEach(sale => {
      totalRevenue += sale.total;
      totalInterest += (sale.interestTotal || 0);
      sale.items.forEach(item => {
        // Enforce number type for cost to ensure calculation works even if data is malformed
        const itemCost = Number(item.cost) || 0; 
        const itemQty = Number(item.quantity) || 0;
        totalCost += (itemCost * itemQty);
      });
    });

    const grossProfit = totalRevenue - totalCost;
    
    // Expenses Calculation (Using originalAmount to reflect the bill value)
    const totalExpenses = filteredExpenses.reduce((acc, r) => acc + r.originalAmount, 0);
    
    const netResult = grossProfit - totalExpenses;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      salesCount: filteredSales.length,
      totalRevenue,
      totalInterest,
      totalCost,
      grossProfit,
      totalExpenses,
      netResult,
      margin,
      filteredSales,
      filteredExpenses
    };
  }, [sales, financialRecords, startDate, endDate, currentUser, isAdmin]);

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    const dataMap: Record<string, { date: string, revenue: number, expense: number, profit: number }> = {};

    // Helper to normalize date key for Chart Display (DD/MM/YYYY)
    const toKey = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');

    // Add Sales to Chart
    reportData.filteredSales.forEach(s => {
        const key = toKey(s.date);
        if (!dataMap[key]) dataMap[key] = { date: key, revenue: 0, expense: 0, profit: 0 };
        dataMap[key].revenue += s.total;
        
        // Calculate profit per sale for chart accuracy
        const saleCost = s.items.reduce((acc, i) => acc + ((Number(i.cost) || 0) * i.quantity), 0);
        dataMap[key].profit += (s.total - saleCost);
    });

    // Add Expenses to Chart
    reportData.filteredExpenses.forEach(e => {
        const key = toKey(e.dueDate);
        if (!dataMap[key]) dataMap[key] = { date: key, revenue: 0, expense: 0, profit: 0 };
        dataMap[key].expense += e.originalAmount;
        // Subtract expense from profit for that day (Cash flow view)
        dataMap[key].profit -= e.originalAmount;
    });

    // Sort by Date
    return Object.values(dataMap).sort((a, b) => {
        const [da, ma, ya] = a.date.split('/').map(Number);
        const [db, mb, yb] = b.date.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });
  }, [reportData]);

  return (
    <PlanGate>
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Relatórios Financeiros</h2>
            <p className="text-slate-500 text-sm">Análise detalhada de lucros e perdas</p>
        </div>
        
        {/* Date Filter */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2 px-2">
                <Filter size={16} className="text-slate-400"/>
                <span className="text-xs font-bold text-slate-600 uppercase">Período:</span>
            </div>
            <div className="flex items-center gap-2">
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1 text-sm text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-400"><ArrowRight size={14}/></span>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1 text-sm text-slate-600 focus:outline-none focus:border-blue-500"
                />
            </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard 
              title="Total de Vendas" 
              value={`R$ ${reportData.totalRevenue.toFixed(2)}`} 
              subValue={`${reportData.salesCount} vendas realizadas`}
              icon={DollarSign} 
              colorClass="text-blue-600"
          />
          <StatCard 
              title="Juros Recebidos" 
              value={`R$ ${reportData.totalInterest.toFixed(2)}`} 
              subValue="Proveniente de parcelamentos"
              icon={TrendingUp} 
              colorClass="text-purple-600" 
          />
          {(!isAdmin && currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral') ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-center items-center text-slate-400 col-span-2">
               <AlertCircle size={24} className="mb-2" />
               <p className="text-xs text-center font-medium">Dados de Custo e Lucro restritos</p>
            </div>
          ) : (
            <>
              <StatCard 
                  title="Custo dos Produtos" 
                  value={`R$ ${reportData.totalCost.toFixed(2)}`} 
                  subValue="Custo de mercadoria vendida (CMV)"
                  icon={Wallet} 
                  colorClass="text-orange-600"
              />
              <StatCard 
                  title="Lucro Bruto" 
                  value={`R$ ${reportData.grossProfit.toFixed(2)}`} 
                  subValue={`Margem Bruta: ${reportData.margin.toFixed(1)}%`}
                  icon={TrendingUp} 
                  colorClass="text-green-600"
              />
            </>
          )}
          <StatCard 
              title="Despesas Operacionais" 
              value={`R$ ${reportData.totalExpenses.toFixed(2)}`} 
              subValue="Contas a Pagar no período"
              icon={TrendingDown} 
              colorClass="text-red-500"
          />
      </div>

            {/* MAIN RESULT CARD */}
      {(!isAdmin && currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral') ? (
        <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 italic">
          O Resultado Líquido detalhado está disponível apenas para administradores e proprietários.
        </div>
      ) : (
        <div 
          className={`mb-8 p-6 rounded-xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-colors cursor-pointer hover:shadow-md ${reportData.netResult >= 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'}`}
          onClick={() => {
              const totalOptions = (settings.profitSeparations || []).length;
              if (totalOptions > 0) {
                  setNetResultDisplayIdx(prev => (prev + 1 > totalOptions - 1 ? -1 : prev + 1));
              }
          }}
          title={((settings.profitSeparations || []).length > 0) ? "Clique para alternar as separações de lucro" : undefined}
        >
            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${reportData.netResult >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {reportData.netResult >= 0 ? <TrendingUp size={32} /> : <AlertCircle size={32} />}
                </div>
                <div>
                    <h3 className="text-lg font-medium text-slate-800">
                        {netResultDisplayIdx === -1 
                            ? 'Resultado Líquido do Período' 
                            : (settings.profitSeparations?.[netResultDisplayIdx]?.name || 'Separação')}
                    </h3>
                    <p className="text-sm opacity-70 text-slate-600">
                        {netResultDisplayIdx === -1 
                            ? '(Caixa Líquido do Período)'
                            : `(${settings.profitSeparations?.[netResultDisplayIdx]?.percentage || 0}% dos Lucros)`}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <div className={`text-4xl font-bold ${reportData.netResult >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    R$ {
                        netResultDisplayIdx === -1 
                        ? reportData.netResult.toFixed(2)
                        : ((reportData.netResult > 0 ? reportData.netResult : 0) * (settings.profitSeparations?.[netResultDisplayIdx]?.percentage || 0) / 100).toFixed(2)
                    }
                </div>
                <div className={`text-sm font-medium ${reportData.netResult >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {reportData.netResult >= 0 ? 'LUCRO' : 'PREJUÍZO'}
                </div>
            </div>
        </div>
      )}

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CHART 1: Sales vs Expenses */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex flex-col">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Calendar size={20}/> Fluxo Diário (Vendas x Despesas)</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{fontSize: 12}} stroke="#94a3b8" />
                          <YAxis tick={{fontSize: 12}} stroke="#94a3b8" tickFormatter={(value) => `R$${value}`} />
                          <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                          />
                          <Legend wrapperStyle={{paddingTop: '10px'}} />
                          <Bar dataKey="revenue" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* CHART 2: Net Profit Trend */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex flex-col">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><TrendingUp size={20}/> Evolução do Lucro (Caixa)</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{fontSize: 12}} stroke="#94a3b8" />
                          <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                          <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Resultado Dia']}
                          />
                          <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
      
      {/* EXPENSES TABLE */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-700">Despesas Detalhadas</div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-sm">
                    <tr><th className="p-4 font-medium">Vencimento</th><th className="p-4 font-medium">Fornecedor</th><th className="p-4 font-medium">Descrição</th><th className="p-4 font-medium">Valor</th><th className="p-4 font-medium">Status</th><th className="p-4 text-right">Ação</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {reportData.filteredExpenses.map(record => (
                        <tr key={record.id} onClick={() => openRecord(record)} className="hover:bg-red-50 cursor-pointer transition-colors group">
                            <td className="p-4 text-slate-600">{new Date(record.dueDate).toLocaleDateString('pt-BR')}</td>
                            <td className="p-4 font-medium text-slate-800">{record.entityName}</td>
                            <td className="p-4 text-slate-500">{record.description}</td>
                            <td className="p-4 font-bold text-red-600">R$ {record.amount.toFixed(2)}</td>
                            <td className="p-4">{record.status === 'paid' ? <span className="text-green-600 text-xs border border-green-200 bg-green-50 px-2 py-1 rounded">Pago</span> : record.status === 'pending' ? <span className="text-orange-600 text-xs border border-orange-200 bg-orange-50 px-2 py-1 rounded">Pendente</span> : <span className="text-blue-600 text-xs border border-blue-200 bg-blue-50 px-2 py-1 rounded">Parcial</span>}</td>
                            <td className="p-4 text-right">
                                <button onClick={(e) => { e.stopPropagation(); setViewHistoryGroup({ description: record.description, entityName: record.entityName, records: [record] }); }} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500 transition-colors"><Eye size={18} /></button>
                            </td>
                        </tr>
                    ))}
                    {reportData.filteredExpenses.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma despesa.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {selectedRecord && (
          <PaymentModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {/* HISTORY MODAL */}
      {viewHistoryGroup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">Histórico Detalhado</h3>
                          <p className="text-xs text-slate-500">{viewHistoryGroup.description} • {viewHistoryGroup.entityName}</p>
                      </div>
                      <button onClick={() => setViewHistoryGroup(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 pl-1">Parcelas</h4>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
                          {viewHistoryGroup.records.sort((a:any,b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((r: any) => (
                              <div key={r.id} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-center hover:bg-slate-50">
                                  <div>
                                      <div className="text-sm font-medium text-slate-700">{r.description}</div>
                                      <div className="text-xs text-slate-500">Vencimento: {new Date(r.dueDate).toLocaleDateString('pt-BR')}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-sm font-bold text-slate-700">R$ {r.amount.toFixed(2)}</div>
                                      {r.status === 'paid' && r.history && r.history.length > 0 && (
                                          <div className="text-[10px] text-green-600 font-bold">Pago em: {new Date(r.history[0].date).toLocaleDateString('pt-BR')}</div>
                                      )}
                                      {r.status === 'pending' && <div className="text-[10px] text-orange-600 font-bold">Pendente</div>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
    </PlanGate>
  );
};
