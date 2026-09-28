// @ts-nocheck
// ... existing imports
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CartItem, PaymentMethod, Customer, SalePayment } from '../types';
import { Search, Plus, Trash2, CreditCard, Banknote, QrCode, CalendarClock, User, Check, Printer, ShoppingBag, X, Copy, FileDown, Zap, Package, AlertTriangle, Calendar, Lock, Camera, Book } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { printReceipt, saveReceiptAsImage } from '../services/printerService';
import { ConfirmModal } from '../components/ConfirmModal';
import { CashSessionModal } from '../components/CashSessionModal';
import { TransactionModal } from '../components/TransactionModal';
import { DiscountModal } from '../components/DiscountModal';
import { CustomerSelectorModal } from '../components/CustomerSelectorModal';
import { CarnePrinter } from '../components/CarnePrinter';

// ... (Helpers generatePixPayload, etc. remain same)
const crc16 = (buffer: string) => {
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

const formatField = (id: string, value: string) => {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
};

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase();
};

const generatePixPayload = (key: string, name: string, city: string, amount: string, txid: string = '***') => {
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

const parseFloatSafe = (str: any): number => {
  if (str === null || str === undefined || str === '') return 0;
  const normalized = String(str).replace(',', '.');
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
};

const isGeneralPromoActive = (product: Product) => {
    if (!product.promotionActive || !product.promotionalPrice) return false;
    const now = new Date();
    now.setHours(0,0,0,0);
    if (product.promotionStartDate) {
        const start = new Date(product.promotionStartDate + 'T00:00:00');
        if (now < start) return false;
    }
    if (product.promotionEndDate) {
        const end = new Date(product.promotionEndDate + 'T23:59:59');
        if (now > end) return false;
    }
    return true;
};

const isVariationPromoActive = (product: Product, opt: string) => {
    if (!product.variationPromotions?.[opt]) return false;
    const vp = product.variationPromotions[opt];
    if (!vp.promotionActive || !vp.promotionalPrice) return false;
    const now = new Date();
    now.setHours(0,0,0,0);
    if (vp.promotionStartDate) {
        const start = new Date(vp.promotionStartDate + 'T00:00:00');
        if (now < start) return false;
    }
    if (vp.promotionEndDate) {
        const end = new Date(vp.promotionEndDate + 'T23:59:59');
        if (now > end) return false;
    }
    return true;
};

const isPromoActive = (product: Product) => {
    if (isGeneralPromoActive(product)) return true;
    if (product.variationPromotions) {
        return Object.keys(product.variationPromotions).some(opt => isVariationPromoActive(product, opt));
    }
    return false;
};

const getProductDisplayPrice = (product: Product) => {
    if (isGeneralPromoActive(product)) {
        return product.promotionalPrice!;
    }
    
    // Check variation promotions first
    if (product.variationPromotions) {
        const activeVps = Object.keys(product.variationPromotions)
            .filter(opt => isVariationPromoActive(product, opt))
            .map(opt => product.variationPromotions![opt].promotionalPrice!)
            .filter(price => typeof price === 'number' && !isNaN(price));
        if (activeVps.length > 0) {
            return Math.min(...activeVps);
        }
    }

    // Check variation custom prices
    if (product.variationPrices && Object.keys(product.variationPrices).length > 0) {
        const varPrices = Object.values(product.variationPrices).filter(p => p > 0);
        if (varPrices.length > 0) {
            return Math.min(product.price, ...varPrices);
        }
    }
    
    return product.price;
};

const getProductCurrentPrice = (product: Product, opt?: string) => {
    if (opt) {
        if (isVariationPromoActive(product, opt)) {
            return product.variationPromotions![opt].promotionalPrice!;
        }
        if (product.variationPrices?.[opt] !== undefined && product.variationPrices[opt] !== 0) {
            return product.variationPrices[opt];
        }
    }
    if (isGeneralPromoActive(product)) {
        return product.promotionalPrice!;
    }
    return product.price;
};

function generateCouponId() { return Math.floor(100000 + Math.random() * 900000).toString(); }

export const POS = () => {
  const { products, customers, sales, addSale, settings, financialRecords, authInitialized, cashSession, companies, currentUser, raffleCampaigns, isAdmin } = useStore();
  
  // Default customer "Cliente Balcão"
  const defaultCustomer = useMemo<Customer>(() => ({ 
      id: 'def', 
      name: 'Cliente Balcão', 
      phone: '', 
      email: '', 
      debt: 0 
  }), []);

  const [currentSaleId] = useState(() => Date.now().toString().slice(-6));
  
  const [cart, setCart] = useState<CartItem[]>(() => {
      const saved = localStorage.getItem('temp_cart');
      if (saved) {
          try { return JSON.parse(saved); } catch (err) { console.warn("Failed to parse local storage temp_cart", err); }
      }
      return [];
  });
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
      return localStorage.getItem('temp_customer') || 'def';
  });

  useEffect(() => {
      localStorage.setItem('temp_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
      localStorage.setItem('temp_customer', selectedCustomerId);
  }, [selectedCustomerId]);

  const [unregisteredCustomer, setUnregisteredCustomer] = useState<UnregisteredCustomer | null>(null);
  
  const selectedCustomer = useMemo(() => {
    if (unregisteredCustomer) return { id: 'unregistered', name: unregisteredCustomer.name, cpf: unregisteredCustomer.cpf, phone: unregisteredCustomer.phone || '', email: '', debt: 0 } as Customer;
    if (selectedCustomerId === 'def') return defaultCustomer;
    return customers.find(c => c.id === selectedCustomerId) || defaultCustomer;
  }, [customers, selectedCustomerId, defaultCustomer, unregisteredCustomer]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [custSearchTerm, setCustSearchTerm] = useState('');
  const [custCompanyFilter, setCustCompanyFilter] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'barcode' | 'search' | null>(null);

  const handleScan = (decodedText: string) => {
    setShowScanner(false);
    if (scannerTarget === 'barcode') {
      setBarcodeInput(decodedText);
      const product = products.find(p => p.code === decodedText);
      if (product) {
        addToCart(product);
        setBarcodeInput('');
      } else {
        alert("Produto não encontrado.");
      }
    } else if (scannerTarget === 'search') {
      setSearchTerm(decodedText);
    }
    setScannerTarget(null);
  };
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [activeMobileTab, setActiveMobileTab] = useState<'cart' | 'catalog' | 'plans'>('catalog');
  
  // Payment Modal States
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [currentPayments, setCurrentPayments] = useState<SalePayment[]>([]);
  const [amountToPay, setAmountToPay] = useState<string>(''); // For the input field
  
  // Discount State
  const [discountActive, setDiscountActive] = useState(false);
  const [discountType, setDiscountType] = useState<'%' | 'R$'>('%');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [activeDiscountItem, setActiveDiscountItem] = useState<CartItem | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Print Modal State
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showCarnePrinter, setShowCarnePrinter] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{sale: any, customer: Customer | undefined} | null>(null);

  // Confirmation Modal State (for WhatsApp)
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [creditError, setCreditError] = useState<string | null>(null);
  const [confirmExceedLimit, setConfirmExceedLimit] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setCreditError(null), 0);
    return () => clearTimeout(timeoutId);
  }, [selectedCustomerId]);

  // --- EFFECT: VALIDATE CASH SESSION ON MOUNT ---
  useEffect(() => {
    if (!authInitialized || (!settings.cashRegisterEnabled && !currentUser?.forcedCashOpening)) return;
    
    const checkSession = () => {
        if (cashSession && cashSession.status === 'aberto') {
            const openedDate = new Date(cashSession.openedAt).toDateString();
            const today = new Date().toDateString();
            if (openedDate !== today) {
                alert("Você possui um caixa aberto de um dia anterior. É necessário fechá-lo para abrir um novo caixa hoje.");
                setShowCloseModal(true);
                setShowOpenModal(false);
                return;
            }
        }
        if (!cashSession) {
            setShowCloseModal(false);
        } else if (cashSession.status === 'aberto') {
            setShowOpenModal(false);
            setShowCloseModal(false);
        }
    };

    // Defer to avoid cascading render warning
    const timeoutId = setTimeout(checkSession, 0);
    return () => clearTimeout(timeoutId);
  }, [authInitialized, cashSession, settings.cashRegisterEnabled, currentUser?.forcedCashOpening]);

  useEffect(() => {
    if (!authInitialized) return;
    
    const checkCustomer = () => {
        const saved = customers.find(c => c.id === selectedCustomerId);
        if (selectedCustomerId !== 'def' && !saved) {
            setSelectedCustomerId('def');
        }
    };
    
    const timeoutId = setTimeout(checkCustomer, 0);
    return () => clearTimeout(timeoutId);
  }, [authInitialized, customers, selectedCustomerId]);

  // Term Payment Logic & Flow
  const [isTermSelection, setIsTermSelection] = useState(false);
  const [termDate, setTermDate] = useState<string>('');
  const [termInstallments, setTermInstallments] = useState<number>(1);
  const [termInterest, setTermInterest] = useState<number>(0);
  const [termFlow, setTermFlow] = useState({
     active: false,
     currentStep: 1,
     totalSteps: 1,
     originalAmount: 0,
     interestRate: 0
  });

  // Credit Payment Logic
  const [isCreditSelection, setIsCreditSelection] = useState(false);
  const [creditInstallments, setCreditInstallments] = useState<number>(1);
  const [creditInterest, setCreditInterest] = useState<number>(0);

  // Plan Expiration State
  const [planDueDate, setPlanDueDate] = useState<string>('');

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Check if there is a plan in the cart
  const hasPlanInCart = useMemo(() => {
      return cart.some(item => item.category === 'Planos');
  }, [cart]);

  // Block logic for Plan Sales
  const isSaleBlocked = useMemo(() => {
      return (hasPlanInCart && selectedCustomer.id === 'def') || (isTermSelection && (selectedCustomer.id === 'def' || !!unregisteredCustomer));
  }, [hasPlanInCart, selectedCustomer, isTermSelection, unregisteredCustomer]);

  const filteredCustomers = useMemo(() => {
      return customers.filter(c => {
          const matchesSearch = 
              (c.name || '').toLowerCase().includes(custSearchTerm.toLowerCase()) || 
              (c.cpf && c.cpf.includes(custSearchTerm)) ||
              (c.employeeId && c.employeeId.toLowerCase().includes(custSearchTerm.toLowerCase())) ||
              (c.loyaltyCardNumber && c.loyaltyCardNumber.toLowerCase().includes(custSearchTerm.toLowerCase()));
          const matchesCompany = custCompanyFilter === '' || c.companyId === custCompanyFilter;
          return matchesSearch && matchesCompany;
      });
  }, [customers, custSearchTerm, custCompanyFilter]);

  // --- HELPER: GET VISUAL STOCK (Available - Cart Qty) ---
  const getVisualStock = (product: Product) => {
      // For general stock
      const cartQty = cart.reduce((acc, item) => item.id === product.id ? acc + item.quantity : acc, 0);
      return (product.stock || 0) - cartQty;
  };

  const getVisualVariationStock = (product: Product, opt: string) => {
      const cartQty = cart.reduce((acc, item) => {
          if (item.id === product.id && (item.selectedSize === opt || item.selectedColor === opt || item.selectedNumber === opt)) {
              return acc + item.quantity;
          }
          return acc;
      }, 0);
      return (product.variationStock?.[opt] || 0) - cartQty;
  };

  const [variationModal, setVariationModal] = useState<Product | null>(null);

  const finalizeAddToCart = (product: Product, variation?: string, variationType?: 'sizes' | 'colors' | 'numbers') => {
      if (product.category === 'Planos' && product.unlimitedStock === false) {
          if (getVisualStock(product) <= 0) {
              alert(`Estoque esgotado para o plano "${product.name}".`);
              return;
          }
      }
      if (variation) {

         const visualStock = getVisualVariationStock(product, variation);
         if (visualStock <= 0) {
             alert(`ATENÇÃO: Produto "${product.name}" na variação "${variation}" com estoque zerado ou negativo! Venda permitida, mas verifique reposição.`);
         }
      } else {
         const visualStock = getVisualStock(product);
         if (visualStock <= 0) {
             alert(`ATENÇÃO: Produto "${product.name}" com estoque zerado ou negativo! Venda permitida, mas verifique reposição.`);
         }
      }

      const existingIndex = cart.findIndex(item => {
          if (item.id !== product.id) return false;
          if (variation) {
              if (variationType === 'sizes') return item.selectedSize === variation;
              if (variationType === 'colors') return item.selectedColor === variation;
              if (variationType === 'numbers') return item.selectedNumber === variation;
          }
          return true;
      });

      if (existingIndex >= 0) {
          const newCart = [...cart];
          newCart[existingIndex].quantity += 1;
          setCart(newCart);
      } else {
          const finalPrice = getProductCurrentPrice(product, variation);
          const newItem: CartItem = { 
              ...product, 
              price: finalPrice,
              quantity: 1, 
              isDiscountActive: false, 
              discountValue: 0, 
              discountType: '%' 
          };
          if (variation) {
              if (variationType === 'sizes') newItem.selectedSize = variation;
              if (variationType === 'colors') newItem.selectedColor = variation;
              if (variationType === 'numbers') newItem.selectedNumber = variation;
          }
          setCart([...cart, newItem]);
      }
      setSearchTerm(''); 
      setVariationModal(null);
  };

  const addToCart = (product: Product) => {
      if ((settings.cashRegisterEnabled && !cashSession) || (currentUser?.forcedCashOpening && !cashSession)) {
          alert("Abertura e fechamento de caixa está ativo ou é obrigatório para você. Você precisa abrir um caixa primeiro para realizar vendas.");
          setShowOpenModal(true);
          return;
      }
      const hasVariations = (product.sizes?.length ?? 0) > 1 || (product.colors?.length ?? 0) > 1 || (product.numbers?.length ?? 0) > 1;
      if (hasVariations && product.variationStock) {
          setVariationModal(product);
          return;
      }
      finalizeAddToCart(product);
  };

  // --- AUTO-CALCULATE PLAN EXPIRATION ---
  useEffect(() => {
      if (hasPlanInCart) {
          // Sum total days: Quantity * ValidityDays for each plan item
          const totalDays = cart
              .filter(item => item.category === 'Planos')
              .reduce((acc, item) => acc + (item.quantity * ((item.validityDays || 30) + (item.bonusEnabled ? (item.bonusDays || 0) : 0))), 0);

          
          if (totalDays > 0) {
              const d = new Date();
              d.setDate(d.getDate() + totalDays);
              const dateStr = d.toISOString().split('T')[0];
              // Defer to avoid cascading render warning
              const timeoutId = setTimeout(() => setPlanDueDate(dateStr), 0);
              return () => clearTimeout(timeoutId);
          }
      }
  }, [cart, hasPlanInCart]);

  const customerCompany = useMemo(() => {
    if (!selectedCustomer || selectedCustomer.id === 'def') return null;
    return companies.find(c => c.id === selectedCustomer.companyId);
  }, [selectedCustomer, companies]);

  const availableCredit = useMemo(() => {
    if (!customerCompany || typeof customerCompany.creditLimit !== 'number') return null;
    return Math.max(0, customerCompany.creditLimit - (selectedCustomer.debt || 0));
  }, [customerCompany, selectedCustomer]);

  // --- EFFECT 1: RESET STATE ON OPEN ONLY ---
  useEffect(() => {
    if (showPayment) {
        // Defer to avoid cascading render warning
        const timeoutId = setTimeout(() => {
            // Reset Term State
            setIsTermSelection(false);
            setTermInstallments(1);
            setTermFlow({ active: false, currentStep: 1, totalSteps: 1, originalAmount: 0 });
            
            // Default next month date for Term (Payment)
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            setTermDate(d.toISOString().split('T')[0]);
        }, 0);
        return () => clearTimeout(timeoutId);
    }
  }, [showPayment]);

  const calculateSubtotal = useCallback(() => {
    return cart.reduce((acc, item) => {
        const price = item.price || 0;
        const itemDiscount = item.isDiscountActive 
            ? (item.discountType === '%' ? (price * item.quantity * (item.discountValue || 0) / 100) : ((item.discountValue || 0) * item.quantity))
            : 0;
        return acc + (price * item.quantity) - itemDiscount;
    }, 0);
  }, [cart]);

  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal();
    
    if (!discountActive || !discountValue) return subtotal;
    
    const val = parseFloatSafe(discountValue);
    if (isNaN(val) || val <= 0) return subtotal;
    
    const discountAmount = discountType === '%' ? (subtotal * val) / 100 : val;
    
    return Math.max(0, subtotal - discountAmount);
  }, [calculateSubtotal, discountActive, discountValue, discountType]);

  const calculateTotalWithoutDiscount = useCallback(() => {
    return cart.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
  }, [cart]);

  // --- EFFECT 2: UPDATE AMOUNT TO PAY ---
  useEffect(() => {
    if (showPayment) {
        const baseTotal = calculateTotal();
        const paidTotal = currentPayments.reduce((acc, p) => acc + p.amount, 0);
        const interestTotal = currentPayments.reduce((acc, p) => acc + (p.interestAmount || 0), 0);
        const paidBase = paidTotal - interestTotal;
        const remainingBase = Math.max(0, baseTotal - paidBase);
        
        if (!termFlow.active) {
            // Defer to avoid cascading render warning
            const timeoutId = setTimeout(() => setAmountToPay(remainingBase.toFixed(2)), 0);
            return () => clearTimeout(timeoutId);
        }
    }
  }, [showPayment, currentPayments, cart, termFlow.active, discountActive, discountValue, discountType, calculateTotal]);



  const updateQuantity = (index: number, delta: number) => {
    // If trying to increase
    if (delta > 0) {
        const item = cart[index];
        const product = products.find(p => p.id === item.id);
        if (item && product) {
            let visualStock = product.stock - item.quantity;
            const variation = item.selectedSize || item.selectedColor || item.selectedNumber;
            if (variation) {
               visualStock = (product.variationStock?.[variation] || 0) - item.quantity;
            }
            if (visualStock <= 0) {
                alert(`ATENÇÃO: Estoque zerado para este item!`);
            }
        }
    }

    setCart(cart.map((item, i) => {
      if (i === index) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }).filter(Boolean));
  };

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    // Check for exact variation match first
    let variationMatch = null;
    let matchedProduct = null;
    let variationType = undefined;

    for (const p of products) {
        if (p.variationCodes) {
            for (const [varName, varCode] of Object.entries(p.variationCodes)) {
                if (varCode === barcode) {
                    variationMatch = varName;
                    matchedProduct = p;
                    if (p.sizes && p.sizes.length > 1) variationType = 'sizes';
                    else if (p.colors && p.colors.length > 1) variationType = 'colors';
                    else if (p.numbers && p.numbers.length > 1) variationType = 'numbers';
                    break;
                }
            }
        }
        if (matchedProduct) break;
    }

    if (matchedProduct && variationMatch) {
        if ((settings.cashRegisterEnabled && !cashSession) || (currentUser?.forcedCashOpening && !cashSession)) {
            alert("Abertura e fechamento de caixa está ativo ou é obrigatório para você. Você precisa abrir um caixa primeiro para realizar vendas.");
            setShowOpenModal(true);
            return;
        }
        finalizeAddToCart(matchedProduct, variationMatch, variationType as any);
        setBarcodeInput('');
        return;
    }

    const product = products.find(p => p.code === barcode);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      // Check if it's a customer barcode/card
      const cust = customers.find(c => c.loyaltyCardNumber === barcode);
      if (cust) {
          setSelectedCustomerId(cust.id);
          setBarcodeInput('');
      } else {
          alert("Produto ou Cliente não encontrado!");
          setBarcodeInput('');
      }
    }
  };

  const addPayment = (method: PaymentMethod, dueDate?: string, installmentInfo?: {current: number, total: number}, overrideAmount?: number, interestRate?: number) => {
      let val = overrideAmount !== undefined ? overrideAmount : parseFloatSafe(amountToPay);

      if (isNaN(val) || val <= 0) return false;

      const total = calculateTotal();
      const currentPaid = currentPayments.reduce((acc, p) => acc + (p.amount - (p.interestAmount || 0)), 0);
      const remaining = Math.max(0, total - currentPaid);
      
      // Limit non-cash payments to remaining amount
      if (method !== 'Dinheiro' && val > remaining + 0.01) {
          val = remaining;
      }

      // Calculate interest amount if interestRate is provided
      const interestAmount = interestRate ? (val * interestRate / 100) : 0;
      const finalAmount = val + interestAmount;

      setCurrentPayments(prev => [...prev, { 
          method, 
          amount: finalAmount, 
          dueDate: dueDate, 
          installmentNumber: installmentInfo?.current,
          totalInstallments: installmentInfo?.total,
          interestRate: interestRate,
          interestAmount: interestAmount
      }]);

      return true;
  };

  const handleTermStep = () => {
      const step = termFlow.active ? termFlow.currentStep : 1;
      const total = termFlow.active ? termFlow.totalSteps : termInstallments;
      const originalAmt = termFlow.active ? termFlow.originalAmount : parseFloatSafe(amountToPay);
      const interestRate = termFlow.active ? termFlow.interestRate : termInterest;

      if (originalAmt <= 0) {
          alert("Valor inválido.");
          return;
      }

      if (!termFlow.active) {
          setTermFlow({
              active: true,
              currentStep: 1,
              totalSteps: total,
              originalAmount: originalAmt,
              interestRate: interestRate
          });
      }

      let amountForThisStep: number;
      const base = Math.floor((originalAmt / total) * 100) / 100;
      
      if (step === total) {
          const theoreticallyPaidBefore = base * (total - 1);
          amountForThisStep = Number((originalAmt - theoreticallyPaidBefore).toFixed(2));
      } else {
          amountForThisStep = base;
      }

      const success = addPayment(PaymentMethod.TERM, termDate, { current: step, total: total }, amountForThisStep, interestRate);

      if (success) {
          if (step < total) {
              // Calculate next month for UI flow
              // Safe way to increment month on string date YYYY-MM-DD
              const [y, m, d] = termDate.split('-').map(Number);
              const nextDate = new Date(y, m, d); // Month is 0-indexed in JS, so `m` is already next month index
              const nextDateStr = nextDate.toISOString().split('T')[0];
              
              setTermDate(nextDateStr);

              setTermFlow(prev => ({
                  ...prev,
                  active: true,
                  currentStep: step + 1,
                  totalSteps: total,
                  originalAmount: originalAmt,
                  interestRate: interestRate
              }));
          } else {
              setIsTermSelection(false);
              setTermFlow({ active: false, currentStep: 1, totalSteps: 1, originalAmount: 0, interestRate: 0 });
              setTermInterest(0);
          }
      }
  };

  // ... (Rest of POS.tsx Logic: removePayment, handlePrintOption, finalizeSale etc... No logic changes needed inside them besides what StoreContext handles)
  const removePayment = (index: number) => {
      const newPayments = [...currentPayments];
      newPayments.splice(index, 1);
      setCurrentPayments(newPayments);
      
      if (isTermSelection) {
         setTermFlow({ active: false, currentStep: 1, totalSteps: 1, originalAmount: 0 });
         setTermInstallments(1);
      }
  };

  const handlePrintOption = (option: 'print' | 'save' | 'none') => {
      if (!lastSaleData) return;

      if (option === 'print') {
          printReceipt(lastSaleData.sale, settings, lastSaleData.customer, financialRecords, companies, raffleCampaigns);
      } else if (option === 'save') {
          saveReceiptAsImage(lastSaleData.sale, settings, lastSaleData.customer, financialRecords, companies, raffleCampaigns);
      }
      
      setShowPrintOptions(false);
      setLastSaleData(null);
      resetPOS();
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === selectedCustomer.password) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      executeFinalizeSale();
    } else {
      setPasswordError('Senha incorreta!');
    }
  };

  const finalizeSale = () => {
    if ((settings.cashRegisterEnabled && !cashSession) || (currentUser?.forcedCashOpening && !cashSession)) {
        setShowOpenModal(true);
        return;
    }

    const total = calculateTotal();
    const paid = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    const interest = currentPayments.reduce((acc, p) => acc + (p.interestAmount || 0), 0);
    const paidWithoutInterest = paid - interest;

    if (paidWithoutInterest < total - 0.1) {
        alert("O valor pago é insuficiente. Adicione mais pagamentos.");
        return;
    }

    if (hasPlanInCart) {
        if (selectedCustomer.id === 'def') {
            alert("Para vender um plano, é necessário selecionar um cliente.");
            return;
        }
        if (!planDueDate) {
            alert("Data de vencimento do plano inválida.");
            return;
        }
    }

    // NEW: Credit Limit Check
    const termPayments = currentPayments.filter(p => p.method === 'A Prazo');
    const termAmount = termPayments.reduce((acc, p) => acc + p.amount, 0);

    if (selectedCustomer.creditLimitEnabled && termAmount > 0) {
        const availableCredit = (selectedCustomer.creditLimit || 0) - (selectedCustomer.debt || 0);
        if (termAmount > availableCredit) {
            setCreditError(`Limite de crédito excedido! Disponível: R$ ${availableCredit.toFixed(2)}. O cliente deve pagar o restante em outra forma de pagamento.`);
            return;
        }
    } else if (termAmount > 0 && customerCompany && typeof availableCredit === 'number') {
        // Existing company credit logic
        if (termAmount > availableCredit) {
            const allowedCredit = availableCredit;
            const excessDebt = termAmount - allowedCredit;
            
            if (confirm(`O cliente só possui R$ ${allowedCredit.toFixed(2)} de crédito disponível na empresa. O restante (R$ ${excessDebt.toFixed(2)}) ficará pendente na conta pessoal do cliente. Deseja continuar?`)) {
                // Proceed with sale, marking excessDebt as personal debt
            } else {
                setCreditError(`Limite de crédito excedido! Disponível: R$ ${availableCredit.toFixed(2)}. O cliente deve pagar o restante em outra forma de pagamento.`);
                return;
            }
        }
    }

    setCreditError(null);
    executeFinalizeSale();
  };

  const executeFinalizeSale = () => {
    const total = calculateTotal();
    const paid = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    const interestTotal = currentPayments.reduce((acc, p) => acc + (p.interestAmount || 0), 0);
    const totalWithInterest = total + interestTotal;
    const change = Math.max(0, paid - totalWithInterest);

    const primaryMethod = currentPayments.length === 1 ? currentPayments[0].method : 'Múltiplos';

    const hasTermPayment = currentPayments.some(p => p.method === PaymentMethod.TERM);

    let raffleCoupons: string[] | undefined;
    let raffleCampaignId: string | undefined;

    if (raffleCampaigns && raffleCampaigns.length > 0) {
        const activeCampaigns = raffleCampaigns.filter(c => {
            if (!c.active) return false;
            const now = new Date();

            // Start Date (00:00:00)
            const sDateStr = c.startDate.split('T')[0];
            const [sY, sM, sD] = sDateStr.split('-').map(Number);
            const startCutoff = new Date(sY, sM - 1, sD, 0, 0, 0);

            // End/Draw Date Cutoff with drawTime (or 23:59:59)
            const eTargetStr = (c.drawDate || c.endDate).split('T')[0];
            const [eY, eM, eD] = eTargetStr.split('-').map(Number);
            
            let hours = 23;
            let minutes = 59;
            let seconds = 59;

            if (c.drawTime && c.drawTime.includes(':')) {
                const [h, m] = c.drawTime.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) {
                    hours = h;
                    minutes = m;
                    seconds = 0;
                }
            }

            const endCutoff = new Date(eY, eM - 1, eD, hours, minutes, seconds);

            return now >= startCutoff && now <= endCutoff;
        });

        if (activeCampaigns.length > 0) {
            const campaign = activeCampaigns[0];
            if (totalWithInterest >= campaign.minAmount) {
                const numCoupons = campaign.ruleType === 'multiple' 
                    ? Math.floor(totalWithInterest / campaign.minAmount) 
                    : 1;
                
                if (numCoupons > 0) {
                    let shouldGenerate = campaign.autoGenerate;
                    if (!shouldGenerate) {
                        shouldGenerate = window.confirm(`Gerar ${numCoupons} cupom(ns) para o sorteio "${campaign.title}"?`);
                    }
                    if (shouldGenerate) {
                        raffleCampaignId = campaign.id;
                        raffleCoupons = [];
                        for (let i = 0; i < numCoupons; i++) {
                            raffleCoupons.push(generateCouponId());
                        }
                    }
                }
            }
        }
    }

    const saleData: Sale = {
      id: currentSaleId,
      customerId: unregisteredCustomer ? null : (selectedCustomerId === 'def' ? null : selectedCustomerId),
      unregisteredCustomer: unregisteredCustomer || undefined,
      items: cart,
      total: totalWithInterest,
      interestTotal,
      discountTotal: calculateTotalWithoutDiscount() - calculateTotal(),
      paymentMethod: primaryMethod, 
      payments: currentPayments,
      date: new Date().toISOString(),
      status: hasTermPayment ? 'pending' : 'completed',
      // Store Context handles date normalization for plan expiration too
      planExpirationDate: hasPlanInCart ? planDueDate : undefined,
      raffleCoupons,
      raffleCampaignId,
      raffleCouponDetails: raffleCoupons ? raffleCoupons.map(cp => ({ couponNumber: cp, status: 'valid' })) : undefined
    };

    addSale(saleData); // Context now handles Stock Deduction

    const printerEnabled = settings.printerConfig.enabled;
    const autoPrint = settings.printerConfig.autoPrint;

    if (!printerEnabled) {
        saveReceiptAsImage(saleData, settings, selectedCustomer, financialRecords, companies, raffleCampaigns);
    } else {
        if (autoPrint) {
            printReceipt(saleData, settings, selectedCustomer, financialRecords, companies, raffleCampaigns);
        } else {
            setLastSaleData({ sale: saleData, customer: selectedCustomer });
            setShowPrintOptions(true);
        }
    }

    if ((!printerEnabled || autoPrint) && settings.whatsappMessageTemplate && selectedCustomer.phone) {
      const msg = settings.whatsappMessageTemplate
        .replace('{cliente}', selectedCustomer.name)
        .replace('{pedido}', currentSaleId)
        .replace('{valor}', total.toFixed(2));
      
      setConfirmConfig({
          isOpen: true,
          title: "Enviar Comprovante",
          message: `Venda finalizada! Deseja enviar o comprovante via WhatsApp para ${selectedCustomer.name}?`,
          onConfirm: () => {
              window.open(`https://wa.me/55${selectedCustomer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
              if (!showPrintOptions) {
                  resetPOS();
              }
          },
          confirmText: "Enviar WhatsApp",
          isDangerous: false
      });
    } else {
        if (!showPrintOptions) {
            resetPOS();
        }
    }
  };

  const resetPOS = () => {
    setCart([]);
    setCurrentPayments([]);
    setShowPayment(false);
    setSelectedCustomerId('def');
    setUnregisteredCustomer(null);
  };

  const subtotalAfterDiscount = calculateTotal();
  const currentInterestTotal = currentPayments.reduce((acc, p) => acc + (p.interestAmount || 0), 0);
  
  // Pending interest from current selection
  let pendingInterest = 0;
  if (isCreditSelection && creditInterest > 0) {
    pendingInterest = (parseFloatSafe(amountToPay) || 0) * (creditInterest / 100);
  } else if (isTermSelection) {
    const rate = termFlow.active ? termFlow.interestRate : termInterest;
    if (rate > 0) {
      pendingInterest = (parseFloatSafe(amountToPay) || 0) * (rate / 100);
    }
  }

  const total = subtotalAfterDiscount + currentInterestTotal + pendingInterest;
  const paidTotal = currentPayments.reduce((acc, p) => acc + p.amount, 0);
  const remainingTotal = Math.max(0, total - paidTotal);

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code || '').includes(searchTerm);
    
    // Employee isolation for products (if we want to hide certain categories or products)
    // The user specifically mentioned employee report isolation, so we'll ensure sales are isolated.
    
    if (activeMobileTab === 'plans') {
        return matchesSearch && p.category === 'Planos';
    } else {
        return matchesSearch && p.category !== 'Planos';
    }
  });

  const employeeSalesToday = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return sales.filter(s => {
      if (!isAdmin && currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral') {
        if (s.employeeId !== currentUser?.id) return false;
      }
      return new Date(s.date).toLocaleDateString('en-CA') === todayStr;
    });
  }, [sales, isAdmin, currentUser]);

  const employeeTotalSalesToday = employeeSalesToday.reduce((acc, s) => acc + s.total, 0);

  const pixPaymentAmount = useMemo(() => {
    return currentPayments
      .filter(p => p.method === PaymentMethod.PIX)
      .reduce((acc, p) => acc + p.amount, 0);
  }, [currentPayments]);

  const showPixScreen = remainingTotal <= 0.1 && pixPaymentAmount > 0;

  const pixData = useMemo(() => {
    if (!showPixScreen || !settings.pixKey) return null;
    try {
       const payload = generatePixPayload(settings.pixKey, settings.name || 'Loja', 'BRASIL', pixPaymentAmount.toString());
       const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(payload)}`;
       return { payload, qrUrl };
    } catch {
       return null;
    }
  }, [showPixScreen, pixPaymentAmount, settings]);

  const handleCopyPix = () => {
    if (pixData?.payload) {
        navigator.clipboard.writeText(pixData.payload);
        alert("Código Pix Copia e Cola copiado!");
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 h-full bg-slate-100 overflow-hidden relative">
      
      {/* ... (Mobile Tab Switcher and Left/Right Column Layout code remains largely the same) ... */}
      <div className="md:hidden bg-white border-b border-slate-200 flex text-sm font-medium shrink-0">
        <button onClick={() => setActiveMobileTab('cart')} className={`flex-1 py-3 flex items-center justify-center gap-2 ${activeMobileTab === 'cart' ? 'border-b-2 border-accent text-accent' : 'text-slate-500'}`}><ShoppingBag size={18} /> Carrinho ({cart.reduce((a,c)=>a+c.quantity, 0)})</button>
        <button onClick={() => setActiveMobileTab('catalog')} className={`flex-1 py-3 flex items-center justify-center gap-2 ${activeMobileTab === 'catalog' ? 'border-b-2 border-accent text-accent' : 'text-slate-500'}`}><Search size={18} /> Produtos</button>
        <button onClick={() => setActiveMobileTab('plans')} className={`flex-1 py-3 flex items-center justify-center gap-2 ${activeMobileTab === 'plans' ? 'border-b-2 border-accent text-accent' : 'text-slate-500'}`}><Zap size={18} /> Planos</button>
      </div>

      {/* LEFT COLUMN: Cart */}
      <div className={`${activeMobileTab === 'cart' ? 'flex' : 'hidden'} md:flex w-full md:w-5/12 flex-col bg-white border-r border-slate-200 shadow-xl z-10 h-full`}>
        {/* ... (Cart Header and Items) ... */}
        <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Venda #{currentSaleId}</h2>
            {(settings.cashRegisterEnabled || currentUser?.forcedCashOpening) && (
              <button onClick={() => cashSession ? setShowCloseModal(true) : setShowOpenModal(true)} className="text-xs bg-white/20 px-2 py-1 rounded mt-1">
                  {cashSession ? 'Fechar Caixa' : 'Abrir Caixa'}
              </button>
            )}
            {cashSession && (settings.cashRegisterEnabled || currentUser?.forcedCashOpening) && (
                <div className="flex gap-2 mt-2">
                    <button onClick={() => setShowSangriaModal(true)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Sangria</button>
                    <button onClick={() => setShowSuprimentoModal(true)} className="text-xs bg-green-500 text-white px-2 py-1 rounded">Suprimento</button>
                </div>
            )}
            <div 
              className="flex items-center gap-2 mt-1 text-slate-300 text-sm cursor-pointer hover:text-white"
              onClick={() => setShowCustomerSelector(true)}
            >
              <User size={14} />
              <span className="truncate max-w-[150px]">
                {selectedCustomer?.name || 'Cliente Balcão'}
              </span>
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs text-slate-400">Total</div>
             <div className="text-2xl font-bold">
                 {discountActive || cart.some(i => i.isDiscountActive) ? (
                     <>
                         <span className="text-sm line-through text-slate-400 mr-2">R$ {calculateTotalWithoutDiscount().toFixed(2)}</span>
                         <span>R$ {total.toFixed(2)}</span>
                     </>
                 ) : (
                     <span>R$ {total.toFixed(2)}</span>
                 )}
             </div>
             {availableCredit !== null && (
               <div className="text-[10px] mt-1 flex items-center justify-end gap-1">
                 <span className="text-slate-400 uppercase font-bold">Limite:</span>
                 <span className={availableCredit <= 0 ? "text-red-500 font-bold" : "text-blue-600 font-bold"}>
                   R$ {availableCredit.toFixed(2)}
                 </span>
                 {availableCredit <= 0 && (
                   <span className="text-red-500 font-black animate-pulse ml-1">Limite total utilizado</span>
                 )}
               </div>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <ShoppingBag size={48} className="mb-2 opacity-20" />
               <p>Caixa Livre</p>
               <p className="text-xs">Bipe um produto ou pesquise</p>
            </div>
          ) : (
            cart.map((item, index) => {
              const originalProd = products.find(p => p.id === item.id);
              const origPrice = originalProd ? originalProd.price : item.price;
              const hasItemPromo = origPrice > (item.price || 0);
              return (
                <div key={`${item.id}-${index}`} className="flex gap-3 bg-slate-50 p-2 rounded border border-slate-100 items-center">
                  <img src={item.image} alt="" className="w-12 h-12 rounded object-cover bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm leading-tight truncate">{item.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
                        <span>{item.quantity} x</span>
                        {hasItemPromo ? (
                          <>
                            <span className="line-through text-slate-400">R$ {origPrice.toFixed(2)}</span>
                            <span className="font-bold text-orange-600">R$ {(item.price || 0).toFixed(2)}</span>
                          </>
                        ) : (
                          <span>R$ {(item.price || 0).toFixed(2)}</span>
                        )}
                        {(item.selectedSize || item.selectedColor || item.selectedNumber) && (
                            <span className="ml-1 text-[10px] bg-slate-200 px-1 rounded text-slate-600">
                                {[item.selectedSize, item.selectedColor, item.selectedNumber].filter(Boolean).join(' ')}
                            </span>
                        )}
                      </div>
                    {item.isDiscountActive && (
                        <div className="text-xs text-red-500 font-bold">
                            {item.discountType === '%' ? `-${item.discountValue || 0}%` : `-R$${(item.discountValue || 0).toFixed(2)}`}
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => { setActiveDiscountItem(item); setShowDiscountModal(true); }} className={`p-1 rounded text-xs ${item.isDiscountActive ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-700'}`}>
                       {item.isDiscountActive ? 'Desc' : 'Desc'}
                   </button>
                   <button onClick={() => updateQuantity(index, -1)} className="p-1 bg-slate-200 rounded hover:bg-slate-300 text-slate-700 w-6 h-6 flex items-center justify-center">-</button>
                   <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                   <button onClick={() => updateQuantity(index, 1)} className="p-1 bg-slate-200 rounded hover:bg-slate-300 text-slate-700 w-6 h-6 flex items-center justify-center">+</button>
                </div>
                <div className="text-right w-16 md:w-20">
                  <div className="font-bold text-slate-800 text-sm">
                      R$ {(((item.price || 0) * item.quantity) - (item.isDiscountActive ? (item.discountType === '%' ? (item.quantity * (item.price || 0) * (item.discountValue || 0) / 100) : (item.discountValue || 0)) : 0)).toFixed(2)}
                  </div>
                  <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          }))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
           {!isAdmin && currentUser?.role !== 'DonoLoja' && currentUser?.role !== 'AdminGeral' && (
             <div className="mb-3 p-3 bg-blue-600 text-white rounded-lg shadow-sm flex justify-between items-center">
               <span className="text-xs font-bold uppercase tracking-wider opacity-90">Minhas Vendas Hoje:</span>
               <span className="text-lg font-black">R$ {employeeTotalSalesToday.toFixed(2)}</span>
             </div>
           )}

           {isSaleBlocked && (
               <div className="mb-2 p-2 bg-red-100 border border-red-200 rounded text-red-700 text-xs font-bold flex items-center gap-2 justify-center">
                   <AlertTriangle size={14} />
                   Para vender Planos, selecione um Cliente.
               </div>
           )}

           {(() => {
               const totalWithoutDiscount = calculateTotalWithoutDiscount();
               const finalTotal = calculateTotal();
               const discountR = totalWithoutDiscount - finalTotal;
               const discountPercent = totalWithoutDiscount > 0 ? (discountR / totalWithoutDiscount) * 100 : 0;
               
               if (discountR > 0) {
                   return (
                       <div className="mb-3 space-y-1 text-sm">
                           <div className="flex justify-between text-slate-500">
                               <span>Subtotal:</span>
                               <span>R$ {totalWithoutDiscount.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-red-500 font-medium">
                               <span>Desconto ({discountPercent.toFixed(1)}%):</span>
                               <span>- R$ {discountR.toFixed(2)}</span>
                           </div>
                       </div>
                   );
               }
               return null;
           })()}

           <form onSubmit={handleBarcodeSubmit} className="mb-3">
              <div className="relative">
                <div className="relative">
                  <input ref={barcodeRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Código de Barras" className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent outline-none" autoFocus={window.innerWidth > 768} />
                   {isMobile && (
                     <button onClick={() => { setScannerTarget('barcode'); setShowScanner(true); }} className="absolute right-2 top-2 p-1 text-slate-500">
                       <Camera size={20} />
                     </button>
                   )}
                </div>
              </div>
           </form>
           <button 
                onClick={() => cart.length > 0 && !isSaleBlocked && setShowPayment(true)} 
                disabled={cart.length === 0 || isSaleBlocked} 
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex justify-between px-6 items-center ${cart.length > 0 && !isSaleBlocked ? 'bg-success text-white hover:bg-emerald-600' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
           >
             <span>{isSaleBlocked ? 'Selecione Cliente' : 'Finalizar Venda'}</span>
             <span>R$ {total.toFixed(2)}</span>
           </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Products & Plans */}
      <div className={`${activeMobileTab === 'catalog' || activeMobileTab === 'plans' ? 'flex' : 'hidden'} md:flex w-full md:w-7/12 flex-col p-4 md:p-6 overflow-hidden h-full`}>
        
        {((settings.cashRegisterEnabled && !cashSession) || (currentUser?.forcedCashOpening && !cashSession)) && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="text-amber-500" size={24} />
                    <div>
                        <p className="font-bold text-amber-800">Caixa Fechado</p>
                        <p className="text-sm text-amber-700">Abra o caixa para começar a realizar vendas.</p>
                    </div>
                </div>
                <button onClick={() => setShowOpenModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-lg whitespace-nowrap">
                    Abrir Caixa
                </button>
            </div>
        )}

        {/* DESKTOP TOGGLE & SEARCH HEADER */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 md:mb-6 shrink-0">
           {/* Desktop Toggle Buttons */}
           <div className="hidden md:flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <button onClick={() => setActiveMobileTab('catalog')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeMobileTab === 'catalog' || activeMobileTab === 'cart' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}><Package size={16} /> Produtos</button>
                <button onClick={() => setActiveMobileTab('plans')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeMobileTab === 'plans' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}><Zap size={16} /> Planos</button>
           </div>
           <div className="relative flex-1">
             <Search className="absolute left-3 top-3 text-slate-400" size={20} />
             <div className="relative">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-accent" />
              <button onClick={() => { setScannerTarget('search'); setShowScanner(true); }} className="absolute right-2 top-2 p-1 text-slate-500">
                <Camera size={20} />
              </button>
            </div>
           </div>
        </div>

        {/* LIST */}
        <div className={`grid gap-3 md:gap-4 overflow-y-auto pb-20 content-start ${
          settings.posDisplayMode === 'list-detailed' || settings.posDisplayMode === 'list-photo'
          ? 'grid-cols-1' 
          : 'grid-cols-2 lg:grid-cols-4'
        }`}>
          {filteredProducts.map(product => {
            // Calculate Visual Stock
            const displayStock = getVisualStock(product);
            const isZeroStock = displayStock <= 0;

            if (settings.posDisplayMode === 'list-photo') {
              const hasPromo = isPromoActive(product);
              const displayPrice = getProductDisplayPrice(product);
              return (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)} 
                  className={`bg-white p-3 rounded-xl shadow-sm border transition-all flex items-center gap-4 active:scale-[0.98] transform duration-100 cursor-pointer hover:shadow-md ${isZeroStock ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-accent'}`}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    {hasPromo && (
                      <span className="absolute top-1 left-1 text-[8px] bg-orange-500 text-white px-1 rounded font-bold">
                        PROMO
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                        {product.code || 'S/C'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isZeroStock ? 'bg-red-600 text-white' : 'bg-primary text-white'}`}>
                        Estoque: {displayStock}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{product.name}</h3>
                    <p className="text-xs text-slate-400">{product.brand || 'Sem marca'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-xs text-slate-400 font-medium">Valor</span>
                    {hasPromo ? (
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-xs text-slate-400 line-through">R$ {(product.price || 0).toFixed(2)}</span>
                        <span className="font-black text-orange-600 text-lg md:text-xl">R$ {displayPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-black text-accent text-lg md:text-xl">R$ {(product.price || 0).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              );
            }

            if (settings.posDisplayMode === 'list-detailed') {
              const hasPromo = isPromoActive(product);
              const displayPrice = getProductDisplayPrice(product);
              return (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)} 
                  className={`bg-white p-4 rounded-xl shadow-sm border transition-all flex items-center gap-4 active:scale-[0.98] transform duration-100 cursor-pointer hover:shadow-md ${isZeroStock ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-accent'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                        {product.code || 'S/C'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isZeroStock ? 'bg-red-600 text-white' : 'bg-primary text-white'}`}>
                        Estoque: {displayStock}
                      </span>
                      {hasPromo && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">
                          PROMOÇÃO
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{product.name}</h3>
                    <p className="text-xs text-slate-400">{product.brand || 'Sem marca'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-xs text-slate-400 font-medium">Valor</span>
                    {hasPromo ? (
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-xs text-slate-400 line-through">R$ {(product.price || 0).toFixed(2)}</span>
                        <span className="font-black text-orange-600 text-lg md:text-xl">R$ {displayPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-black text-accent text-lg md:text-xl">R$ {(product.price || 0).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              );
            }

            if (settings.posDisplayMode === 'grid-compact') {
              const hasPromo = isPromoActive(product);
              const displayPrice = getProductDisplayPrice(product);
              return (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)} 
                  className={`bg-white p-3 rounded-lg shadow-sm border transition-all flex flex-col active:scale-95 transform duration-100 cursor-pointer hover:shadow-md ${isZeroStock ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-accent'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[60%]">{product.code || 'S/C'}</span>
                    <div className="flex gap-1 items-center">
                      {hasPromo && (
                        <span className="text-[8px] bg-orange-100 text-orange-600 px-0.5 rounded font-bold">
                          %
                        </span>
                      )}
                      <span className={`text-[9px] px-1 rounded font-bold ${isZeroStock ? 'bg-red-600 text-white' : 'bg-primary text-white'}`}>
                        {displayStock}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-xs mb-2 leading-tight line-clamp-2 h-8">{product.name}</h3>
                  <div className="mt-auto pt-2 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 truncate max-w-[40%]">{product.brand}</span>
                    {hasPromo ? (
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] text-slate-400 line-through">R$ {(product.price || 0).toFixed(2)}</span>
                        <span className="font-black text-orange-600 text-sm">R$ {displayPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-black text-accent text-sm">R$ {(product.price || 0).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              );
            }

            // Default: grid-photo
            const hasPromo = isPromoActive(product);
            const displayPrice = getProductDisplayPrice(product);
            return (
                <div 
                    key={product.id} 
                    onClick={() => addToCart(product)} 
                    className={`bg-white p-3 rounded-lg shadow-sm border transition-all flex flex-col active:scale-95 transform duration-100 cursor-pointer hover:shadow-md ${isZeroStock ? 'border-red-500 bg-red-50 animate-pulse ring-1 ring-red-500' : 'border-slate-200 hover:border-accent'}`}
                >
                  <div className="aspect-square bg-slate-100 rounded mb-2 overflow-hidden relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    {hasPromo && (
                      <span className="absolute top-1 left-1 text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow">
                        PROMO
                      </span>
                    )}
                    <span className={`absolute bottom-0 right-0 text-[10px] px-1 rounded-tl font-bold ${isZeroStock ? 'bg-red-600 text-white' : 'bg-primary text-white'}`}>
                        Estoque: {displayStock}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-800 text-xs md:text-sm mb-1 leading-tight line-clamp-2 h-8 md:h-10">{product.name}</h3>
                  <div className="mt-auto flex justify-between items-end">
                    <span className="text-[10px] text-slate-400 truncate max-w-[50%]">{product.brand}</span>
                    {hasPromo ? (
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-xs text-slate-400 line-through">R$ {(product.price || 0).toFixed(2)}</span>
                        <span className="font-bold text-orange-600 text-sm md:text-base">R$ {displayPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-accent text-sm md:text-base">R$ {(product.price || 0).toFixed(2)}</span>
                    )}
                  </div>
                </div>
            );
          })}
          {filteredProducts.length === 0 && <div className="col-span-full py-10 text-center text-slate-400"><p>Nenhum item encontrado.</p></div>}
        </div>
      </div>

      <CustomerSelectorModal 
        isOpen={showCustomerSelector}
        onClose={() => setShowCustomerSelector(false)}
        onSelect={(cust, unregistered) => {
          if (unregistered) {
            setUnregisteredCustomer(unregistered);
            setSelectedCustomerId('def');
          } else if (cust) {
            setSelectedCustomerId(cust.id);
            setUnregisteredCustomer(null);
          } else {
            setSelectedCustomerId('def');
            setUnregisteredCustomer(null);
          }
          setShowCustomerSelector(false);
        }}
        customers={customers || []}
        companies={companies || []}
      />

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <Lock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Confirmar Venda</h3>
                  <p className="text-sm text-slate-500">
                    Cliente: {selectedCustomer.name}
                    {selectedCustomer.creditLimitEnabled && (
                      <span className="ml-2 font-semibold text-orange-600">
                        (Crédito: R$ {((selectedCustomer.creditLimit || 0) - (selectedCustomer.debt || 0)).toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Senha do Cliente</label>
              <input 
                type="password" 
                className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all text-center text-2xl tracking-widest ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-accent'}`}
                placeholder="****"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              {passwordError && <p className="text-red-500 text-xs mt-2 text-center font-bold">{passwordError}</p>}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(''); }}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePasswordSubmit}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center backdrop-blur-sm md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden h-[98vh] md:h-auto md:max-h-[90vh] flex flex-col md:flex-row">
            
            {/* Left: Summary & List */}
            <div className="w-full md:w-1/2 p-4 md:p-6 bg-slate-50 border-r border-slate-200 overflow-y-auto h-[40%] md:h-auto border-b md:border-b-0 shrink-0">
               <div className="flex justify-between items-center mb-2 md:mb-6">
                 <h3 className="text-lg md:text-xl font-bold text-slate-800">Resumo</h3>
                 <button onClick={() => setShowPayment(false)} className="md:hidden p-1 bg-slate-200 rounded-full"><X size={20}/></button>
               </div>
               
               <div className="space-y-2 md:space-y-4 mb-4">
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm bg-blue-50/30 flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><User size={14} className="text-accent" /><span className="text-xs font-medium text-slate-500">Cliente</span></div>
                          <div className="text-base md:text-lg font-bold text-slate-800 pl-6 truncate">{selectedCustomer.name}</div>
                      </div>
                      <div className="flex gap-2">
                          {selectedCustomerId !== 'def' && (
                              <button 
                                onClick={() => setSelectedCustomerId('def')}
                                className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-100 px-2 py-1 rounded transition-colors"
                                title="Voltar para Balcão"
                              >
                                Remover
                              </button>
                          )}
                          <button 
                            onClick={() => setShowCustomerSelector(true)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-100 px-2 py-1 rounded transition-colors"
                          >
                            {selectedCustomer.id === 'def' ? 'Selecionar' : 'Trocar'}
                          </button>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:block md:space-y-4">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        {(() => {
                            const totalWithoutDiscount = calculateTotalWithoutDiscount();
                            const finalTotal = calculateTotal();
                            const discountR = totalWithoutDiscount - finalTotal;
                            const discountPercent = totalWithoutDiscount > 0 ? (discountR / totalWithoutDiscount) * 100 : 0;
                            
                            if (discountR > 0) {
                                return (
                                    <>
                                        <div className="flex justify-between text-xs md:text-sm text-slate-500 mb-1">Subtotal</div>
                                        <div className="text-sm md:text-lg font-bold text-slate-500 line-through">R$ {totalWithoutDiscount.toFixed(2)}</div>
                                        <div className="flex justify-between text-xs md:text-sm text-red-500 mb-1 mt-2">Desconto ({discountPercent.toFixed(1)}%)</div>
                                        <div className="text-sm md:text-lg font-bold text-red-500">- R$ {discountR.toFixed(2)}</div>
                                        <div className="flex justify-between text-xs md:text-sm text-slate-800 mb-1 mt-2 font-bold">Total Final</div>
                                    </>
                                );
                            }
                            return <div className="flex justify-between text-xs md:text-sm text-slate-500 mb-1">Total</div>;
                        })()}
                        <div className="text-xl md:text-3xl font-bold text-slate-800">R$ {total.toFixed(2)}</div>
                        {availableCredit !== null && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Crédito Disponível</span>
                              <span className={`text-sm font-bold ${availableCredit <= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                R$ {availableCredit.toFixed(2)}
                              </span>
                            </div>
                            {availableCredit <= 0 && (
                              <p className="text-[10px] text-red-500 font-bold text-right mt-1 animate-pulse">Limite total utilizado</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm"><div className="flex justify-between text-xs md:text-sm mb-1"><span className="text-green-600">Pago</span></div><div className="text-lg md:text-xl font-bold text-green-600">R$ {paidTotal.toFixed(2)}</div></div>
                  </div>
                  <div className={`p-3 rounded-lg border shadow-sm ${remainingTotal > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}><div className="flex justify-between text-xs md:text-sm mb-1"><span className={remainingTotal > 0 ? 'text-red-600' : 'text-green-600'}>Restante</span></div><div className={`text-lg md:text-xl font-bold ${remainingTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>R$ {remainingTotal.toFixed(2)}</div></div>
                  
                  {creditError && (
                      <div className="p-3 rounded-lg border border-red-200 bg-red-50 shadow-sm animate-pulse">
                          <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase mb-1">
                              <AlertTriangle size={14} /> Erro de Crédito
                          </div>
                          <p className="text-xs text-red-700 font-medium leading-tight">{creditError}</p>
                      </div>
                  )}

                  {paidTotal > total + 0.001 && (
                      <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm">
                          <div className="flex justify-between text-xs md:text-sm mb-1 text-emerald-600 font-bold">Troco</div>
                          <div className="text-lg md:text-xl font-black text-emerald-700">R$ {(paidTotal - total).toFixed(2)}</div>
                      </div>
                  )}
               </div>

               <h4 className="font-bold text-slate-700 mb-2 text-xs md:text-sm uppercase tracking-wide">Adicionados</h4>
               <div className="space-y-2 pb-4">
                  {currentPayments.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                          <div className="flex items-center gap-2">
                             {p.method === PaymentMethod.CASH && <Banknote size={14} className="text-green-600"/>}
                             {p.method === PaymentMethod.PIX && <QrCode size={14} className="text-blue-600"/>}
                             {(p.method === PaymentMethod.CREDIT || p.method === PaymentMethod.DEBIT) && <CreditCard size={14} className="text-purple-600"/>}
                             {p.method === PaymentMethod.TERM && <CalendarClock size={14} className="text-orange-600"/>}
                             <div className="flex flex-col">
                                <span className="font-medium text-slate-700 text-sm">{p.method} {p.totalInstallments && p.totalInstallments > 1 ? `(${p.installmentNumber}/${p.totalInstallments})` : ''}</span>
                                {p.dueDate && <span className="text-xs text-orange-600 font-bold">Venc: {new Date(p.dueDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>}
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 text-sm">R$ {p.amount.toFixed(2)}</span>
                              <button onClick={() => removePayment(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                          </div>
                      </div>
                  ))}
                  {currentPayments.length === 0 && <div className="text-slate-400 text-xs text-center py-2 italic">Nenhum pagamento.</div>}
               </div>
            </div>

            {/* Right: Actions (Dynamic View) */}
            <div className="w-full md:w-1/2 p-4 md:p-6 flex flex-col h-[60%] md:h-auto bg-white">
               <div className="hidden md:flex justify-end mb-4">
                  <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
               </div>

               {showPixScreen ? (
                  <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center overflow-y-auto">
                      <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 mb-2 shrink-0">
                         {pixData ? <img src={pixData.qrUrl} alt="QR Code Pix" className="w-40 h-40 md:w-64 md:h-64 object-contain" /> : <div className="w-40 h-40 md:w-64 md:h-64 flex items-center justify-center bg-slate-50 text-slate-400 text-sm p-4">configure a Chave Pix nas configurações.</div>}
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">Pagamento via Pix</h3>
                      <p className="text-slate-500 mb-2 text-sm">Escaneie o QR Code para pagar <span className="font-bold text-slate-800">R$ {pixPaymentAmount.toFixed(2)}</span></p>
                      <button onClick={handleCopyPix} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors mb-4 border border-slate-200 text-sm"><Copy size={16} /> Copiar Código Pix</button>
                      <div className="w-full mt-auto pt-2"><button onClick={finalizeSale} className="w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all bg-success hover:bg-emerald-600 text-white hover:shadow-xl"><Check size={24} /> Confirmar Venda</button></div>
                  </div>
               ) : (
                  <>
                    <div className="flex-1 overflow-y-auto">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Valor a Inserir</label>
                        <div className="relative mb-3 md:mb-6">
                            <span className="absolute left-4 top-3 md:top-3 text-slate-400 font-bold">R$</span>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                className={`w-full pl-10 pr-4 py-2 md:py-3 text-xl md:text-2xl font-bold border-2 rounded-xl focus:ring-0 outline-none ${termFlow.active ? 'bg-slate-100 text-slate-500 border-slate-100' : 'text-slate-800 border-slate-200 focus:border-accent'}`}
                                value={amountToPay}
                                onChange={(e) => {
                                  if (termFlow.active) return;
                                  let val = e.target.value.replace(/[^0-9.,]/g, '');
                                  const separators = val.match(/[.,]/g);
                                  if (separators && separators.length > 1) {
                                    const firstIndex = val.search(/[.,]/);
                                    const before = val.slice(0, firstIndex + 1);
                                    const after = val.slice(firstIndex + 1).replace(/[.,]/g, '');
                                    val = before + after;
                                  }
                                  setAmountToPay(val);
                                }}
                                onFocus={(e) => !termFlow.active && e.target.select()}
                                readOnly={termFlow.active}
                            />
                        </div>

                        <label className="block text-xs font-medium text-slate-600 mb-2">Selecione a Forma de Pagamento</label>
                        
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setDiscountActive(!discountActive)} className={`flex-1 py-2 rounded-lg font-bold text-sm border ${discountActive ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>Desconto</button>
                        </div>
                        {discountActive && (
                            <div className="bg-slate-50 p-4 rounded-xl mb-4 border-2 border-orange-200 shadow-inner">
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => setDiscountType('%')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${discountType === '%' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>% Porcentagem</button>
                                    <button onClick={() => setDiscountType('R$')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${discountType === 'R$' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>R$ Valor Fixo</button>
                                </div>
                                <div className="relative mb-3">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{discountType === 'R$' ? 'R$' : '%'}</span>
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        value={discountValue} 
                                        onChange={(e) => {
                                          let val = e.target.value.replace(/[^0-9.,]/g, '');
                                          const separators = val.match(/[.,]/g);
                                          if (separators && separators.length > 1) {
                                            const firstIndex = val.search(/[.,]/);
                                            const before = val.slice(0, firstIndex + 1);
                                            const after = val.slice(firstIndex + 1).replace(/[.,]/g, '');
                                            val = before + after;
                                          }
                                          setDiscountValue(val);
                                        }} 
                                        placeholder={`0${discountType === '%' ? '' : ',00'}`} 
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-slate-200 focus:border-orange-500 outline-none transition-all font-bold text-lg" 
                                    />
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-orange-100 space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Subtotal Original:</span>
                                        <span className="font-medium">R$ {calculateTotalWithoutDiscount().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-red-600 font-bold">
                                        <span>Desconto Aplicado:</span>
                                        <span>- R$ {(calculateTotalWithoutDiscount() - calculateTotal()).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-800 font-black pt-1 border-t border-slate-100">
                                        <span>Novo Total:</span>
                                        <span className="text-orange-600">R$ {calculateTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
                                <button onClick={() => addPayment(PaymentMethod.CASH)} disabled={termFlow.active || isCreditSelection} className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-200 transition-all gap-1 md:gap-2 group ${termFlow.active || isCreditSelection ? 'opacity-40 cursor-not-allowed' : 'hover:border-green-500 hover:bg-green-50'}`}><Banknote size={20} className="text-slate-400 group-hover:text-green-600"/><span className="font-medium text-slate-600 text-sm group-hover:text-green-700">Dinheiro</span></button>
                                <button onClick={() => addPayment(PaymentMethod.PIX)} disabled={termFlow.active || isCreditSelection} className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-200 transition-all gap-1 md:gap-2 group ${termFlow.active || isCreditSelection ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50'}`}><QrCode size={20} className="text-slate-400 group-hover:text-blue-600"/><span className="font-medium text-slate-600 text-sm group-hover:text-blue-700">Pix</span></button>
                                
                                {!isCreditSelection ? (
                                   <button onClick={() => { setIsCreditSelection(true); setIsTermSelection(false); }} disabled={termFlow.active} className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-200 transition-all gap-1 md:gap-2 group ${termFlow.active ? 'opacity-40 cursor-not-allowed' : 'hover:border-purple-500 hover:bg-purple-50'}`}><CreditCard size={20} className="text-slate-400 group-hover:text-purple-600"/><span className="font-medium text-slate-600 text-sm group-hover:text-purple-700">Crédito</span></button>
                                ) : (
                                   <div className="col-span-2 flex flex-col bg-purple-50 p-2 rounded-xl border border-purple-200 animate-fade-in">
                                      <div className="flex gap-2 items-center">
                                        <div className="flex-1">
                                           <label className="text-[10px] font-bold text-purple-600 block mb-1">Parcelas (Cartão)</label>
                                           <input 
                                             type="number" min="1" max="12"
                                             className="w-full text-sm p-1 rounded border border-purple-300 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-center"
                                             value={creditInstallments}
                                             onChange={(e) => setCreditInstallments(parseInt(e.target.value) || 1)}
                                           />
                                        </div>
                                        <div className="w-20">
                                           <label className="text-[10px] font-bold text-purple-600 block mb-1">Juros %</label>
                                           <input 
                                             type="number" step="0.1"
                                             className="w-full text-sm p-1 rounded border border-purple-300 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-center"
                                             value={creditInterest}
                                             onChange={(e) => setCreditInterest(parseFloat(e.target.value) || 0)}
                                           />
                                        </div>
                                        <button 
                                          onClick={() => {
                                            const amt = parseFloatSafe(amountToPay);
                                            addPayment(PaymentMethod.CREDIT, undefined, { current: 1, total: creditInstallments }, amt, creditInterest);
                                            setIsCreditSelection(false);
                                            setCreditInstallments(1);
                                            setCreditInterest(0);
                                          }} 
                                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm h-full"
                                        >
                                          OK
                                        </button>
                                        <button onClick={() => setIsCreditSelection(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={18} /></button>
                                      </div>
                                      <div className="mt-2 text-2xl font-black text-purple-800 flex flex-col gap-1 bg-white/50 p-2 rounded-lg border border-purple-200">
                                         <div className="flex justify-between items-center">
                                            <span className="text-xs uppercase opacity-70">Valor da Parcela:</span>
                                            <span>{creditInstallments}x de R$ {((parseFloatSafe(amountToPay) * (1 + creditInterest / 100)) / creditInstallments).toFixed(2)}</span>
                                         </div>
                                         {creditInterest > 0 && (
                                           <div className="flex justify-between items-center text-sm border-t border-purple-200 pt-1">
                                              <span className="text-xs uppercase opacity-70">Total com Juros:</span>
                                              <span>R$ {(parseFloatSafe(amountToPay) * (1 + creditInterest / 100)).toFixed(2)}</span>
                                           </div>
                                         )}
                                      </div>
                                   </div>
                                )}

                                <button onClick={() => addPayment(PaymentMethod.DEBIT)} disabled={termFlow.active || isCreditSelection} className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-200 transition-all gap-1 md:gap-2 group ${termFlow.active || isCreditSelection ? 'opacity-40 cursor-not-allowed' : 'hover:border-purple-500 hover:bg-purple-50'}`}><CreditCard size={20} className="text-slate-400 group-hover:text-purple-600"/><span className="font-medium text-slate-600 text-sm group-hover:text-purple-700">Débito</span></button>

                                {!isTermSelection ? (
                                   <>
                                     <button 
                                        onClick={() => {
                                          if(selectedCustomer.id === 'def' || !!unregisteredCustomer) return;
                                          setIsTermSelection(true);
                                          setIsCreditSelection(false);
                                        }} 
                                        disabled={selectedCustomer.id === 'def' || !!unregisteredCustomer || termFlow.active || isCreditSelection} 
                                        className={`${hasPlanInCart ? 'col-span-1' : 'col-span-2'} flex flex-row items-center justify-center p-3 md:p-4 rounded-xl border transition-all gap-2 md:gap-3 group ${selectedCustomer.id === 'def' || !!unregisteredCustomer || termFlow.active || isCreditSelection ? 'bg-slate-100 opacity-50 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-orange-500 hover:bg-orange-50'}`}
                                     >
                                        <CalendarClock size={20} className="text-slate-400 group-hover:text-orange-600"/>
                                        <span className="font-medium text-slate-600 text-sm group-hover:text-orange-700">{hasPlanInCart ? 'A Prazo' : 'A Prazo (Crediário)'}</span>
                                        {!hasPlanInCart && (selectedCustomer.id === 'def' || !!unregisteredCustomer) && <span className="text-xs text-slate-400 ml-2">({unregisteredCustomer ? 'Não disponível para sem cadastro' : 'Selecione um cliente'})</span>}
                                     </button>
                                     {hasPlanInCart && (
                                         <div className="col-span-1 bg-blue-50 border border-blue-100 rounded-xl p-2 flex flex-col justify-center">
                                             <label className="text-[10px] uppercase font-bold text-blue-600 mb-1 flex items-center gap-1"><Calendar size={10} /> Vencimento do Plano</label>
                                             <input 
                                                type="date"
                                                className="bg-slate-100 border border-blue-200 rounded p-1 text-sm text-slate-500 outline-none w-full cursor-not-allowed font-bold"
                                                value={planDueDate}
                                                readOnly
                                             />
                                         </div>
                                     )}
                                   </>
                                ) : (
                                   <>
                                   <div className="col-span-2 flex flex-col bg-orange-50 p-2 rounded-xl border border-orange-200 animate-fade-in">
                                      <div className="flex gap-2 items-center">
                                         <div className="flex-1">
                                           <label className="text-[10px] font-bold text-orange-600 block mb-1">
                                               {termFlow.active ? `${termFlow.currentStep}º Vencimento` : 'Vencimento da Parcela'}
                                           </label>
                                           <input 
                                             type="date" 
                                             className="w-full text-sm p-1 rounded border border-orange-300 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                             value={termDate}
                                             onChange={(e) => setTermDate(e.target.value)}
                                           />
                                         </div>
                                         <div className="w-16">
                                           <label className="text-[10px] font-bold text-orange-600 block mb-1">Parcelas</label>
                                           <input 
                                             type="number" min="1" max="12"
                                             className={`w-full text-sm p-1 rounded border border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-500 text-center ${termFlow.active ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
                                             value={termFlow.active ? termFlow.totalSteps : termInstallments}
                                             onChange={(e) => {
                                               if (!termFlow.active) {
                                                 const val = parseInt(e.target.value) || 1;
                                                 setTermInstallments(val);
                                                 setConfirmExceedLimit(false);
                                               }
                                             }}
                                             readOnly={termFlow.active}
                                           />
                                         </div>
                                         <div className="w-16">
                                           <label className="text-[10px] font-bold text-orange-600 block mb-1">Juros %</label>
                                           <input 
                                             type="number" step="0.1"
                                             className={`w-full text-sm p-1 rounded border border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-500 text-center ${termFlow.active ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
                                             value={termFlow.active ? termFlow.interestRate : termInterest}
                                             onChange={(e) => !termFlow.active && setTermInterest(parseFloat(e.target.value) || 0)}
                                             readOnly={termFlow.active}
                                           />
                                         </div>
                                         <button 
                                           onClick={() => {
                                             if (customerCompany && termInstallments > customerCompany.paymentMethods.term.maxInstallments) {
                                               if (!settings.allowExceedCompanyInstallmentLimit) {
                                                 alert(`A empresa ${customerCompany.name} permite no máximo ${customerCompany.paymentMethods.term.maxInstallments} parcelas.`);
                                                 return;
                                               }
                                               if (!confirmExceedLimit) {
                                                 alert(`Atenção: O limite da empresa é de ${customerCompany.paymentMethods.term.maxInstallments} parcelas. As parcelas excedentes serão creditadas como dívida pessoal do cliente. Marque a caixa de confirmação para continuar.`);
                                                 return;
                                               }
                                             }
                                             handleTermStep();
                                           }} 
                                           className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-bold text-sm h-full"
                                         >
                                           OK
                                         </button>
                                         {!termFlow.active && (
                                           <button onClick={() => setIsTermSelection(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
                                         )}
                                      </div>
                                      <div className="mt-2 text-2xl font-black text-orange-800 flex flex-col gap-1 bg-white/50 p-2 rounded-lg border border-orange-200">
                                         <div className="flex justify-between items-center">
                                            <span className="text-xs uppercase opacity-70">Valor da Parcela:</span>
                                            <span>{(termFlow.active ? termFlow.totalSteps : termInstallments)}x de R$ {(((parseFloatSafe(amountToPay) || 0) * (1 + (termFlow.active ? termFlow.interestRate : termInterest) / 100)) / (termFlow.active ? termFlow.totalSteps : termInstallments)).toFixed(2)}</span>
                                         </div>
                                         {(termFlow.active ? termFlow.interestRate : termInterest) > 0 && (
                                           <div className="flex justify-between items-center text-sm border-t border-orange-200 pt-1">
                                              <span className="text-xs uppercase opacity-70">Total com Juros:</span>
                                              <span>R$ {((parseFloatSafe(amountToPay) || 0) * (1 + (termFlow.active ? termFlow.interestRate : termInterest) / 100)).toFixed(2)}</span>
                                           </div>
                                         )}
                                      </div>
                                   </div>
                                   {(customerCompany && termInstallments > customerCompany.paymentMethods.term.maxInstallments && settings.allowExceedCompanyInstallmentLimit && !termFlow.active) && (
                                      <div className="col-span-2 mt-2 p-3 bg-orange-100 border border-orange-200 rounded-lg animate-fade-in">
                                         <p className="text-xs text-orange-800 font-bold mb-2 flex items-center gap-1">
                                            <AlertTriangle size={14} /> Atenção: Limite de parcelas da empresa excedido!
                                         </p>
                                         <p className="text-[10px] text-orange-700 mb-3 leading-tight">
                                            O limite desta empresa é de {customerCompany.paymentMethods.term.maxInstallments}x. 
                                            As parcelas de {customerCompany.paymentMethods.term.maxInstallments + 1} a {termInstallments} serão registradas como <strong>Dívida Pessoal</strong> do cliente.
                                         </p>
                                         <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                              type="checkbox" 
                                              className="w-4 h-4 accent-orange-600" 
                                              checked={confirmExceedLimit}
                                              onChange={(e) => setConfirmExceedLimit(e.target.checked)}
                                            />
                                            <span className="text-xs font-bold text-orange-800 group-hover:text-orange-900 transition-colors">Confirmar parcelamento além do limite</span>
                                         </label>
                                      </div>
                                   )}
                                </>
                                )}
                        </div>
                    </div>

                    {!isTermSelection && (
                        <div className="mt-auto pt-2">
                            <button onClick={finalizeSale} disabled={remainingTotal > 0.1} className={`w-full py-3 md:py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${remainingTotal > 0.1 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-success hover:bg-emerald-600 text-white hover:shadow-xl'}`}>
                                <Check size={24} /> {remainingTotal > 0.1 ? `Faltam R$ ${remainingTotal.toFixed(2)}` : 'Confirmar'}
                            </button>
                        </div>
                    )}
                  </>
               )}
            </div>

          </div>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {showDiscountModal && activeDiscountItem && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          onApply={(type, value) => {
            setCart(cart.map(item => item.id === activeDiscountItem.id ? { ...item, isDiscountActive: true, discountType: type, discountValue: value } : item));
            setShowDiscountModal(false);
          }}
          initialType={activeDiscountItem.discountType}
          initialValue={activeDiscountItem.discountValue}
        />
      )}

      {showPrintOptions && lastSaleData && (
         <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[95vh] overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Venda Finalizada!</h3>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 border border-slate-100">
                    {lastSaleData.sale.discountTotal > 0 && (
                        <>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                <span className="text-slate-500 font-medium">Subtotal:</span>
                                <span className="text-lg font-bold text-slate-500 line-through">R$ {(lastSaleData.sale.total + lastSaleData.sale.discountTotal - (lastSaleData.sale.interestTotal || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                <span className="text-red-500 font-medium">Desconto:</span>
                                <span className="text-lg font-bold text-red-500">- R$ {lastSaleData.sale.discountTotal.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-slate-500 font-medium">Total da Venda:</span>
                        <span className="text-xl font-black text-slate-800">R$ {lastSaleData.sale.total.toFixed(2)}</span>
                    </div>
                    
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pagamentos:</p>
                        {lastSaleData.sale.payments.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-slate-600">{p.method}</span>
                                <span className="font-bold text-slate-700">R$ {p.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-slate-500 font-medium">Total Pago:</span>
                        <span className="font-bold text-slate-800">R$ {lastSaleData.sale.payments.filter((p: any) => p.method !== PaymentMethod.TERM).reduce((acc: number, p: any) => acc + p.amount, 0).toFixed(2)}</span>
                    </div>

                    {lastSaleData.sale.payments.some((p: any) => p.method === PaymentMethod.TERM) && (
                        <div className="mt-4 pt-2 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2">Parcelas e Vencimentos (A Prazo):</p>
                            <div className="space-y-1">
                                {lastSaleData.sale.payments.filter((p: any) => p.method === PaymentMethod.TERM).map((p: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs bg-orange-50 p-1.5 rounded border border-orange-100">
                                        <span className="text-orange-800 font-medium">
                                            {p.totalInstallments && p.totalInstallments > 1 ? `${p.installmentNumber}/${p.totalInstallments}` : 'Parcela Única'}
                                        </span>
                                        <div className="text-right">
                                            <div className="font-bold text-orange-900">R$ {p.amount.toFixed(2)}</div>
                                            {p.dueDate && <div className="text-[9px] text-orange-600 font-bold">Venc: {new Date(p.dueDate).toLocaleDateString()}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {lastSaleData.sale.payments.filter((p: any) => p.method !== PaymentMethod.TERM).reduce((acc: number, p: any) => acc + p.amount, 0) > lastSaleData.sale.total && (
                        <div className="flex justify-between items-center pt-2 mt-1 bg-green-100 p-2 rounded-lg">
                            <span className="text-green-700 font-bold">TROCO:</span>
                            <span className="text-xl font-black text-green-800">R$ {(lastSaleData.sale.payments.filter((p: any) => p.method !== PaymentMethod.TERM).reduce((acc: number, p: any) => acc + p.amount, 0) - lastSaleData.sale.total).toFixed(2)}</span>
                        </div>
                    )}
                </div>
              </div>
              <div className="p-6 pt-0 shrink-0 border-t border-slate-100">
                <div className="grid grid-cols-1 gap-3 mt-4">
                    {lastSaleData.sale.payments.some((p: any) => p.method === PaymentMethod.TERM) && (
                        <button onClick={() => setShowCarnePrinter(true)} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Book size={20} /> Emitir Carnê</button>
                    )}
                    <button onClick={() => handlePrintOption('print')} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Printer size={20} /> Imprimir Cupom</button>
                    <button onClick={() => handlePrintOption('save')} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"><FileDown size={20} /> Salvar Arquivo</button>
                    <button onClick={() => handlePrintOption('none')} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">Fechar</button>
                </div>
              </div>
            </div>
         </div>
      )}

      {confirmConfig && <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(null)} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} isDangerous={confirmConfig.isDangerous} confirmText={confirmConfig.confirmText || "Confirmar"} />}
      {showCloseModal && <CashSessionModal isOpen={showCloseModal} onClose={() => setShowCloseModal(false)} type="close" isForced={true} />}

      {variationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center p-4 border-b border-slate-100">
               <h3 className="font-bold text-slate-800">Selecione a Variação</h3>
               <button onClick={() => setVariationModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="mb-4">
                   <div className="font-bold text-lg text-slate-800">{variationModal.name}</div>
                </div>
                {['sizes', 'colors', 'numbers'].map(type => {
                    const opts = variationModal[type as keyof Product] as string[];
                    if (!opts || opts.length <= 1) return null;
                    const labels = { sizes: 'Tamanho', colors: 'Cor', numbers: 'Número' };
                    return (
                        <div key={type} className="mb-4">
                            <span className="block text-sm font-bold text-slate-600 mb-2">{labels[type as keyof typeof labels]}</span>
                            <div className="flex flex-wrap gap-2">
                                {opts.map(opt => {
                                    const st = getVisualVariationStock(variationModal, opt);
                                    const isEsgotado = st <= 0;
                                    const optPrice = getProductCurrentPrice(variationModal, opt);
                                    const isVarPromo = isVariationPromoActive(variationModal, opt);
                                    const isGenPromo = isGeneralPromoActive(variationModal);
                                    const hasPromo = isVarPromo || isGenPromo;
                                    const basePrice = (variationModal.variationPrices?.[opt] && variationModal.variationPrices[opt] > 0) ? variationModal.variationPrices[opt] : variationModal.price;
                                    return (
                                        <button 
                                            key={opt}
                                            disabled={isEsgotado}
                                            onClick={() => finalizeAddToCart(variationModal, opt, type as 'sizes' | 'colors' | 'numbers')}
                                            className={`px-4 py-2.5 rounded-lg border transition-colors flex flex-col items-center justify-center min-w-[70px] ${isEsgotado ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through' : 'bg-white text-slate-700 border-slate-300 hover:border-accent hover:text-accent hover:bg-accent/5'}`}
                                        >
                                            <span className="font-bold text-sm">{opt}</span>
                                            <span className="text-[10px] opacity-70 mb-1 leading-none">Qtd: {st}</span>
                                            {hasPromo ? (
                                              <div className="flex flex-col items-center leading-tight">
                                                <span className="text-[10px] text-slate-400 line-through">R$ {basePrice.toFixed(2)}</span>
                                                <span className="text-xs font-bold text-orange-600 font-mono">R$ {optPrice.toFixed(2)}</span>
                                              </div>
                                            ) : (
                                              <span className="text-xs font-bold text-slate-600 font-mono">R$ {basePrice.toFixed(2)}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
             </div>
          </div>
        </div>
      )}
      {showOpenModal && <CashSessionModal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} type="open" isForced={!cashSession} />}
      {showSangriaModal && <TransactionModal isOpen={showSangriaModal} onClose={() => setShowSangriaModal(false)} type="sangria" />}
      {showSuprimentoModal && <TransactionModal isOpen={showSuprimentoModal} onClose={() => setShowSuprimentoModal(false)} type="suprimento" />}
      
      {showCarnePrinter && lastSaleData && (
          <CarnePrinter 
              sale={lastSaleData.sale} 
              settings={settings} 
              customer={lastSaleData.customer} 
              onClose={() => setShowCarnePrinter(false)} 
          />
      )}

      {showScanner && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
