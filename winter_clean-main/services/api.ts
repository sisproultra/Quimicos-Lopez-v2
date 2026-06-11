import { supabase } from './supabaseClient';
import { 
    Sale, Customer, Service, Employee, Expense, ProductionLog, WasteLog, 
    PickupRequest, CashShift, ExpenseCategory, Category, WashType, 
    MeasurementUnit, PaymentMethod, TicketConfig, Income 
} from '../types';

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Set to keep track of tables that failed with PGRST205 (missing table in Supabase)
const localOnlyTables = new Set<string>();

// Helper to get local storage key
const getLocalKey = (table: string) => `wc_local_${table}`;

// Helper to load all items of a table from localStorage
const getLocalItems = <T>(table: string): T[] => {
    try {
        const val = localStorage.getItem(getLocalKey(table));
        return val ? JSON.parse(val) : [];
    } catch (e) {
        console.error(`Error loading local items for ${table}:`, e);
        return [];
    }
};

// Helper to save all items of a table to localStorage
const saveLocalItems = <T>(table: string, items: T[]) => {
    try {
        localStorage.setItem(getLocalKey(table), JSON.stringify(items));
    } catch (e) {
        console.error(`Error saving local items for ${table}:`, e);
    }
};

// Generic CRUD Helper with fallback to localStorage if Supabase table doesn't exist
const createCrud = <T extends { id: string | number }>(
    table: string, 
    mapFromDB: (row: any) => T = (row) => row as T, 
    mapToDB: (item: Partial<T>) => any = (item) => item
) => ({
    getAll: async (): Promise<T[]> => {
        if (localOnlyTables.has(table)) {
            return getLocalItems<T>(table);
        }
        try {
            const { data, error } = await supabase.from(table).select('*');
            if (error) { 
                if (error.code === 'PGRST205') {
                    console.warn(`Table ${table} not found in Supabase (PGRST205). Falling back to localStorage.`);
                    localOnlyTables.add(table);
                    return getLocalItems<T>(table);
                }
                console.error(`Error fetching ${table}:`, JSON.stringify(error, null, 2)); 
                return []; 
            }
            return data.map(mapFromDB);
        } catch (e) {
            console.error(`Unexpected exception fetching ${table}, fallback to local:`, e);
            return getLocalItems<T>(table);
        }
    },
    create: async (item: T) => {
        if (localOnlyTables.has(table)) {
            const items = getLocalItems<T>(table);
            const exists = items.findIndex(i => String(i.id) === String(item.id));
            if (exists >= 0) {
                items[exists] = item;
            } else {
                items.push(item);
            }
            saveLocalItems<T>(table, items);
            return true;
        }
        try {
            const payload = mapToDB(item);
            const { error } = await supabase.from(table).insert(payload);
            if (error) {
                if (error.code === 'PGRST205') {
                    localOnlyTables.add(table);
                    const items = getLocalItems<T>(table);
                    const exists = items.findIndex(i => String(i.id) === String(item.id));
                    if (exists >= 0) {
                        items[exists] = item;
                    } else {
                        items.push(item);
                    }
                    saveLocalItems<T>(table, items);
                    return true;
                }
                console.error(`Error creating in ${table}:`, JSON.stringify(error, null, 2));
                return false;
            }
            return true;
        } catch (e) {
            console.error(`Unexpected exception creating in ${table}:`, e);
            return false;
        }
    },
    upsert: async (item: T) => {
        if (localOnlyTables.has(table)) {
            const items = getLocalItems<T>(table);
            const exists = items.findIndex(i => String(i.id) === String(item.id));
            if (exists >= 0) {
                items[exists] = item;
            } else {
                items.push(item);
            }
            saveLocalItems<T>(table, items);
            return true;
        }
        try {
            const payload = mapToDB(item);
            const { error } = await supabase.from(table).upsert(payload);
            if (error) {
                if (error.code === 'PGRST205') {
                    localOnlyTables.add(table);
                    const items = getLocalItems<T>(table);
                    const exists = items.findIndex(i => String(i.id) === String(item.id));
                    if (exists >= 0) {
                        items[exists] = item;
                    } else {
                        items.push(item);
                    }
                    saveLocalItems<T>(table, items);
                    return true;
                }
                console.error(`Error upserting in ${table}:`, JSON.stringify(error, null, 2));
                return false;
            }
            return true;
        } catch (e) {
            console.error(`Unexpected exception upserting in ${table}:`, e);
            return false;
        }
    },
    update: async (id: string, updates: Partial<T>) => {
        if (localOnlyTables.has(table)) {
            const items = getLocalItems<T>(table);
            const idx = items.findIndex(i => String(i.id) === String(id));
            if (idx >= 0) {
                items[idx] = { ...items[idx], ...updates };
                saveLocalItems<T>(table, items);
            }
            return true;
        }
        try {
            const payload = mapToDB(updates);
            const { error } = await supabase.from(table).update(payload).eq('id', id);
            if (error) {
                if (error.code === 'PGRST205') {
                    localOnlyTables.add(table);
                    const items = getLocalItems<T>(table);
                    const idx = items.findIndex(i => String(i.id) === String(id));
                    if (idx >= 0) {
                        items[idx] = { ...items[idx], ...updates };
                        saveLocalItems<T>(table, items);
                    }
                    return true;
                }
                console.error(`Error updating in ${table}:`, JSON.stringify(error, null, 2));
                return false;
            }
            return true;
        } catch (e) {
            console.error(`Unexpected exception updating in ${table}:`, e);
            return false;
        }
    },
    delete: async (id: string) => {
        if (localOnlyTables.has(table)) {
            const items = getLocalItems<T>(table);
            const filtered = items.filter(i => String(i.id) !== String(id));
            saveLocalItems<T>(table, filtered);
            return true;
        }
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) {
                if (error.code === 'PGRST205') {
                    localOnlyTables.add(table);
                    const items = getLocalItems<T>(table);
                    const filtered = items.filter(i => String(i.id) !== String(id));
                    saveLocalItems<T>(table, filtered);
                    return true;
                }
                console.error(`Error deleting from ${table}:`, JSON.stringify(error, null, 2));
                return false;
            }
            return true;
        } catch (e) {
            console.error(`Unexpected exception deleting in ${table}:`, e);
            return false;
        }
    }
});

