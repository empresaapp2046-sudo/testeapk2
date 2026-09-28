// @ts-nocheck

export enum PaymentMethod {
  CASH = 'Dinheiro',
  PIX = 'Pix',
  DEBIT = 'Débito',
  CREDIT = 'Crédito',
  TERM = 'A Prazo',
  MIXED = 'Múltiplos'
}

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
  dueDate?: string; 
  installments?: number; 
  installmentNumber?: number; 
  totalInstallments?: number; 
  interestRate?: number;
  interestAmount?: number;
}

// NEW: Company Interface
export interface Company {
  id: string;
  ownerId?: string;
  name: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string; // Default: 'isento'
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  description: string;
  paymentMethods: {
    pix: boolean;
    money: boolean;
    credit: boolean;
    debit: boolean;
    term: {
      enabled: boolean;
      maxInstallments: number;
    };
  };
  creditLimit: number; // NEW: Limite de compra a prazo
  presentationLetter?: string; // NEW: Texto personalizado da carta
  presentationLetterClauses?: string; // NEW: Cláusulas personalizadas
  corporateDiscount?: number; // NEW: Desconto para a empresa (ex: 20%)
  closingDay?: string; // NEW: Dia de fechamento da fatura
  dueDay?: string; // NEW: Dia de vencimento da fatura
  settlementHistory?: string[]; // NEW: IDs of debt settlements
}

export interface DebtSettlement {
  id: string;
  ownerId?: string;
  companyId: string;
  companyName: string;
  date: string;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  customersCount: number;
  details: {
    customerId: string;
    customerName: string;
    amount: number;
    sales: {
      saleId: string;
      date: string;
      total: number;
      items: {
        name: string;
        quantity: number;
        price: number;
      }[];
    }[];
  }[];
}

export interface RaffleWin {
  id: string;
  campaignId?: string;
  campaignTitle: string;
  prize?: string;
  drawDate: string;
  couponNumber?: string;
}

export interface Customer {
  id: string;
  ownerId?: string; // Firebase Isolation
  name: string;
  cpf?: string; 
  phone: string;
  email: string;
  debt: number;
  personalDebt?: number; // NEW: Dívida pessoal separada da empresa
  birthDate?: string; 
  registrationDate?: string; // NEW: Data de Cadastro Imutável
  street?: string;
  number?: string;
  apartment?: string;
  city?: string;
  state?: string;
  companyId?: string; // NEW: Association
  employeeId?: string; // NEW: Matrícula
  loyaltyCardNumber?: string; // NEW: Cartão Fidelidade
  password?: string; // NEW: Senha para compras vinculadas à empresa
  creditLimitEnabled?: boolean;
  creditLimit?: number;
  installmentLimit?: number;
  cardNumber?: string;
  raffleWins?: RaffleWin[]; // NEW: Permanent record of raffle prizes won
  tempPassword?: string;
  tempPasswordExpires?: string; // ISO date string
}

export interface Brand {
  id: string;
  ownerId?: string; // Firebase Isolation
  name: string;
}

export interface Supplier {
  id: string;
  ownerId?: string; // Firebase Isolation
  name: string;
  contact: string;
}

export interface Product {
  id: string;
  ownerId?: string; // Firebase Isolation
  code: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  brand: string; 
  supplierId?: string;
  image?: string;
  validityDays?: number; // Added for Plans
  bonusEnabled?: boolean; // Plans: optional bonus days
  bonusDays?: number; // Plans: extra days granted on sale
  unlimitedStock?: boolean; // Plans: unlimited stock (999999)

  // NEW: Vitrine Features
  showInVitrine?: boolean;
  sizes?: string[]; // e.g., ['P', 'M', 'G']
  colors?: string[]; // e.g., ['#FF0000', '#0000FF'] or names
  numbers?: string[]; // e.g., ['38', '39']
  // NEW: Promotion
  promotionActive?: boolean;
  // NEW: Variation Stock
  variationStock?: Record<string, number>;
  variationPrices?: Record<string, number>;
  variationCodes?: Record<string, string>;
  promotionalPrice?: number;
  promotionStartDate?: string;
  promotionEndDate?: string;
  variationPromotions?: Record<string, {
    promotionActive?: boolean;
    promotionalPrice?: number;
    promotionStartDate?: string;
    promotionEndDate?: string;
  }>;
}

export interface CartItem extends Product {
  quantity: number;
  isDiscountActive: boolean;
  discountValue: number;
  discountType: '%' | 'R$';
  selectedSize?: string;
  selectedColor?: string;
  selectedNumber?: string;
}

export interface UnregisteredCustomer {
  name: string;
  cpf?: string;
  phone?: string;
}

