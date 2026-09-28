// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { Product, Customer, Sale, FinancialRecord, Supplier, Brand, CompanySettings, PaymentMethod, User, LicenseKey, LicenseType, AppLog, PlanConfig, MessageTemplate, Raffle, CashSession, CashTransaction, Company, DebtSettlement, RaffleCampaign } from '../types';
import { saveLocalData, loadLocalData } from '../lib/offline.functions';
import { localDb } from '../lib/local-db';
import { db, auth, secondaryAuth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  writeBatch, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, User as FirebaseUser } from 'firebase/auth';
// @ts-expect-error - No types available for crypto-js in this environment
import CryptoJS from 'crypto-js';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
  }
}

const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Dispatch a custom event to trigger the ErrorBoundary
  window.dispatchEvent(new CustomEvent('firestore:error', { detail: new Error(JSON.stringify(errInfo)) }));
};

// ... (Keep existing Interfaces and Helpers until StoreContext definition)

interface StoreContextType {
  addBrand: (b: Brand) => Promise<void>;
  updateBrand: (b: Brand) => Promise<void>;
  removeBrand: (id: string) => Promise<void>;
  addSupplier: (s: Supplier) => Promise<void>;
  updateSupplier: (s: Supplier) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
  addCompany: (c: Company) => Promise<void>;
  updateCompany: (c: Company) => Promise<void>;
  removeCompany: (id: string) => Promise<void>;

  products: Product[];
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  customers: Customer[];
  addCustomer: (c: Customer) => Promise<void>;
  updateCustomer: (c: Customer) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;

  sales: Sale[];
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  financialRecords: FinancialRecord[];
  addFinancialRecord: (r: FinancialRecord) => Promise<void>;
  updateFinancialRecord: (id: string, d: Partial<FinancialRecord>) => Promise<void>;
  removeFinancialRecord: (id: string) => Promise<void>;
  removeFinancialGroup: (docNum: string) => Promise<void>;
  registerPayment: (id: string, amount: number, method?: string, interestAmount?: number, discountAmount?: number) => Promise<void>;
  registerSplitPayment: (id: string, splits: { method: string; amount: number; interestAmount?: number }[]) => Promise<void>;
  suppliers: Supplier[];
  brands: Brand[];
  companies: Company[]; // NEW
  debtSettlements: DebtSettlement[]; // NEW
  settings: CompanySettings;
  
  // New: Message Templates
  messageTemplates: MessageTemplate[];
  
  // New: Raffles
  raffles: Raffle[];
  raffleCampaigns: RaffleCampaign[];
  addRaffleCampaign: (campaign: Omit<RaffleCampaign, 'id' | 'createdAt' | 'tenantId' | 'ownerId'>) => Promise<void>;
  updateRaffleCampaign: (id: string, campaign: Partial<RaffleCampaign>) => Promise<void>;
  deleteRaffleCampaign: (id: string) => Promise<void>;

  // Auth & Admin Data
  currentUser: User | null;
  currentOwnerId: string | null;

  authInitialized: boolean;
  users: User[];
  licenseKeys: LicenseKey[];
  logs: AppLog[];
  
  // New: Cash Management
  cashSessions: CashSession[];
  cashSession: CashSession | null;
  cashTransactions: CashTransaction[];
  lastClosedSession: CashSession | null;
  openCashSession: (initialValue: number, previousSessionId?: string, previousSessionKeptAmount?: number) => Promise<string>;
  closeCashSession: (finalValue: number, keptAmount?: number) => Promise<void>;
  addCashTransaction: (transaction: Omit<CashTransaction, 'id' | 'timestamp' | 'tenantId'>) => Promise<void>;

  // UPDATED BACKUP ACTIONS
  backupData: () => Promise<string>;
  restoreData: (content: string, passwordInput: string) => Promise<{ isCloud: boolean }>;
  
  // DATA PERSISTENCE SWITCH & SYNC
  saveCloudDataToLocal: () => void;
  uploadLocalDataToCloud: () => Promise<void>; 
  clearLocalData: () => void; 
  
  // NEW ACTION FOR DATA CLEANUP
  cleanupOldData: (options: { revenues: boolean, payables: boolean, sales: boolean, forceAll?: boolean }) => Promise<{ deletedSales: number, deletedRecords: number }>;

  // NEW: Debt Management
  clearCustomerDebt: (customerId: string) => Promise<void>;
  clearCompanyDebt: (companyId: string, discountAmount: number, netAmount: number) => Promise<void>;
  removeDebtSettlement: (id: string) => Promise<void>;

  // Auth Actions
  login: (username: string, password?: string, storeSlug?: string) => Promise<{ success: boolean; requiresPasswordChange?: boolean; user?: User, message?: string }>;
  autoLogin: (token: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  setupNewPassword: (newPassword: string, user: User) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  registerUser: (u: Partial<User> & { password?: string }, storeSlug?: string) => Promise<{ success: boolean; message: string }>;
  publicRegisterStoreOwner: (userData: any, token?: string) => Promise<{ success: boolean; message: string }>;
  adminCreateStoreOwner: (userData: any) => Promise<{ success: boolean; message: string }>;
  generateInviteLink: () => Promise<{ success: boolean; link?: string; message?: string }>;
  adminGenerateAutoLoginToken: (userId: string) => Promise<{ success: boolean; link?: string; message?: string }>;
  validateInviteLink: (token: string) => Promise<boolean>;
  createEmployee: (employeeData: any) => Promise<{ success: boolean; message: string }>;
  updateEmployee: (employeeId: string, employeeData: any) => Promise<{ success: boolean; message: string }>;
  resetUserPassword: (username: string, email: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  updateUserCredentials: (type: 'username' | 'password' | 'email', verification: { u?: string, e?: string, p?: string }, newValue: string) => Promise<{ success: boolean; message: string }>;
  
  // Admin Actions
  generateLicenseKey: (type: LicenseType) => string;
  activateLicense: (key: string, username: string) => { success: boolean, message: string };
  adminGenerateAndActivate: (type: LicenseType, userId: string) => { success: boolean, message: string };
  adminDeleteUser: (userId: string) => void;
  adminResetCooldown: (userId: string, type: 'NAME' | 'PASSWORD' | 'EMAIL') => Promise<void>;
  adminToggleUserSync: (userId: string, status: boolean) => Promise<void>;
  adminToggleOfflineMode: (userId: string, status: boolean) => Promise<void>; // NEW
  isAdmin: boolean;
  effectiveUser: User | null;
  isFreeVersion: boolean;
  isCloudSync: boolean;
  generateCustomerTempPassword: (customerId: string) => Promise<{ success: boolean; password?: string; message: string }>;
  changeCustomerPassword: (customerId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  platformPlans: PlanConfig[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// ... (Keep defaultPlans, initialSettings, Helpers and useEffects until addSale function)
export const defaultPlans: PlanConfig[] = [
    { key: 'monthly_basic', name: "Mensal Básico", price: "R$ 79,90", isVisible: true, features: ["Acesso total ao sistema", "Versão Offline para Backup", "Backup e restauração de dados", "Campanhas com Cupons na Venda", "sistema totalmente Offline"], cloudSyncAllowed: false },
    { key: 'annual_eco', name: "Anual Econômico", price: "R$ 799,90", isVisible: true, features: ["Acesso total ao sistema", "Versão Offline para Backup", "Backup e restauração de dados", "Campanhas com Cupons na Venda", "Sistema totalmente Offline", "2 Suporte por Mês", "Sorteios Inclusos"], cloudSyncAllowed: false },
    { key: 'monthly_fidelity', name: "Mensal Fidelidade", price: "R$ 129,90", isVisible: true, features: ["Acesso total ao sistema", "Funciona Online", "Backup em Nuvem Auto", "Acesso Multi-dispositivo", "Login em qualquer lugar", "Vitrine Online Para Compartilhar", "Suporte Prioritário Sem Adição de Cobrança"], cloudSyncAllowed: true },
    { key: 'lifetime', name: "Vitalício Premium", price: "R$ 1.499,90", isVisible: true, features: ["Acesso total ao sistema", "Versão Offline para Backup", "Backup e restauração de dados", "Campanhas com Cupons na Venda", "Sistema totalmente Offline", "Sem renovações", "1 Suporte por Ano", "+ Suporte individual (A Combinar)", "Sorteios Inclusos"], cloudSyncAllowed: false }
];


const initialMenuVisibility: MenuVisibilityConfig = {
  dashboard: true,
  pos: true,
  companies: true,
  inventory: true,
  payables: true,
  finance: true,
  messages: true,
  raffles: true,
  cashReports: true,
  corporateReports: true,
  gcec: true,
  reports: true,
  settings: true,
};

const initialSettingsVisibility: SettingsVisibilityConfig = {
  visibility: true,
  companyData: true,
  userData: true,
  dataRetention: true,
  dashboardVisual: true,
  sidebarConfig: true,
  printerConfig: true,
  backupRestore: true,
  cloudSync: true,
  license: true,
  plans: true,
  support: true,
};

const initialSettings: CompanySettings = {
  name: "Smart PDV PRO", cnpj: "", stateRegistration: "", phone: "", whatsappVitrineEnabled: true, whatsappVitrinePosition: 'bottom', address: "", pixKey: "", whatsappMessageTemplate: "Olá {cliente}, identificamos um débito de R$ {valor} referente ao pedido {pedido}. Segue chave Pix para pagamento:", logo: "", loginEnabled: true,
  aboutUs: { enabled: false, description: "", phone: "", address: "", fields: [] },
  dashboardWidgets: { sales: { enabled: true, range: 0 }, receivables: { enabled: true, range: 30 }, payables: { enabled: true, range: 30 }, alerts: { enabled: true, range: 3 }, birthdays: { enabled: true, range: 0 }, lists: true },
  printerConfig: { enabled: true, autoPrint: false, paperWidth: '80mm' }, enableScreenRecording: true, licenseKey: "FREE-TRIAL", sidebarConfig: { backgroundColor: '#0f172a', textColor: '#cbd5e1', activeItemColor: '#3b82f6' }, backupRestorationCount: 0, cloudSyncEnabled: false, dataRetention: { revenues: 0, payables: 0, sales: 0 }, customPlans: defaultPlans,
  menuVisibility: initialMenuVisibility,
  settingsVisibility: initialSettingsVisibility,
  cashRegisterEnabled: false,
  posDisplayMode: 'grid-photo',
  labelConfig: {
    paperType: 'A4',
    unit: 'cm',
    width: 6,
    height: 4,
    labelsPerRow: 3,
    rowsPerPage: 5,
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 0.5,
    marginRight: 0.5,
    showStoreName: true,
    showProductName: true,
    showVariations: true,
    showBarcode: true,
    showPrice: true
  }
};

// Todos os dados do sistema vivem no IndexedDB do navegador (banco local).
const localStorage: Storage = localDb;

// Hook usado no modo local para replicar as imagens na pasta do projeto
let imagesPersistHook: (() => void) | null = null;
export const collectStoredImages = (): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('img_')) { const v = localStorage.getItem(k); if (v) out[k] = v; }
    }
  } catch { /* ignore */ }
  return out;
};
const saveLocalImage = (id: string, base64: string | undefined, prefix: string) => { if (!base64) return; try { localStorage.setItem(`img_${prefix}_${id}`, base64); } catch (e) { console.error("Storage limit reached for images", e); } imagesPersistHook?.(); };
const getLocalImage = (id: string, prefix: string) => { return localStorage.getItem(`img_${prefix}_${id}`) || undefined; };
const removeLocalImage = (id: string, prefix: string) => { localStorage.removeItem(`img_${prefix}_${id}`); imagesPersistHook?.(); };




// Cópia do usuário logado para abrir o sistema mesmo sem internet
const CACHED_USER_KEY = 'smartpdv_cached_user';

const LOCAL_KEYS = { PRODUCTS: 'smartpdv_products', CUSTOMERS: 'smartpdv_customers', SALES: 'smartpdv_sales', FINANCE: 'smartpdv_financial', SUPPLIERS: 'smartpdv_suppliers', BRANDS: 'smartpdv_brands', COMPANIES: 'smartpdv_companies', SETTINGS: 'smartpdv_settings', MESSAGES: 'smartpdv_messages', RAFFLES: 'smartpdv_raffles', RAFFLE_CAMPAIGNS: 'smartpdv_raffle_campaigns', CASH_SESSIONS: 'smartpdv_cash_sessions', CASH_TRANSACTIONS: 'smartpdv_cash_transactions', DEBT_SETTLEMENTS: 'smartpdv_debt_settlements' };

function getLocalData<T>(key: string): T[] { try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : []; } catch { return []; } }
const setLocalData = (key: string, data: any[]) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn(`Falha ao salvar ${key} no navegador (limite de espaço)`, e); } };

// Logos podem ser base64 grandes: guardamos separadas para não estourar o localStorage
const isDataImage = (v: any) => typeof v === 'string' && v.startsWith('data:');
const stripSettingsImages = (s: any) => {
  const copy = { ...s };
  if (isDataImage(copy.logo)) delete copy.logo;
  if (isDataImage(copy.splashLogo)) delete copy.splashLogo;
  return copy;
};
const hydrateSettingsImages = (s: any, ownerId: string | null | undefined) => {
  if (!s) return s;
  const id = s.ownerId || ownerId || 'unknown';
  const out = { ...s };
  if (!out.logo) out.logo = getLocalImage(id, 'logo');
  if (!out.splashLogo) out.splashLogo = getLocalImage(id, 'splash');
  return out;
};

