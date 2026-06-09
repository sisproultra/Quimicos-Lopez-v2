import { Customer, Service, Sale, Employee, Category, MeasurementUnit, PaymentMethod, TicketConfig, Supplier } from './types';

export const IGV_RATE = 0.18;

export const INITIAL_UNITS: MeasurementUnit[] = [
    { id: '1', name: 'Litro', symbol: 'Lt' },
    { id: '2', name: 'Galón (3.78L)', symbol: 'Gal' },
    { id: '3', name: 'Bidón (5L)', symbol: 'Bid5' },
    { id: '4', name: 'Bidón (20L)', symbol: 'Bid20' },
    { id: '5', name: 'Kilogramo', symbol: 'Kg' },
    { id: '6', name: 'Unidad', symbol: 'Und' },
    { id: '7', name: 'Saco (25Kg)', symbol: 'Sac25' },
    { id: '8', name: 'Mililitro', symbol: 'ml' },
    { id: '9', name: 'Gramo', symbol: 'gr' },
];

export const INITIAL_CATEGORIES: Category[] = [
    { id: '1', name: 'Insumos Químicos', icon: 'Flask' }, 
    { id: '2', name: 'Envases y Etiquetas', icon: 'Package' },
    { id: '3', name: 'Detergentes', icon: 'Droplets' },
    { id: '4', name: 'Desinfectantes', icon: 'Shield' },
    { id: '5', name: 'Limpieza Automotriz', icon: 'Car' }, 
    { id: '6', name: 'Aromatizantes', icon: 'Wind' },
    { id: '7', name: 'Lavavajillas', icon: 'Sparkles' },
    { id: '8', name: 'Cuidado Personal', icon: 'User' },
];

export const INITIAL_INSUMOS: Service[] = [
    { 
        id: 'INS-001', name: 'Hipoclorito de Sodio (Cloro)', price: 2.50, unit: 'Kg', category: 'Insumos Químicos', categoryId: '1', 
        type: 'INSUMO', trackStock: true, stock: 1000, internalCode: 'RAW-CLORO',
        maxStock: 2000, alertLow: 20, alertHigh: 70
    },
    { 
        id: 'INS-002', name: 'Soda Caústica Escamas', price: 4.50, unit: 'Kg', category: 'Insumos Químicos', categoryId: '1', 
        type: 'INSUMO', trackStock: true, stock: 500, internalCode: 'RAW-SODA',
        maxStock: 800, alertLow: 15, alertHigh: 60
    },
    { 
        id: 'INS-006', name: 'Agua Tratada/Destilada', price: 0.10, unit: 'Lt', category: 'Insumos Químicos', categoryId: '1', 
        type: 'INSUMO', trackStock: true, stock: 5000, internalCode: 'RAW-H2O',
        maxStock: 10000, alertLow: 30, alertHigh: 80
    },
    { 
        id: 'INS-007', name: 'Texapon N70 (Lauril)', price: 12.00, unit: 'Kg', category: 'Insumos Químicos', categoryId: '1', 
        type: 'INSUMO', trackStock: true, stock: 300, internalCode: 'RAW-TEX-N70',
        maxStock: 500, alertLow: 20, alertHigh: 70
    },
    { 
        id: 'INS-008', name: 'Comperlan (Amida de Coco)', price: 15.00, unit: 'Kg', category: 'Insumos Químicos', categoryId: '1', 
        type: 'INSUMO', trackStock: true, stock: 150, internalCode: 'RAW-COMP',
        maxStock: 300, alertLow: 20, alertHigh: 70
    },
    { 
        id: 'INS-009', name: 'Ácido Sulfónico', price: 10.00, unit: 'Kg', category: 'Insumos Químicos', categoryId: '1', 
        type: 'INSUMO', trackStock: true, stock: 200, internalCode: 'RAW-ACID-SULF',
        maxStock: 400, alertLow: 25, alertHigh: 75
    },
];