export interface RaffleCouponDetail {
  couponNumber: string;
  status: 'valid' | 'invalid';
  printedName?: string;
  printedPhone?: string;
  invalidatedAt?: string;
  invalidatedReason?: string;
  replacedByCoupon?: string;
  isReprint?: boolean;
}

export interface Sale {
  id: string;
  ownerId?: string; // Firebase Isolation
  customerId: string | null; 
  unregisteredCustomer?: UnregisteredCustomer; // NEW: For customers without registration
  items: CartItem[];
  total: number;
  discountTotal: number;
  interestTotal?: number;
  paymentMethod: string; 
  payments: SalePayment[]; 
  date: string;
  status: 'completed' | 'pending';
  planExpirationDate?: string; // NEW: Stores the calculated expiration date for Plans
  raffleCoupons?: string[]; // NEW: Valid coupons generated for a raffle campaign
  invalidRaffleCoupons?: string[]; // NEW: Cancelled/invalidated coupon numbers
  raffleCampaignId?: string; // NEW: ID of the raffle campaign
  raffleCouponDetails?: RaffleCouponDetail[]; // NEW: Detailed tracking of coupon status
}

export interface PaymentHistory {
  date: string;
  amount: number;
  note?: string;
  method?: string;
}

export interface FinancialRecord {
  id: string;
  ownerId?: string; // Firebase Isolation
  documentNumber?: string; // ID de Registro (Agrupamento de Conta)
  description: string;
  amount: number; 
  originalAmount: number; 
  type: 'receivable' | 'payable' | 'company_receivable' | 'personal_receivable';
  dueDate: string;
  status: 'paid' | 'pending' | 'partial';
  entityName: string; 
  history: PaymentHistory[];
}

export interface DashboardWidgetConfig {
  enabled: boolean;
  range: number; 
}

export interface SidebarConfig {
  backgroundColor: string;
  textColor: string;
  activeItemColor?: string; // Nova propriedade para cor do botão ativo
}

export interface DataRetentionConfig {
  revenues: number; // Months to keep (0 = forever)
  payables: number; // Months to keep (0 = forever)
  sales: number;    // Months to keep (0 = forever)
}

// NEW: Dynamic Plan Configuration
export interface PlanConfig {
  key: string; // 'monthly_basic', 'annual_eco', 'lifetime', 'fidelity'
  name: string;
  price: string;
  isVisible: boolean;
  features: string[];
  cloudSyncAllowed?: boolean; // NEW: Controls if this plan allows Firebase Sync
}

export interface MenuVisibilityConfig {
  dashboard: boolean;
  pos: boolean;
  companies: boolean;
  inventory: boolean;
  payables: boolean;
  finance: boolean;
  messages: boolean;
  raffles: boolean;
  cashReports: boolean;
  corporateReports: boolean;
  reports: boolean;
  settings: boolean;
}

export interface SettingsVisibilityConfig {
  notifications?: boolean;
  visibility: boolean; // NEW: Control visibility of the ADM section itself
  companyData: boolean;
  userData: boolean;
  dataRetention: boolean;
  dashboardVisual: boolean;
  sidebarConfig: boolean;
  printerConfig: boolean;
  posConfig: boolean; // NEW: Control visibility of POS settings
  backupRestore: boolean;
  cloudSync: boolean;
  license: boolean;
  plans: boolean;
  support: boolean; // Added support as it was missing but used in Settings.tsx
  notifications?: boolean;
}

export interface AboutUsField {
  id: string;
  title: string;
  text: string;
  image?: string;
  visible: boolean;
}

export interface AboutUsConfig {
  enabled: boolean;
  description: string;
  phone: string;
  address: string;
  fields: AboutUsField[];
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  selectedSound: string;
  alerts: {
    messages: boolean;
    payables: boolean;
    installments: boolean;
    lowStock: boolean;
  };
  installmentsAdvanceDays: number;
  alarmRepeat: 'none' | '5m' | '15m' | '1h';
}

export interface CompanySettings {
  id?: string; // Firestore ID
  ownerId?: string; // Firebase Isolation
  name: string;
  cnpj: string;
  stateRegistration: string;
  phone?: string; 
  whatsappVitrineEnabled?: boolean;
  whatsappVitrinePosition?: 'bottom' | 'top' | 'none';
  aboutUs?: AboutUsConfig;
  address: string;
  pixKey: string;
  whatsappMessageTemplate: string;
  logo?: string;
  splashLogo?: string; // NEW: Individual splash screen logo for each store
  notificationSettings?: NotificationSettings;
  loginEnabled?: boolean; // NEW: Controls if login screen is skipped
  cashRegisterEnabled?: boolean; // NEW: Controls if cash register opening/closing is enabled
  allowExceedCompanyInstallmentLimit?: boolean; // NEW: Permite parcelas além do limite da empresa
  posDisplayMode?: 'grid-photo' | 'list-detailed' | 'grid-compact' | 'list-photo'; // NEW: POS Display Mode
  