const SECRET_KEY = "SMARTPDV_SECURE_2024_PRO";
const encryptDataWithCryptoJS = (data: any): string => { try { const jsonStr = JSON.stringify(data); return CryptoJS.AES.encrypt(jsonStr, SECRET_KEY).toString(); } catch (e) { console.error("Erro na criptografia", e); throw new Error("Falha ao criptografar dados.", { cause: e }); } };
const decryptDataWithCryptoJS = (cipherText: string): any => { try { const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY); const decryptedStr = bytes.toString(CryptoJS.enc.Utf8); if (!decryptedStr) throw new Error("Decryption failed"); return JSON.parse(decryptedStr); } catch (e) { console.error("Erro na descriptografia", e); throw new Error("Arquivo inválido ou senha incorreta.", { cause: e }); } };
const cleanForCloud = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(cleanForCloud).filter(item => item !== undefined);
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key in data) {
      if ((key === 'image' || key === 'logo') && typeof data[key] === 'string' && data[key].startsWith('data:image')) {
          continue; // Skip base64 images to prevent Firestore size limit issues
      }
      const value = cleanForCloud(data[key]);
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  return data;
};
const normalizeDate = (dateStr: string | undefined): string => { if (!dateStr) { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString(); } if (dateStr.length === 10 && dateStr.includes('-')) { const [y, m, d] = dateStr.split('-').map(Number); const date = new Date(y, m - 1, d, 12, 0, 0, 0); return date.toISOString(); } return dateStr; };

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... (State initialization same as original file)
  const [currentUser, setCurrentUser] = useState<User | null>(() => { const stored = localStorage.getItem('current_session_soft'); return stored ? JSON.parse(stored) : null; });
  const [authInitialized, setAuthInitialized] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [debtSettlements, setDebtSettlements] = useState<DebtSettlement[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [raffleCampaigns, setRaffleCampaigns] = useState<RaffleCampaign[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [users, setUsers] = useState<User[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([]);
  
  const lastClosedSession = useMemo(() => {
      return cashSessions
          .filter(s => s.status === 'fechado')
          .sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime())[0] || null;
  }, [cashSessions]);
  const [logs, setLogs] = useState<AppLog[]>([]);
  
  const productsRef = useRef<string>("");
  const customersRef = useRef<string>("");
  const salesRef = useRef<string>("");
  const financeRef = useRef<string>("");

  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'AdminGeral' || 
                  currentUser?.username?.toLowerCase()?.trim() === 'coutinho' || 
                  currentUser?.email?.toLowerCase()?.trim() === 'mcn.coutinho@gmail.com';
  
  // Helper to get the effective user for license checks (owner if current is employee)
  const effectiveUser = useMemo(() => {
      if (!currentUser) return null;
      if (isAdmin || currentUser.role === 'DonoLoja' || !currentUser.ownerId || currentUser.ownerId === currentUser.id) {
          return currentUser;
      }
      // It's an employee, find the owner
      return users.find(u => u.id === currentUser.ownerId) || currentUser;
  }, [currentUser, users, isAdmin]);

  // NEW: Consistent Owner ID for Data Isolation
  const currentOwnerId = useMemo(() => {
      if (!currentUser) return null;
      if (currentUser.role === 'DonoLoja' || currentUser.role === 'AdminGeral') return currentUser.id;
      return currentUser.tenantId || currentUser.ownerId || currentUser.id;
  }, [currentUser]);

  const isFreeVersion = useMemo(() => {
      if (!currentUser) return true;
      if (isAdmin) return false;
      if (currentUser.ownerId && users.length === 0) return false; // Prevent blinking while loading owner
      const target = effectiveUser || currentUser;
      const isFreeKey = !target.licenseKey || target.licenseKey === 'FREE-TRIAL' || target.licenseKey === 'FREE-VERSION';
      const isExpired = target.licenseExpiry ? new Date(target.licenseExpiry).getTime() < Date.now() : false;
      return isFreeKey || isExpired;
  }, [currentUser, isAdmin, effectiveUser, users.length]);
  
  // Logic Updated: isCloudSync depends on Plan OR Admin Override
  const isCloudSync = useMemo(() => {
      if (!currentUser) return false;
      const target = effectiveUser || currentUser;
      
      // Find the plan config for the user's license
      const currentPlan = settings.customPlans?.find(p => p.key === target.licenseKey) || defaultPlans.find(p => p.key === target.licenseKey);
      
      // Allow if: Admin OR Plan allows it OR User has 'allowedCloudSync' explicitly set to true (admin override)
      const hasPlanPermission = isAdmin || currentPlan?.cloudSyncAllowed === true || target.allowedCloudSync === true;
      
      // Sistema 100% local: dados operacionais nunca são sincronizados na nuvem.
      // A nuvem é usada apenas para login e validação/renovação da licença.
      void hasPlanPermission;
      return false;
  }, [currentUser, isAdmin, settings.cloudSyncEnabled, settings.customPlans, effectiveUser]);

  const logAction = (action: string, details: string, targetUserId?: string, targetUsername?: string) => {
      const uId = targetUserId || currentUser?.id;
      const uName = targetUsername || currentUser?.username;
      if (!uId || !uName) return;
      addDoc(collection(db, 'logs'), { ownerId: uId, userId: uId, username: uName, action, details, timestamp: new Date().toISOString() }).catch(e => console.warn("Logging suppressed", e));
  };

  // Environment detection
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Persistence Helper for Local Folders
  const persistToFolder = useCallback(async (category: string, content: any) => {
    if (!isLocal || !currentOwnerId) return;
    try {
      await saveLocalData({ category, content, tenantId: currentOwnerId });
    } catch (e) {
      console.warn(`Failed to persist ${category} to folder`, e);
    }
  }, [isLocal, currentOwnerId]);

  // Load from Folder Helper
  const loadFromFolder = useCallback(async (category: string) => {
    if (!isLocal || !currentOwnerId) return null;
    try {
      const res = await loadLocalData({ category, tenantId: currentOwnerId });
      return res.success ? res.content : null;
    } catch (e) {
      console.warn(`Failed to load ${category} from folder`, e);
      return null;
    }
  }, [isLocal, currentOwnerId]);

  // Modo local: sempre que uma imagem (logo, foto de produto) mudar, salva tudo na pasta do projeto
  useEffect(() => {
    if (!isLocal || !currentOwnerId) { imagesPersistHook = null; return; }
    let timer: ReturnType<typeof setTimeout> | null = null;
    imagesPersistHook = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { persistToFolder('images', collectStoredImages()); }, 300);
    };
    return () => { if (timer) clearTimeout(timer); imagesPersistHook = null; };
  }, [isLocal, currentOwnerId, persistToFolder]);



  // ... (useEffect listeners)
  useEffect(() => { const handleSoftReset = () => { localStorage.removeItem('current_session_soft'); setCurrentUser(null); setProducts([]); setCustomers([]); setSales([]); setFinancialRecords([]); setSuppliers([]); setBrands([]); setMessageTemplates([]); setRaffles([]); setSettings(initialSettings); signOut(auth).catch(() => {}); }; window.addEventListener('app:soft_reset', handleSoftReset); return () => window.removeEventListener('app:soft_reset', handleSoftReset); }, []);
  
  // Initial Auth Listener
   useEffect(() => { 
       const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
       const readCachedUser = (): User | null => {
           try { const raw = localStorage.getItem(CACHED_USER_KEY); return raw ? JSON.parse(raw) as User : null; } catch { return null; }
       };
       const applyLocalSettings = () => {
           const storedSettings = getLocalData<CompanySettings>(LOCAL_KEYS.SETTINGS);
           if (storedSettings[0]) setSettings(hydrateSettingsImages(storedSettings[0], storedSettings[0]?.ownerId));
       };

       const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => { 
           if (firebaseUser) { 
               const cached = readCachedUser();
               // Sem internet: abre direto com os dados já salvos no computador/navegador.
               if (isOffline() && cached && cached.id === firebaseUser.uid) {
                   setCurrentUser(cached);
                   applyLocalSettings();
                   setAuthInitialized(true);
                   return;
               }
               try { 
                   const userDocRef = doc(db, 'users', firebaseUser.uid); 
                   const userDocSnap = await getDoc(userDocRef); 
                   if (userDocSnap.exists()) { 
                       const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User; 
                       updateDoc(userDocRef, { isOnline: true, lastLogin: new Date().toISOString() }).catch(() => {}); 
                       setCurrentUser(userData); 
                       try { localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData)); } catch { /* ignora */ }
                       localStorage.removeItem('current_session_soft'); 
                       
                       const settingsQuery = query(collection(db, 'settings'), where('ownerId', '==', userData.ownerId || userData.id)); 
                       const settingsSnap = await getDocs(settingsQuery); 
                       if (!settingsSnap.empty) { 
                           const remoteSettings = { ...settingsSnap.docs[0].data(), id: settingsSnap.docs[0].id } as CompanySettings; 
                           if (!remoteSettings.customPlans) { 
                               remoteSettings.customPlans = defaultPlans; 
                           } 
                           setSettings(remoteSettings); 
                           setLocalData(LOCAL_KEYS.SETTINGS, [remoteSettings]); 
                       } 
                   } else { 
                      const newUser: User = { 
                          id: firebaseUser.uid, 
                          tenantId: firebaseUser.uid, 
                          username: firebaseUser.email?.split('@')[0] || 'User', 
                          email: firebaseUser.email || '', 
                          role: 'user', 
                          isOnline: true, 
                          lastLogin: new Date().toISOString(), 
                          history: [], 
                          licenseKey: 'FREE-TRIAL', 
                          licenseExpiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), 
                          allowedCloudSync: false 
                      }; 
                      setDoc(userDocRef, newUser).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users')); 
                      setCurrentUser(newUser); 
                  } 
               } catch (e) { 
                   // Sem internet ou nuvem indisponível: usa a cópia local já salva.
                   const cachedFallback = readCachedUser();
                   if (cachedFallback && cachedFallback.id === firebaseUser.uid) {
                       setCurrentUser(cachedFallback);
                       applyLocalSettings();
                   } else {
                       handleFirestoreError(e, OperationType.GET, 'users');
                   }
               } 
           } else { 
               const storedSoft = localStorage.getItem('current_session_soft'); 
               const cachedOffline = isOffline() ? readCachedUser() : null;
               if (storedSoft) { 
                   setCurrentUser(JSON.parse(storedSoft)); 
               } else if (cachedOffline) {
                   setCurrentUser(cachedOffline);
                   applyLocalSettings();
               } else { 
                  const storedSettings = getLocalData<CompanySettings>(LOCAL_KEYS.SETTINGS); 
                  const activeSettings = storedSettings[0] || initialSettings; 
                  if (activeSettings.loginEnabled === false) { 
                      const guestUser: User = { 
                          id: 'guest_user', 
                          tenantId: 'guest_tenant', 
                          username: 'Vendedor (Visitante)', 
                          email: '', 
                          role: 'user', 
                          isOnline: true, 
                          history: [], 
                          licenseKey: 'FREE-VERSION' 
                      }; 
                      setCurrentUser(guestUser); 
                      setSettings(activeSettings); 
                  } else { 
                      setCurrentUser(null); 

                      setProducts([]); 
                      setCustomers([]); 
                      setSales([]); 
                      setFinancialRecords([]); 
                      setSuppliers([]); 
                      setBrands([]); 
                      setMessageTemplates([]); 
                      setRaffles([]); 
                      setSettings(initialSettings); 
                      setLogs([]); 
                  } 
              } 
          } 
          setAuthInitialized(true); 
      }); 
      
      return () => unsubscribeAuth(); 
  }, []);
  
  // NEW EFFECT: Real-time User Profile Sync
  // This ensures that if Admin grants 'allowedCloudSync', the user gets it immediately without relogging.
  useEffect(() => {
      if (!currentUser?.id || currentUser.id === 'guest_user') return;

      const unsubUserProfile = onSnapshot(doc(db, 'users', currentUser.id), (docSnap) => {
          if (docSnap.exists()) {
              const freshData = { id: docSnap.id, ...docSnap.data() } as User;
              // Update state if permissions changed
              setCurrentUser(prev => {
                  if (!prev) return freshData;
                  if (prev.allowedCloudSync !== freshData.allowedCloudSync || prev.licenseKey !== freshData.licenseKey) {
                      return { ...prev, ...freshData };
                  }
                  return prev;
              });
          }
      }, (e) => handleFirestoreError(e, OperationType.GET, `users/${currentUser.id}`));

      return () => unsubUserProfile();
  }, [currentUser?.id]);

  useEffect(() => { 
      if (!currentUser) return; 
      
      let unsubKeys = () => {}; 
      let unsubUsers = () => {}; 
      let unsubPlatform = () => {};

      try {
          const pRef = doc(db, "settings", "PLATFORM_PLANS");
          unsubPlatform = onSnapshot(doc(db, "settings", "PLATFORM_PLANS"), (snap) => {
              if (snap.exists() && snap.data().plans) {
                  const platformPlans = snap.data().plans;
                  console.log("PLATFORM_PLANS synced:", platformPlans);
                  setSettings(prev => ({ ...prev, customPlans: platformPlans }));
                  // Also update local storage to keep synced plans available offline
                  const storedSettings = getLocalData<CompanySettings>(LOCAL_KEYS.SETTINGS);
                  if (storedSettings[0]) {
                      storedSettings[0].customPlans = platformPlans;
                      setLocalData(LOCAL_KEYS.SETTINGS, storedSettings);
                  }
              } else if (isAdmin) {
                  // Admin can initialize PLATFORM_PLANS if it doesn't exist
                  setDoc(doc(db, "settings", "PLATFORM_PLANS"), { 
                      plans: defaultPlans,
                      updatedAt: new Date().toISOString(),
                      updatedBy: currentUser?.username || 'admin'
                  }).catch(e => console.error("Error initializing PLATFORM_PLANS:", e));
              }
          }, (e) => console.warn("Could not load PLATFORM_PLANS", e));
      } catch (e) { console.error(e); }

      try { 
          const licQuery = isAdmin 
              ? collection(db, 'licenseKeys') 
              : (currentUser.username 
                  ? query(collection(db, 'licenseKeys'), where('usedBy', '==', currentUser.username))
                  : null);

          
          if (licQuery) {
              unsubKeys = onSnapshot(licQuery, (snapshot) => { 
                  setLicenseKeys(snapshot.docs.map(doc => ({ ...doc.data() } as LicenseKey))); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'licenseKeys')); 
          }
      } catch (e) { console.error("Error subscribing to license keys", e); } 

      if (isAdmin) {
          try {
              unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
                  const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                  setUsers(usersList);
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'users'));
          } catch (e) { console.error("Error subscribing to users list", e); }
      } else if (currentUser?.tenantId || currentUser?.id) {
          try {
              const ownerIdToUse = currentUser.tenantId || currentUser.ownerId || currentUser.id;
              const q = query(collection(db, 'users'), where('tenantId', '==', ownerIdToUse));
              
              let lastEmployees: User[] = [];
              let lastOwner: User | null = null;
              
              const updateCombinedUsers = () => {
                  const combined = [...lastEmployees];
                  if (lastOwner && !combined.some(u => u.id === lastOwner!.id)) {
                      combined.push(lastOwner);
                  }
                  setUsers(combined);
              };

              const unsubQ = onSnapshot(q, (snapshot) => {
                  lastEmployees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                  updateCombinedUsers();
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'users'));
              
              const unsubOwner = onSnapshot(doc(db, 'users', ownerIdToUse), (docSnap) => {
                  if (docSnap.exists()) {
                      lastOwner = { id: docSnap.id, ...docSnap.data() } as User;
                      updateCombinedUsers();
                  }
              }, (e) => console.warn("Could not fetch owner doc", e));

              unsubUsers = () => {
                  unsubQ();
                  unsubOwner();
              };
          } catch (e) { console.error("Error subscribing to tenant users list", e); }
      }

      let unsubProds = () => {}; let unsubCusts = () => {}; let unsubSales = () => {}; let unsubFin = () => {}; let unsubSupp = () => {}; let unsubBrands = () => {}; let unsubCompanies = () => {}; let unsubMsgs = () => {}; let unsubRaffles = () => {}; let unsubSettings = () => {}; let unsubCashTrans = () => {}; let unsubCashSession = () => {}; let unsubRaffleCampaigns = () => {};
      
      const unsubscribeAll = () => {
          unsubKeys();
          unsubUsers();
          unsubPlatform();
          unsubProds();
          unsubCusts();
          unsubSales();
          unsubFin();
          unsubSupp();
          unsubBrands();
          unsubCompanies();
          unsubMsgs();
          unsubRaffles();
          unsubSettings();
          unsubCashTrans();
          unsubCashSession();
          unsubRaffleCampaigns();
      };

      
      // Load initial data from folders if local
      if (isLocal && currentOwnerId) {
        const loadAll = async () => {
          // Restaura as imagens (logos e fotos) salvas na pasta do projeto
          const localImages = await loadFromFolder('images');
          if (localImages && typeof localImages === 'object') {
            Object.entries(localImages as Record<string, string>).forEach(([k, v]) => {
              try { if (typeof v === 'string' && !localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* ignore */ }
            });
          }

          const localProds = await loadFromFolder('products');
          if (localProds) setProducts(localProds);
          
          const localCusts = await loadFromFolder('customers');
          if (localCusts) setCustomers(localCusts);
          
          const localSales = await loadFromFolder('sales');
          if (localSales) setSales(localSales);
          
          const localFinance = await loadFromFolder('financialRecords');
          if (localFinance) setFinancialRecords(localFinance);

          const localSuppliers = await loadFromFolder('suppliers');
          if (localSuppliers) setSuppliers(localSuppliers);

          const localBrands = await loadFromFolder('brands');
          if (localBrands) setBrands(localBrands);

          const localCompanies = await loadFromFolder('companies');
          if (localCompanies) setCompanies(localCompanies);

          const localMessages = await loadFromFolder('messages');
          if (localMessages) setMessageTemplates(localMessages);

          const localRaffleCampaigns = await loadFromFolder('raffle_campaigns');
          if (localRaffleCampaigns) setRaffleCampaigns(localRaffleCampaigns);

          const localCashSessions = await loadFromFolder('cash_sessions');
          if (localCashSessions) setCashSessions(localCashSessions);

          const localCashTransactions = await loadFromFolder('cash_transactions');
          if (localCashTransactions) setCashTransactions(localCashTransactions);

          const localRaffles = await loadFromFolder('raffles');
          if (localRaffles) setRaffles(localRaffles);

          const localDebtSettlements = await loadFromFolder('debtSettlements');
          if (localDebtSettlements) setDebtSettlements(localDebtSettlements);


          const localSettings = await loadFromFolder('settings');
          if (localSettings) {
            const sData = Array.isArray(localSettings) ? localSettings[0] : localSettings;
            if (sData) setSettings(hydrateSettingsImages(sData, currentOwnerId));
          }

        };
        loadAll();
      }

      if (isCloudSync) {
          const q = (col: string) => {
              if (!currentOwnerId) return null;
              return query(collection(db, col), where('ownerId', '==', currentOwnerId));
          };
          const qSession = (col: string) => {
              const tid = currentUser?.tenantId || currentUser?.ownerId || currentUser?.id;
              if (!tid) return null;
              return query(collection(db, col), where('tenantId', '==', tid));
          };

          const prodQuery = q('products');
          if (prodQuery) {
              unsubProds = onSnapshot(prodQuery, (snap) => { 
                  const data = snap.docs.map(doc => { 
                      const { id, ...rest } = doc.data(); 
                      const p = { ...rest, id: doc.id } as Product; 
                      const localImg = getLocalImage(p.id, 'prod'); 
                      if (localImg) p.image = localImg; 
                      return p; 
                  }); 
                  if (productsRef.current !== JSON.stringify(data)) { 
                      productsRef.current = JSON.stringify(data); 
                      setProducts(data);
                      persistToFolder('products', data); 
                  }
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'products')); 
          }
          
          const custQuery = q('customers');
          if (custQuery) {
              unsubCusts = onSnapshot(custQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)); 
                  if (customersRef.current !== JSON.stringify(data)) { 
                      customersRef.current = JSON.stringify(data); 
                      setCustomers(data);
                      persistToFolder('customers', data); 
                  }
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'customers')); 
          }
          
          const salesQuery = q('sales');
          if (salesQuery) {
              unsubSales = onSnapshot(salesQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale)); 
                  if (salesRef.current !== JSON.stringify(data)) { 
                      salesRef.current = JSON.stringify(data); 
                      setSales(data);
                      persistToFolder('sales', data); 
                  }
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'sales')); 
          }
          
          const cashTransQuery = q('cash_transactions');
          if (cashTransQuery) {
              unsubCashTrans = onSnapshot(cashTransQuery, (snap) => {
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashTransaction));
                  setCashTransactions(data);
                  setLocalData(LOCAL_KEYS.CASH_TRANSACTIONS, data);
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'cash_transactions'));
          }

          const cashSessionsQuery = q('cash_sessions');
          if (cashSessionsQuery) {
              unsubCashSession = onSnapshot(cashSessionsQuery, (snap) => {
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashSession));
                  setCashSessions(data);
                  setLocalData(LOCAL_KEYS.CASH_SESSIONS, data);
                  // Find the active session for the current user
                  const activeSession = data.find(s => s.userId === currentUser.id && s.status === 'aberto');
                  setCashSession(activeSession || null);
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'cash_sessions'));
          }
          
          // UPDATED: Smarter Merge for Financial Records to prevent missing data
          const finQuery = q('financialRecords');
          if (finQuery) {
              unsubFin = onSnapshot(finQuery, (snap) => { 
                  const cloudRecords = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as FinancialRecord)); 
                  
                  setFinancialRecords(prev => {
                      // Fix for previous test data that saved as "Outros"
                      cloudRecords.forEach(r => {
                          if (r.history) {
                              r.history.forEach(h => {
                                  if (h.note && h.note.includes('(Outros)')) {
                                      h.note = h.note.replace('(Outros)', '(Dinheiro)');
                                  }
                              });
                          }
                      });
                      const cloudMap = new Map(cloudRecords.map(r => [r.id, r]));
                      
                      // Helper to identify unique records ignoring ID (which changes from Local to Cloud)
                      const getSig = (r: FinancialRecord) => `${r.documentNumber || ''}|${r.description}|${r.type}|${r.dueDate}`;
                      const cloudSignatures = new Set(cloudRecords.map(r => getSig(r)));
    
                      // Keep records from PREV that are NOT in Cloud (by ID) AND don't have a matching signature (duplicate check)
                      const preservedLocal = prev.filter(local => {
                          if (cloudMap.has(local.id)) return false;
                          if (cloudSignatures.has(getSig(local))) return false;
                          return true;
                      });
    
                      // Merge Cloud + Preserved Local (Optimistic updates)
                      // Sort by Date Descending
                      const merged = [...cloudRecords, ...preservedLocal];
                      const sorted = merged.sort((a, b) => new Date(b.date || b.dueDate).getTime() - new Date(a.date || a.dueDate).getTime());
                      persistToFolder('finance', sorted);
                      return sorted;
                  });
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'financialRecords'));
          }

          const suppQuery = q('suppliers');
          if (suppQuery) {
              unsubSupp = onSnapshot(suppQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Supplier)); 
                  setSuppliers(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'suppliers')); 
          }

          const brandsQuery = q('brands');
          if (brandsQuery) {
              unsubBrands = onSnapshot(brandsQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Brand)); 
                  setBrands(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'brands')); 
          }
          
          const companiesQuery = q('companies');
          if (companiesQuery) {
              unsubCompanies = onSnapshot(companiesQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Company)); 
                  setCompanies(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'companies')); 
          }

          const settlementsQuery = q('debtSettlements');
          if (settlementsQuery) {
              unsubCompanies = onSnapshot(settlementsQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as DebtSettlement)); 
                  setDebtSettlements(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'debtSettlements')); 
          }
          
          const msgsQuery = q('messages');
          if (msgsQuery) {
              unsubMsgs = onSnapshot(msgsQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MessageTemplate)); 
                  setMessageTemplates(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'messages')); 
          }
          
          const rafflesQuery = q('raffles');
          if (rafflesQuery) {
              unsubRaffles = onSnapshot(rafflesQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Raffle)); 
                  setRaffles(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'raffles')); 
          }

          const campaignsQuery = q('raffle_campaigns');
          if (campaignsQuery) {
              unsubRaffleCampaigns = onSnapshot(campaignsQuery, (snap) => { 
                  const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as RaffleCampaign)); 
                  setRaffleCampaigns(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev); 
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'raffle_campaigns')); 
          }

          // Subscribe to platform plans - MOVED to top level effect to ensure it runs for all users
          let unsubPlatform = () => {};
          // Already handled in the top-level currentUser effect (lines 504-523)


          const settingsQuery = q('settings');
          if (settingsQuery) {
              unsubSettings = onSnapshot(settingsQuery, (snap) => { 
                  if (!snap.empty) { 
                      const { id, ...rest } = snap.docs[0].data(); 
                      const settingsData = { ...rest, id: snap.docs[0].id } as CompanySettings; 
                      if (!settingsData.customPlans) settingsData.customPlans = defaultPlans; 
                      const currentPlan = settingsData.customPlans?.find(p => p.key === currentUser.licenseKey) || defaultPlans.find(p => p.key === currentUser.licenseKey);
                      const hasPlanPermissionLocal = isAdmin || currentPlan?.cloudSyncAllowed === true || currentUser.allowedCloudSync === true;
                      if (!hasPlanPermissionLocal) { settingsData.cloudSyncEnabled = false; } 
                      const localLogo = getLocalImage(settingsData.ownerId!, 'logo'); 
                      if (localLogo) settingsData.logo = localLogo; 
                      setSettings(prev => JSON.stringify(prev) !== JSON.stringify(settingsData) ? settingsData : prev); 
                      setLocalData(LOCAL_KEYS.SETTINGS, [settingsData]); 
                      persistToFolder('settings', settingsData);
                  }
              }, (e) => handleFirestoreError(e, OperationType.LIST, 'settings')); 
          }
      } else { 
          setProducts(getLocalData<Product>(LOCAL_KEYS.PRODUCTS)); 
          setCustomers(getLocalData<Customer>(LOCAL_KEYS.CUSTOMERS)); 
          setSales(getLocalData<Sale>(LOCAL_KEYS.SALES)); 
          setFinancialRecords(getLocalData<FinancialRecord>(LOCAL_KEYS.FINANCE)); 
          setSuppliers(getLocalData<Supplier>(LOCAL_KEYS.SUPPLIERS)); 
          setBrands(getLocalData<Brand>(LOCAL_KEYS.BRANDS)); 
          setCompanies(getLocalData<Company>(LOCAL_KEYS.COMPANIES)); 
          setDebtSettlements(getLocalData<DebtSettlement>(LOCAL_KEYS.DEBT_SETTLEMENTS));
          setMessageTemplates(getLocalData<MessageTemplate>(LOCAL_KEYS.MESSAGES)); 
          setRaffles(getLocalData<Raffle>(LOCAL_KEYS.RAFFLES)); 
          const localSessions = getLocalData<CashSession>(LOCAL_KEYS.CASH_SESSIONS);
          setCashSessions(localSessions);
          setCashTransactions(getLocalData<CashTransaction>(LOCAL_KEYS.CASH_TRANSACTIONS));
          
          // Find active session for current user in local mode
          if (currentUser) {
              const activeSession = localSessions.find(s => s.userId === currentUser.id && s.status === 'aberto');
              setCashSession(activeSession || null);
          }
          
          const storedSettings = getLocalData<CompanySettings>(LOCAL_KEYS.SETTINGS)[0]; 
          const localSettings = storedSettings ? hydrateSettingsImages(storedSettings, currentOwnerId) : null;
          if (localSettings) { if (!localSettings.customPlans) localSettings.customPlans = defaultPlans; setSettings(localSettings); } else { setSettings(initialSettings); } 

      } 
      
      return () => { unsubProds(); unsubCusts(); unsubSales(); unsubFin(); unsubSupp(); unsubBrands(); unsubCompanies(); unsubMsgs(); unsubRaffles(); unsubRaffleCampaigns(); unsubSettings(); unsubCashTrans(); unsubCashSession(); unsubKeys(); unsubUsers(); if (typeof unsubPlatform === "function") unsubPlatform(); }; 
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isAdmin, isCloudSync]);

  // Admin: recupera as logos salvas online (Lovable Cloud) em qualquer dispositivo
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (!uid) return;
        const { data } = await supabase.from('settings').select('general_settings').eq('owner_id', uid).maybeSingle();
        const remote: any = data?.general_settings;
        if (cancelled || !remote) return;
        setSettings(prev => {
          const next = { ...prev };
          if (remote.logo) next.logo = remote.logo;
          if (remote.splashLogo) next.splashLogo = remote.splashLogo;
          return next;
        });
      } catch (e) {
        console.warn('Falha ao carregar logos da nuvem (admin)', e);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, currentUser?.id]);


  const cleanupOldData = async (options: { revenues: boolean, payables: boolean, sales: boolean, forceAll?: boolean }) => { return { deletedSales: 0, deletedRecords: 0 }; };

  // --- CRUD ACTIONS ---
  // ... (Products, Sales, Customers, etc... Keep existing logic)
  const addProduct = async (p: Product) => { if (!currentUser) return; if (isCloudSync) { const {id, ...d} = p; try { const ref = await addDoc(collection(db,'products'),{...cleanForCloud(d), ownerId:currentOwnerId}); if(p.image && p.image.startsWith('data:')) saveLocalImage(ref.id, p.image, 'prod'); }catch(e){ console.error("Failed to add product", e); } } else { const newP = {...p, id:Date.now().toString(), ownerId:currentOwnerId}; const updated = [...products, newP]; setProducts(updated); setLocalData(LOCAL_KEYS.PRODUCTS, updated); persistToFolder('products', updated); if(p.image) saveLocalImage(newP.id, p.image, 'prod'); } };
  const updateProduct = async (p: Product) => { if (isCloudSync) { const {id,...d}=p; if(p.image && p.image.startsWith('data:')) { saveLocalImage(id,p.image,'prod'); } else { removeLocalImage(id, 'prod'); } try{await updateDoc(doc(db,'products',id),cleanForCloud(d));}catch(e){ console.error("Failed to update product", e); } } else { const newP = products.map(x=>x.id===p.id?p:x); setProducts(newP); setLocalData(LOCAL_KEYS.PRODUCTS, newP); persistToFolder('products', newP); if(p.image && p.image.startsWith('data:')) { saveLocalImage(p.id,p.image,'prod'); } else { removeLocalImage(p.id, 'prod'); } } };
  const removeProduct = async (id: string) => { if(isCloudSync){ try{await deleteDoc(doc(db,'products',id)); removeLocalImage(id,'prod');}catch(e){ console.error("Failed to remove product", e); } } else { const newP = products.filter(x=>x.id!==id); setProducts(newP); setLocalData(LOCAL_KEYS.PRODUCTS, newP); persistToFolder('products', newP); removeLocalImage(id,'prod'); } };
  
  // UPDATED addSale to ensure Financial Records appear instantly
  const addSale = async (s: Sale) => {
      const saleToSave = { 
          ...s, 
          id: s.id || `SALE-${Date.now()}`, 
          ownerId: currentOwnerId 
      };
      if (isCloudSync) {
          const { id, ...d } = saleToSave;
          await setDoc(doc(db, 'sales', saleToSave.id), { ...cleanForCloud(d), ownerId: currentOwnerId });
      } else {
          const updated = [saleToSave, ...sales];
          setSales(updated);
          setLocalData(LOCAL_KEYS.SALES, updated);
          persistToFolder('sales', updated);
      }

      // Link to Cash Session if open
      if (currentUser) {
          let activeSession = cashSession;
          
          // Check if session is from a different date
          if (activeSession) {
              const sessionDate = new Date(activeSession.openedAt).toLocaleDateString();
              const todayDate = new Date().toLocaleDateString();
              
              if (sessionDate !== todayDate) {
                  // Auto-close previous session and open a new one
                  const sessionTransactions = cashTransactions.filter(t => t.sessionId === activeSession!.id);
                  const currentBalance = sessionTransactions.reduce((acc, t) => {
                      if (t.type === 'saida') return acc - t.value;
                      return acc + t.value;
                  }, 0);
                  
                  await closeCashSession(currentBalance, currentBalance, activeSession.id);
                  const newSessionId = await openCashSession(currentBalance, activeSession.id, currentBalance);
                  
                  await addCashTransaction({
                      sessionId: newSessionId,
                      type: 'venda',
                      value: s.total,
                      description: `Venda #${s.id.slice(-6)}`,
                      operatorId: currentUser.id,
                      authorizedBy: currentUser.id,
                  });
                  
                  // Mark as handled
                  activeSession = null;
              }
          }

          if (activeSession) {
              await addCashTransaction({
                  sessionId: activeSession.id,
                  type: 'venda',
                  value: s.total,
                  description: `Venda #${s.id.slice(-6)}`,
                  operatorId: currentUser.id,
                  authorizedBy: currentUser.id,
              });
          }
      }
      const updatedProducts = [...products];
      const batchUpdates = []; 
      for (const item of s.items) {
          if (item.category === 'Planos' && (item as any).unlimitedStock !== false) continue;
          const productIndex = updatedProducts.findIndex(p => p.id === item.id);
          if (productIndex > -1) {
              const currentStock = updatedProducts[productIndex].stock;
              const newStock = currentStock - item.quantity;
              
              const productToUpdate = { ...updatedProducts[productIndex], stock: newStock };
              const variation = item.selectedSize || item.selectedColor || item.selectedNumber;
              let varUpdates = {};
              if (variation && productToUpdate.variationStock) {
                  const newVarStock = (productToUpdate.variationStock[variation] || 0) - item.quantity;
                  productToUpdate.variationStock = {
                      ...productToUpdate.variationStock,
                      [variation]: newVarStock
                  };
                  varUpdates = { [`variationStock.${variation}`]: newVarStock };
              }
              updatedProducts[productIndex] = productToUpdate;

              if (isCloudSync) {
                  batchUpdates.push(updateDoc(doc(db, 'products', item.id), { 
                      stock: newStock,
                      ...varUpdates
                  }));
              }
          }
      }
      setProducts(updatedProducts);
      if (!isCloudSync) {
          setLocalData(LOCAL_KEYS.PRODUCTS, updatedProducts);
          persistToFolder('products', updatedProducts);
      } else {
          try { await Promise.all(batchUpdates); } catch (e) { console.error("Failed to sync stock updates", e); }
      }
      // NEW: Update customer debt for 'A Prazo' payments
      // Now split into company debt (up to limit) and personal debt (excess)
      const termPayments = s.payments.filter(p => p.method === 'A Prazo');
      const termTotal = termPayments.reduce((acc, p) => acc + p.amount, 0);
      
      let companyDebt = 0;

      if (termTotal > 0 && s.customerId) {
          let personalDebt: number;
          const customer = customers.find(c => c.id === s.customerId);
          const company = customer?.companyId ? companies.find(comp => comp.id === customer.companyId) : null;
          
          if (customer) {
              if (company && typeof company.creditLimit === 'number') {
                  const currentCompanyDebt = customers.filter(c => c.companyId === company.id).reduce((acc, c) => acc + ((c.debt || 0) - (c.personalDebt || 0)), 0);
                  const availableCredit = Math.max(0, company.creditLimit - currentCompanyDebt);
                  
                  // NEW: Calculate how much of the term total is within the installment limit
                  const maxInst = company.paymentMethods.term.maxInstallments;
                  const instPayments = s.payments.filter(p => p.method === 'A Prazo');
                  const withinLimitAmount = instPayments
                      .filter(p => p.installmentNumber && p.installmentNumber <= maxInst)
                      .reduce((acc, p) => acc + p.amount, 0);
                  
                  // The company debt is the MINIMUM of (available credit) and (amount within installment limit)
                  companyDebt = Math.min(availableCredit, withinLimitAmount);
                  personalDebt = termTotal - companyDebt;
              } else {
                  personalDebt = termTotal;
              }
              
              // Update customer debt (total)
              const newDebt = (customer.debt || 0) + termTotal;
              // Update personal debt (excess)
              const newPersonalDebt = (customer.personalDebt || 0) + personalDebt;
              
              if (isCloudSync) {
                  updateDoc(doc(db, 'customers', customer.id), { 
                      debt: newDebt,
                      personalDebt: newPersonalDebt
                  }).catch(console.error);
              } else {
                  const updatedCustomers = customers.map(c => c.id === customer.id ? { ...c, debt: newDebt, personalDebt: newPersonalDebt } : c);
                  setCustomers(updatedCustomers);
                  setLocalData(LOCAL_KEYS.CUSTOMERS, updatedCustomers);
                  persistToFolder('customers', updatedCustomers);
              }
          }
      }

      const newFinancialRecords: FinancialRecord[] = [];
      s.payments.forEach((payment, index) => {
          const isPaid = payment.method !== 'A Prazo';
          const dueDate = payment.dueDate || s.date;
          
          if (payment.method === 'A Prazo') {
              const customer = s.customerId ? customers.find(c => c.id === s.customerId) : null;
              const company = customer?.companyId ? companies.find(comp => comp.id === customer.companyId) : null;
              
              const isExceedingInstallmentLimit = company && payment.installmentNumber && payment.installmentNumber > company.paymentMethods.term.maxInstallments;
              const installmentText = (payment.installmentNumber && payment.totalInstallments && payment.totalInstallments > 1) ? ` (${payment.installmentNumber}/${payment.totalInstallments})` : '';

              if (companyDebt > 0 && !isExceedingInstallmentLimit) {
                  const companyAmount = Math.min(payment.amount, companyDebt);
                  const personalAmount = payment.amount - companyAmount;
                  
                  // Create Company Record
                  newFinancialRecords.push({
                      id: `${s.id}_pay_${index}_comp_${Date.now()}`,
                      ownerId: currentUser?.id,
                      documentNumber: s.id,
                      description: (s.unregisteredCustomer ? `Venda #${s.id} (Dívida Empresa) (Venda Sem Cadastro)` : `Venda #${s.id} (Dívida Empresa)`) + installmentText,
                      amount: companyAmount,
                      originalAmount: companyAmount,
                      type: 'company_receivable',
                      dueDate: normalizeDate(dueDate),
                      status: 'pending',
                      entityName: s.unregisteredCustomer ? s.unregisteredCustomer.name : (s.customerId ? (customers.find(c => c.id === s.customerId)?.name || 'Cliente') : 'Cliente Balcão'),
                      history: []
                  });
                  
                  companyDebt -= companyAmount;

                  // Create Personal Record if there's excess
                  if (personalAmount > 0) {
                      newFinancialRecords.push({
                          id: `${s.id}_pay_${index}_pers_${Date.now()}`,
                          ownerId: currentUser?.id,
                          documentNumber: s.id,
                          description: (s.unregisteredCustomer ? `Venda #${s.id} (Dívida Pessoal) (Venda Sem Cadastro)` : `Venda #${s.id} (Dívida Pessoal)`) + installmentText,
                          amount: personalAmount,
                          originalAmount: personalAmount,
                          type: 'personal_receivable',
                          dueDate: normalizeDate(dueDate),
                          status: 'pending',
                          entityName: s.unregisteredCustomer ? s.unregisteredCustomer.name : (s.customerId ? (customers.find(c => c.id === s.customerId)?.name || 'Cliente') : 'Cliente Balcão'),
                          history: []
                      });
                  }
              } else {
                  // Entirely Personal
                  newFinancialRecords.push({
                      id: `${s.id}_pay_${index}_pers_${Date.now()}`,
                      ownerId: currentUser?.id,
                      documentNumber: s.id,
                      description: (s.unregisteredCustomer ? `Venda #${s.id} (Dívida Pessoal) (Venda Sem Cadastro)` : `Venda #${s.id} (Dívida Pessoal)`) + installmentText,
                      amount: payment.amount,
                      originalAmount: payment.amount,
                      type: 'personal_receivable',
                      dueDate: normalizeDate(dueDate),
                      status: 'pending',
                      entityName: s.unregisteredCustomer ? s.unregisteredCustomer.name : (s.customerId ? (customers.find(c => c.id === s.customerId)?.name || 'Cliente') : 'Cliente Balcão'),
                      history: []
                  });
              }
          } else {
              // Non-TERM payment
              newFinancialRecords.push({
                  id: `${s.id}_pay_${index}_${Date.now()}`,
                  ownerId: currentUser?.id,
                  documentNumber: s.id,
                  description: s.unregisteredCustomer ? `Venda #${s.id} (${payment.method}) (Venda Sem Cadastro)` : `Venda #${s.id} (${payment.method})`,
                  amount: payment.amount,
                  originalAmount: payment.amount,
                  type: 'receivable',
                  dueDate: normalizeDate(dueDate),
                  status: isPaid ? 'paid' : 'pending',
                  entityName: s.unregisteredCustomer ? s.unregisteredCustomer.name : (s.customerId ? (customers.find(c => c.id === s.customerId)?.name || 'Cliente') : 'Cliente Balcão'),
                  history: isPaid ? [{ date: s.date, amount: payment.amount, note: 'Pagamento à vista' }] : []
              });
          }
      });

      // ALWAYS UPDATE STATE (OPTIMISTIC)
      setFinancialRecords(prev => [...prev, ...newFinancialRecords]);

      if (isCloudSync) {
          newFinancialRecords.forEach(record => {
             setDoc(doc(db, 'financialRecords', record.id), { 
                 ...cleanForCloud(record), 
                 ownerId: currentOwnerId,
                 dueDate: record.dueDate
             }).catch(console.error);
          });
      } else {
          const currentFinance = getLocalData<FinancialRecord>(LOCAL_KEYS.FINANCE);
          const updatedFinance = [...currentFinance, ...newFinancialRecords];
          setLocalData(LOCAL_KEYS.FINANCE, updatedFinance);
      }
  };

  const updateSale = async (updatedSale: Sale) => {
    setSales(prev => {
      const updated = prev.map(s => s.id === updatedSale.id ? updatedSale : s);
      if (!isCloudSync) {
        setLocalData(LOCAL_KEYS.SALES, updated);
      }
      return updated;
    });

    if (isCloudSync) {
      try {
        await updateDoc(doc(db, 'sales', updatedSale.id), cleanForCloud(updatedSale));
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'sales');
      }
    }
  };

  const addCustomer = async (c:Customer) => { if(isCloudSync){const {id,...d}=c; await addDoc(collection(db,'customers'),{...cleanForCloud(d),ownerId:currentOwnerId});}else{const n={...c,id:Date.now().toString(),ownerId:currentOwnerId}; const updated = [...customers,n]; setCustomers(updated); setLocalData(LOCAL_KEYS.CUSTOMERS,updated); persistToFolder('customers', updated); }};
  const updateCustomer = async (c:Customer) => { if(isCloudSync){const {id,...d}=c; await updateDoc(doc(db,'customers',id),cleanForCloud(d));}else{const n=customers.map(x=>x.id===c.id?c:x); setCustomers(n); setLocalData(LOCAL_KEYS.CUSTOMERS,n); persistToFolder('customers', n); }};
  const removeCustomer = async (id:string) => { if(isCloudSync){await deleteDoc(doc(db,'customers',id));}else{const n=customers.filter(x=>x.id!==id); setCustomers(n); setLocalData(LOCAL_KEYS.CUSTOMERS,n); persistToFolder('customers', n); }};
  const addSupplier = async (s:Supplier) => { if(isCloudSync){const {id,...d}=s; await addDoc(collection(db,'suppliers'),{...cleanForCloud(d),ownerId:currentOwnerId});}else{const n={...s,id:Date.now().toString(),ownerId:currentOwnerId}; const updated = [...suppliers,n]; setSuppliers(updated); setLocalData(LOCAL_KEYS.SUPPLIERS,updated); persistToFolder('suppliers', updated); }};
  const updateSupplier = async (s:Supplier) => { if(isCloudSync){const {id,...d}=s; await updateDoc(doc(db,'suppliers',id),cleanForCloud(d));}else{const n=suppliers.map(x=>x.id===s.id?s:x); setSuppliers(n); setLocalData(LOCAL_KEYS.SUPPLIERS,n); persistToFolder('suppliers', n); }};
  const removeSupplier = async (id:string) => { if(isCloudSync){await deleteDoc(doc(db,'suppliers',id));}else{const n=suppliers.filter(x=>x.id!==id); setSuppliers(n); setLocalData(LOCAL_KEYS.SUPPLIERS,n); persistToFolder('suppliers', n); }};
  const addBrand = async (b:Brand) => { if(isCloudSync){const {id,...d}=b; await addDoc(collection(db,'brands'),{...cleanForCloud(d),ownerId:currentOwnerId});}else{const n={...b,id:Date.now().toString(),ownerId:currentOwnerId}; const updated = [...brands,n]; setBrands(updated); setLocalData(LOCAL_KEYS.BRANDS,updated); persistToFolder('brands', updated); }};
  const updateBrand = async (b:Brand) => { if(isCloudSync){const {id,...d}=b; await updateDoc(doc(db,'brands',id),cleanForCloud(d));}else{const n=brands.map(x=>x.id===b.id?b:x); setBrands(n); setLocalData(LOCAL_KEYS.BRANDS,n); persistToFolder('brands', n); }};
  const removeBrand = async (id:string) => { if(isCloudSync){await deleteDoc(doc(db,'brands',id));}else{const n=brands.filter(x=>x.id!==id); setBrands(n); setLocalData(LOCAL_KEYS.BRANDS,n); persistToFolder('brands', n); }};
  const addCompany = async (c:Company) => { if(isCloudSync){const {id,...d}=c; await addDoc(collection(db,'companies'),{...cleanForCloud(d),ownerId:currentOwnerId});}else{const n={...c,id:Date.now().toString(),ownerId:currentOwnerId}; const updated = [...companies,n]; setCompanies(updated); setLocalData(LOCAL_KEYS.COMPANIES,updated); persistToFolder('companies', updated); }};
  const updateCompany = async (c:Company) => { if(isCloudSync){const {id,...d}=c; await updateDoc(doc(db,'companies',id),cleanForCloud(d));}else{const n=companies.map(x=>x.id===c.id?c:x); setCompanies(n); setLocalData(LOCAL_KEYS.COMPANIES,n); persistToFolder('companies', n); }};
  const removeCompany = async (id:string) => { if(isCloudSync){await deleteDoc(doc(db,'companies',id));}else{const n=companies.filter(x=>x.id!==id); setCompanies(n); setLocalData(LOCAL_KEYS.COMPANIES,n); persistToFolder('companies', n); }};
  const addFinancialRecord = async (r: FinancialRecord) => {
    const recordWithFixedDate = { ...r, dueDate: normalizeDate(r.dueDate) };
    const recordToSave = { ...recordWithFixedDate, id: r.id || Date.now().toString(), ownerId: currentOwnerId };

    setFinancialRecords(prev => {
      const updated = [...prev, recordToSave];
      if (!isCloudSync) {
        setLocalData(LOCAL_KEYS.FINANCE, updated);
        persistToFolder('financialRecords', updated);
      }
      return updated;
    });

    if (isCloudSync) {
      const { id, ...d } = recordToSave;
      await addDoc(collection(db, 'financialRecords'), { ...cleanForCloud(d), ownerId: currentOwnerId });
    }
  };
  const updateFinancialRecord = async (id:string,d:Partial<FinancialRecord>) => { if(isCloudSync){await updateDoc(doc(db,'financialRecords',id),cleanForCloud(d));}else{const n=financialRecords.map(x=>x.id===id?{...x,...d}:x); setFinancialRecords(n); setLocalData(LOCAL_KEYS.FINANCE,n); persistToFolder('financialRecords', n); }};
  const removeFinancialRecord = async (id:string) => { if(isCloudSync){await deleteDoc(doc(db,'financialRecords',id));}else{const n=financialRecords.filter(x=>x.id!==id); setFinancialRecords(n); setLocalData(LOCAL_KEYS.FINANCE,n); persistToFolder('financialRecords', n); }};
  const removeFinancialGroup = async (docNum:string) => { if(isCloudSync){const d=financialRecords.filter(r=>r.documentNumber===docNum); d.forEach(async r=>await deleteDoc(doc(db,'financialRecords',r.id)));}else{const n=financialRecords.filter(x=>x.documentNumber!==docNum); setFinancialRecords(n); setLocalData(LOCAL_KEYS.FINANCE,n); persistToFolder('financialRecords', n); }};
  
  const registerPayment = async (id:string, amount:number, method?: string, interestAmount: number = 0, discountAmount: number = 0) => { 
      const rec = financialRecords.find(r=>r.id===id); 
      if(!rec) return; 
      
      const principalPaid = amount - interestAmount;
      // Calculate remaining amount: record.amount - principalPaid - discountAmount
      const remaining = rec.amount - principalPaid - discountAmount;
      const nAmt = Math.max(0, remaining); 
      const st = nAmt <= 0.01 ? 'paid' : 'partial'; 
      
      let note = `Pagamento Realizado (${method || 'Dinheiro'})`;
      if (interestAmount > 0) note += ` - Juros: R$ ${interestAmount.toFixed(2)}`;
      if (discountAmount > 0) note += ` - Desconto: R$ ${discountAmount.toFixed(2)}`;
      
      const newHistoryItem: PaymentHistory = { date: new Date().toISOString(), amount: amount, note, method: method || 'Dinheiro' };
      const hist = [...(rec.history || []), newHistoryItem]; 
      const up = {amount: nAmt, status: st as any, history: hist}; 
      
      // Total reduction from customer debt = amount + discountAmount
      const totalReduction = amount + discountAmount;
      
      if(isCloudSync){ 
          await updateDoc(doc(db,'financialRecords',id), up); 
          if(rec.type==='receivable' || rec.type === 'personal_receivable' || rec.type === 'company_receivable'){
              const c=customers.find(x=>x.name===rec.entityName); 
              if(c&&c.id!=='def') {
                  const newDebt = Math.max(0, c.debt - totalReduction);
                  const newPersonalDebt = (rec.type === 'receivable' || rec.type === 'personal_receivable') 
                      ? Math.max(0, (c.personalDebt || 0) - totalReduction)
                      : (c.personalDebt || 0);
                  await updateDoc(doc(db,'customers',c.id),{debt: newDebt, personalDebt: newPersonalDebt});
              }
          }
      } else { 
          const n=financialRecords.map(x=>x.id===id?{...x,...up}:x); 
          setFinancialRecords(n); 
          setLocalData(LOCAL_KEYS.FINANCE,n); 
          persistToFolder('financialRecords', n);
          if(rec.type==='receivable' || rec.type === 'personal_receivable' || rec.type === 'company_receivable'){
              const c=customers.find(x=>x.name===rec.entityName); 
              if(c&&c.id!=='def'){
                  const newDebt = Math.max(0, c.debt - totalReduction);
                  const newPersonalDebt = (rec.type === 'receivable' || rec.type === 'personal_receivable') 
                      ? Math.max(0, (c.personalDebt || 0) - totalReduction)
                      : (c.personalDebt || 0);
                  const nc=customers.map(x=>x.id===c.id?{...x, debt: newDebt, personalDebt: newPersonalDebt}:x); 
                  setCustomers(nc); 
                  setLocalData(LOCAL_KEYS.CUSTOMERS,nc);
                  persistToFolder('customers', nc);
              }
          }
      }
  };

  const registerSplitPayment = async (id: string, splits: { method: string; amount: number; interestAmount?: number }[]) => {
      const rec = financialRecords.find(r => r.id === id);
      if (!rec || !splits || splits.length === 0) return;

      const totalPrincipalPaid = splits.reduce((acc, s) => acc + (s.amount - (s.interestAmount || 0)), 0);
      const totalAmountPaid = splits.reduce((acc, s) => acc + s.amount, 0);
      const remaining = Math.max(0, rec.amount - totalPrincipalPaid);
      const st = remaining <= 0.01 ? 'paid' : 'partial';

      const newHistoryItems: PaymentHistory[] = splits.map(s => {
          let note = `Pagamento Realizado (${s.method || 'Dinheiro'})`;
          if (s.interestAmount && s.interestAmount > 0) note += ` - Juros: R$ ${s.interestAmount.toFixed(2)}`;
          return {
              date: new Date().toISOString(),
              amount: s.amount,
              note,
              method: s.method || 'Dinheiro'
          };
      });

      const hist = [...(rec.history || []), ...newHistoryItems];
      const up = { amount: remaining, status: st as any, history: hist };

      if (isCloudSync) {
          await updateDoc(doc(db, 'financialRecords', id), up);
          if (rec.type === 'receivable' || rec.type === 'personal_receivable' || rec.type === 'company_receivable') {
              const c = customers.find(x => x.name === rec.entityName);
              if (c && c.id !== 'def') {
                  const newDebt = Math.max(0, c.debt - totalAmountPaid);
                  const newPersonalDebt = (rec.type === 'receivable' || rec.type === 'personal_receivable')
                      ? Math.max(0, (c.personalDebt || 0) - totalAmountPaid)
                      : (c.personalDebt || 0);
                  await updateDoc(doc(db, 'customers', c.id), { debt: newDebt, personalDebt: newPersonalDebt });
              }
          }
      } else {
          const n = financialRecords.map(x => x.id === id ? { ...x, ...up } : x);
          setFinancialRecords(n);
          setLocalData(LOCAL_KEYS.FINANCE, n);
          persistToFolder('finance', n);
          if (rec.type === 'receivable' || rec.type === 'personal_receivable' || rec.type === 'company_receivable') {
              const c = customers.find(x => x.name === rec.entityName);
              if (c && c.id !== 'def') {
                  const newDebt = Math.max(0, c.debt - totalAmountPaid);
                  const newPersonalDebt = (rec.type === 'receivable' || rec.type === 'personal_receivable')
                      ? Math.max(0, (c.personalDebt || 0) - totalAmountPaid)
                      : (c.personalDebt || 0);
                  const nc = customers.map(x => x.id === c.id ? { ...x, debt: newDebt, personalDebt: newPersonalDebt } : x);
                  setCustomers(nc);
                  setLocalData(LOCAL_KEYS.CUSTOMERS, nc);
                  persistToFolder('customers', nc);
              }
          }
      }
  };

  const clearCustomerDebt = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Recalculate true personal debt to fix any previous bugs
    const truePersonalDebt = financialRecords
        .filter(r => r.entityName === customer.name && r.type === 'personal_receivable' && r.status !== 'paid')
        .reduce((acc, r) => acc + r.amount, 0);

    // 1. Update customer debt (total and personal)
    const newTotalDebt = Math.max(0, (customer.debt || 0) - truePersonalDebt);
    const newPersonalDebt = 0;
    
    if (isCloudSync) {
      try {
        await updateDoc(doc(db, 'customers', customerId), { debt: newTotalDebt, personalDebt: newPersonalDebt });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `customers/${customerId}`);
      }
    } else {
      const updatedCustomers = customers.map(c => c.id === customerId ? { ...c, debt: newTotalDebt, personalDebt: newPersonalDebt } : c);
      setCustomers(updatedCustomers);
      setLocalData(LOCAL_KEYS.CUSTOMERS, updatedCustomers);
    }

    // 2. Mark all pending personal_receivable for this customer as paid
    const pendingRecords = financialRecords.filter(r => 
      r.type === 'personal_receivable' && 
      r.status !== 'paid' && 
      r.entityName === customer.name
    );

    const batchUpdates: Promise<void>[] = [];
    const updatedRecords = financialRecords.map(r => {
      if (pendingRecords.some(pr => pr.id === r.id)) {
        const up = { 
          amount: 0, 
          status: 'paid' as const, 
          history: [...(r.history || []), { date: new Date().toISOString(), amount: r.amount, note: 'Quitação total de dívida pessoal' }] 
        };
        if (isCloudSync) {
          batchUpdates.push(updateDoc(doc(db, 'financialRecords', r.id), up));
        }
        return { ...r, ...up };
      }
      return r;
    });

    if (!isCloudSync) {
      setFinancialRecords(updatedRecords);
      setLocalData(LOCAL_KEYS.FINANCE, updatedRecords);
    } else {
      try {
        await Promise.all(batchUpdates);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'financialRecords');
      }
    }
  };

  const clearCompanyDebt = async (companyId: string, discountAmount: number, netAmount: number) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    const companyCustomers = customers.filter(c => c.companyId === companyId);
    const companyCustomerIds = new Set(companyCustomers.map(c => c.id));
    
    // 1. Gather details for settlement history
    const settlementDetails: any[] = [];
    let totalGross = 0;

    companyCustomers.forEach(customer => {
        // Recalculate true personal debt to fix any previous bugs
        const truePersonalDebt = financialRecords
            .filter(r => r.entityName === customer.name && r.type === 'personal_receivable' && r.status !== 'paid')
            .reduce((acc, r) => acc + r.amount, 0);

        const companyDebtPortion = Math.max(0, (customer.debt || 0) - truePersonalDebt);
        if (companyDebtPortion > 0) {
            totalGross += companyDebtPortion;
            
            // Find sales that contribute to this debt
            const customerSales = sales.filter(s => s.customerId === customer.id && s.status === 'pending');
            
            settlementDetails.push({
                customerId: customer.id,
                customerName: customer.name,
                amount: companyDebtPortion,
                sales: customerSales.map(s => ({
                    saleId: s.id,
                    date: s.date,
                    total: s.total,
                    items: s.items.map(i => ({
                        name: i.name,
                        quantity: i.quantity,
                        price: i.price
                    }))
                }))
            });
        }
    });

    if (settlementDetails.length === 0) return;

    const settlement: DebtSettlement = {
        id: `SETTLE-${Date.now()}`,
        ownerId: currentOwnerId,
        companyId: company.id,
        companyName: company.name,
        date: new Date().toISOString(),
        totalAmount: totalGross,
        discountAmount: discountAmount,
        netAmount: netAmount,
        customersCount: settlementDetails.length,
        details: settlementDetails
    };

    // 2. Save settlement
    if (isCloudSync) {
        const { id, ...d } = settlement;
        await addDoc(collection(db, 'debtSettlements'), { ...cleanForCloud(d), ownerId: currentOwnerId });
    } else {
        const newSettlements = [settlement, ...debtSettlements];
        setDebtSettlements(newSettlements);
        setLocalData(LOCAL_KEYS.DEBT_SETTLEMENTS, newSettlements);
    }

    // 3. Update financial records of type 'company_receivable' to 'paid'
    const recordsToUpdate = financialRecords.filter(r => companyCustomers.some(c => c.name === r.entityName) && r.type === 'company_receivable' && r.status !== 'paid');
    
    const batchUpdates: Promise<void>[] = [];
    const updatedRecords = financialRecords.map(r => {
        if (recordsToUpdate.some(ru => ru.id === r.id)) {
            const up = { 
                amount: 0, 
                status: 'paid' as const, 
                history: [...(r.history || []), { date: new Date().toISOString(), amount: r.amount, note: 'Quitação total de dívida empresa' }] 
            };
            if (isCloudSync) {
                batchUpdates.push(updateDoc(doc(db, 'financialRecords', r.id), up));
            }
            return { ...r, ...up };
        }
        return r;
    });

    if (!isCloudSync) {
        setFinancialRecords(updatedRecords);
        setLocalData(LOCAL_KEYS.FINANCE, updatedRecords);
    } else {
        try {
            await Promise.all(batchUpdates);
        } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, 'financialRecords');
        }
    }
    
    // 4. Update sales status
    const salesToUpdate = sales.filter(s => s.customerId && companyCustomerIds.has(s.customerId) && s.status === 'pending');
    const updatedSales = sales.map(s => {
        if (salesToUpdate.some(su => su.id === s.id)) {
            if (isCloudSync) {
                updateDoc(doc(db, 'sales', s.id), { status: 'paid' });
            }
            return { ...s, status: 'paid' as const };
        }
        return s;
    });
    if (!isCloudSync) {
        setSales(updatedSales);
        setLocalData(LOCAL_KEYS.SALES, updatedSales);
    }

    // 5. Update customers debt
    let currentUpdatedCustomers = [...customers];
    for (const customer of companyCustomers) {
        // Recalculate true personal debt to fix any previous bugs
        const truePersonalDebt = financialRecords
            .filter(r => r.entityName === customer.name && r.type === 'personal_receivable' && r.status !== 'paid')
            .reduce((acc, r) => acc + r.amount, 0);

        const companyDebtPortion = Math.max(0, (customer.debt || 0) - truePersonalDebt);
        const newTotalDebt = Math.max(0, (customer.debt || 0) - companyDebtPortion);
        
        // If the new total debt is 0, ensure personal debt is also 0
        const newPersonalDebt = newTotalDebt === 0 ? 0 : truePersonalDebt;
        
        if (isCloudSync) {
            await updateDoc(doc(db, 'customers', customer.id), { debt: newTotalDebt, personalDebt: newPersonalDebt });
        } else {
            currentUpdatedCustomers = currentUpdatedCustomers.map(c => c.id === customer.id ? { ...c, debt: newTotalDebt, personalDebt: newPersonalDebt } : c);
        }
    }
    if (!isCloudSync) {
        setCustomers(currentUpdatedCustomers);
        setLocalData(LOCAL_KEYS.CUSTOMERS, currentUpdatedCustomers);
    }
  };

  const removeDebtSettlement = async (id: string) => {
    if (isCloudSync) {
        try {
            await deleteDoc(doc(db, 'debtSettlements', id));
        } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `debtSettlements/${id}`);
        }
    } else {
        const n = debtSettlements.filter(x => x.id !== id);
        setDebtSettlements(n);
        setLocalData(LOCAL_KEYS.DEBT_SETTLEMENTS, n);
        persistToFolder('debtSettlements', n);
    }
  };

  const addMessageTemplate = async (m: MessageTemplate) => { if (isCloudSync) { const { id, ...d } = m; await addDoc(collection(db, 'messages'), { ...cleanForCloud(d), ownerId: currentOwnerId }); } else { const n = { ...m, id: Date.now().toString(), ownerId: currentOwnerId }; const newList = [...messageTemplates, n]; setMessageTemplates(newList); setLocalData(LOCAL_KEYS.MESSAGES, newList); persistToFolder('messages', newList); } };
  const updateMessageTemplate = async (m: MessageTemplate) => { if (isCloudSync) { const { id, ...d } = m; await updateDoc(doc(db, 'messages', id), cleanForCloud(d)); } else { const n = messageTemplates.map(x => x.id === m.id ? m : x); setMessageTemplates(n); setLocalData(LOCAL_KEYS.MESSAGES, n); persistToFolder('messages', n); } };
  const removeMessageTemplate = async (id: string) => { if (isCloudSync) { await deleteDoc(doc(db, 'messages', id)); } else { const n = messageTemplates.filter(x => x.id !== id); setMessageTemplates(n); setLocalData(LOCAL_KEYS.MESSAGES, n); persistToFolder('messages', n); } };
  const addRaffle = async (r: Raffle) => { if (isCloudSync) { const { id, ...d } = r; await addDoc(collection(db, 'raffles'), { ...cleanForCloud(d), ownerId: currentOwnerId }); } else { const n = { ...r, id: Date.now().toString(), ownerId: currentOwnerId }; const newList = [...raffles, n]; setRaffles(newList); setLocalData(LOCAL_KEYS.RAFFLES, newList); persistToFolder('raffles', newList); } };

  // New Raffle Campaign CRUD
  const addRaffleCampaign = async (c: Omit<RaffleCampaign, 'id' | 'createdAt' | 'tenantId' | 'ownerId'>) => {
    const newCampaign: RaffleCampaign = { ...c, id: Date.now().toString(), createdAt: new Date().toISOString(), tenantId: currentUser?.tenantId || '', ownerId: currentOwnerId || '' };
    if (isCloudSync) {
      const { id, ...d } = newCampaign;
      await addDoc(collection(db, 'raffle_campaigns'), { ...cleanForCloud(d), ownerId: currentOwnerId });
    } else {
      const newList = [...raffleCampaigns, newCampaign];
      setRaffleCampaigns(newList);
      setLocalData(LOCAL_KEYS.RAFFLE_CAMPAIGNS, newList);
      persistToFolder('raffle_campaigns', newList);
    }
  };
  const updateRaffleCampaign = async (id: string, c: Partial<RaffleCampaign>) => {
    if (isCloudSync) {
      await updateDoc(doc(db, 'raffle_campaigns', id), cleanForCloud(c));
    } else {
      const newList = raffleCampaigns.map(x => x.id === id ? { ...x, ...c } : x);
      setRaffleCampaigns(newList);
      setLocalData(LOCAL_KEYS.RAFFLE_CAMPAIGNS, newList);
      persistToFolder('raffle_campaigns', newList);
    }
  };
  const deleteRaffleCampaign = async (id: string) => {
    if (isCloudSync) {
      await deleteDoc(doc(db, 'raffle_campaigns', id));
    } else {
      const newList = raffleCampaigns.filter(x => x.id !== id);
      setRaffleCampaigns(newList);
      setLocalData(LOCAL_KEYS.RAFFLE_CAMPAIGNS, newList);
      persistToFolder('raffle_campaigns', newList);
    }
  };
  
  // FIX: Update Settings with Cloud Push
  const updateSettings = async (s:CompanySettings) => { 
      // NEW: If Admin updates settings, and it includes customPlans, sync to PLATFORM_PLANS
      if ((isAdmin || currentUser?.role === 'AdminGeral') && s.customPlans) {
          try {
              await setDoc(doc(db, "settings", "PLATFORM_PLANS"), { 
                  plans: s.customPlans,
                  updatedAt: new Date().toISOString(),
                  updatedBy: currentUser?.username || 'admin'
              }, { merge: true });
              console.log("PLATFORM_PLANS updated/synced to Firestore");
          } catch (e) {
              console.error("Error updating PLATFORM_PLANS:", e);
          }
      }
      
      const ownerKey = currentOwnerId || 'unknown';

      // Logos: base64 fica em chave própria (evita estourar o localStorage e perder o restante)
      if (isDataImage(s.logo)) {
          saveLocalImage(ownerKey, s.logo, 'logo');
      } else {
          removeLocalImage(ownerKey, 'logo');
      }
      if (isDataImage(s.splashLogo)) {
          saveLocalImage(ownerKey, s.splashLogo, 'splash');
      } else {
          removeLocalImage(ownerKey, 'splash');
      }

      setSettings(s);
      setLocalData(LOCAL_KEYS.SETTINGS, [stripSettingsImages(s)]);
      // Modo local (rodando pelo projeto no PC): salva tudo, inclusive as logos, na pasta do projeto
      persistToFolder('settings', [s]);

      // Somente o administrador salva as logos online (Lovable Cloud)
      if (isAdmin) {
          try {
              const { supabase } = await import('@/integrations/supabase/client');
              const { data: authData } = await supabase.auth.getUser();
              const uid = authData?.user?.id;
              if (uid) {
                  await supabase.from('settings').upsert({
                      owner_id: uid,
                      general_settings: { logo: s.logo || null, splashLogo: s.splashLogo || null, name: s.name || null },
                      updated_at: new Date().toISOString(),
                  }, { onConflict: 'owner_id' });
              }
          } catch (e) {
              console.warn('Falha ao salvar logos na nuvem (admin)', e);
          }
      }

      
      if(currentOwnerId && (isCloudSync || s.cloudSyncEnabled)) {
          const {id,...d}=s; 
          const q=query(collection(db,'settings'),where('ownerId','==',currentOwnerId)); 
          const snap=await getDocs(q); 
          if(snap.empty){
              await addDoc(collection(db,'settings'),{...cleanForCloud(d),ownerId:currentOwnerId});
          }else{
              await updateDoc(doc(db,'settings',snap.docs[0].id),cleanForCloud(d));
          }
      }
  };

  const clearLocalData = () => { setProducts([]); setCustomers([]); setSales([]); setFinancialRecords([]); setSuppliers([]); setBrands([]); setMessageTemplates([]); setRaffles([]); setLocalData(LOCAL_KEYS.PRODUCTS, []); setLocalData(LOCAL_KEYS.CUSTOMERS, []); setLocalData(LOCAL_KEYS.SALES, []); setLocalData(LOCAL_KEYS.FINANCE, []); setLocalData(LOCAL_KEYS.SUPPLIERS, []); setLocalData(LOCAL_KEYS.BRANDS, []); setLocalData(LOCAL_KEYS.MESSAGES, []); setLocalData(LOCAL_KEYS.RAFFLES, []); };
  const uploadLocalDataToCloud = async () => { 
    if (!currentOwnerId) return; 
    const collections = ['products', 'customers', 'sales', 'financialRecords', 'suppliers', 'brands', 'messages', 'raffles']; 
    for (const colName of collections) { 
        const q = query(collection(db, colName), where('ownerId', '==', currentOwnerId)); 
        const snapshot = await getDocs(q); 
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref)); 
        await Promise.all(deletePromises); 
    } 
    const upload = async (col: string, data: any[]) => { 
        const promises = data.map(item => { 
            const { id, ...rest } = item; 
            const cleanItem = cleanForCloud(rest); 
            return addDoc(collection(db, col), { ...cleanItem, ownerId: currentOwnerId }); 
        }); 
        await Promise.all(promises); 
    }; 
    await upload('products', products); 
    await upload('customers', customers); 
    await upload('sales', sales); 
    await upload('financialRecords', financialRecords); 
    await upload('suppliers', suppliers); 
    await upload('brands', brands); 
    await upload('messages', messageTemplates); 
    await upload('raffles', raffles); 
    const newSettings = { ...settings, cloudSyncEnabled: true }; 
    setSettings(newSettings); 
    const q = query(collection(db, 'settings'), where('ownerId', '==', currentOwnerId)); 
    const snap = await getDocs(q); 
    const cleanData = cleanForCloud({ ...newSettings, ownerId: currentOwnerId }); 
    if (snap.empty) { 
        await addDoc(collection(db, 'settings'), cleanData); 
    } else { 
        await updateDoc(doc(db, 'settings', snap.docs[0].id), cleanData); 
    } 
  };
  const saveCloudDataToLocal = () => { setLocalData(LOCAL_KEYS.PRODUCTS, products); setLocalData(LOCAL_KEYS.CUSTOMERS, customers); setLocalData(LOCAL_KEYS.SALES, sales); setLocalData(LOCAL_KEYS.FINANCE, financialRecords); setLocalData(LOCAL_KEYS.SUPPLIERS, suppliers); setLocalData(LOCAL_KEYS.BRANDS, brands); setLocalData(LOCAL_KEYS.MESSAGES, messageTemplates); setLocalData(LOCAL_KEYS.RAFFLES, raffles); const localSettings = { ...settings, cloudSyncEnabled: false }; setLocalData(LOCAL_KEYS.SETTINGS, [localSettings]); };
  const backupData = async (): Promise<string> => { if (!currentUser) throw new Error("Usuário não autenticado"); const payload = { products, customers, sales, financialRecords, suppliers, brands, settings, messageTemplates, raffles, meta: { date: new Date().toISOString(), user: currentUser.username, password: currentUser.password, version: '1.2.0' } }; return encryptDataWithCryptoJS(payload); };
  const restoreData = async (content: string, passwordInput: string): Promise<{ isCloud: boolean }> => { try { const data = decryptDataWithCryptoJS(content); if (!data || !data.products) throw new Error("Arquivo inválido"); if (data.meta && data.meta.password) { if (data.meta.password !== passwordInput) { throw new Error("A senha informada não é compatível com a senha deste backup."); } } setProducts(data.products || []); setCustomers(data.customers || []); setSales(data.sales || []); setFinancialRecords(data.financialRecords || []); setSuppliers(data.suppliers || []); setBrands(data.brands || []); setMessageTemplates(data.messageTemplates || []); setRaffles(data.raffles || []); if (data.settings) setSettings(data.settings); saveCloudDataToLocal(); return { isCloud: false }; } catch (e: any) { console.error(e); if (e.message.includes("senha informada não é compatível")) { throw e; } throw new Error(e.message || "Falha ao restaurar. Verifique o arquivo.", { cause: e }); } };
  const autoLogin = async (token: string) => {
      try {
          if (!token) return { success: false, message: 'Token não fornecido' };
          
          const q = query(collection(db, 'users'), where('autoLoginToken', '==', token));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
              return { success: false, message: 'Link inválido ou expirado' };
          }
          
          const userDoc = querySnapshot.docs[0];
          const userData = { ...userDoc.data(), id: userDoc.id } as User;
          
          // Log them in
           await updateDoc(doc(db, 'users', userData.id), {isOnline: true, lastLogin: new Date().toISOString()});
           setCurrentUser(userData);
           return { success: true, user: userData };

          localStorage.setItem('current_session_soft', JSON.stringify(userData));
          
          return { success: true, user: userData };
      } catch (e: any) {
          console.error("Auto login error", e);
          return { success: false, message: 'Erro ao validar token' };
      }
  };

  const login = async (u:string, p?:string, storeSlug?:string) => { 
    if (!u) return { success: false };
    try { 
        let emailToUse = u;
        let requiresPasswordChange = false;
        let tempPassword = '';
        
        // Try to find the email and temp password in user_logins
        try {
            if (!u.includes('@')) {
                let loginDoc = await getDoc(doc(db, 'user_logins', u));
                
                if (!loginDoc.exists()) {
                    loginDoc = await getDoc(doc(db, 'user_logins', u.toLowerCase()));
                }
                
                if (!loginDoc.exists()) {
                    // One last try for capitalized version
                    loginDoc = await getDoc(doc(db, 'user_logins', u.charAt(0).toUpperCase() + u.slice(1).toLowerCase()));
                }
                
                if (loginDoc.exists()) {
                    const data = loginDoc.data();
                    emailToUse = data.email;
                    if (data.requiresPasswordChange && data.tempPassword) {
                        requiresPasswordChange = true;
                        tempPassword = data.tempPassword;
                    }
                } else if (u.toLowerCase() === 'coutinho') {
                    emailToUse = 'mcn.coutinho@gmail.com';
                } else {
                    // Try to query users collection directly (might fail if not authenticated, but we can try)
                    const q = query(collection(db,'users'),where('username','==',u)); 
                    const s = await getDocs(q);
                    if (!s.empty) {
                        emailToUse = s.docs[0].data().email;
                    }
                }
            } else {
                // It's an email, let's query user_logins by email to see if it requires password change
                const q = query(collection(db, 'user_logins'), where('email', '==', u));
                const s = await getDocs(q);
                if (!s.empty) {
                    const data = s.docs[0].data();
                    if (data.requiresPasswordChange && data.tempPassword) {
                        requiresPasswordChange = true;
                        tempPassword = data.tempPassword;
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch username mapping", e);
        }
        
        // Try to authenticate
        let authSuccess = false;
        let passwordToUse = p || '';
        
        if (requiresPasswordChange && tempPassword) {
            passwordToUse = tempPassword;
        }

        if (!passwordToUse) {
            return { success: false };
        }

        try {
            await signInWithEmailAndPassword(auth, emailToUse, passwordToUse);
            authSuccess = true;
        } catch (e) {
            console.warn("Login failed via Firebase Auth. Trying local check...", e);
        }

        
        if (!authSuccess) {
            // If Firebase Auth failed, try local password check (only works if we can read the users collection)
            try {
                const q = query(collection(db,'users'),where('email','==',emailToUse)); 
                const s = await getDocs(q);
                if (!s.empty) {
                    const d = {...s.docs[0].data(),id:s.docs[0].id} as User;
                    if (d.password === passwordToUse) {
                        authSuccess = true;
                    }
                }
            } catch (e) {
                console.warn("Could not fetch user for local password check", e);
            }

            // --- CHECK TEMP PASSWORD FOR CUSTOMERS (WITHOUT AUTH) ---
            if (!authSuccess && storeSlug) {
                try {
                    const custQ = query(collection(db, 'customers'), where('email', '==', emailToUse));
                    const custSnap = await getDocs(custQ);
                    if (!custSnap.empty) {
                        const custData = custSnap.docs[0].data() as Customer;
                        if (custData.tempPassword && custData.tempPassword === passwordToUse) {
                            const now = new Date();
                            const expires = custData.tempPasswordExpires ? new Date(custData.tempPasswordExpires) : null;
                            if (expires && now < expires) {
                                // Find store owner via slug to verify tenant
                                const storeQ = query(collection(db, 'settings'), where('username', '==', storeSlug));
                                const storeSnap = await getDocs(storeQ);
                                if (!storeSnap.empty) {
                                    const storeData = storeSnap.docs[0].data();
                                    const storeOwnerId = storeData.ownerId || storeSnap.docs[0].id;
                                    
                                    if (custData.ownerId === storeOwnerId) {
                                        // Valid temp password! Create a temporary session.
                                        const tempUser: User = {
                                            id: custSnap.docs[0].id,
                                            username: custData.name,
                                            email: custData.email,
                                            role: 'Cliente',
                                            ownerId: storeOwnerId,
                                            tenantId: storeOwnerId,
                                            licenseKey: 'FREE-VERSION'
                                        };
                                        
                                        setCurrentUser(tempUser);
                                        localStorage.setItem('current_session_soft', JSON.stringify(tempUser));
                                        window.location.href = `/l/${storeOwnerId}`;
                                        return { success: true, user: tempUser };
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("Temp password check error", err);
                }
            }
        }

        
        if (authSuccess) {
            // Now we should be authenticated, or we bypassed it. Let's fetch the user data.
            const q = query(collection(db,'users'),where('email','==',emailToUse)); 
            const s = await getDocs(q);
            if (!s.empty) {
                const d = {...s.docs[0].data(),id:s.docs[0].id} as User;

                // Restrição de Loja / Tenant Isolation
                const isGlobalAdmin = d.role === 'AdminGeral' || d.role === 'admin' || d.username?.toLowerCase() === 'coutinho';
                
                // Fetch store slug if it exists
                let storeSlugFromSettings = '';
                if (d.ownerId || d.tenantId) {
                    const settingsId = d.role === 'DonoLoja' ? d.id : (d.tenantId || d.ownerId);
                    if (settingsId) {
                        const settingsDoc = await getDoc(doc(db, 'settings', settingsId));
                        if (settingsDoc.exists()) {
                            storeSlugFromSettings = settingsDoc.data().username || '';
                        }
                    }
                }

                // If a storeSlug is provided, we match the user's ownerId/tenantId with the store's ownerId
                if (!isGlobalAdmin && storeSlug) {
                    const storeQ = query(collection(db, 'settings'), where('username', '==', storeSlug));
                    const storeSnap = await getDocs(storeQ);
                    if (!storeSnap.empty) {
                        const storeData = storeSnap.docs[0].data();
                        const storeOwnerId = storeData.ownerId || storeSnap.docs[0].id;
                        if (d.ownerId !== storeOwnerId && d.tenantId !== storeOwnerId) {
                            return { success: false, message: 'Usuário não pertence a esta loja.' };
                        }
                    }
                }
                
                if (requiresPasswordChange) {
                    return { success: true, requiresPasswordChange: true, user: d };
                }

                updateDoc(doc(db,'users',d.id),{isOnline:true,lastLogin:new Date().toISOString()}); 
                
                // Create user_logins document if it doesn't exist
                if (d.username) {
                    setDoc(doc(db, 'user_logins', d.username), { email: d.email }, { merge: true }).catch(console.error);
                }
                
                setCurrentUser(d); 
                localStorage.setItem('current_session_soft',JSON.stringify(d)); 

                if (isGlobalAdmin) {
                    window.location.href = '/dashboard';
                } else if (d.role === 'DonoLoja') {
                    // Garantir que o Dono de Loja seja redirecionado para seu próprio link de loja
                    const slug = storeSlugFromSettings || d.id;
                    window.location.href = `/${slug}/dashboard`;
                } else if (d.role === 'Cliente' && d.tenantId) {
                    const slug = storeSlugFromSettings || d.tenantId;
                    window.location.href = `/${slug}/vitrine`;
                } else if (d.tenantId) {
                    // Employees (Vendedor, etc.) go to POS by default in their store
                    const slug = storeSlugFromSettings || d.tenantId;
                    window.location.href = `/${slug}/pos`;
                } else {
                    window.location.href = '/dashboard';
                }

                return { success: true, user: d }; 
            }
        }

        
        return { success: false }; 
    } catch(e) { 
        console.error("Login error", e);
        return { success: false }; 
    } 
  };

  const setupNewPassword = async (newPassword: string, user: User) => {
      try {
          if (auth.currentUser) {
              await updatePassword(auth.currentUser, newPassword);
          }
          
          await updateDoc(doc(db, 'users', user.id), { 
              password: newPassword,
              isOnline: true,
              lastLogin: new Date().toISOString()
          });
          
          if (user.username) {
              await setDoc(doc(db, 'user_logins', user.username), { 
                  requiresPasswordChange: false,
                  tempPassword: null
              }, { merge: true });
          }
          
          const updatedUser = { ...user, password: newPassword, isOnline: true };
          setCurrentUser(updatedUser);
          localStorage.setItem('current_session_soft', JSON.stringify(updatedUser));
          
          return { success: true, message: 'Senha configurada com sucesso' };
      } catch (e: any) {
          console.error("Error setting up new password:", e);
          return { success: false, message: e.message || 'Erro ao configurar nova senha' };
      }
  };
  const logout = async () => { 
    const prevUser = currentUser;
    if(currentUser && currentUser.id !== 'guest_user') try{await updateDoc(doc(db,'users',currentUser.id),{isOnline:false});}catch(e){ console.error("Failed to update online status", e); } 
    await signOut(auth); 
    localStorage.removeItem('current_session_soft'); 
    localStorage.removeItem(CACHED_USER_KEY); 
    
    if (settings.loginEnabled === false) { 
        const guestUser: User = { id: 'guest_user', username: 'Vendedor (Visitante)', email: '', role: 'user', isOnline: true, history: [], licenseKey: 'FREE-VERSION' }; 
        setCurrentUser(guestUser); 
    } else { 
        setCurrentUser(null); 
    }

    // Sistema 100% local: sempre volta para a Landing Page
    window.location.href = '/';
  };
  const registerUser = async (u:any, storeSlug?: string) => { 
    try { 
        const userEmail = u.email || `${u.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@smartpdv.local`;
        const res = await createUserWithEmailAndPassword(auth, userEmail, u.password); 
        
        let ownerId = res.user.uid;
        let tenantId = res.user.uid;
        let role: UserRole = 'Vendedor';
        let permissions = { canAccessPOS: true, canAccessInventory: false, canAccessCustomers: false, canAccessFinanceiro: false, canAccessReports: false, canAccessMessages: true, canManageUsers: false, visibility: true, companyData: false, userData: false, dataRetention: false, dashboardVisual: true, sidebarConfig: false, printerConfig: true, posConfig: true, backupRestore: false, cloudSync: false, license: false, plans: false, support: false };

        // If registering within a specific store context, they become a 'Cliente' of that store
        if (storeSlug) {
            const storeQ = query(collection(db, 'settings'), where('username', '==', storeSlug));
            const storeSnap = await getDocs(storeQ);
            if (!storeSnap.empty) {
                const storeData = storeSnap.docs[0].data();
                ownerId = storeData.ownerId || storeSnap.docs[0].id;
                tenantId = ownerId;
                role = 'Cliente';
                permissions = { ...permissions, canAccessPOS: false, canAccessCustomers: false, canAccessFinanceiro: false, canAccessInventory: false, canAccessReports: false };

            }
        }

        const n: User = { 
            id: res.user.uid, 
            ownerId,
            tenantId,
            username: u.username, 
            email: userEmail, 
            password: u.password, 
            role, 
            isOnline: true, 
            history: [{ action: 'Cadastro de Usuário', date: new Date().toISOString() }], 
            licenseKey: 'FREE-TRIAL', 
            licenseExpiry: new Date(Date.now()+259200000).toISOString(), 
            allowedCloudSync: false, 
            createdAt: new Date(), 
            permissions 
        }; 
        await setDoc(doc(db,'users',n.id),n); 
        await setDoc(doc(db, 'user_logins', u.username), { email: userEmail }); 
        return {success:true, message:'Sucesso'}; 
    } catch(e:any) { 
        console.error("Registration Error:", e); 
        if (e.code === 'auth/email-already-in-use') return {success:false, message:'Email em uso'}; 
        return {success:false, message: e.message || 'Erro ao criar conta'}; 
    } 
  };


  const generateStoreSlug = async (name: string) => {
    let slug = name.toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) slug = 'loja';

    const q = query(collection(db, 'settings'), where('username', '==', slug));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const serial = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${serial}`;
    }

    return slug;
  };

  const publicRegisterStoreOwner = async (userData: any, token?: string) => {
    try {
        if (token) {
            const isValid = await validateInviteLink(token);
            if (!isValid) return { success: false, message: 'Link de convite inválido ou expirado.' };
        }

        const userEmail = userData.email?.trim() || `${userData.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@smartpdv.local`;
        const res = await createUserWithEmailAndPassword(auth, userEmail, userData.password);
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12); // Cadastro dura 12 horas (teste)

        const newUser: User = {
            id: res.user.uid,
            ownerId: res.user.uid, 
            tenantId: res.user.uid,
            name: userData.name || userData.username,
            username: userData.username,
            loginIdentifier: userEmail,
            email: userEmail,
            role: 'DonoLoja',
            licenseKey: 'FREE-TRIAL',
            licenseExpiry: expiresAt.toISOString(),

            permissions: {
                canAccessPOS: true,
                canAccessInventory: true,
                canAccessCustomers: true,
                canAccessFinanceiro: true,
                canAccessReports: true,
                canAccessMessages: true,
                canManageUsers: true,
                visibility: true,
                companyData: true,
                userData: true,
                dataRetention: true,
                dashboardVisual: true,
                sidebarConfig: true,
                printerConfig: true,
                posConfig: true,
                backupRestore: true,
                cloudSync: true,
                license: true,
                plans: true,
                support: true
            },
            createdAt: new Date(),
            isOnline: true, // They will be signed in
            history: [{ action: 'Cadastro de Lojista via Convite', date: new Date().toISOString() }],
            allowedCloudSync: false

        };
        await setDoc(doc(db, 'users', newUser.id), newUser);

        const slug = await generateStoreSlug(userData.companyName || userData.username);

        const companySettings: CompanySettings = {
            ...initialSettings,
            ownerId: newUser.id,
            name: userData.companyName,
            username: slug, // Guardar o slug amigável
            phone: userData.phone,
            address: userData.address
        };
        await setDoc(doc(db, 'settings', newUser.id), cleanForCloud(companySettings));
        
        if (userData.username) {
            await setDoc(doc(db, 'user_logins', userData.username), { email: userEmail, requiresPasswordChange: false });
        }


        if (token) {
            await updateDoc(doc(db, 'invites', token), { used: true, usedBy: res.user.uid });
        }

        
        // No need to signOut since they should stay logged in after registering.
        
        return { success: true, message: 'Conta criada com sucesso' };
    } catch (e: any) {
        console.error("Error creating store owner:", e);
        return { success: false, message: e.message || 'Erro ao criar conta' };
    }
  };

  const generateInviteLink = async () => {
    try {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Link agora dura 24 horas (1 dia)

        await setDoc(doc(db, 'invites', token), {
            token,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            used: false
        });

        const link = `${window.location.origin}/register-store-owner?token=${token}`;
        return { success: true, link };
    } catch (e: any) {
        return { success: false, message: e.message || 'Erro ao gerar link' };
    }
  };


  const validateInviteLink = async (token: string) => {
    try {
        const docRef = await getDoc(doc(db, 'invites', token));
        if (!docRef.exists()) return false;
        const data = docRef.data();
        if (data.used) return false;
        
        const expiresAt = new Date(data.expiresAt);
        if (new Date() > expiresAt) return false;
        
        return true;
    } catch (e) {
        return false;
    }
  };

  const adminGenerateAutoLoginToken = async (userId: string) => {
    try {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { autoLoginToken: token });
        
        const link = `${window.location.origin}/#/autologin?token=${token}`;
        return { success: true, link };
    } catch (e: any) {
        return { success: false, message: e.message || 'Erro ao gerar link de auto-login' };
    }
  };

  const adminCreateStoreOwner = async (userData: any) => {
    try {
        const userEmail = userData.email?.trim() || `${userData.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@smartpdv.local`;
        const res = await createUserWithEmailAndPassword(secondaryAuth, userEmail, userData.password);
        const newUser: User = {
            id: res.user.uid,
            ownerId: res.user.uid, // Dono da loja é dono de si mesmo
            tenantId: res.user.uid,
            name: userData.name || userData.username,
            username: userData.username,
            loginIdentifier: userEmail,
            email: userEmail,
            role: 'DonoLoja',
            permissions: {
                canAccessPOS: true,
                canAccessInventory: true,
                canAccessCustomers: true,
                canAccessFinanceiro: true,
                canAccessReports: true,
                canAccessMessages: true,
                canManageUsers: true,
                visibility: true,
                companyData: true,
                userData: true,
                dataRetention: true,
                dashboardVisual: true,
                sidebarConfig: true,
                printerConfig: true,
                posConfig: true,
                backupRestore: true,
                cloudSync: true,
                license: true,
                plans: true,
                support: true
            },
            createdAt: new Date(),
            isOnline: false,
            history: []
        };
        await setDoc(doc(db, 'users', newUser.id), newUser);
        const slug = await generateStoreSlug(userData.companyName || userData.username);

        const companySettings: CompanySettings = {
            ...initialSettings,
            ownerId: newUser.id,
            name: userData.companyName,
            username: slug, // Slug amigável
            phone: userData.phone,
            address: userData.address
        };
        await setDoc(doc(db, 'settings', newUser.id), {
            ...companySettings,
            customPlans: settings.customPlans || defaultPlans
        });
        
        if (userData.username) {
            await setDoc(doc(db, 'user_logins', userData.username), { email: userData.email });
        }
        
        // Sign out the secondary auth to prevent any issues
        await signOut(secondaryAuth);
        
        return { success: true, message: 'Dono de loja criado com sucesso' };
    } catch (e: any) {
        console.error("Error creating store owner:", e);
        return { success: false, message: e.message || 'Erro ao criar dono de loja' };
    }
  };

  const updateEmployee = async (employeeId: string, employeeData: any) => {
    if (!currentUser) return { success: false, message: 'Usuário não autenticado' };
    try {
        const userRef = doc(db, 'users', employeeId);
        const updateData: Partial<User> = {
            name: employeeData.name,
            username: employeeData.username,
            role: employeeData.role,
            permissions: employeeData.permissions,
            allowedCloudSync: employeeData.permissions.cloudSync || false,
            forcedCashOpening: employeeData.forcedCashOpening
        };
        await updateDoc(userRef, updateData);
        
        if (employeeData.username && employeeData.email) {
            await setDoc(doc(db, 'user_logins', employeeData.username), { email: employeeData.email }, { merge: true });
        }
        
        return { success: true, message: 'Funcionário atualizado com sucesso' };
    } catch (e: any) {
        console.error("Error updating employee:", e);
        return { success: false, message: e.message || 'Erro ao atualizar funcionário' };
    }
  };

  const createEmployee = async (employeeData: any) => {
    if (!currentUser) return { success: false, message: 'Usuário não autenticado' };
    try {
        const isPasswordEmpty = !employeeData.password;
        const tempPassword = isPasswordEmpty ? Math.random().toString(36).slice(-8) + 'A1!' : employeeData.password;
        
        const res = await createUserWithEmailAndPassword(secondaryAuth, employeeData.email, tempPassword);
        const newEmployee: User = {
            id: res.user.uid,
            ownerId: currentUser.tenantId || currentUser.id, // O dono da loja é o owner
            tenantId: currentUser.tenantId || currentUser.id,
            name: employeeData.name,
            username: employeeData.username,
            loginIdentifier: employeeData.email, // Default to email, can be updated
            email: employeeData.email,
            role: employeeData.role,
            permissions: employeeData.permissions,
            forcedCashOpening: employeeData.forcedCashOpening,
            allowedCloudSync: employeeData.permissions.cloudSync || false,
            createdAt: new Date(),
            isOnline: false,
            history: []
        };
        await setDoc(doc(db, 'users', newEmployee.id), newEmployee);
        
        if (employeeData.username) {
            await setDoc(doc(db, 'user_logins', employeeData.username), { 
                email: employeeData.email,
                requiresPasswordChange: isPasswordEmpty,
                tempPassword: isPasswordEmpty ? tempPassword : null
            });
        }
        
        // Sign out the secondary auth
        await signOut(secondaryAuth);
        
        return { success: true, message: 'Funcionário criado com sucesso' };
    } catch (e: any) {
        console.error("Error creating employee:", e);
        let msg = e.message || 'Erro ao criar funcionário';
        if (e.code === 'auth/email-already-in-use') msg = 'Este email já está em uso por outro usuário.';
        if (e.code === 'auth/weak-password') msg = 'A senha deve ter pelo menos 6 caracteres.';
        if (e.code === 'auth/invalid-email') msg = 'O endereço de email é inválido.';
        return { success: false, message: msg };
    }
  };
  const resetUserPassword = async (u:string,e:string,np:string) => { 
    if (!u || !e) return {success:false, message: 'Dados incompletos'};
    try { 
        const q=query(collection(db,'users'),where('username','==',u),where('email','==',e)); 
        const s=await getDocs(q); 
        if(s.empty) return {success:false,message:'Dados incorretos'}; 
        await updateDoc(doc(db,'users',s.docs[0].id),{password:np}); 
        return {success:true,message:'Senha alterada'}; 
    } catch(err:any) { 
        return {success:false,message:err.message}; 
    } 
  };
  const adminResetCooldown = async (userId: string, type: 'NAME' | 'PASSWORD' | 'EMAIL') => { if (!isAdmin) return; const updates: any = {}; if (type === 'NAME') updates.lastUsernameChange = null; if (type === 'PASSWORD') updates.lastPasswordChange = null; if (type === 'EMAIL') updates.lastEmailChange = null; await updateDoc(doc(db, 'users', userId), updates); if (currentUser?.id === userId) { setCurrentUser(prev => prev ? ({ ...prev, ...updates }) : null); } };
  const updateUserCredentials = async (type: 'username' | 'password' | 'email', verification: { u?: string, e?: string, p?: string }, newValue: string) => { return {success:false, message:'Not implemented in snippet'}; };
  const updateUsername = () => false; 
  const adminDeleteUser = async (uid: string) => {
      try {
          const userToDelete = users.find(u => u.id === uid);
          if (!userToDelete) {
              console.error("User not found", uid);
              return;
          }
          
          // Check if current user is admin OR is the owner of the user to be deleted
          const isOwner = currentUser?.id === userToDelete.ownerId || currentUser?.id === userToDelete.tenantId;
          
          if (isAdmin || isOwner) {
              await deleteDoc(doc(db, 'users', uid));
          } else {
              console.error("Permission denied", currentUser?.id, userToDelete);
          }
      } catch (e) {
          console.error("Error deleting user", e);
      }
  };
  
  // NEW: Manual Cloud Sync Toggle by Admin
  const adminToggleUserSync = async (userId: string, status: boolean) => {
      if(!isAdmin) return;
      await updateDoc(doc(db, 'users', userId), { allowedCloudSync: status });
  };

  const adminToggleOfflineMode = async (userId: string, status: boolean) => {
      if(!isAdmin) return;
      await updateDoc(doc(db, 'users', userId), { 
          forceOfflineMode: status,
          // Se ativar o modo offline, desativa a nuvem compulsoriamente
          ...(status ? { allowedCloudSync: false } : {}) 
      });
  };

  const openCashSession = async (initialValue: number, previousSessionId?: string, previousSessionKeptAmount?: number): Promise<string> => {
      if (!currentUser) return '';
      
      // Do not allow opening a new session if one is already open for this user
      const existingSession = cashSessions.find(s => s.userId === currentUser.id && s.status === 'aberto');
      if (existingSession) {
          throw new Error("Você já possui um caixa aberto. É necessário fechá-lo antes de abrir um novo.");
      }
      
      const sessionId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const newSession: CashSession = {
          id: sessionId,
          userId: currentUser.id,
          tenantId: currentUser.tenantId || currentUser.ownerId || currentUser.id,
          ownerId: currentOwnerId || currentUser.id,
          status: 'aberto',
          openedAt: new Date().toISOString(),
          initialValue,
          previousSessionId,
          previousSessionKeptAmount
      };

      if (isCloudSync) {
          try {
              const { id, ...sessionData } = newSession;
              const docRef = await addDoc(collection(db, 'cash_sessions'), {
                  ...sessionData,
                  id: sessionId // Keep the generated ID
              });
              // If we want to use Firestore ID instead, we could, but user wants a visible ID
          } catch (error) {
              console.error("Error syncing cash session to cloud:", error);
          }
      }
      
      setCashSessions(prev => [newSession, ...prev]);
      setCashSession(newSession);
      if (!isCloudSync) setLocalData(LOCAL_KEYS.CASH_SESSIONS, [newSession, ...cashSessions]);

      // Add opening transaction
      await addCashTransaction({
          sessionId: newSession.id,
          type: 'abertura',
          value: initialValue,
          description: previousSessionId ? `Abertura de Caixa (Troco do Caixa ${previousSessionId})` : 'Abertura de Caixa',
          operatorId: currentUser.id,
          authorizedBy: currentUser.id
      });

      return newSession.id;
  };

  const closeCashSession = async (finalValue: number, keptAmount?: number, sessionId?: string) => {
      const sessionToClose = sessionId 
          ? cashSessions.find(s => s.id === sessionId)
          : cashSession;

      if (!sessionToClose || !currentUser) return;

      const updatedSession: CashSession = {
          ...sessionToClose,
          status: 'fechado',
          closedAt: new Date().toISOString(),
          finalValue,
          keptAmount
      };

      if (isCloudSync) {
          try {
              const q = query(collection(db, 'cash_sessions'), where('id', '==', sessionToClose.id));
              const snap = await getDocs(q);
              if (!snap.empty) {
                  await updateDoc(doc(db, 'cash_sessions', snap.docs[0].id), {
                      status: 'fechado',
                      closedAt: updatedSession.closedAt,
                      finalValue: updatedSession.finalValue,
                      keptAmount: updatedSession.keptAmount || 0
                  });
              }
          } catch (error) {
              console.error("Error syncing cash session closure to cloud:", error);
          }
      }

      setCashSessions(prev => prev.map(s => s.id === sessionToClose.id ? updatedSession : s));
      if (cashSession?.id === sessionToClose.id) {
          setCashSession(null);
      }
      if (!isCloudSync) {
          const updatedSessions = cashSessions.map(s => s.id === sessionToClose.id ? updatedSession : s);
          setLocalData(LOCAL_KEYS.CASH_SESSIONS, updatedSessions);
          persistToFolder('cash_sessions', updatedSessions);
      }
  };

  const addCashTransaction = async (transaction: Omit<CashTransaction, 'id' | 'timestamp' | 'tenantId'>) => {
      if (!currentUser) return;
      
      const newTransaction: CashTransaction = {
          ...transaction,
          id: Math.random().toString(36).substr(2, 9),
          tenantId: currentUser.tenantId || currentUser.ownerId || currentUser.id,
          ownerId: currentOwnerId || currentUser.id,
          timestamp: new Date().toISOString()
      };

      if (isCloudSync) {
          try {
              const { id, ...transactionData } = newTransaction;
              const docRef = await addDoc(collection(db, 'cash_transactions'), {
                  ...transactionData,
                  timestamp: serverTimestamp()
              });
              newTransaction.id = docRef.id;
          } catch (error) {
              console.error("Error syncing cash transaction to cloud:", error);
          }
      }

      setCashTransactions(prev => [newTransaction, ...prev]);
      if (!isCloudSync) {
          const updatedTransactions = [newTransaction, ...cashTransactions];
          setLocalData(LOCAL_KEYS.CASH_TRANSACTIONS, updatedTransactions);
          persistToFolder('cash_transactions', updatedTransactions);
      }
  };

  const generateLicenseKey = (t:LicenseType) => { const k=`KEY-${Date.now()}`; addDoc(collection(db,'licenseKeys'),{key:k,type:t,generatedBy:currentUser?.username,createdAt:new Date().toISOString(),isUsed:false}); return k; };
  const activateLicense = (k:string, u:string) => { 
      const l=licenseKeys.find(x=>x.key===k&&!x.isUsed); 
      const usr=users.find(x=>x.username===u); 
      if(!l||!usr) return {success:false, message:'Inválido'}; 
      
      if (usr.licenseExpiry && new Date(usr.licenseExpiry).getTime() > Date.now()) {
          const currentKeyData = licenseKeys.find(x => x.key === usr.licenseKey);
          if (currentKeyData && currentKeyData.type !== l.type) {
              return { success: false, message: 'Você já possui uma licença ativa de outro plano. Aguarde o vencimento para trocar de plano.' };
          }
      }

      let expiry: string | null = null; 
      let baseTime = Date.now();
      
      // If user has a valid expiry in the future, add to it
      if (usr.licenseExpiry) {
          const currentExpiry = new Date(usr.licenseExpiry).getTime();
          if (currentExpiry > baseTime) {
              baseTime = currentExpiry;
          }
      }

      const day = 24 * 60 * 60 * 1000; 
      if (l.type === 'monthly' || l.type === 'monthly_fidelity') expiry = new Date(baseTime + 30 * day).toISOString(); 
      else if (l.type === 'annual') expiry = new Date(baseTime + 365 * day).toISOString(); 
      else if (l.type === 'trial_30min') expiry = new Date(baseTime + 30 * 60 * 1000).toISOString(); 
      
      const isRenewal = usr.licenseKey && usr.licenseKey !== 'FREE-TRIAL' && usr.licenseExpiry && new Date(usr.licenseExpiry).getTime() > Date.now(); 
      const actionText = isRenewal ? "Renovação de Licença" : "Ativação de Licença"; 
      const historyEntry = { action: actionText, date: new Date().toISOString(), details: `Chave: ${k}. Ativado pelo próprio usuário. Validade: ${expiry ? new Date(expiry).toLocaleDateString() : 'Vitalício'}` }; 
      const newHistory = [historyEntry, ...(usr.history || [])]; 
      updateDoc(doc(db,'licenseKeys',l.key),{isUsed:true,usedBy:u}); 
      updateDoc(doc(db,'users',usr.id),{ licenseKey:k, licenseExpiry: expiry, history: newHistory }); 
      logAction( isRenewal ? "License Self-Renewal" : "License Self-Activation", `User ${u} activated key ${k}`, usr.id, u ); 
      return {success:true, message:'Ativado'}; 
  };

  const adminGenerateAndActivate = (t:LicenseType, uid:string) => { 
      if(!isAdmin) return {success:false, message:'Erro'}; 
      const targetUser = users.find(u => u.id === uid); 
      if (!targetUser) return { success: false, message: 'Usuário não encontrado' }; 

      if (targetUser.licenseExpiry && new Date(targetUser.licenseExpiry).getTime() > Date.now()) {
          const currentKeyData = licenseKeys.find(x => x.key === targetUser.licenseKey);
          if (currentKeyData && currentKeyData.type !== t) {
              return { success: false, message: 'O usuário já possui uma licença ativa de outro plano. Aguarde o vencimento para trocar de plano.' };
          }
      }

      const k=`ADM-${Date.now()}`; 
      let expiry: string | null = null; 
      let baseTime = Date.now();

      // If user has a valid expiry in the future, add to it
      if (targetUser.licenseExpiry) {
          const currentExpiry = new Date(targetUser.licenseExpiry).getTime();
          if (currentExpiry > baseTime) {
              baseTime = currentExpiry;
          }
      }

      const day = 24 * 60 * 60 * 1000; 
      if (t === 'monthly' || t === 'monthly_fidelity') expiry = new Date(baseTime + 30 * day).toISOString(); 
      else if (t === 'annual') expiry = new Date(baseTime + 365 * day).toISOString(); 
      else if (t === 'trial_30min') expiry = new Date(baseTime + 30 * 60 * 1000).toISOString(); 
      
      const isRenewal = targetUser.licenseKey && targetUser.licenseKey !== 'FREE-TRIAL' && targetUser.licenseExpiry && new Date(targetUser.licenseExpiry).getTime() > Date.now(); 
      const actionText = isRenewal ? "Renovação de Licença (Admin)" : "Ativação de Licença (Admin)"; 
      const historyEntry = { action: actionText, date: new Date().toISOString(), details: `Plano: ${t}. Ativado por Admin: ${currentUser?.username}. Validade: ${expiry ? new Date(expiry).toLocaleDateString() : 'Vitalício'}` }; 
      const newHistory = [historyEntry, ...(targetUser.history || [])]; 
      addDoc(collection(db,'licenseKeys'),{key:k,type:t,isUsed:true,usedBy:targetUser.username}); 
      updateDoc(doc(db,'users',uid),{ licenseKey:k, licenseExpiry: expiry, history: newHistory }); 
      logAction( isRenewal ? "License Renewed (Admin)" : "License Activated (Admin)", `Admin ${currentUser?.username} activated ${t} for user ${targetUser.username}`, uid, targetUser.username ); 
      return {success:true, message:'Ativado'}; 
  };
  
  const generateCustomerTempPassword = async (customerId: string) => {
    try {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return { success: false, message: 'Cliente não encontrado' };
        
        // Generate a random 8-character password
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
        let tempPassword = "";
        for (let i = 0; i < 8; i++) {
            tempPassword += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 3); // 3 hours
        
        const updatedCustomer = { 
            ...customer, 
            tempPassword, 
            tempPasswordExpires: expiresAt.toISOString() 
        };
        
        await updateCustomer(updatedCustomer);
        return { success: true, password: tempPassword, message: 'Senha temporária gerada!' };
    } catch (e: any) {
        console.error("Error generating temp password", e);
        return { success: false, message: 'Erro ao gerar senha temporária' };
    }
  };

  const changeCustomerPassword = async (customerId: string, newPassword: string) => {
    try {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return { success: false, message: 'Cliente não encontrado' };
        
        const updatedCustomer = { 
            ...customer, 
            password: newPassword, 
            tempPassword: '', 
            tempPasswordExpires: '' 
        };
        
        await updateCustomer(updatedCustomer);
        return { success: true, message: 'Senha alterada com sucesso!' };
    } catch (e: any) {
        console.error("Error changing customer password", e);
        return { success: false, message: 'Erro ao alterar senha' };
    }
  };

  
  if (!authInitialized) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">Carregando Sistema...</div>;

  return (
    <StoreContext.Provider value={{
      products, customers, sales, financialRecords, suppliers, brands, companies, settings, messageTemplates, raffles, raffleCampaigns,
      currentUser, currentOwnerId, authInitialized, users, licenseKeys, logs, isFreeVersion, isAdmin, isCloudSync, cashSessions, cashSession, cashTransactions, lastClosedSession,
      addRaffleCampaign, updateRaffleCampaign, deleteRaffleCampaign,
      addProduct, updateProduct, removeProduct, addSale, updateSale, addCustomer, updateCustomer, removeCustomer, 
      addSupplier, updateSupplier, removeSupplier, addBrand, updateBrand, removeBrand,
      addCompany, updateCompany, removeCompany,
      addFinancialRecord, updateFinancialRecord, removeFinancialRecord, removeFinancialGroup,
      registerPayment, registerSplitPayment, updateSettings, backupData, restoreData, saveCloudDataToLocal,
      login, autoLogin, logout, registerUser, publicRegisterStoreOwner, adminCreateStoreOwner, generateInviteLink, adminGenerateAutoLoginToken, validateInviteLink, createEmployee, updateEmployee, resetUserPassword, updateUserCredentials, updateUsername, setupNewPassword,
      generateLicenseKey, activateLicense, adminGenerateAndActivate, adminDeleteUser, adminResetCooldown,
      generateCustomerTempPassword, changeCustomerPassword,


      cleanupOldData, uploadLocalDataToCloud, clearLocalData,
      clearCustomerDebt, clearCompanyDebt, removeDebtSettlement, debtSettlements,
      addMessageTemplate, updateMessageTemplate, removeMessageTemplate, addRaffle, adminToggleUserSync, adminToggleOfflineMode,
      openCashSession, closeCashSession, addCashTransaction,
      effectiveUser,
      platformPlans: settings.customPlans || defaultPlans
    }}>
      {children}


    </StoreContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
