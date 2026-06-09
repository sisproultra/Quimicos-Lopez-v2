export type ViewState = 'dashboard' | 'pos' | 'customers' | 'inventory' | 'production' | 'logistics' | 'finance' | 'settings' | 'employees' | 'admin_saas' | 'sales_history' | 'supplies' | 'programmer' | 'reports' | 'purchases' | 'collections' | 'accounts_payable' | 'suppliers' | 'system_config' | 'liquidations' | 'reg_gasto' | 'route' | 'prod_bulk' | 'prod_packaged' | 'prod_history' | 'prod_waste' | 'quotations' | 'guia_remision';

export interface ThemeStyles {
  primary: string;
  hover: string;
  text: string;
  bgLight: string;
  border: string;
  ring: string;
  badge: string;
}

export const NAMED_COLORS: Record<string, string> = {
  blue: '#2563eb',
  purple: '#9333ea',
  green: '#10b981', // Emerald 500
  forest: '#15803d', // Green 700
  orange: '#ea580c',
  rose: '#e11d48',
  slate: '#334155',
  teal: '#0d9488'
};

export const PRESET_COLORS = Object.values(NAMED_COLORS);

export const getThemeStyles = (colorInput: string): ThemeStyles => {
  const hex = NAMED_COLORS[colorInput] || colorInput;
  const color = hex.startsWith('#') ? hex : '#10b981'; 

  return {
    primary: `bg-[${color}]`,
    hover: `hover:bg-[${color}]/90`,
    text: `text-[${color}]`,
    bgLight: `bg-[${color}/10]`,
    border: `border-[${color}]/20`,
    ring: `focus:ring-[${color}]`,
    badge: `bg-[${color}]/10 text-[${color}]`
  };
};

export type ProductType = 'INSUMO' | 'PRODUCTO_TERMINADO';
export type ProductSubtype = 'BULK' | 'PACKAGED';

export interface Ingredient {
    id: string; 
    name: string;
    quantity: number; 
    unit: string;
}

export interface Service { 
  id: string;
  name: string;
  price: number;
  unit: string; 
  category: string; 
  categoryId?: string; 
  description?: string;
  trackStock?: boolean; 
  stock?: number; 
  imageUrl?: string;
  
  type: ProductType;
  subtype?: ProductSubtype;
  internalCode?: string;
  ean?: string;
  minStock?: number;
  minProduceQty?: number; 
  
  // Link for Packaged -> Bulk
  consumesFromBulkId?: string;
  packagedSize?: number; // Liters or units consumed per item

  // New fields for Supplies Control
  maxStock?: number; 
  alertLow?: number; 
  alertHigh?: number; 
  
  recipe?: Ingredient[]; 
  deleted?: boolean; 
}

export interface Supplier {
  id: string;
  name: string;
  docType: 'RUC' | 'DNI';
  docNumber: string;
  contactName?: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  deleted?: boolean;
}

export interface PurchaseItem {
  insumoId: string;
  insumoName: string;
  quantity: number;
  cost: number; 
  costUsd?: number;
  subtotal: number; 
  subtotalUsd?: number;
  unit: string;
}

export interface Purchase {
  id: string;
  date: string;
  supplierName?: string;
  supplierId?: string;
  items: PurchaseItem[];
  total: number;
  totalUsd?: number;
  currency: 'PEN' | 'USD';
  exchangeRate: number;
  paymentMethodId: string;
  notes?: string;
  createdBy: string;
  deleted?: boolean;
}

export interface PackagingEntry {
    id: string;
    targetProductId: string; 
    targetProductName: string;
    quantity: number; 
    containerSize: number; 
    totalVolume: number; 
    date: string;
    performedBy: string;
}

export interface ProductionLog {
    id: string;
    date: string;
    productId: string;
    productName: string;
    quantityProduced: number; 
    packagedVolume: number; 
    batchNumber: string; 
    expirationDate: string;
    producedBy: string; 
    ingredientsDeducted: boolean;
    packaging?: PackagingEntry[];
    status: 'open' | 'closed'; 
    deleted?: boolean;
}