  profitSeparations?: { id: string; name: string; percentage: number; }[]; // NEW: Lucros separados (ex: Dízimo, Investimentos)
  
  // NEW: Vitrine Configuration
  vitrineConfig?: {
    availableSizes: string[];
    availableColors: string[];
    availableNumbers: string[];
    lowStockThreshold?: number;
  };

  labelConfig?: {
    paperType: 'A4' | 'custom';
    unit: 'cm' | 'mm';
    width: number; // For custom
    height: number; // For custom
    gapX?: number; // Distance between labels horizontally
    gapY?: number; // Distance between labels vertically
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    labelsPerRow: number; // For A4 and general grid definition
    rowsPerPage: number; // For A4
    showStoreName: boolean;
    showProductName: boolean;
    showVariations: boolean;
    showBarcode: boolean;
    showPrice: boolean;
    customText?: string;
    fieldOrder?: ('storeName' | 'productName' | 'variations' | 'barcode' | 'price' | 'customText')[];
  };

  dashboardWidgets: {
    sales: DashboardWidgetConfig;
    receivables: DashboardWidgetConfig;
    payables: DashboardWidgetConfig;
    alerts: DashboardWidgetConfig;
    birthdays: DashboardWidgetConfig;
    lists: boolean; 
  };
  printerConfig: {
    enabled: boolean;
    autoPrint: boolean;
    paperWidth: '58mm' | '80mm';
    printerName?: string;
    fillCustomerOnRaffleCoupon?: boolean;
  };
  enableScreenRecording?: boolean; // NEW: Controls whether screen recording (Live) option is enabled in Raffles
  licenseKey?: string;
  sidebarConfig?: SidebarConfig;
  backupRestorationCount?: number; // Contador de restaurações para segurança
  cloudSyncEnabled?: boolean; // NEW: Controls if data sync is active (requires specific plan)
  dataRetention?: DataRetentionConfig; // NEW: Auto-deletion settings
  customPlans?: PlanConfig[]; // NEW: Customizable plans list
  menuVisibility?: MenuVisibilityConfig; // NEW: Controls which menus are visible to non-admins
  settingsVisibility?: SettingsVisibilityConfig; // NEW: Controls which settings sections are visible to non-admins
  firebaseConfig?: any;
  supabaseConfig?: any;
}


// --- NOVOS TIPOS PARA AUTENTICAÇÃO E LICENÇAS ---

export type UserRole = 'AdminGeral' | 'DonoLoja' | 'Vendedor' | 'SubGerente';

export interface UserPermissions {
  canAccessPOS: boolean;
  canAccessInventory: boolean;
  
  // Inventory Sub-Permissions
  inventoryProductsView?: boolean;
  inventoryProductsEdit?: boolean;
  inventoryProductsDelete?: boolean;
  inventoryPlansView?: boolean;
  inventoryPlansEdit?: boolean;
  inventoryPlansDelete?: boolean;
  inventoryBrandsView?: boolean;
  inventoryBrandsEdit?: boolean;
  inventoryBrandsDelete?: boolean;
  inventorySuppliersView?: boolean;
  inventorySuppliersEdit?: boolean;
  inventorySuppliersDelete?: boolean;
  inventoryVitrineView?: boolean;
  inventoryVitrineEdit?: boolean;
  inventoryVitrineDelete?: boolean;
  
  canAccessCustomers: boolean;
  customersEdit?: boolean;
  customersDelete?: boolean;
  
  canAccessFinanceiro: boolean;
  financeiroEdit?: boolean;
  financeiroDelete?: boolean;
  
  canAccessReports: boolean;
  canAccessReportsCash?: boolean;
  canAccessReportsCorporate?: boolean;
  canAccessReportsAI?: boolean;
  
  canAccessMessages: boolean;
  messagesEdit?: boolean;
  messagesDelete?: boolean;
  
  canAccessRaffles: boolean;
  
  canManageUsers: boolean;
  usersEdit?: boolean;
  usersDelete?: boolean;
  
  // Finance Sub-Permissions
  financeiroOverview?: boolean;
  financeiroRevenues?: boolean;
  financeiroPlans?: boolean;
  financeiroExpenses?: boolean;
  