// --- MAPPERS (Snake Case <-> Camel Case) ---

// Employee
const mapEmployeeFromDB = (row: any): Employee => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    password: row.password,
    role: row.role,
    active: row.active,
    permissions: row.permissions || [],
    photoUrl: row.photo_url,
    phone: row.phone,
    address: row.address,
    gender: row.gender,
    deleted: row.deleted
});
const mapEmployeeToDB = (item: Partial<Employee>): any => ({
    id: item.id,
    first_name: item.firstName,
    last_name: item.lastName,
    username: item.username,
    password: item.password,
    role: item.role,
    active: item.active,
    permissions: item.permissions,
    photo_url: item.photoUrl,
    phone: item.phone,
    address: item.address,
    gender: item.gender,
    deleted: item.deleted
});

export const docTypeToDB = (docType: string | undefined): string => {
    if (!docType) return '0';
    const upper = docType.toUpperCase();
    if (upper === 'DNI') return '1';
    if (upper === 'RUC') return '6';
    if (upper === 'CE') return '4';
    if (upper === 'PASAPORTE') return '7';
    if (upper === '0' || upper === '1' || upper === '4' || upper === '6' || upper === '7') return upper;
    return '0';
};

export const docTypeFromDB = (dbType: string | undefined): 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | undefined => {
    if (!dbType) return undefined;
    const clean = String(dbType).trim();
    if (clean === '1') return 'DNI';
    if (clean === '6') return 'RUC';
    if (clean === '4') return 'CE';
    if (clean === '7') return 'PASAPORTE';
    if (clean.toUpperCase() === 'DNI' || clean.toUpperCase() === 'RUC' || clean.toUpperCase() === 'CE' || clean.toUpperCase() === 'PASAPORTE') {
        return clean.toUpperCase() as any;
    }
    return undefined;
};