export const INITIAL_PRODUCTS: Service[] = [
    { 
        id: 'PROD-BULK-001', name: 'Lejía Maestra (Bulk)', price: 0, unit: 'Lt', category: 'Desinfectantes', categoryId: '4', 
        type: 'PRODUCTO_TERMINADO', subtype: 'BULK', trackStock: true, stock: 500, internalCode: 'BLK-LEJIA',
        recipe: [
            { id: 'INS-001', name: 'Hipoclorito de Sodio (Cloro)', quantity: 0.25, unit: 'Kg' },
            { id: 'INS-006', name: 'Agua Tratada/Destilada', quantity: 0.75, unit: 'Lt' }
        ]
    },
    { 
        id: 'PROD-SKU-001', name: 'Lejía Premium 5L', price: 12.50, unit: 'Und', category: 'Desinfectantes', categoryId: '4', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 85, internalCode: 'SKU-LEJ-5L',
    },
    { 
        id: 'PROD-BULK-002', name: 'Detergente Rosa Maestra (Bulk)', price: 0, unit: 'Lt', category: 'Detergentes', categoryId: '3', 
        type: 'PRODUCTO_TERMINADO', subtype: 'BULK', trackStock: true, stock: 200, internalCode: 'BLK-DET-ROSA',
        recipe: [
            { id: 'INS-007', name: 'Texapon N70 (Lauril)', quantity: 0.15, unit: 'Kg' },
            { id: 'INS-009', name: 'Ácido Sulfónico', quantity: 0.05, unit: 'Kg' },
            { id: 'INS-006', name: 'Agua Tratada/Destilada', quantity: 0.8, unit: 'Lt' }
        ]
    },
    { 
        id: 'PROD-SKU-002', name: 'Detergente Aroma Rosas 4L', price: 25.00, unit: 'Und', category: 'Detergentes', categoryId: '3', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 64, internalCode: 'SKU-DET-4L',
    },
    { 
        id: 'PROD-SKU-003', name: 'Detergente Industrial Multiusos 10L', price: 45.00, unit: 'Und', category: 'Detergentes', categoryId: '3', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 40, internalCode: 'SKU-DET-IND-10L',
    },
    { 
        id: 'PROD-SKU-004', name: 'Silicona Emulsionada para Tablero Galón', price: 38.00, unit: 'Gal', category: 'Limpieza Automotriz', categoryId: '5', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 32, internalCode: 'SKU-SIL-EMUL',
    },
    { 
        id: 'PROD-SKU-005', name: 'Desinfectante Pino Silvestre 5L', price: 15.00, unit: 'Und', category: 'Desinfectantes', categoryId: '4', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 55, internalCode: 'SKU-PINO-5L',
    },
    { 
        id: 'PROD-SKU-006', name: 'Champú para Carrocería Alta espuma 5L', price: 18.50, unit: 'Und', category: 'Limpieza Automotriz', categoryId: '5', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 120, internalCode: 'SKU-CHAMP-AUTO-5L',
    },
    { 
        id: 'PROD-SKU-007', name: 'Desengrasante Multiusos Cítrico Garrafa 5L', price: 28.00, unit: 'Und', category: 'Detergentes', categoryId: '3', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 75, internalCode: 'SKU-DESENG-5L',
    },
    { 
        id: 'PROD-SKU-008', name: 'Aromatizante Lavanda Concentrado Galón', price: 21.00, unit: 'Gal', category: 'Aromatizantes', categoryId: '6', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 90, internalCode: 'SKU-AROM-LAV',
    },
    { 
        id: 'PROD-SKU-009', name: 'Saca Sarro Líquido Ultra Activo 2L', price: 10.50, unit: 'Und', category: 'Desinfectantes', categoryId: '4', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 150, internalCode: 'SKU-SARRO-2L',
    },
    { 
        id: 'PROD-SKU-010', name: 'Jabón Líquido Antibacterial para Manos 5L', price: 24.50, unit: 'Und', category: 'Cuidado Personal', categoryId: '8', 
        type: 'PRODUCTO_TERMINADO', subtype: 'PACKAGED', trackStock: true, stock: 65, internalCode: 'SKU-JABON-5L',
    }
];