export interface WasteLog {
    id: string;
    date: string;
    productId: string;
    productName: string;
    quantity: number;
    reason: string;
    reportedBy: string;
    deleted?: boolean;
}

export interface CustomerContact {
  name: string;
  phone: string;
  type: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  contacts?: CustomerContact[]; 
  countryCode?: string;
  gender?: 'M' | 'F' | 'Otro'; 
  docType?: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE'; 
  docNumber?: string;
  email?: string;
  businessName?: string;
  businessLogo?: string;
  address?: string;
  department?: string;
  province?: string;
  district?: string; 
  zone?: string;
  googleMapsUrl?: string;
  notes?: string;
  alertMessage?: string;
  alertColor?: 'red' | 'green' | 'blue' | 'orange';
  gpsLocation?: { lat: number, lng: number };
  ubigeo?: string;
  sunatStatus?: string;
  sunatCondition?: string;
  deleted?: boolean; 
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: 'admin' | 'vendedor_ruta' | 'operario_produccion' | 'almacen' | 'cajero' | 'operario' | 'programmer'; 
  active: boolean;
  permissions: ViewState[]; 
  photoUrl?: string;
  phone?: string;
  address?: string;
  gender?: 'M' | 'F' | 'Otro';
  assignedZones?: string[]; 
  deleted?: boolean; 
}

export interface SaleItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  subtotal: number;
  batchNumber?: string; 
  completed?: boolean; 
  imageUrl?: string;
  notes?: string;
  deliveryDate?: string; 
  audioNoteUrl?: string; 
  photos?: string[]; 
}

export type SaleStatus = 'pendiente' | 'en_preparacion' | 'despachado' | 'en_ruta' | 'entregado' | 'cancelado' | 'por_lavar' | 'lavado';

export type PaymentStatus = 'pagado' | 'parcial' | 'pendiente';

export interface PaymentDetail {
  methodId: string;
  methodName: string;
  amount: number;
  date?: string;
  collectedBy?: string; 
  status?: 'por_validar' | 'confirmado';
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  total: number;
  
  currency?: 'PEN' | 'USD';
  exchangeRate?: number;
  
  documentType?: 'BOLETA' | 'FACTURA' | 'NOTA_PEDIDO';
  clientDocNumber?: string;
  netAmount?: number;
  taxAmount?: number;
  
  status: SaleStatus;
  paymentStatus: PaymentStatus; 
  date: string;
  scheduledDeliveryDate?: string; 
  notes?: string;
  
  payments: PaymentDetail[]; 
  totalPaid: number; 
  balance: number; 
  change?: number; 
  
  deliveryProofPhoto?: string; 
  dispatchedAt?: string;
  deliveredAt?: string;
  deliveredBy?: string; 
  lastReprint?: string;
  deleted?: boolean; 

  // Integracion Sunat CPE
  sunatStatus?: 'BORRADOR' | 'PENDIENTE_ENVIO' | 'ENVIADO_API' | 'RECHAZADO_SUNAT' | 'ACEPTADO_SUNAT' | 'ERROR' | 'ANULADO';
  sunatPdfUrl?: string;
  sunatXmlUrl?: string;
  sunatCdrUrl?: string;
  sunatResponseCode?: string;
  sunatResponseDescription?: string;
  sunatDocumentNumber?: string;
  creditDays?: number;
  dueDate?: string;
  
  // Nota de Credito
  creditNoteDocumentNumber?: string;
  creditNotePdfUrl?: string;
  creditNoteXmlUrl?: string;
  creditNoteCdrUrl?: string;
  creditNoteStatus?: 'ACEPTADO_SUNAT' | 'ERROR';
  creditNoteResponseDescription?: string;
}

export interface GuiaRemisionItem {
  itemIndex: number;
  codigoProducto: string;
  descripcion: string;
  unidadMedida: string;
  cantidad: number;
}