// Customer
const mapCustomerFromDB = (row: any): Customer => ({
    id: row.id,
    name: row.razon_social || row.name,
    phone: row.telefono || row.phone,
    countryCode: row.country_code,
    gender: row.gender,
    docType: docTypeFromDB(row.tipo_documento || row.doc_type),
    docNumber: row.nro_documento || row.doc_number,
    email: row.email,
    businessName: row.nombre_comercial || row.business_name,
    address: row.direccion || row.address,
    department: row.departamento || row.department,
    province: row.provincia || row.province,
    district: row.distrito || row.district,
    ubigeo: row.ubigeo,
    sunatStatus: row.estado_sunat || row.sunat_status,
    sunatCondition: row.condicion_sunat || row.sunat_condition,
    notes: row.notes,
    alertMessage: row.alert_message,
    alertColor: row.alert_color,
    gpsLocation: row.gps_location,
    deleted: row.activo !== undefined ? !row.activo : row.deleted
});

const mapCustomerToDB = (item: Partial<Customer>): any => {
    // Para evitar errores PGRST204, solo definimos las columnas reales de la tabla 'clientes' en Supabase
    const data: any = {};
    
    if (item.id !== undefined) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(item.id)) {
            data.id = item.id;
        }
    }
    if (item.docType !== undefined) data.tipo_documento = docTypeToDB(item.docType);
    if (item.docNumber !== undefined) data.nro_documento = item.docNumber;
    if (item.name !== undefined) data.razon_social = item.name;
    
    // Nombre comercial por defecto
    if (item.businessName !== undefined || item.name !== undefined) {
        data.nombre_comercial = item.businessName || item.name;
    }
    
    if (item.address !== undefined) data.direccion = item.address;
    if (item.ubigeo !== undefined) data.ubigeo = item.ubigeo;
    if (item.department !== undefined) data.departamento = item.department;
    if (item.province !== undefined) data.provincia = item.province;
    if (item.district !== undefined) data.distrito = item.district;
    if (item.email !== undefined) data.email = item.email;
    if (item.phone !== undefined) data.telefono = item.phone;
    
    if (item.deleted !== undefined) {
        data.activo = !item.deleted;
    } else {
        data.activo = true;
    }

    // Tenant ID por defecto o heredado
    data.tenant_id = (item as any).tenantId || (item as any).tenant_id || '00000000-0000-0000-0000-000000000000';

    return data;
};

// Category
const mapCategoryFromDB = (row: any): Category => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    washTypeId: row.wash_type_id,
    unitId: row.unit_id,
    deliveryTimeHours: row.delivery_time_hours
});
const mapCategoryToDB = (item: Partial<Category>): any => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    wash_type_id: item.washTypeId,
    unit_id: item.unitId,
    delivery_time_hours: item.deliveryTimeHours
});

// Service (Product/Insumo)
const mapServiceFromDB = (row: any): Service => ({
    id: row.id,
    name: row.name,
    price: row.price,
    unit: row.unit,
    category: row.category,
    categoryId: row.category_id,
    description: row.description,
    trackStock: row.track_stock,
    stock: row.stock,
    imageUrl: row.image_url,
    type: row.type,
    internalCode: row.internal_code,
    ean: row.ean,
    minStock: row.min_stock,
    maxStock: row.max_stock,
    alertLow: row.alert_low,
    alertHigh: row.alert_high,
    recipe: row.recipe,
    deleted: row.deleted
});
const mapServiceToDB = (item: Partial<Service>): any => ({
    id: item.id,
    name: item.name,
    price: item.price,
    unit: item.unit,
    category: item.category,
    category_id: item.categoryId,
    description: item.description,
    track_stock: item.trackStock,
    stock: item.stock,
    image_url: item.imageUrl,
    type: item.type,
    internal_code: item.internalCode,
    ean: item.ean,
    min_stock: item.minStock,
    max_stock: item.maxStock,
    alert_low: item.alertLow,
    alert_high: item.alertHigh,
    recipe: item.recipe,
    deleted: item.deleted
});

// Expense Category
const mapExpenseCatFromDB = (row: any): ExpenseCategory => ({
    id: row.id,
    name: row.name,
    type: row.type,
    isStaffRelated: row.is_staff_related
});
const mapExpenseCatToDB = (item: Partial<ExpenseCategory>): any => ({
    id: item.id,
    name: item.name,
    type: item.type,
    is_staff_related: item.isStaffRelated
});

