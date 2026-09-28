// @ts-nocheck

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Customer, Supplier, Brand, Company } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { Sparkles, Save, UserPlus, PackagePlus, Factory, Truck, Search, Upload, Filter, Pencil, Trash2, X, MapPin, Calendar, Gift, Cake, MessageCircle, Lock, Crown, Zap, Clock, Info, Plus, User, Camera, Barcode as BarcodeIcon, Trophy, CheckCircle } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ConfirmModal } from '../components/ConfirmModal';
import { CustomerInfoModal } from '../components/CustomerInfoModal';
import { MessageSelectorModal } from '../components/MessageSelectorModal';
import { BarcodeLabelPrint } from '../components/BarcodeLabelPrint';
import { PlanGate } from '../components/PlanGate';

export const Inventory = (props: { initialTab?: any }) => {
  return (
    <PlanGate>
      <InventoryContent {...props} />
    </PlanGate>
  );
};


interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGECity {
  id: number;
  nome: string;
}

interface PriceInputProps {
  value: number | undefined;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

const PriceInput: React.FC<PriceInputProps> = ({ value, onChange, className, placeholder }) => {
  const [localValue, setLocalValue] = useState<string>(
    value ? String(value).replace('.', ',') : ''
  );
  const [prevValue, setPrevValue] = useState<number | undefined>(value);

  if (value !== prevValue) {
    setLocalValue(value ? String(value).replace('.', ',') : '');
    setPrevValue(value);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    raw = raw.replace(/[^0-9.,]/g, '');
    
    const separators = raw.match(/[.,]/g);
    if (separators && separators.length > 1) {
      const firstIndex = raw.search(/[.,]/);
      const before = raw.slice(0, firstIndex + 1);
      const after = raw.slice(firstIndex + 1).replace(/[.,]/g, '');
      raw = before + after;
    }

    setLocalValue(raw);

    const normalized = raw.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  };

  const handleBlur = () => {
    if (!localValue || isNaN(parseFloat(localValue.replace(',', '.')))) {
      setLocalValue('');
      onChange(0);
    } else {
      const parsed = parseFloat(localValue.replace(',', '.'));
      setLocalValue(String(parsed).replace('.', ','));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

const InventoryContent = ({ initialTab }: { initialTab?: 'products' | 'plans' | 'customers' | 'suppliers' | 'brands' | 'vitrine' }) => {
  const { 
    products, customers, suppliers, brands, sales, companies, settings, currentUser, isAdmin,
    addProduct, updateProduct, removeProduct, 
    addCustomer, updateCustomer, removeCustomer, 
    addSupplier, updateSupplier, removeSupplier,
    addBrand, updateBrand, removeBrand, updateSettings,
    isFreeVersion
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'products' | 'plans' | 'customers' | 'suppliers' | 'brands' | 'vitrine'>(() => {
    if (initialTab) return initialTab;
    if (currentUser?.permissions) {
      if (currentUser.permissions.inventoryProductsView !== false) return 'products';
      if (currentUser.permissions.inventoryPlansView !== false) return 'plans';
      if (currentUser.permissions.inventoryBrandsView !== false) return 'brands';
      if (currentUser.permissions.inventorySuppliersView !== false) return 'suppliers';
      if (currentUser.permissions.inventoryVitrineView !== false) return 'vitrine';
    }
    return 'products';
  });
  
  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  // New Info Modal State
  const [infoCustomer, setInfoCustomer] = useState<Customer | null>(null);
  
  // Message Modal State
  const [msgModalCustomer, setMsgModalCustomer] = useState<Customer | null>(null);

  const [printingProduct, setPrintingProduct] = useState<Product | null>(null);

  const [scannerTarget, setScannerTarget] = useState<'prodSearch' | 'prodCode' | 'custSearch' | null>(null);
  const [prodSearch, setProdSearch] = useState('');

  const handleScan = (decodedText: string) => {
    if (scannerTarget === 'prodSearch') setProdSearch(decodedText);
    if (scannerTarget === 'prodCode') setProductForm(prev => ({ ...prev, code: decodedText }));
    if (scannerTarget === 'custSearch') setCustSearch(decodedText);
    setScannerTarget(null);
  };
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [prodBrandFilter, setProdBrandFilter] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('');

  // Customer Search
  const [custSearch, setCustSearch] = useState('');
  const [custCompanyFilter, setCustCompanyFilter] = useState('');
  const [showBirthdays, setShowBirthdays] = useState(false);

  // Location Data State (IBGE)
  const [statesList, setStatesList] = useState<IBGEState[]>([]);
  const [citiesList, setCitiesList] = useState<IBGECity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Product Form State
  const [isEditingProd, setIsEditingProd] = useState(false);
  const [productInfoModal, setProductInfoModal] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', price: 0, cost: 0, stock: 0, category: '', brand: '', code: '', supplierId: '', image: ''
  });
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // INLINE CREATION STATE (For Product Form)
  const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  
  const [isAddingNewSize, setIsAddingNewSize] = useState(false);
  const [newSizeName, setNewSizeName] = useState('');
  const [isAddingNewColor, setIsAddingNewColor] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [isAddingNewNumber, setIsAddingNewNumber] = useState(false);
  const [newNumberName, setNewNumberName] = useState('');

  // Plan Form State
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [planSearch, setPlanSearch] = useState('');
  const [planForm, setPlanForm] = useState<{id?: string, code: string, name: string, price: number, cost: number, description: string, validityDays: number, image?: string, bonusEnabled: boolean, bonusDays: number, unlimitedStock: boolean, stock: number}>({
    code: '', name: '', price: 0, cost: 0, description: '', validityDays: 30, image: '', bonusEnabled: false, bonusDays: 0, unlimitedStock: true, stock: 0

  });

  const handlePlanImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPlanForm(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  // Customer Form State
  const [isEditingCust, setIsEditingCust] = useState(false);
  const [customerForm, setCustomerForm] = useState<Partial<Customer & { confirmPassword?: string }>>({
    name: '', cpf: '', phone: '', email: '', debt: 0, birthDate: '',
    street: '', number: '', apartment: '', city: '', state: '',
    companyId: '', employeeId: '', loyaltyCardNumber: '', password: '', confirmPassword: ''
  });

  // Supplier Form State
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({ name: '', contact: '' });

  // Brand Form State
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState<Partial<Brand>>({ name: '' });

  // --- IBGE API EFFECTS ---
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setStatesList(data))
      .catch(err => console.error("Erro ao carregar estados", err));
  }, []);

  useEffect(() => {
    const loadCities = async () => {
      if (customerForm.state) {
        setLoadingCities(true);
        try {
          const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${customerForm.state}/municipios`);
          const data = await res.json();
          setCitiesList(data);
        } catch (err) {
          console.error("Erro ao carregar cidades", err);
        } finally {
          setLoadingCities(false);
        }
      } else {
        setCitiesList([]);
      }
    };
    loadCities();
  }, [customerForm.state]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.category === 'Planos') return false; 
      const matchesSearch = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.code.includes(prodSearch);
      const matchesBrand = prodBrandFilter ? p.brand === prodBrandFilter : true;
      const matchesCat = prodCatFilter ? p.category === prodCatFilter : true;
      return matchesSearch && matchesBrand && matchesCat;
    });
  }, [products, prodSearch, prodBrandFilter, prodCatFilter]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
      const term = planSearch.trim().toLowerCase();
      return products.filter(p => {
        if (p.category !== 'Planos') return false;
        if (!term) return true;
        return (p.name || '').toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term);
      });
  }, [products, planSearch]);


  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (c.id === 'def') return false;
      
      const company = companies.find(comp => comp.id === c.companyId);
      const companyName = company ? company.name.toLowerCase() : '';

      const matchesSearch = 
        c.name.toLowerCase().includes(custSearch.toLowerCase()) || 
        c.cpf.includes(custSearch) ||
        (c.employeeId && c.employeeId.toLowerCase().includes(custSearch.toLowerCase())) ||
        (c.loyaltyCardNumber && c.loyaltyCardNumber.toLowerCase().includes(custSearch.toLowerCase())) ||
        companyName.includes(custSearch.toLowerCase());

      const matchesCompany = custCompanyFilter === '' || c.companyId === custCompanyFilter;

      return matchesSearch && matchesCompany;
    });
  }, [customers, custSearch, custCompanyFilter, companies]);

  // Birthday Logic
  const upcomingBirthdays = useMemo(() => {
     const today = new Date();
     today.setHours(0,0,0,0);
     return customers
        .filter(c => c.birthDate && c.id !== 'def')
        .map(c => {
            const [year, month, day] = c.birthDate!.split('-').map(Number);
            const birthMonth = month - 1;
            const birthDay = day;
            const nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
            nextBirthday.setHours(0,0,0,0);
            if (nextBirthday < today) { nextBirthday.setFullYear(today.getFullYear() + 1); }
            const diffTime = nextBirthday.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...c, diffDays, nextBirthday };
        })
        .filter(c => c.diffDays <= 30) 
        .sort((a, b) => a.diffDays - b.diffDays);
  }, [customers]);

  const uniqueCategories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))), [products]);

  // ACTION HANDLERS
  const handleAniversariantesClick = () => {
      if (isFreeVersion) { alert("Adquira a licença para acessar todos os benefícios (incluindo Aniversariantes)."); return; }
      setShowBirthdays(true);
  };

  // PLAN ACTIONS
  const emptyPlanForm = { code: '', name: '', price: 0, cost: 0, description: '', validityDays: 30, image: '', bonusEnabled: false, bonusDays: 0, unlimitedStock: true, stock: 0 };
  const handleSubmitPlan = () => {
      if (!planForm.name || !planForm.price) { alert("Preencha o nome e o valor."); return; }
      const code = (planForm.code || '').trim() || 'PLANO-' + Date.now().toString().slice(-4);
      const duplicated = products.find(p => p.category === 'Planos' && (p.code || '').toLowerCase() === code.toLowerCase() && p.id !== planForm.id);
      if (duplicated) { alert("Já existe um plano com este código."); return; }
      const payload: Product = {
        id: planForm.id || Date.now().toString(),
        name: planForm.name,
        price: Number(planForm.price),
        cost: Number(planForm.cost) || 0,
        brand: planForm.description,
        category: 'Planos',
        stock: planForm.unlimitedStock ? 999999 : Math.max(0, Number(planForm.stock) || 0),
        unlimitedStock: !!planForm.unlimitedStock,
        code,
        image: planForm.image || 'https://placehold.co/200x200/3b82f6/ffffff?text=PLANO',
        validityDays: Number(planForm.validityDays) || 30,
        bonusEnabled: !!planForm.bonusEnabled,
        bonusDays: planForm.bonusEnabled ? (Number(planForm.bonusDays) || 0) : 0,
      };
      if (isEditingPlan && planForm.id) { updateProduct(payload); alert("Plano atualizado!"); } else { addProduct(payload); alert("Plano criado!"); }
      setPlanForm({ ...emptyPlanForm }); setIsEditingPlan(false);
  };
  const handleEditPlan = (p: Product) => { setPlanForm({ id: p.id, code: p.code || '', name: p.name, price: p.price, cost: p.cost || 0, description: p.brand, validityDays: p.validityDays || 30, image: p.image || '', bonusEnabled: !!p.bonusEnabled, bonusDays: p.bonusDays || 0, unlimitedStock: p.unlimitedStock !== false, stock: p.unlimitedStock === false ? (p.stock || 0) : 0 }); setIsEditingPlan(true); };


  // PRODUCT ACTIONS
  const handleSmartDesc = async () => {
    if (!productForm.name) return;
    setIsGeneratingDesc(true);
    const desc = await generateProductDescription(productForm.name);
    alert(`Sugestão Gemini: ${desc}`);
    setIsGeneratingDesc(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setProductForm({ ...productForm, image: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProduct = () => {
    if (!productForm.name || !productForm.price) {
      alert("Preencha nome e preço.");
      return;
    }

    let finalBrand = productForm.brand;
    let finalSupplierId = productForm.supplierId;

    // HANDLE NEW BRAND CREATION ON THE FLY
    if (isAddingNewBrand && newBrandName.trim()) {
        const existingBrand = brands.find(b => b.name.toLowerCase() === newBrandName.toLowerCase());
        if (!existingBrand) {
            addBrand({ id: Date.now().toString(), name: newBrandName });
            finalBrand = newBrandName;
        } else {
            finalBrand = existingBrand.name;
        }
    }

    // HANDLE NEW SUPPLIER CREATION ON THE FLY
    if (isAddingNewSupplier && newSupplierName.trim()) {
        const newId = Date.now().toString();
        addSupplier({ id: newId, name: newSupplierName, contact: '' });
        finalSupplierId = newId;
    }

    // Auto-calculate stock from variations if applicable
    const sizes = productForm.sizes || [];
    const colors = productForm.colors || [];
    const numbers = productForm.numbers || [];
    const hasVariations = sizes.length > 1 || colors.length > 1 || numbers.length > 1;
    let finalStock = productForm.stock || 0;
    
    if (hasVariations && productForm.variationStock) {
        finalStock = Object.values(productForm.variationStock).reduce((sum, val) => sum + (val || 0), 0);
    }

    const payload = {
      ...productForm as Product,
      stock: finalStock,
      brand: finalBrand || 'Geral',
      supplierId: finalSupplierId,
      image: productForm.image || `https://picsum.photos/200/200?random=${Date.now()}`,
      showInVitrine: false
    };

    if (isEditingProd && productForm.id) {
      if (isFreeVersion) { alert("Bloqueado no plano grátis."); return; }
      updateProduct(payload);
      alert("Produto atualizado!");
    } else {
      addProduct({ ...payload, id: Date.now().toString() });
      alert("Produto cadastrado!");
    }
    
    // Reset Main Form
    setProductForm({ name: '', price: 0, cost: 0, stock: 0, category: '', brand: '', code: '', supplierId: '', image: '', variationPromotions: {} });
    setIsEditingProd(false);
    
    // Reset Inline Forms
    setIsAddingNewBrand(false);
    setNewBrandName('');
    setIsAddingNewSupplier(false);
    setNewSupplierName('');
    setIsAddingNewSize(false);
    setNewSizeName('');
    setIsAddingNewColor(false);
    setNewColorName('');
    setIsAddingNewNumber(false);
    setNewNumberName('');
  };

  const handleEditProduct = (p: Product) => { 
    if (isFreeVersion) return; 
    setProductForm({ ...p, variationPromotions: p.variationPromotions || {} }); 
    setIsEditingProd(true); 
    setIsAddingNewBrand(false); 
    setIsAddingNewSupplier(false); 
    setIsAddingNewSize(false);
    setIsAddingNewColor(false);
    setIsAddingNewNumber(false);
  };
  const handleDeleteProduct = (id: string) => { if (isFreeVersion) return; setConfirmConfig({ isOpen: true, title: "Excluir", message: "Confirma exclusão?", onConfirm: () => removeProduct(id) }); };

  // CUSTOMER ACTIONS (Omitted for brevity, kept same)
  const handleSubmitCustomer = () => { /* ... existing logic ... */ 
      if (!customerForm.name) return;

      if (customerForm.companyId && customerForm.password) {
          if (customerForm.password !== customerForm.confirmPassword) {
              alert("As senhas não coincidem!");
              return;
          }
      }

      const { confirmPassword, ...customerData } = customerForm;

      if (isEditingCust && customerForm.id) { if(isFreeVersion) return; updateCustomer(customerData as Customer); alert("Atualizado!"); }
      else { addCustomer({ id: Date.now().toString(), name: customerForm.name, cpf: customerForm.cpf||'', phone: customerForm.phone||'', email: customerForm.email||'', debt: 0, birthDate: customerForm.birthDate||'', registrationDate: new Date().toISOString(), street: customerForm.street||'', number: customerForm.number||'', apartment: customerForm.apartment||'', city: customerForm.city||'', state: customerForm.state||'', companyId: customerForm.companyId || '', employeeId: customerForm.employeeId || '', loyaltyCardNumber: customerForm.loyaltyCardNumber || '', password: customerForm.password || '', creditLimitEnabled: customerForm.creditLimitEnabled, creditLimit: customerForm.creditLimit, installmentLimit: customerForm.installmentLimit, cardNumber: customerForm.cardNumber }); alert("Cadastrado!"); }
      setCustomerForm({ name: '', cpf: '', phone: '', email: '', debt: 0, birthDate: '', street: '', number: '', apartment: '', city: '', state: '', companyId: '', employeeId: '', loyaltyCardNumber: '', password: '', confirmPassword: '' }); setIsEditingCust(false);
  };
  const handleEditCustomer = (c: Customer) => { if (isFreeVersion) return; setCustomerForm(c); setIsEditingCust(true); };
  const handleDeleteCustomer = (id: string) => { if (isFreeVersion) return; setConfirmConfig({ isOpen: true, title: "Excluir", message: "Confirma?", onConfirm: () => removeCustomer(id) }); };

  // SUPPLIER ACTIONS
  const handleSubmitSupplier = () => {
    if (isFreeVersion) return;
    if (!supplierForm.name) { alert("Nome obrigatório"); return; }

    if (isEditingSupplier && supplierForm.id) {
        updateSupplier(supplierForm as Supplier);
        alert("Fornecedor atualizado!");
    } else {
        addSupplier({
          id: Date.now().toString(),
          name: supplierForm.name!,
          contact: supplierForm.contact || ''
        });
        alert("Fornecedor cadastrado!");
    }
    setSupplierForm({ name: '', contact: '' });
    setIsEditingSupplier(false);
  };

  const handleEditSupplier = (s: Supplier) => { if (isFreeVersion) return; setSupplierForm(s); setIsEditingSupplier(true); };
  const handleDeleteSupplier = (id: string) => { if (isFreeVersion) return; setConfirmConfig({ isOpen: true, title: "Excluir", message: "Confirma?", onConfirm: () => removeSupplier(id) }); };

  // BRAND ACTIONS
  const handleSubmitBrand = () => {
    if (isFreeVersion) return;
    if (!brandForm.name) { alert("Nome obrigatório"); return; }

    if (isEditingBrand && brandForm.id) {
        updateBrand(brandForm as Brand);
        alert("Marca atualizada!");
    } else {
        addBrand({
          id: Date.now().toString(),
          name: brandForm.name!
        });
        alert("Marca cadastrada!");
    }
    setBrandForm({ name: '' });
    setIsEditingBrand(false);
  };

  const handleEditBrand = (b: Brand) => { if (isFreeVersion) return; setBrandForm(b); setIsEditingBrand(true); };
  const handleDeleteBrand = (id: string) => { if (isFreeVersion) return; setConfirmConfig({ isOpen: true, title: "Excluir", message: "Confirma?", onConfirm: () => removeBrand(id) }); };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <style>{`
        @keyframes rainbow { 
          0% { border-color: #f97316; background-color: #fff7ed; box-shadow: 0 0 10px rgba(249, 115, 22, 0.2); } 
          20% { border-color: #ef4444; background-color: #fef2f2; box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); } 
          40% { border-color: #eab308; background-color: #fefce8; box-shadow: 0 0 10px rgba(234, 179, 8, 0.2); } 
          60% { border-color: #3b82f6; background-color: #eff6ff; box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); } 
          80% { border-color: #22c55e; background-color: #f0fdf4; box-shadow: 0 0 10px rgba(34, 197, 94, 0.2); } 
          100% { border-color: #f97316; background-color: #fff7ed; box-shadow: 0 0 10px rgba(249, 115, 22, 0.2); } 
        }
        .rainbow-blink {
          animation: rainbow 1.5s infinite;
        }
      `}</style>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Gestão</h2>
        {isFreeVersion ? (
            <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 flex items-center gap-2">
                <Lock size={12} /> Versão Gratuita (Limitada)
            </div>
        ) : settings?.companyName ? (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 flex items-center gap-2">
                <Crown size={12} /> Licença Ativa: {settings.companyName}
            </div>
        ) : null}
      </div>
      
      {/* TABS */}
      <div className="flex gap-2 md:gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {(isAdmin || currentUser?.role === 'DonoLoja' || currentUser?.permissions?.inventoryProductsView !== false) && (
            <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'products' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>Produtos</button>
        )}
        {(isAdmin || currentUser?.role === 'DonoLoja' || currentUser?.permissions?.inventoryPlansView !== false) && (
            <button onClick={() => setActiveTab('plans')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'plans' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><Zap size={16}/> Planos</button>
        )}
        {(isAdmin || currentUser?.role === 'DonoLoja' || currentUser?.permissions?.canAccessCustomers !== false) && (
            <button onClick={() => setActiveTab('customers')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'customers' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>Clientes</button>
        )}
        {(isAdmin || currentUser?.role === 'DonoLoja' || currentUser?.permissions?.inventoryBrandsView !== false) && (
            <button onClick={() => setActiveTab('brands')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'brands' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                {isFreeVersion && <Lock size={12} className="text-slate-400" />} <Factory size={16} /> Marcas
            </button>
        )}
        {(isAdmin || currentUser?.role === 'DonoLoja' || currentUser?.permissions?.inventorySuppliersView !== false) && (
            <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'suppliers' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                {isFreeVersion && <Lock size={12} className="text-slate-400" />} <Truck size={16} /> Fornecedores
            </button>
        )}
      </div>

      {/* --- PRODUCTS TAB --- */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
             {/* Filter Header */}
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="text" placeholder="Pesquisar produto..." className="w-full pl-10 pr-12 py-2 rounded border border-slate-300 focus:outline-none focus:border-accent text-sm" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
                  {isMobile && (
                    <button onClick={() => setScannerTarget('prodSearch')} className="absolute right-2 top-2 p-1 text-slate-500">
                      <Camera size={20} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                   <select className="border border-slate-300 rounded px-3 py-2 text-sm bg-white focus:outline-none" value={prodBrandFilter} onChange={(e) => setProdBrandFilter(e.target.value)}>
                     <option value="">Todas Marcas</option>
                     {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                   </select>
                   <select className="border border-slate-300 rounded px-3 py-2 text-sm bg-white focus:outline-none" value={prodCatFilter} onChange={(e) => setProdCatFilter(e.target.value)}>
                     <option value="">Todas Categorias</option>
                     {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
             </div>
             {/* Table */}
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[700px]">
                 <thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4">Produto</th><th className="p-4">Marca / Categoria</th><th className="p-4">Preço</th><th className="p-4">Estoque</th><th className="p-4 text-right">Ações</th></tr></thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredProducts.map(p => (
                     <tr key={p.id} className="hover:bg-slate-50 group">
                       <td className="p-4 flex items-center gap-3"><img src={p.image} className="w-10 h-10 rounded bg-slate-200 object-cover" alt="" /><div><div className="font-medium text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.code}</div></div></td>
                       <td className="p-4"><div className="text-slate-800 text-sm">{p.brand}</div><div className="text-xs text-slate-500">{p.category}</div></td>
                       <td className="p-4 font-bold text-slate-800">R$ {p.price.toFixed(2)}</td>
                       <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{p.stock} un</span></td>
                       <td className="p-4 text-right">
                         {!isFreeVersion ? ( 
                           <>
                             <button onClick={() => setPrintingProduct(p)} className="text-orange-500 hover:text-orange-700 p-2" title="Imprimir Etiqueta">
                               <BarcodeIcon size={18} />
                             </button>
                             {(p.sizes?.length > 1 || p.colors?.length > 1 || p.numbers?.length > 1) && (
                                 <button onClick={() => setProductInfoModal(p)} className="text-purple-500 hover:text-purple-700 p-2" title="Informações de Variação">
                                     <Info size={18} />
                                 </button>
                             )}
                             <button onClick={() => handleEditProduct(p)} className="text-blue-500 hover:text-blue-700 p-2"><Pencil size={18} /></button>
                             <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={18} /></button>
                           </> 
                         ) : ( <Lock size={16} className="text-slate-300 inline-block" /> )}
                       </td>
                     </tr>
                   ))}
                   {filteredProducts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum produto encontrado.</td></tr>}
                 </tbody>
               </table>
             </div>
          </div>

          {/* Product Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 text-slate-800"><PackagePlus size={20}/> {isEditingProd ? 'Editar Produto' : 'Novo Produto'}</h3>{isEditingProd && !isFreeVersion && (<button onClick={() => { setIsEditingProd(false); setProductForm({name:'', price:0, cost:0, stock:0, category:'', brand:'', code:'', supplierId:''}); }} className="text-sm text-slate-400 hover:text-slate-600">Cancelar</button>)}</div>
            {isFreeVersion && products.length >= 3 ? ( <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center"><Lock className="mx-auto text-orange-400 mb-2" size={32} /><h4 className="font-bold text-orange-800 text-sm mb-1">Limite Atingido (3 Produtos)</h4></div> ) : (
                <div className="space-y-4">
                  {/* ... (Image and Basic Inputs) ... */}
                  <div className="flex items-center gap-4"><div className="w-16 h-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">{productForm.image ? <img src={productForm.image} className="w-full h-full object-cover" /> : <Upload size={20} className="text-slate-400" />}</div><div className="flex-1"><label className="block text-xs font-medium text-slate-500 mb-1">Foto do Produto</label><div className="flex gap-2"><input type="text" placeholder="URL da imagem..." className="flex-1 border rounded p-2 text-sm outline-none" value={productForm.image || ''} onChange={(e) => setProductForm({...productForm, image: e.target.value})} /><label className="bg-slate-100 hover:bg-slate-200 cursor-pointer p-2 rounded border border-slate-300"><Upload size={16} /><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label></div></div></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Nome do Produto</label><input className="w-full border rounded p-2 outline-none" value={productForm.name || ''} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Ex: Coca Cola 2L"/></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-slate-500 mb-1">Preço Venda</label><PriceInput className="w-full border rounded p-2 outline-none" value={productForm.price} onChange={val => setProductForm({...productForm, price: val})} /></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Custo</label><PriceInput className="w-full border rounded p-2 outline-none" value={productForm.cost} onChange={val => setProductForm({...productForm, cost: val})} /></div></div>
                  <div className="grid grid-cols-2 gap-4">
                    {(() => {
                        const sizes = productForm.sizes || [];
                        const colors = productForm.colors || [];
                        const numbers = productForm.numbers || [];
                        const hasVariations = sizes.length > 1 || colors.length > 1 || numbers.length > 1;
                        
                        let computedStock = productForm.stock || 0;
                        if (hasVariations && productForm.variationStock) {
                            computedStock = Object.values(productForm.variationStock).reduce((sum, val) => sum + (val || 0), 0);
                        }

                        return (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Estoque {hasVariations ? '(Auto)' : ''}
                                </label>
                                <input 
                                    type="number" 
                                    className={`w-full border rounded p-2 outline-none ${hasVariations ? 'bg-slate-100 text-slate-500' : ''}`}
                                    value={computedStock} 
                                    readOnly={hasVariations}
                                    onChange={e => {
                                        if(!hasVariations) setProductForm({...productForm, stock: parseFloat(e.target.value)});
                                    }} 
                                />
                            </div>
                        );
                    })()}
                    <div className="relative"><label className="block text-xs font-medium text-slate-500 mb-1">Código</label><input type="text" className="w-full border rounded p-2 pr-10 outline-none" value={productForm.code || ''} onChange={e => setProductForm({...productForm, code: e.target.value})} />{isMobile && (<button onClick={() => setScannerTarget('prodCode')} className="absolute right-2 bottom-2 p-1 text-slate-500"><Camera size={18} /></button>)}</div></div>

                  {/* BRAND & CATEGORY (WITH INLINE ADD) */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Marca</label>
                        {isAddingNewBrand ? (
                            <div className="flex items-center gap-1">
                                <input 
                                    className="w-full border border-blue-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                                    placeholder="Nova Marca"
                                    value={newBrandName}
                                    onChange={(e) => setNewBrandName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={() => { setIsAddingNewBrand(false); setNewBrandName(''); }} className="p-2 bg-red-100 text-red-500 rounded hover:bg-red-200"><X size={16}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <select className="w-full border rounded p-2 text-sm outline-none" value={productForm.brand || ''} onChange={e => setProductForm({...productForm, brand: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                                <button onClick={() => setIsAddingNewBrand(true)} className="p-2 bg-slate-100 text-blue-600 rounded hover:bg-blue-50 border border-slate-200" title="Criar nova marca"><Plus size={16}/></button>
                            </div>
                        )}
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
                        <input type="text" className="w-full border rounded p-2 outline-none" value={productForm.category || ''} onChange={e => setProductForm({...productForm, category: e.target.value})} placeholder="Ex: Bebidas" />
                     </div>
                  </div>

                  {/* SUPPLIER (WITH INLINE ADD) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Fornecedor</label>
                    {isAddingNewSupplier ? (
                        <div className="flex items-center gap-1">
                            <input 
                                className="w-full border border-blue-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                                placeholder="Nome do Novo Fornecedor"
                                value={newSupplierName}
                                onChange={(e) => setNewSupplierName(e.target.value)}
                                autoFocus
                            />
                            <button onClick={() => { setIsAddingNewSupplier(false); setNewSupplierName(''); }} className="p-2 bg-red-100 text-red-500 rounded hover:bg-red-200"><X size={16}/></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <select className="w-full border rounded p-2 text-sm outline-none" value={productForm.supplierId || ''} onChange={e => setProductForm({...productForm, supplierId: e.target.value})}>
                                <option value="">Selecione...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button onClick={() => setIsAddingNewSupplier(true)} className="p-2 bg-slate-100 text-blue-600 rounded hover:bg-blue-50 border border-slate-200" title="Criar novo fornecedor"><Plus size={16}/></button>
                        </div>
                    )}
                  </div>
                  
                  {/* --- PRODUCT EXTRA OPTIONS (sistema local, sem vitrine online) --- */}
                  <div className="border border-indigo-100 bg-indigo-50/30 p-4 rounded-lg space-y-4">
                      <div className="space-y-4">
                        {/* --- PROMOTION CONFIG --- */}
                        <div className="bg-white p-4 rounded border border-orange-100 shadow-sm">
                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                                <input type="checkbox" className="w-4 h-4 text-orange-600" checked={productForm.promotionActive || false} onChange={e => setProductForm({...productForm, promotionActive: e.target.checked})} />
                                <span className="font-bold text-orange-600 text-sm">Ativar Promoção para este item</span>
                            </label>
                            {productForm.promotionActive && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Preço Promocional (R$)</label>
                                        <PriceInput className="w-full p-2 border rounded text-sm" value={productForm.promotionalPrice} onChange={val => setProductForm({...productForm, promotionalPrice: val})} placeholder="Ex: 99.90" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Início da Promoção (Opcional)</label>
                                        <input type="date" className="w-full p-2 border rounded text-sm" value={productForm.promotionStartDate || ''} onChange={e => setProductForm({...productForm, promotionStartDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Fim da Promoção (Opcional)</label>
                                        <input type="date" className="w-full p-2 border rounded text-sm" value={productForm.promotionEndDate || ''} onChange={e => setProductForm({...productForm, promotionEndDate: e.target.value})} />
                                    </div>
                                </div>
                            )}
                        </div>
                      </div>


                    <div className="space-y-4 pt-4 border-t border-slate-200">
                        <p className="text-xs text-slate-500">Selecione as variações disponíveis para este produto (opcional):</p>
                        
                        {(() => {
                          const handleVariationToggle = (type) => (value) => {
                            const current = productForm[type] || [];
                            const isSelected = current.includes(value);
                            if (isSelected) {
                              setProductForm({...productForm, [type]: current.filter(v => v !== value)});
                            } else {
                              const newValues = [...current, value];
                              const otherTypes = ['sizes', 'colors', 'numbers'].filter(t => t !== type);
                              const hasMultipleOther = otherTypes.some(t => (productForm[t] || []).length > 1);
                              
                              if (newValues.length > 1 && hasMultipleOther) {
                                alert("Apenas uma categoria de variação pode ter múltiplos itens selecionados.");
                                return;
                              }
                              setProductForm({...productForm, [type]: newValues});
                            }
                          };

                          const handleAddSize = async () => {
                            if (!newSizeName.trim()) return;
                            const currentSizes = settings.vitrineConfig?.availableSizes || [];
                            if (!currentSizes.includes(newSizeName)) {
                                const updatedSettings = {
                                    ...settings,
                                    vitrineConfig: {
                                        ...settings.vitrineConfig,
                                        availableSizes: [...currentSizes, newSizeName]
                                    }
                                };
                                await updateSettings(updatedSettings);
                            }
                            handleVariationToggle('sizes')(newSizeName);
                            setNewSizeName('');
                            setIsAddingNewSize(false);
                          };

                          const handleAddColor = async () => {
                            if (!newColorName.trim()) return;
                            const currentColors = settings.vitrineConfig?.availableColors || [];
                            if (!currentColors.includes(newColorName)) {
                                const updatedSettings = {
                                    ...settings,
                                    vitrineConfig: {
                                        ...settings.vitrineConfig,
                                        availableColors: [...currentColors, newColorName]
                                    }
                                };
                                await updateSettings(updatedSettings);
                            }
                            handleVariationToggle('colors')(newColorName);
                            setNewColorName('');
                            setIsAddingNewColor(false);
                          };

                          const handleAddNumber = async () => {
                            if (!newNumberName.trim()) return;
                            const currentNumbers = settings.vitrineConfig?.availableNumbers || [];
                            if (!currentNumbers.includes(newNumberName)) {
                                const updatedSettings = {
                                    ...settings,
                                    vitrineConfig: {
                                        ...settings.vitrineConfig,
                                        availableNumbers: [...currentNumbers, newNumberName]
                                    }
                                };
                                await updateSettings(updatedSettings);
                            }
                            handleVariationToggle('numbers')(newNumberName);
                            setNewNumberName('');
                            setIsAddingNewNumber(false);
                          };

                          return (
                            <>
                              {/* Tamanhos */}
                              <div>
                                <span className="block text-xs font-bold text-slate-600 mb-2">Tamanhos</span>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {settings.vitrineConfig?.availableSizes?.map(size => {
                                    const isSelected = (productForm.sizes || []).includes(size);
                                    return (
                                      <button 
                                        key={size}
                                        onClick={() => handleVariationToggle('sizes')(size)}
                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                      >
                                        {size}
                                      </button>
                                    );
                                  })}
                                  {isAddingNewSize ? (
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="text"
                                        className="px-2 py-1 text-sm border border-blue-300 rounded-full w-24 outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Ex: XGG"
                                        value={newSizeName}
                                        onChange={e => setNewSizeName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSize()}
                                        autoFocus
                                      />
                                      <button onClick={handleAddSize} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"><Plus size={14} /></button>
                                      <button onClick={() => { setIsAddingNewSize(false); setNewSizeName(''); }} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-full"><X size={14} /></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setIsAddingNewSize(true)} className="px-3 py-1 text-sm rounded-full border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors flex items-center gap-1">
                                      <Plus size={14} /> Adicionar
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Cores */}
                              <div className="mt-4">
                                <span className="block text-xs font-bold text-slate-600 mb-2">Cores</span>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {settings.vitrineConfig?.availableColors?.map(color => {
                                    const isSelected = (productForm.colors || []).includes(color);
                                    return (
                                      <button 
                                        key={color}
                                        onClick={() => handleVariationToggle('colors')(color)}
                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                      >
                                        {color}
                                      </button>
                                    );
                                  })}
                                  {isAddingNewColor ? (
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="text"
                                        className="px-2 py-1 text-sm border border-blue-300 rounded-full w-24 outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Ex: Azul"
                                        value={newColorName}
                                        onChange={e => setNewColorName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddColor()}
                                        autoFocus
                                      />
                                      <button onClick={handleAddColor} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"><Plus size={14} /></button>
                                      <button onClick={() => { setIsAddingNewColor(false); setNewColorName(''); }} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-full"><X size={14} /></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setIsAddingNewColor(true)} className="px-3 py-1 text-sm rounded-full border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors flex items-center gap-1">
                                      <Plus size={14} /> Adicionar
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Números */}
                              <div className="mt-4">
                                <span className="block text-xs font-bold text-slate-600 mb-2">Números</span>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {settings.vitrineConfig?.availableNumbers?.map(num => {
                                    const isSelected = (productForm.numbers || []).includes(num);
                                    return (
                                      <button 
                                        key={num}
                                        onClick={() => handleVariationToggle('numbers')(num)}
                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                      >
                                        {num}
                                      </button>
                                    );
                                  })}
                                  {isAddingNewNumber ? (
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="text"
                                        className="px-2 py-1 text-sm border border-blue-300 rounded-full w-24 outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Ex: 40"
                                        value={newNumberName}
                                        onChange={e => setNewNumberName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddNumber()}
                                        autoFocus
                                      />
                                      <button onClick={handleAddNumber} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"><Plus size={14} /></button>
                                      <button onClick={() => { setIsAddingNewNumber(false); setNewNumberName(''); }} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-full"><X size={14} /></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setIsAddingNewNumber(true)} className="px-3 py-1 text-sm rounded-full border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors flex items-center gap-1">
                                      <Plus size={14} /> Adicionar
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Variation Stock Input */}
                              {(() => {
                                const sizes = productForm.sizes || [];
                                const colors = productForm.colors || [];
                                const numbers = productForm.numbers || [];
                                
                                let varyingType = null;
                                if (sizes.length > 1) varyingType = 'sizes';
                                else if (colors.length > 1) varyingType = 'colors';
                                else if (numbers.length > 1) varyingType = 'numbers';
                                
                                if (!varyingType) return null;

                                const varyingOptions = productForm[varyingType] || [];
                                const singleSize = sizes.length === 1 ? sizes[0] : '';
                                const singleColor = colors.length === 1 ? colors[0] : '';
                                const singleNumber = numbers.length === 1 ? numbers[0] : '';
                                
                                return (
                                  <div className="mt-4 pt-4 border-t border-slate-100">
                                    <span className="block text-xs font-bold text-slate-600 mb-2">Estoque por Variação</span>
                                    <div className="space-y-2">
                                      {varyingOptions.map(opt => {
                                        const nameParts = [];
                                        if (singleColor && varyingType !== 'colors') nameParts.push(singleColor);
                                        if (singleSize && varyingType !== 'sizes') nameParts.push(singleSize);
                                        if (singleNumber && varyingType !== 'numbers') nameParts.push(singleNumber);
                                        nameParts.push(opt);
                                        const label = nameParts.join(' - ');
                                        
                                        return (
                                           <div key={opt} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                                             <div className="flex items-center justify-between gap-2">
                                               <span className="text-sm font-semibold text-slate-700">{label}</span>
                                               <div className="flex flex-wrap gap-2 justify-end">
                                                 <div className="flex items-center gap-2">
                                                   <span className="text-xs text-slate-500">Cód:</span>
                                                   <input 
                                                     type="text" 
                                                     className="w-24 p-1 border rounded text-sm text-center" 
                                                     placeholder="Código"
                                                     value={productForm.variationCodes?.[opt] ?? ''}
                                                     onChange={e => {
                                                       setProductForm({
                                                         ...productForm, 
                                                         variationCodes: {
                                                           ...(productForm.variationCodes || {}),
                                                           [opt]: e.target.value
                                                         }
                                                       });
                                                     }}
                                                   />
                                                 </div>
                                                 <div className="flex items-center gap-2">
                                                   <span className="text-xs text-slate-500">Estoque:</span>
                                                   <input 
                                                     type="number" 
                                                     min="0"
                                                     className="w-20 p-1 border rounded text-sm text-center" 
                                                     placeholder="Qtd"
                                                     value={productForm.variationStock?.[opt] ?? ''}
                                                     onChange={e => {
                                                       const val = parseInt(e.target.value);
                                                       setProductForm({
                                                         ...productForm, 
                                                         variationStock: {
                                                           ...(productForm.variationStock || {}),
                                                           [opt]: isNaN(val) ? 0 : val
                                                         }
                                                       });
                                                     }}
                                                   />
                                                 </div>
                                                 <div className="flex items-center gap-2">
                                                   <span className="text-xs text-slate-500">Preço:</span>
                                                   <input 
                                                     type="number" 
                                                     step="0.01"
                                                     className={`w-20 p-1 border rounded text-sm text-center ${productForm.variationPromotions?.[opt]?.promotionActive ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}`} 
                                                     placeholder="R$"
                                                     value={productForm.variationPrices?.[opt] ?? ''}
                                                     disabled={productForm.variationPromotions?.[opt]?.promotionActive}
                                                     onChange={e => {
                                                       const val = parseFloat(e.target.value);
                                                       setProductForm({
                                                         ...productForm, 
                                                         variationPrices: {
                                                           ...(productForm.variationPrices || {}),
                                                           [opt]: isNaN(val) ? 0 : val
                                                         }
                                                       });
                                                     }}
                                                   />
                                                 </div>
                                               </div>
                                             </div>

                                             {/* Promotion specific to this variation */}
                                             <div className="pt-2 border-t border-dashed border-slate-200 space-y-2">
                                               <label className="flex items-center gap-2 cursor-pointer">
                                                 <input 
                                                   type="checkbox" 
                                                   className="w-4 h-4 text-orange-600 rounded" 
                                                   checked={productForm.variationPromotions?.[opt]?.promotionActive || false}
                                                   onChange={e => {
                                                     const currentPromo = productForm.variationPromotions?.[opt] || {};
                                                     setProductForm({
                                                       ...productForm, 
                                                       variationPromotions: {
                                                         ...(productForm.variationPromotions || {}),
                                                         [opt]: {
                                                           ...currentPromo,
                                                           promotionActive: e.target.checked
                                                         }
                                                       }
                                                     });
                                                   }}
                                                 />
                                                 <span className="text-xs font-bold text-orange-600">Ativar promoção para esta variação</span>
                                               </label>

                                                 {productForm.variationPromotions?.[opt]?.promotionActive && (
                                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white p-2 rounded border border-orange-100">
                                                     <div>
                                                       <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Preço Promo (R$)</label>
                                                       <input 
                                                         type="number" 
                                                         step="0.01"
                                                         className="w-full p-1 border rounded text-xs" 
                                                         placeholder="Ex: 89.90"
                                                         value={productForm.variationPromotions?.[opt]?.promotionalPrice ?? ''}
                                                         onChange={e => {
                                                           const currentPromo = productForm.variationPromotions?.[opt] || {};
                                                           setProductForm({
                                                             ...productForm,
                                                             variationPromotions: {
                                                               ...(productForm.variationPromotions || {}),
                                                               [opt]: {
                                                                 ...currentPromo,
                                                                 promotionalPrice: e.target.value === '' ? undefined : Number(e.target.value)
                                                               }
                                                             }
                                                           });
                                                         }}
                                                       />
                                                     </div>
                                                     <div>
                                                       <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Início</label>
                                                       <input 
                                                         type="date" 
                                                         className="w-full p-1 border rounded text-xs"
                                                         value={productForm.variationPromotions?.[opt]?.promotionStartDate || ''}
                                                         onChange={e => {
                                                           const currentPromo = productForm.variationPromotions?.[opt] || {};
                                                           setProductForm({
                                                             ...productForm,
                                                             variationPromotions: {
                                                               ...(productForm.variationPromotions || {}),
                                                               [opt]: {
                                                                 ...currentPromo,
                                                                 promotionStartDate: e.target.value
                                                               }
                                                             }
                                                           });
                                                         }}
                                                       />
                                                     </div>
                                                     <div>
                                                       <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Fim</label>
                                                       <input 
                                                         type="date" 
                                                         className="w-full p-1 border rounded text-xs"
                                                         value={productForm.variationPromotions?.[opt]?.promotionEndDate || ''}
                                                         onChange={e => {
                                                           const currentPromo = productForm.variationPromotions?.[opt] || {};
                                                           setProductForm({
                                                             ...productForm,
                                                             variationPromotions: {
                                                               ...(productForm.variationPromotions || {}),
                                                               [opt]: {
                                                                 ...currentPromo,
                                                                 promotionEndDate: e.target.value
                                                               }
                                                             }
                                                           });
                                                         }}
                                                       />
                                                     </div>
                                                   </div>
                                                 )}
                                               </div>
                                           </div>
                                         );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}

                      </div>
                  </div>
                  
                  <button onClick={handleSmartDesc} disabled={isGeneratingDesc} className="w-full py-2 bg-purple-50 text-purple-600 rounded border border-purple-200 hover:bg-purple-100 flex items-center justify-center gap-2 text-sm transition-colors"><Sparkles size={16} /> {isGeneratingDesc ? 'Pensando...' : 'Gerar Descrição IA'}</button>
                  <button onClick={handleSubmitProduct} className="w-full bg-primary text-white py-2 rounded hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg active:scale-95"><Save size={16} /> {isEditingProd ? 'Atualizar Produto' : 'Salvar Produto'}</button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* --- PLANS TAB --- */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-700">Planos para venda no PDV</h3>
                  <p className="text-xs text-slate-500 mt-1">Cadastre código, preço, validade, bônus e estoque dos planos.</p>
                </div>
                <span className="text-xs text-slate-500">{filteredPlans.length} cadastrado(s)</span>
              </div>
              <div className="mt-3 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={planSearch} onChange={e => setPlanSearch(e.target.value)} placeholder="Buscar plano por nome ou código..." className="w-full border rounded pl-9 pr-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4">Código</th><th className="p-4">Plano</th><th className="p-4">Preço</th><th className="p-4">Validade</th><th className="p-4">Estoque</th><th className="p-4 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50">
                      <td className="p-4 text-xs font-mono text-slate-500">{plan.code || '-'}</td>
                      <td className="p-4"><div className="font-medium text-slate-800">{plan.name}</div>{plan.brand && <div className="text-xs text-slate-500">{plan.brand}</div>}</td>
                      <td className="p-4 font-bold text-slate-800">R$ {Number(plan.price || 0).toFixed(2)}</td>
                      <td className="p-4 text-slate-600">
                        {plan.validityDays || 30} dias
                        {plan.bonusEnabled && (plan.bonusDays || 0) > 0 && <span className="ml-1 text-xs font-semibold text-green-600">+{plan.bonusDays} bônus = {(plan.validityDays || 30) + (plan.bonusDays || 0)} dias</span>}
                      </td>
                      <td className="p-4 text-slate-600">{plan.unlimitedStock === false ? plan.stock : 'Ilimitado (999999)'}</td>
                      <td className="p-4 text-right"><button onClick={() => handleEditPlan(plan)} className="text-blue-500 hover:text-blue-700 p-2" title="Editar plano"><Pencil size={18} /></button><button onClick={() => handleDeleteProduct(plan.id)} className="text-red-500 hover:text-red-700 p-2" title="Excluir plano"><Trash2 size={18} /></button></td>
                    </tr>
                  ))}
                  {filteredPlans.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Nenhum plano cadastrado para venda.</td></tr>}
                </tbody>
              </table>
            </div>

          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2 text-slate-800"><PackagePlus size={20} /> {isEditingPlan ? 'Editar Plano' : 'Novo Plano'}</h3>{isEditingPlan && <button onClick={() => { setIsEditingPlan(false); setPlanForm({ ...emptyPlanForm }); }} className="text-sm text-slate-400 hover:text-slate-600">Cancelar</button>}</div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {planForm.image ? <img src={planForm.image} className="w-full h-full object-cover" alt="" /> : <Upload size={20} className="text-slate-400" />}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Imagem do Plano</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="URL da imagem..." className="flex-1 border rounded p-2 text-sm outline-none" value={planForm.image || ''} onChange={e => setPlanForm({ ...planForm, image: e.target.value })} />
                    <label className="bg-slate-100 hover:bg-slate-200 cursor-pointer p-2 rounded border border-slate-300" title="Enviar imagem do computador">
                      <Upload size={16} />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePlanImageUpload} />
                    </label>
                    {planForm.image && <button type="button" onClick={() => setPlanForm({ ...planForm, image: '' })} className="p-2 rounded border border-slate-300 text-red-500 hover:bg-red-50" title="Remover imagem"><Trash2 size={16} /></button>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Código do Plano</label><input className="w-full border rounded p-2 outline-none" value={planForm.code} onChange={e => setPlanForm({ ...planForm, code: e.target.value })} placeholder="Ex: PLANO180" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Nome do Plano</label><input className="w-full border rounded p-2 outline-none" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Ex: Plano Mensal" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-slate-500 mb-1">Preço de Venda</label><PriceInput className="w-full border rounded p-2 outline-none" value={planForm.price} onChange={price => setPlanForm({ ...planForm, price })} /></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Validade (dias)</label><input type="number" min="1" className="w-full border rounded p-2 outline-none" value={planForm.validityDays} onChange={e => setPlanForm({ ...planForm, validityDays: Number(e.target.value) })} /></div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Custo (opcional)</label><PriceInput className="w-full border rounded p-2 outline-none" value={planForm.cost} onChange={cost => setPlanForm({ ...planForm, cost })} /></div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={planForm.bonusEnabled} onChange={e => setPlanForm({ ...planForm, bonusEnabled: e.target.checked })} />
                  <Gift size={16} className="text-green-600" /> Adicionar brinde / bônus de dias
                </label>
                {planForm.bonusEnabled && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Dias de bônus</label>
                    <input type="number" min="0" className="w-full border rounded p-2 outline-none" value={planForm.bonusDays} onChange={e => setPlanForm({ ...planForm, bonusDays: Number(e.target.value) })} placeholder="Ex: 30" />
                    <p className="text-xs text-green-700 mt-2 font-medium">Cliente recebe {Number(planForm.validityDays) || 0} + {Number(planForm.bonusDays) || 0} = {(Number(planForm.validityDays) || 0) + (Number(planForm.bonusDays) || 0)} dias.</p>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={planForm.unlimitedStock} onChange={e => setPlanForm({ ...planForm, unlimitedStock: e.target.checked })} />
                  Estoque sem limites (999999)
                </label>
                {!planForm.unlimitedStock && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantidade em estoque</label>
                    <input type="number" min="0" className="w-full border rounded p-2 outline-none" value={planForm.stock} onChange={e => setPlanForm({ ...planForm, stock: Number(e.target.value) })} placeholder="Ex: 50" />
                    <p className="text-xs text-slate-500 mt-2">A quantidade diminui a cada venda no PDV.</p>
                  </div>
                )}
              </div>

              <div><label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label><textarea className="w-full border rounded p-2 outline-none resize-none" rows={3} value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Informações do plano" /></div>
              <button onClick={handleSubmitPlan} className="w-full bg-primary text-white py-2 rounded hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg"><Save size={16} /> {isEditingPlan ? 'Atualizar Plano' : 'Salvar Plano'}</button>
            </div>
          </div>
        </div>
      )}


      {/* --- CUSTOMERS TAB (Kept as is) --- */}
      {activeTab === 'customers' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* ... List and Form logic for Customers (Same as before) ... */}
           <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col"><div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4"><h3 className="font-bold text-slate-700 whitespace-nowrap">Clientes</h3><div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
  <div className="relative flex-1 sm:w-64">
    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
    <input 
      className="w-full pl-9 pr-10 py-2 text-sm border rounded-lg focus:outline-none focus:border-accent" 
      placeholder="Nome, CPF, Matrícula, Cartão ou Empresa..." 
      value={custSearch} 
      onChange={(e) => setCustSearch(e.target.value)}
    />
    {isMobile && (
      <button onClick={() => setScannerTarget('custSearch')} className="absolute right-2 top-2 p-1 text-slate-500">
        <Camera size={18} />
      </button>
    )}
  </div>
  <select 
    className="border rounded-lg px-3 py-2 text-sm outline-none bg-white"
    value={custCompanyFilter}
    onChange={(e) => setCustCompanyFilter(e.target.value)}
  >
    <option value="">Todas as Empresas</option>
    {companies.map(comp => (
      <option key={comp.id} value={comp.id}>{comp.name}</option>
    ))}
  </select>
  <button onClick={handleAniversariantesClick} className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg flex items-center gap-2 border border-purple-200">
    {isFreeVersion ? <Lock size={18} /> : <Cake size={18} />} 
    <span className="hidden sm:inline">Aniversariantes</span>
  </button>
</div></div><div className="overflow-x-auto"><table className="w-full text-left min-w-[500px]"><thead className="bg-white text-slate-500 text-sm border-b border-slate-100"><tr><th className="p-4">Nome</th><th className="p-4">Contato / Endereço</th><th className="p-4">Crédito Pessoal da Loja</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredCustomers.map(c => (<tr key={c.id} className="hover:bg-slate-50"><td className="p-4 font-medium text-slate-800">{c.name}{c.raffleWins && c.raffleWins.length > 0 && (<span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 border border-amber-300" title="Ganhador de Sorteio"><Trophy size={10} /> Ganhador</span>)}{c.cpf && (<div className="text-[10px] text-slate-400 mt-0.5">CPF: {c.cpf}</div>)}{c.birthDate && (<div className="text-[10px] text-purple-600 flex items-center gap-1 mt-1 font-normal"><Gift size={10} /> {new Date(c.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')}</div>)}</td><td className="p-4 text-slate-500"><div className="text-sm">{c.email}</div><div className="text-xs">{c.phone}</div>{c.city && <div className="text-xs mt-1 text-slate-400 flex items-center gap-1"><MapPin size={10} /> {c.city}/{c.state}</div>}</td><td className="p-4">{c.debt > 0 ? (<span className="text-red-500 font-bold">R$ {c.debt.toFixed(2)}</span>) : (<span className="text-green-500 text-sm">Em dia</span>)}</td><td className="p-4 text-right">{!isFreeVersion ? ( <><button onClick={() => setInfoCustomer(c)} className="text-purple-500 hover:text-purple-700 p-2" title="Info"><Info size={18} /></button>{c.phone && (<button onClick={() => setMsgModalCustomer(c)} className="text-green-500 hover:text-green-700 p-2" title="Msg"><MessageCircle size={18} /></button>)}<button onClick={() => handleEditCustomer(c)} className="text-blue-500 hover:text-blue-700 p-2"><Pencil size={18} /></button><button onClick={() => handleDeleteCustomer(c.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={18} /></button></> ) : ( <Lock size={16} className="text-slate-300 inline-block" /> )}</td></tr>))}</tbody></table></div></div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800"><UserPlus size={20}/> {isEditingCust ? 'Editar Cliente' : 'Novo Cliente'}</h3>
               {isEditingCust && !isFreeVersion && (<button onClick={() => { setIsEditingCust(false); setCustomerForm({name:'', cpf:'', phone:'', email:'', debt:0, birthDate: '', street: '', number: '', apartment: '', city: '', state: '', companyId: '', employeeId: '', loyaltyCardNumber: ''}); }} className="text-sm text-slate-400">Cancelar</button>)}
             </div>
             {isFreeVersion && customers.length >= 5 ? ( 
               <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center"><Lock className="mx-auto text-orange-400 mb-2" size={32} /><h4 className="font-bold text-orange-800 text-sm mb-1">Limite Atingido (5)</h4></div> 
             ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo</label>
                    <input className="w-full border rounded p-2 outline-none" value={customerForm.name || ''} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="Nome do cliente"/>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">CPF (Opcional)</label>
                      <input className="w-full border rounded p-2 text-sm outline-none" value={customerForm.cpf || ''} onChange={e => setCustomerForm({...customerForm, cpf: e.target.value})} placeholder="000.000.000-00"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nascimento</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-2.5 top-2.5 text-slate-400"/>
                        <input type="date" className="w-full pl-8 border rounded p-2 text-sm text-slate-600 outline-none" value={customerForm.birthDate || ''} onChange={e => setCustomerForm({...customerForm, birthDate: e.target.value})}/>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Empresa (Opcional)</label>
                      <select className="w-full border rounded p-2 text-sm outline-none bg-white" value={customerForm.companyId || ''} onChange={e => setCustomerForm({...customerForm, companyId: e.target.value})}>
                        <option value="">Nenhuma</option>
                        {companies.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {!customerForm.companyId && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1 cursor-pointer">
                          <input type="checkbox" checked={customerForm.creditLimitEnabled || false} onChange={e => setCustomerForm({...customerForm, creditLimitEnabled: e.target.checked})} />
                          Definir Limite de Crédito
                        </label>
                      </div>
                      {customerForm.creditLimitEnabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Limite de Crédito</label>
                            <PriceInput className="w-full border rounded p-2 text-sm outline-none" value={customerForm.creditLimit} onChange={val => setCustomerForm({...customerForm, creditLimit: val})} placeholder="0.00"/>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Máx. Parcelas</label>
                            <input type="number" className="w-full border rounded p-2 text-sm outline-none" value={customerForm.installmentLimit || ''} onChange={e => setCustomerForm({...customerForm, installmentLimit: parseInt(e.target.value) || 0})} placeholder="0"/>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Número do Cartão</label>
                        <input className="w-full border rounded p-2 text-sm outline-none" value={customerForm.cardNumber || ''} onChange={e => setCustomerForm({...customerForm, cardNumber: e.target.value})} placeholder="0000 0000 0000 0000"/>
                      </div>
                    </div>
                  )}

                  {customerForm.companyId && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Matrícula</label>
                          <input className="w-full border rounded p-2 text-sm outline-none" value={customerForm.employeeId || ''} onChange={e => setCustomerForm({...customerForm, employeeId: e.target.value})} placeholder="Matrícula"/>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Nº Cartão</label>
                          <input className="w-full border rounded p-2 text-sm outline-none" value={customerForm.loyaltyCardNumber || ''} onChange={e => setCustomerForm({...customerForm, loyaltyCardNumber: e.target.value})} placeholder="Nº Cartão"/>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Senha (Opcional)</label>
                          <input type="password" title="Senha para compras" className="w-full border rounded p-2 text-sm outline-none" value={customerForm.password || ''} onChange={e => setCustomerForm({...customerForm, password: e.target.value})} placeholder="Senha"/>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Confirmar Senha</label>
                          <input type="password" title="Confirmar senha" className="w-full border rounded p-2 text-sm outline-none" value={customerForm.confirmPassword || ''} onChange={e => setCustomerForm({...customerForm, confirmPassword: e.target.value})} placeholder="Confirmar"/>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Telefone / WhatsApp</label>
                    <input className="w-full border rounded p-2 outline-none" value={customerForm.phone || ''} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="11999999999"/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Email (Opcional)</label>
                    <input className="w-full border rounded p-2 outline-none" value={customerForm.email || ''} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} placeholder="email@exemplo.com"/>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Endereço (Opcional)</p>
                    
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Rua / Logradouro</label>
                        <input className="w-full border rounded p-2 text-sm outline-none" value={customerForm.street || ''} onChange={e => setCustomerForm({...customerForm, street: e.target.value})}/>
                      </div>
                      <div className="w-20">
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Número</label>
                        <input className="w-full border rounded p-2 text-sm outline-none" value={customerForm.number || ''} onChange={e => setCustomerForm({...customerForm, number: e.target.value})}/>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Apartamento / Complemento</label>
                      <input className="w-full border rounded p-2 text-sm outline-none" value={customerForm.apartment || ''} onChange={e => setCustomerForm({...customerForm, apartment: e.target.value})}/>
                    </div>

                    <div className="flex gap-2">
                      <div className="w-24">
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Estado (UF)</label>
                        <select className="w-full border rounded p-2 text-sm outline-none bg-white" value={customerForm.state || ''} onChange={e => { setCustomerForm({...customerForm, state: e.target.value, city: ''}); }}>
                          <option value="">UF</option>
                          {statesList.map(uf => (<option key={uf.id} value={uf.sigla}>{uf.sigla}</option>))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-slate-500 mb-1">Cidade</label>
                        {loadingCities ? (
                          <div className="w-full border rounded p-2 text-sm bg-slate-50 text-slate-400">Carregando...</div>
                        ) : (
                          <select className="w-full border rounded p-2 text-sm outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400" value={customerForm.city || ''} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} disabled={!customerForm.state}>
                            <option value="">{customerForm.state ? 'Selecione a cidade' : 'Selecione o estado primeiro'}</option>
                            {citiesList.map(city => (<option key={city.id} value={city.nome}>{city.nome}</option>))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmitCustomer} 
                    className="w-full bg-primary text-white py-2 rounded hover:bg-slate-800 transition-colors mt-4"
                  >
                    {isEditingCust ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                  </button>
                </div>
              )}
            </div>
          </div>
       )}
      {/* --- BRANDS TAB --- */}
      {activeTab === 'brands' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Brands List */}
              <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><Factory size={20}/> Marcas Cadastradas</h3>
                      <span className="text-xs text-slate-500 font-medium bg-slate-200 px-2 py-1 rounded-full">{brands.length}</span>
                  </div>
                  <div className="overflow-y-auto max-h-[600px] p-2">
                      {brands.length === 0 ? (
                          <div className="p-10 text-center text-slate-400">Nenhuma marca cadastrada.</div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {brands.map(b => (
                                  <div key={b.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                      <span className="font-medium text-slate-700">{b.name}</span>
                                      <div className="flex gap-2">
                                          {!isFreeVersion ? (
                                              <>
                                                  <button onClick={() => handleEditBrand(b)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={16}/></button>
                                                  <button onClick={() => handleDeleteBrand(b.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                              </>
                                          ) : <Lock size={14} className="text-slate-300"/>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* Brand Form */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800">{isEditingBrand ? 'Editar Marca' : 'Nova Marca'}</h3>
                      {isEditingBrand && <button onClick={() => {setIsEditingBrand(false); setBrandForm({name: ''})}} className="text-xs text-slate-400">Cancelar</button>}
                  </div>
                  
                  {isFreeVersion && brands.length >= 3 ? (
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center">
                          <Lock className="mx-auto text-orange-400 mb-2" size={32} />
                          <p className="text-xs text-orange-600">Limite de 3 marcas atingido.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Nome da Marca</label>
                              <input 
                                  className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" 
                                  value={brandForm.name || ''} 
                                  onChange={e => setBrandForm({...brandForm, name: e.target.value})} 
                                  placeholder="Ex: Samsung, Nike..."
                              />
                          </div>
                          <button onClick={handleSubmitBrand} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors shadow-sm">
                              {isEditingBrand ? 'Salvar Alterações' : 'Cadastrar Marca'}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- SUPPLIERS TAB --- */}
      {activeTab === 'suppliers' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Suppliers List */}
              <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><Truck size={20}/> Fornecedores Cadastrados</h3>
                      <span className="text-xs text-slate-500 font-medium bg-slate-200 px-2 py-1 rounded-full">{suppliers.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="text-sm text-slate-500 border-b border-slate-100 bg-slate-50">
                              <tr>
                                  <th className="p-3">Nome</th>
                                  <th className="p-3">Contato</th>
                                  <th className="p-3 text-right">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {suppliers.map(s => (
                                  <tr key={s.id} className="hover:bg-slate-50">
                                      <td className="p-3 font-medium text-slate-800">{s.name}</td>
                                      <td className="p-3 text-slate-500 text-sm">{s.contact || '-'}</td>
                                      <td className="p-3 text-right">
                                          <div className="flex justify-end gap-2">
                                              {!isFreeVersion ? (
                                                  <>
                                                      <button onClick={() => handleEditSupplier(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={16}/></button>
                                                      <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                  </>
                                              ) : <Lock size={14} className="text-slate-300"/>}
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {suppliers.length === 0 && (
                                  <tr><td colSpan={3} className="p-8 text-center text-slate-400">Nenhum fornecedor cadastrado.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Supplier Form */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800">{isEditingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                      {isEditingSupplier && <button onClick={() => {setIsEditingSupplier(false); setSupplierForm({name: '', contact: ''})}} className="text-xs text-slate-400">Cancelar</button>}
                  </div>
                  
                  {isFreeVersion && suppliers.length >= 3 ? (
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center">
                          <Lock className="mx-auto text-orange-400 mb-2" size={32} />
                          <p className="text-xs text-orange-600">Limite de 3 fornecedores atingido.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Nome da Empresa</label>
                              <input 
                                  className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" 
                                  value={supplierForm.name || ''} 
                                  onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} 
                                  placeholder="Ex: Distribuidora XYZ"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Contato (Tel/Email)</label>
                              <input 
                                  className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-blue-500" 
                                  value={supplierForm.contact || ''} 
                                  onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} 
                                  placeholder="(00) 0000-0000"
                              />
                          </div>
                          <button onClick={handleSubmitSupplier} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors shadow-sm">
                              {isEditingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Confirmation Modal Render */}
      {confirmConfig && (
          <ConfirmModal 
              isOpen={confirmConfig.isOpen}
              onClose={() => setConfirmConfig(null)}
              onConfirm={confirmConfig.onConfirm}
              title={confirmConfig.title}
              message={confirmConfig.message}
              isDangerous={true}
              confirmText="Sim, Excluir"
          />
      )}

      {/* Product Info Modal */}
      {productInfoModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center p-4 border-b border-slate-100">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><Info size={20} className="text-purple-500" /> Informações de Variação</h3>
               <button onClick={() => setProductInfoModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="mb-4">
                   <div className="font-bold text-lg text-slate-800">{productInfoModal.name}</div>
                   <div className="text-sm text-slate-500">Estoque Total: {productInfoModal.stock}</div>
                </div>
                {productInfoModal.variationStock && Object.keys(productInfoModal.variationStock).length > 0 ? (
                  <div className="space-y-2">
                    <span className="block text-sm font-bold text-slate-600 mb-2 border-b pb-1">Estoque por Variação</span>
                    {Object.entries(productInfoModal.variationStock).map(([opt, qty]) => (
                      <div key={opt} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-100 rounded">
                         <span className="text-sm font-medium text-slate-700">{opt}</span>
                         <div className="flex items-center gap-3">
                           <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{qty} un</span>
                           <button 
                             onClick={() => {
                               setProductInfoModal(null);
                               // Small hack: we can pass a specific structure or just open the Barcode modal with this product.
                               // The user wants to print specifically THIS variation from this modal?
                               // Wait, if we open BarcodeLabelPrint from here, we need a way to tell it WHICH variation was selected.
                               // Since BarcodeLabelPrint uses its own batches state, we can add an initialBatch property to it.
                               setPrintingProduct({...productInfoModal, _initialVariationToPrint: opt});
                             }} 
                             className="text-orange-500 hover:text-orange-700 bg-orange-50 p-1.5 rounded" 
                             title="Imprimir Etiqueta"
                           >
                             <BarcodeIcon size={16} />
                           </button>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">Nenhuma variação registrada.</div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* NEW CUSTOMER INFO MODAL */}
      {infoCustomer && (
           <CustomerInfoModal 
               customer={infoCustomer}
               sales={sales}
               onClose={() => setInfoCustomer(null)}
           />
      )}

      {/* MESSAGE SELECTOR MODAL */}
      {msgModalCustomer && (
          <MessageSelectorModal 
              customer={msgModalCustomer} 
              onClose={() => setMsgModalCustomer(null)} 
          />
      )}
      
      {/* BIRTHDAY MODAL */}
      {showBirthdays && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50 shrink-0">
                      <div><h3 className="font-bold text-xl text-purple-900 flex items-center gap-2"><Cake size={24} /> Aniversariantes do Mês</h3><p className="text-sm text-purple-600">Próximos 30 dias</p></div>
                      <button onClick={() => setShowBirthdays(false)} className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-500 transition-colors shadow-sm"><X size={20} /></button>
                  </div>
                  <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                      {upcomingBirthdays.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-48 text-slate-400"><Gift size={48} className="mb-4 opacity-30" /><p>Nenhum aniversariante nos próximos 30 dias.</p></div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {upcomingBirthdays.map(c => {
                                  const isToday = c.diffDays === 0;
                                  const isTomorrow = c.diffDays === 1;
                                  let cardClass = "bg-white border border-slate-200";
                                  let titleText = `Faltam ${c.diffDays} dias`;
                                  let titleColor = "text-slate-500";
                                  let icon = <Calendar size={14} />;
                                  if (isToday) { cardClass = "rainbow-blink border-2 shadow-lg"; titleText = "Fazendo aniversário hoje!"; titleColor = "text-purple-600 font-bold"; icon = <Cake size={14} className="animate-bounce" />; } else if (isTomorrow) { cardClass = "bg-blue-50 border border-blue-200 shadow-md"; titleText = "Faz aniversário amanhã"; titleColor = "text-blue-600 font-bold"; icon = <Gift size={14} />; }
                                  return (
                                      <div key={c.id} className={`rounded-xl p-5 relative transition-transform hover:scale-[1.02] ${cardClass}`}>
                                          <div className={`text-xs uppercase tracking-wide mb-2 flex items-center gap-1 ${titleColor}`}>{icon} {titleText}</div>
                                          <h4 className="font-bold text-lg text-slate-800 mb-1">{c.name}</h4>
                                          <div className="text-sm text-slate-500 mb-4 flex items-center gap-2"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{new Date(c.nextBirthday).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>{c.phone && <span className="text-xs">• {c.phone}</span>}</div>
                                          {c.phone && ( isToday ? ( <button onClick={() => setMsgModalCustomer(c)} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"><MessageCircle size={16} /> Parabenizar</button> ) : ( <button onClick={() => setMsgModalCustomer(c)} className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg font-bold text-sm transition-colors border border-blue-200"><MessageCircle size={16} /> Enviar Msg</button> ) )}
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* BARCODE SCANNER */}
      {scannerTarget && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setScannerTarget(null)}
        />
      )}

      {/* BARCODE PRINT MODAL */}
      {printingProduct && (
        <BarcodeLabelPrint
           product={printingProduct}
           settings={settings}
           onClose={() => setPrintingProduct(null)}
        />
      )}
    </div>
  );
};