export const INITIAL_SERVICES: Service[] = [...INITIAL_INSUMOS, ...INITIAL_PRODUCTS];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Distribuidora Santa Anita', phone: '999-000-111', docType: 'RUC', docNumber: '20555555551', address: 'Mercado Productores', district: 'Santa Anita', notes: 'Recibe mercadería de 8am a 11am', gpsLocation: { lat: -12.0395, lng: -76.9631 } },
  { id: '2', name: 'Bodega El Vecino', phone: '999-222-333', docType: 'DNI', docNumber: '40000002', address: 'Av. Los Pinos 123', district: 'Los Olivos', gpsLocation: { lat: -11.9622, lng: -77.0608 } },
  { id: '3', name: 'Lavandería Burbujas S.A.C.', phone: '988-777-666', docType: 'RUC', docNumber: '20601004561', address: 'Jr. Carabaya 540', district: 'Lima Cercado', notes: 'Comprador regular de detergentes y cloro', gpsLocation: { lat: -12.0463, lng: -77.0312 } },
  { id: '4', name: 'Car Wash El Veloz', phone: '977-111-222', docType: 'DNI', docNumber: '45892305', address: 'Av. Universitaria 3420', district: 'San Miguel', notes: 'Requiere siliconas y champú para autos', gpsLocation: { lat: -12.0728, lng: -77.0864 } },
  { id: '5', name: 'Inversiones Químicas J&P', phone: '965-444-333', docType: 'RUC', docNumber: '20773950112', address: 'Mz D Lote 12, Cooperativa Las Flores', district: 'San Juan de Lurigancho', notes: 'Compra soda caústica y ácido sulfónico', gpsLocation: { lat: -12.0150, lng: -76.9930 } }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
    { id: 'S1', name: 'Químicos Globales S.A.', docType: 'RUC', docNumber: '20123456789', contactName: 'Ing. Roberto Caro', phone: '01-4455667', address: 'Av. Industrial 450, Ate', email: 'ventas@quimicosglobales.pe', notes: 'Proveedor de Texapon y Soda Caústica' },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { 
      id: '1', firstName: 'Admin', lastName: 'Gerente', username: 'admin', password: '123', role: 'admin', active: true,
      permissions: ['dashboard', 'pos', 'customers', 'inventory', 'production', 'logistics', 'finance', 'settings', 'employees', 'sales_history', 'supplies', 'reports', 'collections', 'purchases', 'accounts_payable', 'route']
  },
  { 
      id: '99', firstName: 'J', lastName: 'Obregon', username: 'JOBREGON', password: 'oxsbfdx', role: 'programmer', active: true,
      permissions: ['dashboard', 'pos', 'customers', 'inventory', 'production', 'logistics', 'finance', 'settings', 'employees', 'admin_saas', 'sales_history', 'supplies', 'programmer', 'reports', 'collections', 'purchases', 'accounts_payable', 'route']
  },
];

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', name: 'Efectivo', icon: 'Banknote', color: 'green', isActive: true },
  { id: '2', name: 'Transferencia BCP', icon: 'Smartphone', color: 'purple', isActive: true },
  { id: '3', name: 'Yape / Plin', icon: 'QrCode', color: 'blue', isActive: true },
  { id: '4', name: 'Crédito 15 Días', icon: 'Clock', color: 'orange', isActive: true },
  { id: '5', name: 'Galoneras', icon: 'Package', color: 'emerald', isActive: true, fixedValue: 5.00 },
];