// Expense
const mapExpenseFromDB = (row: any): Expense => ({
    id: row.id,
    description: row.description,
    amount: row.amount,
    categoryId: row.category_id,
    category: row.category,
    type: row.type,
    date: row.date,
    paymentMethodId: row.payment_method_id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    deleted: row.deleted
});
const mapExpenseToDB = (item: Partial<Expense>): any => ({
    id: item.id,
    description: item.description,
    amount: item.amount,
    category_id: item.categoryId,
    category: item.category,
    type: item.type,
    date: item.date,
    payment_method_id: item.paymentMethodId,
    staff_id: item.staffId,
    staff_name: item.staffName,
    deleted: item.deleted
});

// Production Log
const mapProductionFromDB = (row: any): ProductionLog => ({
    id: row.id,
    date: row.date,
    productId: row.product_id,
    productName: row.product_name,
    quantityProduced: row.quantity_produced,
    packagedVolume: row.packaged_volume || 0,
    batchNumber: row.batch_number,
    expirationDate: row.expiration_date,
    producedBy: row.produced_by,
    ingredientsDeducted: row.ingredients_deducted,
    packaging: row.packaging || [],
    status: row.status || 'open'
});
const mapProductionToDB = (item: Partial<ProductionLog>): any => ({
    id: item.id,
    date: item.date,
    product_id: item.productId,
    product_name: item.productName,
    quantity_produced: item.quantityProduced,
    packaged_volume: item.packagedVolume,
    batch_number: item.batchNumber,
    expiration_date: item.expirationDate,
    produced_by: item.producedBy,
    ingredients_deducted: item.ingredientsDeducted,
    packaging: item.packaging,
    status: item.status
});

// Waste Log
const mapWasteFromDB = (row: any): WasteLog => ({
    id: row.id,
    date: row.date,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    reason: row.reason,
    reportedBy: row.reported_by
});
const mapWasteToDB = (item: Partial<WasteLog>): any => ({
    id: item.id,
    date: item.date,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    reason: item.reason,
    reported_by: item.reportedBy
});

// Pickup Request
const mapPickupFromDB = (row: any): PickupRequest => ({
    id: row.id,
    clientName: row.client_name,
    countryCode: row.country_code,
    phone: row.phone,
    address: row.address,
    googleMapsUrl: row.google_maps_url,
    scheduledDate: row.scheduled_date,
    notes: row.notes,
    isUrgent: row.is_urgent,
    isSpecialClient: row.is_special_client,
    status: row.status,
    createdAt: row.created_at
});
const mapPickupToDB = (item: Partial<PickupRequest>): any => ({
    id: item.id,
    client_name: item.clientName,
    country_code: item.countryCode,
    phone: item.phone,
    address: item.address,
    google_maps_url: item.googleMapsUrl,
    scheduled_date: item.scheduledDate,
    notes: item.notes,
    is_urgent: item.isUrgent,
    is_special_client: item.isSpecialClient,
    status: item.status,
    created_at: item.createdAt
});

// Cash Shift
const mapShiftFromDB = (row: any): CashShift => ({
    id: row.id,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openedBy: row.opened_by,
    closedBy: row.closed_by,
    initialAmount: row.initial_amount,
    finalAmount: row.final_amount,
    expectedAmount: row.expected_amount,
    status: row.status,
    notes: row.notes,
    totalCashSales: row.total_cash_sales,
    totalNonCashSales: row.total_non_cash_sales,
    totalCashExpenses: row.total_cash_expenses,
    totalNonCashExpenses: row.total_non_cash_expenses,
    totalOtherIncome: row.total_other_income,
});
const mapShiftToDB = (item: Partial<CashShift>): any => ({
    id: item.id,
    opened_at: item.openedAt,
    closed_at: item.closedAt,
    opened_by: item.openedBy,
    closed_by: item.closedBy,
    initial_amount: item.initialAmount,
    final_amount: item.finalAmount,
    expected_amount: item.expectedAmount,
    status: item.status,
    notes: item.notes,
    total_cash_sales: item.totalCashSales,
    total_non_cash_sales: item.totalNonCashSales,
    total_cash_expenses: item.totalCashExpenses,
    total_non_cash_expenses: item.totalNonCashExpenses,
    total_other_income: item.totalOtherIncome
});