export interface GuiaRemision {
  id: string;
  comprobanteAsociadoId?: string;
  nroGuiaCompleto: string;
  serieDocumento: string;
  numeroDocumento: string;
  fechaDocumento: string;
  fechaInicioTraslado: string;
  motivoTrasladoCodigo: string;
  motivoTrasladoDescripcion: string;
  modalidadTrasladoCodigo: string;
  pesoBrutoTotal: number;
  totalBultos: number;
  ubigeoOrigen: string;
  direccionOrigen: string;
  ubigeoDestino: string;
  direccionDestino: string;
  
  // Destinatario
  clienteTipoDocumento: string;
  clienteNroDocumento: string;
  clienteRazonSocial: string;
  
  // Privado/Opcional
  placaVehiculo?: string;
  choferTipoDocumento?: string;
  choferNroDocumento?: string;
  choferNombres?: string;
  choferApellidos?: string;
  choferLicenciaConducir?: string;
  
  // Estado e Integración
  estadoGuia: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'ERROR';
  sunatPdfUrl?: string;
  sunatHashGuia?: string;
  sunatCodigoRespuesta?: string;
  sunatDescripcionRespuesta?: string;
  
  items: GuiaRemisionItem[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  imageIcon?: string; 
  color: string;
  isActive: boolean; 
  fixedValue?: number; 
  deleted?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  washTypeId?: string; 
  unitId?: string; 
  deliveryTimeHours?: number; 
  deleted?: boolean;
}

export interface MeasurementUnit {
  id: string;
  name: string;
  symbol: string; 
  deleted?: boolean;
}

export interface TicketConfig {
  shopName: string;
  ruc?: string;
  address: string;
  phone: string;
  schedule: string;
  policy: string; 
  logoUrl?: string; 
  promoImageUrl?: string; 
  specialMessage?: string;
  deliveryStartHour?: number;
  deliveryEndHour?: number;
  solUser?: string;
  solPassword?: string;
  signaturePassword?: string;
  productionMode?: boolean;
  guiaToken?: string;
  guiaClave?: string;
}

export interface SaasConfig {
  warningActive: boolean;
  warningStartTime?: string | null;
  paymentDay?: number;
  warningDurationHours?: number;
}

export type ExpenseType = 'VARIABLE' | 'FIJO';

export interface ExpenseCategory {
  id: string;
  name: string;
  type: ExpenseType;
  isStaffRelated?: boolean;
  deleted?: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  category: string;
  type: ExpenseType;
  date: string;
  paymentMethodId?: string;
  staffId?: string;
  staffName?: string;
  deleted?: boolean; 
  status?: 'por_validar' | 'confirmado'; 
  photos?: string[]; 
}

export interface WashType {
    id: string;
    name: string;
    description?: string;
    deleted?: boolean;
}

export interface PickupRequest {
    id: string;
    clientName: string;
    countryCode: string;
    phone: string;
    address: string;
    googleMapsUrl?: string;
    scheduledDate: string;
    notes?: string;
    isUrgent: boolean;
    isSpecialClient: boolean;
    status: 'pending' | 'collected';
    createdAt: string;
    deleted?: boolean;
}

export interface Income {
    id: string;
    description: string;
    amount: number;
    date: string;
    deleted?: boolean;
}

export interface CashShift {
    id: string;
    openedAt: string;
    closedAt?: string;
    openedBy: string;
    closedBy?: string;
    initialAmount: number;
    expectedAmount?: number;
    finalAmount?: number;
    totalCashSales: number;
    totalNonCashSales: number;
    totalCashExpenses: number;
    totalNonCashExpenses: number;
    totalOtherIncome: number;
    salesDetails?: Sale[];
    nonCashSalesDetails?: Sale[];
    expensesDetails?: Expense[];
    nonCashExpensesDetails?: Expense[];
    incomesDetails?: Income[];
    status: 'open' | 'closed';
    notes?: string;
    deleted?: boolean;
}

export interface QuotationItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit: string;
}

export interface Quotation {
  id: string;
  customerId: string;
  customerName: string;
  customerDocType?: string;
  customerDocNumber?: string;
  customerAddress?: string;
  items: QuotationItem[];
  total: number;
  date: string;
  validUntil: string;
  notes?: string;
  status: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';
  createdBy?: string;
  deleted?: boolean;
}