  // Dashboard Permissions
  dashboardVitrine?: boolean;
  dashboardVendas?: boolean;
  dashboardAReceber?: boolean;
  dashboardAPagar?: boolean;
  dashboardAlertas?: boolean;
  dashboardEstoqueBaixo?: boolean;
  dashboardAniversariantes?: boolean;
  dashboardProximosPagamentos?: boolean;
  
  // Visibilidade das Seções de Configurações
  visibility: boolean;
  companyData: boolean;
  userData: boolean;
  dataRetention: boolean;
  dashboardVisual: boolean;
  sidebarConfig: boolean;
  printerConfig: boolean;
  posConfig: boolean;
  backupRestore: boolean;
  cloudSync: boolean;
  license: boolean;
  plans: boolean;
  support: boolean;
  notifications?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  contact: {
    phone: string;
    email: string;
  };
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  planStatus: 'active' | 'suspended' | 'trial';
  createdAt: Date;
}

// ... existing interfaces ...

export interface CashSession {
  id: string;
  userId: string;
  tenantId: string;
  ownerId?: string;
  status: 'aberto' | 'fechado';
  openedAt: string;
  closedAt?: string;
  initialValue: number;
  finalValue?: number;
  keptAmount?: number; // Valor segurado para o próximo caixa
  previousSessionId?: string; // ID do caixa anterior de onde veio o troco inicial
  previousSessionKeptAmount?: number; // Valor que veio do caixa anterior
}

export interface CashTransaction {
  id: string;
  sessionId: string;
  tenantId: string;
  ownerId?: string;
  type: 'sangria' | 'suprimento' | 'venda' | 'abertura';
  value: number;
  description: string;
  operatorId: string;
  authorizedBy: string;
  timestamp: string;
}

export interface User {
  id: string;
  ownerId?: string; // NEW: Firebase Isolation
  tenantId: string; // NEW
  name: string;
  email: string;
  role: UserRole; // Updated
  permissions: UserPermissions; // NEW
  createdAt: Date; // NEW
  
  // Existing fields kept for compatibility
  username?: string;
  password?: string;
  licenseKey?: string;
  // Allow login with name or email
  loginIdentifier?: string;
  licenseExpiry?: string | null;
  lastLicenseActivation?: string;
  isOnline: boolean;
  lastLogin?: string;
  lastUsernameChange?: string | null;
  lastPasswordChange?: string | null;
  lastEmailChange?: string | null;
  allowedCloudSync?: boolean;
  forceOfflineMode?: boolean;
  autoLoginToken?: string; // NEW: Token for auto-login URL
  companyId?: string; // NEW: Association
  employeeId?: string; // NEW: Matrícula
  history: {
    action: string;
    date: string;
    details?: string;
  }[];
  forcedCashOpening?: boolean; // NEW: Forces the user to open a cash drawer for sales
}

export interface AppLog {
    id: string;
    ownerId?: string; // Firebase Isolation
    userId: string;
    username: string;
    action: string;
    details: string;
    timestamp: string;
}

// NEW: Message Template Interface
export interface MessageTemplate {
    id: string;
    ownerId?: string;
    title: string;
    category: string;
    content: string; // The description/body of the message
}

// NEW: Raffle Interface
export interface RaffleWinner {
    position: number;
    text: string;
}

export interface Raffle {
    id: string;
    ownerId?: string;
    type: 'clients' | 'numbers' | 'names';
    title?: string; // NEW: Custom Title (e.g., "Dia dos Pais")
    date: string;
    winner?: string; // Deprecated but kept for compatibility
    winners?: RaffleWinner[]; // NEW: Array of winners
    details?: string; // e.g., "Total participants: 50" or "Range: 1-100"
}

export interface CampaignPrize {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface CampaignWinner {
    customerId?: string;
    customerName: string;
    couponNumber: string;
    drawDate: string;
    customerPhone?: string;
    prizeId: string;
    prizeName: string;
    position: number; // 1 for 1st, 2 for 2nd, etc.
}

export interface RaffleCampaign {
    id: string;
    ownerId?: string; // Firebase Isolation
    title: string;
    prize: string; // Legacy field for single prize
    prizeImageUrl?: string; // Legacy field
    prizes?: CampaignPrize[]; // NEW: List of prizes
    winners?: CampaignWinner[]; // NEW: List of winners in order
    startDate: string;
    endDate: string;
    drawDate?: string;
    drawTime?: string; // NEW: Horário limite do sorteio (HH:mm)
    minAmount: number;
    ruleType: 'per_purchase' | 'multiple';
    autoGenerate: boolean;
    active: boolean;
    createdAt: string;
    status?: 'active' | 'finished';
    winner?: { // Legacy field
        customerId?: string;
        customerName: string;
        couponNumber: string;
        drawDate: string;
        customerPhone?: string;
    };
}