// --- SIMPLE MAPPERS FOR AUXILIARY TABLES ---

// Incomes
const mapIncomeFromDB = (row: any): Income => ({
    id: row.id,
    description: row.description,
    amount: row.amount,
    date: row.date
});
const mapIncomeToDB = (item: Partial<Income>): any => item;

// Measurement Units
const mapUnitFromDB = (row: any): MeasurementUnit => ({
    id: row.id,
    name: row.name,
    symbol: row.symbol
});
const mapUnitToDB = (item: Partial<MeasurementUnit>): any => item;

// Wash Types
const mapWashTypeFromDB = (row: any): WashType => ({
    id: row.id,
    name: row.name,
    description: row.description
});
const mapWashTypeToDB = (item: Partial<WashType>): any => item;

// Payment Methods
const mapPaymentMethodFromDB = (row: any): PaymentMethod => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    imageIcon: row.image_icon,
    color: row.color,
    isActive: row.is_active ?? true,
    fixedValue: row.fixed_value,
    deleted: row.deleted
});
const mapPaymentMethodToDB = (item: Partial<PaymentMethod>): any => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    image_icon: item.imageIcon,
    color: item.color,
    is_active: item.isActive,
    fixed_value: item.fixedValue,
    deleted: item.deleted
});


// --- API EXPORTS ---

export const settingsApi = {
    get: async (key: string, defaultValue: any) => {
        if (localOnlyTables.has('settings')) {
            try {
                const stored = localStorage.getItem(`wc_local_settings_${key}`);
                return stored ? JSON.parse(stored) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        }
        try {
            const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
            if (error) {
                if (error.code === 'PGRST205') {
                    localOnlyTables.add('settings');
                    try {
                        const stored = localStorage.getItem(`wc_local_settings_${key}`);
                        return stored ? JSON.parse(stored) : defaultValue;
                    } catch (e) {
                        return defaultValue;
                    }
                }
                console.error('Error fetching settings:', JSON.stringify(error));
            }
            return data ? data.value : defaultValue;
        } catch (e) {
            console.error('Exception in settings.get:', e);
            return defaultValue;
        }
    },
    set: async (key: string, value: any) => {
        if (localOnlyTables.has('settings')) {
            try {
                localStorage.setItem(`wc_local_settings_${key}`, JSON.stringify(value));
            } catch (e) {
                console.error('Error saving local settings:', e);
            }
            return;
        }
        try {
            const { error } = await supabase.from('settings').upsert({ key, value });
            if (error) {
                if (error.code === 'PGRST205') {
                    localOnlyTables.add('settings');
                    try {
                        localStorage.setItem(`wc_local_settings_${key}`, JSON.stringify(value));
                    } catch (e) {
                        console.error('Error saving local settings:', e);
                    }
                    return;
                }
                console.error('Error saving settings:', JSON.stringify(error));
            }
        } catch (e) {
            console.error('Exception in settings.set:', e);
        }
    }
};

export const tenantsApi = {
    get: async (): Promise<any | null> => {
        try {
            const { data, error } = await supabase.from('tenants').select('*');
            if (error) {
                console.error('Error fetching tenant:', JSON.stringify(error));
                return null;
            }
            if (data && data.length > 0) {
                return data[0];
            }
            return null;
        } catch (e) {
            console.error('Exception in tenantsApi.get:', e);
            return null;
        }
    },
    save: async (tenant: any): Promise<boolean> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const finalTenantId = session?.user?.user_metadata?.tenant_id || session?.user?.id;
            
            if (finalTenantId) {
                tenant.id = finalTenantId;
            }
            
            const { error } = await supabase.from('tenants').upsert(tenant);
            if (error) {
                console.error('Error upserting tenant in Supabase:', JSON.stringify(error));
                return false;
            }
            return true;
        } catch (e) {
            console.error('Exception in tenantsApi.save:', e);
            return false;
        }
    }
};