export interface AppContextType {
  sales: Sale[];
  quotations: Quotation[];
  activeQuotationForPOS: Quotation | null;
  setActiveQuotationForPOS: (q: Quotation | null) => void;
  addQuotation: (q: Quotation) => void;
  updateQuotation: (q: Quotation) => void;
  deleteQuotation: (id: string) => void;
  customers: Customer[];
  suppliers: Supplier[];
  services: Service[]; 
  employees: Employee[];
  paymentMethods: PaymentMethod[];
  categories: Category[];
  units: MeasurementUnit[];
  productionLogs: ProductionLog[];
  wasteLogs: WasteLog[];
  expenses: Expense[]; 
  expenseCategories: ExpenseCategory[]; 
  washTypes: WashType[]; 
  pickupRequests: PickupRequest[]; 
  currentShift: CashShift | null; 
  saasConfig: SaasConfig; 
  purchases: Purchase[];
  zones: string[];
  
  currentUser: Employee | null; 

  theme: string;
  themeStyles: ThemeStyles;
  currency: string;
  exchangeRate: number; 
  ticketConfig: TicketConfig;
  currentView: ViewState;
  apiToken: string; 
  decolectaUrl: string;
  
  setCurrentView: (view: ViewState) => void;
  setTheme: (t: string) => void;
  setCurrency: (c: string) => void;
  setExchangeRate: (rate: number) => void;
  setTicketConfig: (c: TicketConfig) => void;
  setSaasConfig: (c: SaasConfig) => void; 
  setCurrentUser: (u: Employee | null) => void;
  setApiToken: (t: string) => void; 
  setDecolectaUrl: (url: string) => void;
  setZones: (z: string[]) => void;
  addZone: (z: string) => void;

  getNextOrderNumber: () => string;

  // Actions
  addSale: (sale: Sale) => void;
  updateSale: (sale: Sale) => void;
  updateSaleStatus: (id: string, status: SaleStatus) => void; 
  deleteSale: (id: string) => void;

  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  refreshCustomers: () => Promise<void>;

  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;

  addProduct: (product: Service) => void;
  updateProduct: (product: Service) => void;
  deleteProduct: (id: string) => void;
  
  addService: (service: Service) => void; 
  updateService: (service: Service) => void;
  deleteService: (id: string) => void;

  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;

  addCategory: (cat: Category) => void;
  updateCategory: (cat: Category) => void; 
  deleteCategory: (id: string) => void;
  
  addUnit: (unit: MeasurementUnit) => void;
  deleteUnit: (id: string) => void;

  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (expense: Expense) => void; 
  
  addExpenseCategory: (cat: ExpenseCategory) => void;
  deleteExpenseCategory: (id: string) => void;

  addWashType: (wt: WashType) => void;
  deleteWashType: (id: string) => void;

  addPickupRequest: (req: PickupRequest) => void;
  updatePickupRequest: (req: PickupRequest) => void;
  deletePickupRequest: (id: string) => void;

  openCashShift: (initialAmount: number, user: string) => void;
  closeCashShift: (finalAmount: number, notes: string, user: string) => void;
  addIncome: (income: Income) => void;

  addPaymentMethod: (pm: PaymentMethod) => void;
  updatePaymentMethod: (pm: PaymentMethod) => void; 
  deletePaymentMethod: (id: string) => void;

  addPurchase: (purchase: Purchase) => void;
  receivePurchase: (purchaseId: string, invoiceNumber: string, dayExchangeRate: number, receivedItems: PurchaseItem[], finalPaymentMethodId?: string) => void;

  // Manufacturing
  produceItem: (log: ProductionLog) => { success: boolean; message: string };
  registerWaste: (log: WasteLog) => { success: boolean; message: string };
  addPackagingToBatch: (batchId: string, entry: PackagingEntry) => { success: boolean; message: string };

  // Auth
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;

  guiasRemision: GuiaRemision[];
  addGuiaRemision: (guia: GuiaRemision) => void;
  updateGuiaRemision: (guia: GuiaRemision) => void;
}