export const INITIAL_TICKET_CONFIG: TicketConfig = {
  shopName: 'Químicos e Inversiones López',
  ruc: '20604051984',
  address: 'Parque Industrial Mz C Lte 4, Lima',
  phone: '(01) 555-0987',
  schedule: 'Lun-Vie 8am - 6pm',
  policy: 'No se aceptan devoluciones de insumos químicos abiertos o adulterados. Verifique su carga en el despacho.',
  logoUrl: 'https://i.ibb.co/G4kXfrPz/logosinfondolopoez.png',
};

const BASE_INITIAL_SALES: Sale[] = [
    {
        id: '1001', customerId: '1', customerName: 'Distribuidora Santa Anita',
        date: new Date(Date.now() - 86400000 * 15).toISOString(), // 15 días atrás
        items: [{ serviceId: 'PROD-SKU-001', serviceName: 'Lejía Premium 5L', quantity: 20, price: 11.50, subtotal: 230.00 }], // Precio especial: 11.50 (normal 12.50)
        total: 230.00,
        status: 'entregado',
        paymentStatus: 'pagado',
        payments: [{ methodId: '2', methodName: 'Transferencia BCP', amount: 230.00, date: new Date(Date.now() - 86400000 * 15).toISOString() }],
        totalPaid: 230.00,
        balance: 0,
        change: 0,
        scheduledDeliveryDate: new Date(Date.now() - 86400000 * 15).toISOString()
    },
    {
        id: '1002', customerId: '3', customerName: 'Lavandería Burbujas S.A.C.',
        date: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 días atrás
        items: [
            { serviceId: 'PROD-SKU-001', serviceName: 'Lejía Premium 5L', quantity: 15, price: 12.00, subtotal: 180.00 }, // Precio: 12.00
            { serviceId: 'PROD-SKU-002', serviceName: 'Detergente Aroma Rosas 4L', quantity: 10, price: 24.00, subtotal: 240.00 } // Precio especial: 24.00 (normal 25.00)
        ],
        total: 420.00,
        status: 'entregado',
        paymentStatus: 'pagado',
        payments: [{ methodId: '3', methodName: 'Yape / Plin', amount: 420.00, date: new Date(Date.now() - 86400000 * 10).toISOString() }],
        totalPaid: 420.00,
        balance: 0,
        change: 0,
        scheduledDeliveryDate: new Date(Date.now() - 86400000 * 10).toISOString()
    },
    {
        id: '1003', customerId: '4', customerName: 'Car Wash El Veloz',
        date: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 días atrás
        items: [
            { serviceId: 'PROD-SKU-004', serviceName: 'Silicona Emulsionada para Tablero Galón', quantity: 5, price: 36.50, subtotal: 182.50 }, // Precio especial S/ 36.50
            { serviceId: 'PROD-SKU-002', serviceName: 'Detergente Aroma Rosas 4L', quantity: 6, price: 25.00, subtotal: 150.00 } // Precio normal S/ 25.00
        ],
        total: 332.50,
        status: 'entregado',
        paymentStatus: 'parcial',
        payments: [{ methodId: '1', methodName: 'Efectivo', amount: 200.00, date: new Date(Date.now() - 86400000 * 7).toISOString() }],
        totalPaid: 200.00,
        balance: 132.50,
        change: -132.50,
        scheduledDeliveryDate: new Date(Date.now() - 86400000 * 7).toISOString()
    },
    {
        id: '1004', customerId: '1', customerName: 'Distribuidora Santa Anita',
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        items: [
            { serviceId: 'PROD-SKU-001', serviceName: 'Lejía Premium 5L', quantity: 40, price: 11.00, subtotal: 440.00 }, // ¡Se lo vendió a un súper precio de S/ 11.00!
            { serviceId: 'PROD-SKU-002', serviceName: 'Detergente Aroma Rosas 4L', quantity: 15, price: 23.00, subtotal: 345.00 } // A S/ 23.00
        ],
        total: 785.00,
        status: 'entregado',
        paymentStatus: 'pagado',
        payments: [{ methodId: '2', methodName: 'Transferencia BCP', amount: 785.00, date: new Date(Date.now() - 86400000 * 5).toISOString() }],
        totalPaid: 785.00,
        balance: 0,
        change: 0,
        scheduledDeliveryDate: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
        id: '1005', customerId: '5', customerName: 'Inversiones Químicas J&P',
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        items: [
            { serviceId: 'INS-002', serviceName: 'Soda Caústica Escamas', price: 4.50, quantity: 100, subtotal: 450.00 },
            { serviceId: 'INS-009', serviceName: 'Ácido Sulfónico', price: 9.80, quantity: 40, subtotal: 392.00 }
        ],
        total: 842.00,
        status: 'despachado',
        paymentStatus: 'pendiente',
        payments: [],
        totalPaid: 0,
        balance: 842.00,
        change: -842.00,
        scheduledDeliveryDate: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
        id: '1006', customerId: '2', customerName: 'Bodega El Vecino',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        items: [
            { serviceId: 'PROD-SKU-001', serviceName: 'Lejía Premium 5L', quantity: 5, price: 12.50, subtotal: 62.50 }, // Precio de lista: S/ 12.50
            { serviceId: 'PROD-SKU-005', serviceName: 'Desinfectante Pino Silvestre 5L', quantity: 4, price: 15.00, subtotal: 60.00 } // S/ 15.00
        ],
        total: 122.50,
        status: 'en_ruta',
        paymentStatus: 'pagado',
        payments: [{ methodId: '3', methodName: 'Yape / Plin', amount: 122.50, date: new Date().toISOString() }],
        totalPaid: 122.50,
        balance: 0,
        change: 0,
        scheduledDeliveryDate: new Date().toISOString()
    },
    {
        id: '1007', customerId: '3', customerName: 'Lavandería Burbujas S.A.C.',
        date: new Date(Date.now() - 86400000 * 1).toISOString(),
        items: [
            { serviceId: 'PROD-SKU-003', serviceName: 'Detergente Industrial Multiusos 10L', quantity: 10, price: 42.00, subtotal: 420.00 }, // Precio especial S/ 42.00 (lista 45)
            { serviceId: 'INS-001', serviceName: 'Hipoclorito de Sodio (Cloro)', quantity: 150, price: 2.30, subtotal: 345.00 } // Cloro a granel S/ 2.30 (lista 2.50)
        ],
        total: 765.00,
        status: 'en_preparacion',
        paymentStatus: 'pagado',
        payments: [{ methodId: '2', methodName: 'Transferencia BCP', amount: 765.00, date: new Date().toISOString() }],
        totalPaid: 765.00,
        balance: 0,
        change: 0,
        scheduledDeliveryDate: new Date(Date.now() + 86400000 * 1).toISOString()
    },
    {
        id: '1008', customerId: '4', customerName: 'Car Wash El Veloz',
        date: new Date().toISOString(),
        items: [
            { serviceId: 'PROD-SKU-004', serviceName: 'Silicona Emulsionada para Tablero Galón', quantity: 3, price: 38.00, subtotal: 114.00 } // Precio normal S/ 38.00
        ],
        total: 114.00,
        status: 'pendiente',
        paymentStatus: 'pendiente',
        payments: [],
        totalPaid: 0,
        balance: 114.00,
        change: -114.00,
        scheduledDeliveryDate: new Date(Date.now() + 86400000 * 1).toISOString()
    }
];