export const salesApi = {
    getAll: async (): Promise<Sale[]> => {
        if (localOnlyTables.has('sales')) {
            return getLocalItems<Sale>('sales');
        }
        try {
            const { data: sales, error } = await supabase.from('sales').select('*');
            if (error || !sales) {
                if (error && error.code === 'PGRST205') {
                    localOnlyTables.add('sales');
                    return getLocalItems<Sale>('sales');
                }
                if (error) console.error('Error fetching sales:', JSON.stringify(error));
                return [];
            }

            const saleIds = sales.map(s => s.id);
            if (saleIds.length === 0) return [];

            const { data: items } = await supabase.from('sale_items').select('*').in('sale_id', saleIds);
            const { data: payments } = await supabase.from('sale_payments').select('*').in('sale_id', saleIds);

            return sales.map(s => ({
                id: s.id,
                customerId: s.customer_id,
                customerName: s.customer_name,
                total: s.total,
                status: s.status,
                paymentStatus: s.payment_status,
                date: s.date,
                scheduledDeliveryDate: s.scheduled_delivery_date,
                notes: s.notes,
                totalPaid: s.total_paid,
                balance: s.balance,
                change: s.change,
                deliveryProofPhoto: s.delivery_proof_photo,
                dispatchedAt: s.dispatched_at,
                deliveredAt: s.delivered_at,
                deliveredBy: s.delivered_by,
                documentType: s.document_type,
                clientDocNumber: s.client_doc_number,
                netAmount: s.net_amount,
                taxAmount: s.tax_amount,
                deleted: s.deleted,
                currency: s.currency,
                exchangeRate: s.exchange_rate,
                sunatStatus: s.sunat_status,
                sunatPdfUrl: s.sunat_pdf_url,
                sunatXmlUrl: s.sunat_xml_url,
                sunatCdrUrl: s.sunat_cdr_url,
                sunatResponseCode: s.sunat_response_code,
                sunatResponseDescription: s.sunat_response || s.sunat_response_description || s.sunat_description_respuesta,
                sunatDocumentNumber: s.sunat_document_number || s.document_number_full,
                creditDays: s.credit_days,
                dueDate: s.due_date,
                internalCorrelative: s.internal_correlative,
                documentSeries: s.document_series || s.document_serie,
                documentNumber: s.document_number,
                creditNoteDocumentNumber: s.credit_note_document_number,
                creditNotePdfUrl: s.credit_note_pdf_url,
                creditNoteXmlUrl: s.credit_note_xml_url,
                creditNoteCdrUrl: s.credit_note_cdr_url,
                creditNoteStatus: s.credit_note_status,
                creditNoteResponseDescription: s.credit_note_response_description,
                items: items?.filter(i => i.sale_id === s.id).map(i => ({
                    serviceId: i.service_id,
                    serviceName: i.service_name,
                    quantity: i.quantity,
                    price: i.price,
                    subtotal: i.subtotal,
                    completed: i.completed,
                    notes: i.notes,
                    batchNumber: i.batch_number,
                    imageUrl: i.image_url,
                    deliveryDate: i.delivery_date
                })) || [],
                payments: payments?.filter(p => p.sale_id === s.id).map(p => ({
                    methodId: p.method_id,
                    methodName: p.method_name,
                    amount: p.amount,
                    date: p.date
                })) || []
            }));
        } catch (e) {
            console.error('Exception in sales.getAll:', e);
            return getLocalItems<Sale>('sales');
        }
    },
    create: async (sale: Sale) => {
        if (localOnlyTables.has('sales')) {
            const list = getLocalItems<Sale>('sales');
            const exists = list.findIndex(s => s.id === sale.id);
            if (exists >= 0) {
                list[exists] = sale;
            } else {
                list.push(sale);
            }
            saveLocalItems<Sale>('sales', list);
            return true;
        }
        try {
            const isAccepted = String(sale.sunatResponseCode || '') === "0";
            const sunatRespValue = isAccepted ? "Aceptado" : (sale.sunatResponseDescription || null);

            const { error: saleError } = await supabase.from('sales').insert({
                id: sale.id,
                customer_id: sale.customerId,
                customer_name: sale.customerName,
                total: sale.total,
                status: sale.status,
                payment_status: sale.paymentStatus,
                date: sale.date,
                scheduled_delivery_date: sale.scheduledDeliveryDate,
                notes: sale.notes,
                total_paid: sale.totalPaid,
                balance: sale.balance,
                change: sale.change,
                delivery_proof_photo: sale.deliveryProofPhoto,
                document_type: sale.documentType,
                client_doc_number: sale.clientDocNumber,
                net_amount: sale.netAmount,
                tax_amount: sale.taxAmount,
                deleted: false,
                currency: sale.currency,
                exchange_rate: sale.exchangeRate,
                sunat_status: sale.sunatStatus,
                sunat_pdf_url: sale.sunatPdfUrl,
                sunat_xml_url: sale.sunatXmlUrl,
                sunat_cdr_url: sale.sunatCdrUrl,
                sunat_response_code: sale.sunatResponseCode,
                sunat_response: sunatRespValue,
                sunat_response_description: sale.sunatResponseDescription,
                sunat_document_number: sale.sunatDocumentNumber,
                credit_days: sale.creditDays,
                due_date: sale.dueDate,
                internal_correlative: sale.internalCorrelative,
                document_series: sale.documentSeries,
                document_number: sale.documentNumber
            });
            if (saleError) {
                if (saleError.code === 'PGRST205') {
                    localOnlyTables.add('sales');
                    const list = getLocalItems<Sale>('sales');
                    list.push(sale);
                    saveLocalItems<Sale>('sales', list);
                    return true;
                }
                console.error('Sale create error:', JSON.stringify(saleError)); 
                return false; 
            }

            if (sale.items.length > 0) {
                const itemsPayload = sale.items.map(i => ({
                    sale_id: sale.id,
                    service_id: i.serviceId,
                    service_name: i.serviceName,
                    quantity: i.quantity,
                    price: i.price,
                    subtotal: i.subtotal,
                    completed: i.completed || false,
                    notes: i.notes,
                    batch_number: i.batchNumber,
                    image_url: i.imageUrl
                }));
                const { error: itemError } = await supabase.from('sale_items').insert(itemsPayload);
                if (itemError) console.error('Sale items insert error:', JSON.stringify(itemError));
            }

            if (sale.payments.length > 0) {
                const paymentsPayload = sale.payments.map(p => ({
                    sale_id: sale.id,
                    method_id: p.methodId,
                    method_name: p.methodName,
                    amount: p.amount,
                    date: p.date
                }));
                const { error: paymentError } = await supabase.from('sale_payments').insert(paymentsPayload);
                if (paymentError) console.error('Sale payments insert error:', JSON.stringify(paymentError));
            }
            return true;
        } catch (e) {
            console.error('Exception in sales.create:', e);
            localOnlyTables.add('sales');
            const list = getLocalItems<Sale>('sales');
            list.push(sale);
            saveLocalItems<Sale>('sales', list);
            return true;
        }
    },
    update: async (sale: Sale) => {
        if (localOnlyTables.has('sales')) {
            const list = getLocalItems<Sale>('sales');
            const idx = list.findIndex(s => s.id === sale.id);
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...sale };
                saveLocalItems<Sale>('sales', list);
            }
            return true;
        }
        try {
            const isAccepted = String(sale.sunatResponseCode || '') === "0";
            const sunatRespValue = isAccepted ? "Aceptado" : (sale.sunatResponseDescription || null);

            const { error: saleError } = await supabase.from('sales').update({
                status: sale.status,
                payment_status: sale.paymentStatus,
                total_paid: sale.totalPaid,
                balance: sale.balance,
                change: sale.change,
                delivery_proof_photo: sale.deliveryProofPhoto,
                dispatched_at: sale.dispatchedAt,
                delivered_at: sale.deliveredAt,
                deleted: sale.deleted,
                currency: sale.currency,
                exchange_rate: sale.exchangeRate,
                sunat_status: sale.sunatStatus,
                sunat_pdf_url: sale.sunatPdfUrl,
                sunat_xml_url: sale.sunatXmlUrl,
                sunat_cdr_url: sale.sunatCdrUrl,
                sunat_response_code: sale.sunatResponseCode,
                sunat_response: sunatRespValue,
                sunat_response_description: sale.sunatResponseDescription,
                sunat_document_number: sale.sunatDocumentNumber,
                credit_days: sale.creditDays,
                due_date: sale.dueDate,
                internal_correlative: sale.internalCorrelative,
                document_series: sale.documentSeries,
                document_number: sale.documentNumber,
                credit_note_document_number: sale.creditNoteDocumentNumber,
                credit_note_pdf_url: sale.creditNotePdfUrl,
                credit_note_xml_url: sale.creditNoteXmlUrl,
                credit_note_cdr_url: sale.creditNoteCdrUrl,
                credit_note_status: sale.creditNoteStatus,
                credit_note_response_description: sale.creditNoteResponseDescription
            }).eq('id', sale.id);
            if (saleError) {
                if (saleError.code === 'PGRST205') {
                    localOnlyTables.add('sales');
                    const list = getLocalItems<Sale>('sales');
                    const idx = list.findIndex(s => s.id === sale.id);
                    if (idx >= 0) {
                        list[idx] = { ...list[idx], ...sale };
                        saveLocalItems<Sale>('sales', list);
                    }
                    return true;
                }
                console.error('Sale update error:', JSON.stringify(saleError));
                return false;
            }

            await supabase.from('sale_payments').delete().eq('sale_id', sale.id);
            
            if (sale.payments.length > 0) {
                const paymentsPayload = sale.payments.map(p => ({
                    sale_id: sale.id,
                    method_id: p.methodId,
                    method_name: p.methodName,
                    amount: p.amount,
                    date: p.date
                }));
                await supabase.from('sale_payments').insert(paymentsPayload);
            }
            
            for (const item of sale.items) {
                 await supabase.from('sale_items')
                    .update({ completed: item.completed })
                    .match({ sale_id: sale.id, service_id: item.serviceId });
            }
            return true;
        } catch (e) {
            console.error('Exception in sales.update:', e);
            localOnlyTables.add('sales');
            const list = getLocalItems<Sale>('sales');
            const idx = list.findIndex(s => s.id === sale.id);
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...sale };
                saveLocalItems<Sale>('sales', list);
            }
            return true;
        }
    }
};

