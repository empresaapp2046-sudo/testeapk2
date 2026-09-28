// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { X, Search, User, Lock, AlertCircle, UserPlus, Camera, Save } from 'lucide-react';
import { Customer, Company, UnregisteredCustomer } from '../types';
import { BarcodeScanner } from './BarcodeScanner';
import { useStore } from '../context/StoreContext';

interface CustomerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer | null, unregistered?: UnregisteredCustomer) => void;
  customers: Customer[];
  companies: Company[];
}

export const CustomerSelectorModal = ({ isOpen, onClose, onSelect, customers, companies }: CustomerSelectorModalProps) => {
  const { addCustomer } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'company' | 'unregistered' | 'new'>('all');
  const [selectedForPassword, setSelectedForPassword] = useState<Customer | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Form for unregistered customer & new customer
  const [unregisteredName, setUnregisteredName] = useState('');
  const [unregisteredCpf, setUnregisteredCpf] = useState('');
  const [unregisteredPhone, setUnregisteredPhone] = useState('');
  const [unregisteredEmail, setUnregisteredEmail] = useState('');
  const [unregisteredError, setUnregisteredError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // New Customer creation flow specific loading
  const [isSaving, setIsSaving] = useState(false);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const defaultCustomer: Customer = { 
    id: 'def', 
    name: 'Cliente Balcão', 
    phone: '', 
    email: '', 
    debt: 0 
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (c.id === 'def') return false;

      const company = companies.find(comp => comp.id === c.companyId);
      const companyName = company ? (company.name || '').toLowerCase() : '';

      const matchesSearch = 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.cpf && c.cpf.includes(searchTerm)) ||
        (c.employeeId && c.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.loyaltyCardNumber && c.loyaltyCardNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        companyName.includes(searchTerm.toLowerCase());

      const matchesCompany = activeTab === 'all' 
        ? (companyFilter === '' || c.companyId === companyFilter)
        : (c.companyId === companyFilter);

      return matchesSearch && matchesCompany;
    });
  }, [customers, searchTerm, companyFilter, activeTab, companies]);

  const handleSelectCustomer = (c: Customer) => {
    if (c.companyId) {
      if (c.password) {
        setSelectedForPassword(c);
        setPasswordInput('');
        setPasswordError('');
      } else {
        alert("Este cliente está vinculado a uma empresa mas não possui senha cadastrada. Por favor, cadastre uma senha para este cliente na tela de Clientes antes de realizar vendas vinculadas.");
      }
    } else {
      onSelect(c);
      onClose();
    }
  };

  const handleSelectUnregistered = () => {
    if (!unregisteredName.trim()) {
      setUnregisteredError('Nome completo é obrigatório!');
      return;
    }
    onSelect(null, {
      name: unregisteredName,
      cpf: unregisteredCpf,
      phone: unregisteredPhone
    });
    // Reset form
    setUnregisteredName('');
    setUnregisteredCpf('');
    setUnregisteredPhone('');
    setUnregisteredError('');
    onClose();
  };

  const handleSaveNewCustomer = async () => {
    if (!unregisteredName.trim()) {
      setUnregisteredError('Nome completo é obrigatório!');
      return;
    }
    setIsSaving(true);
    setUnregisteredError('');
    try {
        const newCust: Customer = {
           id: '', // Will be assigned by store
           name: unregisteredName,
           cpf: unregisteredCpf,
           phone: unregisteredPhone,
           email: unregisteredEmail,
           debt: 0,
        };
        await addCustomer(newCust);
        
        // Simplesmente volta pra aba e preenche
        setSearchTerm(unregisteredName);
        setActiveTab('all');
        
        setUnregisteredName('');
        setUnregisteredCpf('');
        setUnregisteredPhone('');
        setUnregisteredEmail('');
    } catch (e: any) {
        setUnregisteredError('Erro ao salvar cliente: ' + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const verifyPassword = () => {
    if (!selectedForPassword) return;
    if (passwordInput === selectedForPassword.password) {
      onSelect(selectedForPassword);
      setSelectedForPassword(null);
      onClose();
    } else {
      setPasswordError('Senha incorreta!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        
        {selectedForPassword ? (
          <div className="p-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-4">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Senha do Cliente</h3>
            <p className="text-sm text-slate-500 mb-6">
              O cliente <strong>{selectedForPassword.name}</strong> está vinculado a uma empresa. Por favor, solicite a senha para continuar.
            </p>
            
            <input 
              type="password" 
              className={`w-full max-w-xs border-2 rounded-xl p-3 text-center text-2xl tracking-widest outline-none transition-all ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500'}`}
              placeholder="****"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && verifyPassword()}
            />
            
            {passwordError && (
              <div className="flex items-center gap-2 text-red-500 text-sm mt-3 font-bold">
                <AlertCircle size={16} /> {passwordError}
              </div>
            )}

            <div className="flex gap-3 w-full mt-8">
              <button 
                onClick={() => setSelectedForPassword(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={verifyPassword}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Selecionar Cliente</h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex border-b overflow-x-auto shrink-0 w-full no-scrollbar">
              <button 
                onClick={() => { setActiveTab('all'); setCompanyFilter(''); }}
                className={`flex-1 min-w-fit px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setActiveTab('company')}
                className={`flex-1 min-w-fit px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'company' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Por Empresa
              </button>
              <button 
                onClick={() => setActiveTab('new')}
                className={`flex-1 min-w-fit px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'new' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Novo Cadastro
              </button>
              <button 
                onClick={() => setActiveTab('unregistered')}
                className={`flex-1 min-w-fit px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'unregistered' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Sem Cadastro
              </button>
            </div>

            {activeTab === 'unregistered' || activeTab === 'new' ? (
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-3 mb-4 text-blue-600">
                  <UserPlus size={24} />
                  <h4 className="font-bold">{activeTab === 'new' ? 'Cadastrar Novo Cliente' : 'Venda Avulsa (Sem Cadastro)'}</h4>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-600">Nome Completo *</label>
                  <input 
                    className={`w-full border-2 rounded-lg p-3 outline-none transition-all ${unregisteredError ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-blue-500'}`}
                    placeholder="Nome do cliente..."
                    value={unregisteredName}
                    onChange={e => { setUnregisteredName(e.target.value); setUnregisteredError(''); }}
                  />
                  {unregisteredError && <p className="text-xs text-red-500 font-bold">{unregisteredError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-600">CPF (Opcional)</label>
                    <input 
                      className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-all"
                      placeholder="000.000.000-00"
                      value={unregisteredCpf}
                      onChange={e => setUnregisteredCpf(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-600">Telefone (Opcional)</label>
                    <input 
                      className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-all"
                      placeholder="(00) 00000-0000"
                      value={unregisteredPhone}
                      onChange={e => setUnregisteredPhone(e.target.value)}
                    />
                  </div>
                </div>
                
                {activeTab === 'new' && (
                  <div className="space-y-1 mt-2">
                      <label className="text-sm font-bold text-slate-600">Email (Opcional)</label>
                      <input 
                          type="email"
                          className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-all"
                          placeholder="Email"
                          value={unregisteredEmail}
                          onChange={e => setUnregisteredEmail(e.target.value)}
                      />
                  </div>
                )}

                {activeTab === 'unregistered' && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 mt-4">
                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs text-amber-700">
                      <strong>Atenção:</strong> Vendas para clientes sem cadastro não permitem pagamento <strong>A Prazo</strong>. Os dados serão apenas impressos no cupom atual.
                    </p>
                  </div>
                )}
                
                {activeTab === 'new' && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex gap-3 mt-4">
                    <AlertCircle className="text-blue-600 shrink-0" size={20} />
                    <p className="text-xs text-blue-700">
                      <strong>Cadastro Fixo:</strong> O cliente será salvo permanentemente. Para opções avançadas (empresas/senha), vá na tela principal de Clientes.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setActiveTab('all')}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  {activeTab === 'new' ? (
                      <button 
                        onClick={handleSaveNewCustomer}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {isSaving ? 'Salvando...' : <><Save size={18}/> Salvar Cliente</>}
                      </button>
                  ) : (
                      <button 
                        onClick={handleSelectUnregistered}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                      >
                        Confirmar
                      </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b space-y-2 bg-white shrink-0">
                  {activeTab === 'company' && (
                    <select 
                      className="w-full border rounded-lg p-2 outline-none mb-2 bg-slate-50 font-medium" 
                      value={companyFilter} 
                      onChange={e => setCompanyFilter(e.target.value)}
                    >
                      <option value="">Selecione uma Empresa...</option>
                      {companies.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                    </select>
                  )}
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                      className="w-full pl-9 pr-10 py-2 border rounded-lg outline-none focus:border-blue-500 transition-all shadow-sm" 
                      placeholder={activeTab === 'all' ? "Nome, CPF, Matrícula, Cartão ou Empresa..." : "Pesquisar nesta empresa..."}
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                    />
                    {isMobile && (
                      <button 
                        onClick={() => setShowScanner(true)}
                        className="absolute right-2 top-2 p-1 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <Camera size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-white min-h-[50vh]">
                  {activeTab === 'all' && !searchTerm && (
                    <button 
                      onClick={() => handleSelectCustomer(defaultCustomer)}
                      className="w-full text-left p-4 hover:bg-blue-50 rounded-lg border-2 border-dashed border-blue-100 mb-2 flex items-center gap-3 group transition-all"
                    >
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-blue-700">Cliente Balcão</div>
                        <div className="text-xs text-blue-500">Venda sem cadastro de cliente</div>
                      </div>
                    </button>
                  )}

                  <div className="mb-2">
                    {filteredCustomers.length === 0 && searchTerm ? (
                        <div className="text-center p-6 border rounded-lg bg-slate-50">
                            <p className="text-slate-600 mb-3">Cliente não encontrado.</p>
                            <button onClick={() => { setUnregisteredName(searchTerm); setActiveTab('new'); }} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 mx-auto hover:bg-blue-200">
                                <UserPlus size={16} /> Cadastrar "{searchTerm}"
                            </button>
                        </div>
                    ) : null}
                  </div>

                  {activeTab === 'company' && !companyFilter ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                      <Search size={48} className="opacity-20" />
                      <p>Selecione uma empresa acima para ver os clientes.</p>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => {
                      const company = companies.find(comp => comp.id === c.companyId);
                      return (
                        <button 
                          key={c.id} 
                          onClick={() => handleSelectCustomer(c)} 
                          className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border-b last:border-0 group transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{c.name}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                {c.cpf && `CPF: ${c.cpf} | `}
                                {c.employeeId && `Matrícula: ${c.employeeId} | `}
                                {c.loyaltyCardNumber && `Cartão: ${c.loyaltyCardNumber}`}
                              </div>
                            </div>
                            {company && (
                              <div className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold border border-slate-200">
                                {company.name}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : null}
                </div>
              </>
            )}
          </>
        )}
      </div>
      {showScanner && (
        <BarcodeScanner 
          onScan={(text) => {
            setSearchTerm(text);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