const generateMockSales = (): Sale[] => {
    const mockCustomers = [
        { id: '1', name: 'Distribuidora Santa Anita', docType: 'RUC', docNumber: '20555555551' },
        { id: '2', name: 'Bodega El Vecino', docType: 'DNI', docNumber: '40000002' },
        { id: '3', name: 'Lavandería Burbujas S.A.C.', docType: 'RUC', docNumber: '20601004561' },
        { id: '4', name: 'Car Wash El Veloz', docType: 'DNI', docNumber: '45892305' },
        { id: '5', name: 'Inversiones Químicas J&P', docType: 'RUC', docNumber: '20773950112' }
    ];

    const mockProducts = [
        { id: 'INS-001', name: 'Hipoclorito de Sodio (Cloro)', price: 2.30, unit: 'Kg' },
        { id: 'INS-002', name: 'Soda Caústica Escamas', price: 4.50, unit: 'Kg' },
        { id: 'INS-007', name: 'Texapon N70 (Lauril)', price: 12.00, unit: 'Kg' },
        { id: 'INS-009', name: 'Ácido Sulfónico', price: 9.80, unit: 'Kg' },
        { id: 'PROD-SKU-001', name: 'Lejía Premium 5L', price: 12.50, unit: 'Und' },
        { id: 'PROD-SKU-002', name: 'Detergente Aroma Rosas 4L', price: 25.00, unit: 'Und' },
        { id: 'PROD-SKU-003', name: 'Detergente Industrial Multiusos 10L', price: 45.00, unit: 'Und' },
        { id: 'PROD-SKU-004', name: 'Silicona Emulsionada para Tablero Galón', price: 38.00, unit: 'Gal' },
        { id: 'PROD-SKU-005', name: 'Desinfectante Pino Silvestre 5L', price: 15.00, unit: 'Und' }
    ];

    const salesList: Sale[] = [];
    const docTypes: ('FACTURA' | 'BOLETA' | 'NOTA_PEDIDO')[] = ['FACTURA', 'BOLETA', 'NOTA_PEDIDO'];

    for (let i = 1; i <= 50; i++) {
        // Deterministic but varying selection using index i
        const customer = mockCustomers[(i - 1) % mockCustomers.length];
        const docType = docTypes[i % docTypes.length];
        
        // Varying date: spreading over the last 30 days
        const daysAgo = (i % 25) + 1;
        const hour = 8 + (i % 10);
        const minute = (i * 7) % 60;
        const date = new Date(Date.now() - 86400000 * daysAgo);
        date.setHours(hour, minute, 0, 0);

        // 1 or 2 products
        const prod1 = mockProducts[(i * 3) % mockProducts.length];
        const prod2 = mockProducts[(i * 7) % mockProducts.length];
        
        const q1 = ((i * 5) % 80) + 10; // quantity 10 to 90
        const sub1 = parseFloat((prod1.price * q1).toFixed(2));
        
        const items = [
            { serviceId: prod1.id, serviceName: prod1.name, quantity: q1, price: prod1.price, subtotal: sub1, unit: prod1.unit }
        ];

        let total = sub1;

        if (i % 2 === 0 && prod1.id !== prod2.id) {
            const q2 = ((i * 3) % 40) + 5;
            const sub2 = parseFloat((prod2.price * q2).toFixed(2));
            items.push({ serviceId: prod2.id, serviceName: prod2.name, quantity: q2, price: prod2.price, subtotal: sub2, unit: prod2.unit });
            total = parseFloat((total + sub2).toFixed(2));
        }

        const saleId = (1008 + i).toString();
        
        salesList.push({
            id: saleId,
            customerId: customer.id,
            customerName: customer.name,
            items: items,
            total: total,
            documentType: docType,
            clientDocNumber: customer.docNumber,
            status: 'entregado',
            paymentStatus: 'pagado',
            date: date.toISOString(),
            scheduledDeliveryDate: date.toISOString(),
            payments: [{ methodId: '2', methodName: 'Transferencia BCP', amount: total, date: date.toISOString() }],
            totalPaid: total,
            balance: 0,
            change: 0
        });
    }

    return salesList;
};

export const INITIAL_SALES: Sale[] = [
    ...BASE_INITIAL_SALES,
    ...generateMockSales()
];