export const api = {
    employees: createCrud<Employee>('employees', mapEmployeeFromDB, mapEmployeeToDB),
    customers: createCrud<Customer>('clientes', mapCustomerFromDB, mapCustomerToDB),
    services: createCrud<Service>('services', mapServiceFromDB, mapServiceToDB),
    expenses: createCrud<Expense>('expenses', mapExpenseFromDB, mapExpenseToDB),
    production: createCrud<ProductionLog>('production_logs', mapProductionFromDB, mapProductionToDB),
    waste: createCrud<WasteLog>('waste_logs', mapWasteFromDB, mapWasteToDB),
    pickup: createCrud<PickupRequest>('pickup_requests', mapPickupFromDB, mapPickupToDB),
    shifts: createCrud<CashShift>('cash_shifts', mapShiftFromDB, mapShiftToDB),
    categories: createCrud<Category>('categories', mapCategoryFromDB, mapCategoryToDB),
    expenseCategories: createCrud<ExpenseCategory>('expense_categories', mapExpenseCatFromDB, mapExpenseCatToDB),
    
    // Auxiliary tables with explicit mappers to fix potential fetch errors
    units: createCrud<MeasurementUnit>('measurement_units', mapUnitFromDB, mapUnitToDB),
    washTypes: createCrud<WashType>('wash_types', mapWashTypeFromDB, mapWashTypeToDB),
    paymentMethods: createCrud<PaymentMethod>('payment_methods', mapPaymentMethodFromDB, mapPaymentMethodToDB),
    incomes: createCrud<Income>('incomes', mapIncomeFromDB, mapIncomeToDB),
    
    sales: salesApi,
    settings: settingsApi,
    tenants: tenantsApi
};