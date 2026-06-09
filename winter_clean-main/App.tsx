import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard'; 
import { Pos } from './components/Pos'; 
import { InventoryManager } from './components/InventoryManager'; 
import { ProductionPanel } from './components/ProductionPanel'; 
import { Logistics } from './components/Logistics'; 
import { CustomerManager } from './components/CustomerManager';
import { EmployeeManager } from './components/EmployeeManager';
import { FinanceManager } from './components/FinanceManager'; 
import { Settings } from './components/Settings';
import { AdminSaas } from './components/AdminSaas';
import { SalesHistory } from './components/SalesHistory';
import { SuppliesControl } from './components/SuppliesControl';
import { ReportsPanel } from './components/ReportsPanel';
import { Login } from './components/Login';
import { PurchaseManager } from './components/PurchaseManager';
import { Collections } from './components/Collections';
import { AccountsPayable } from './components/AccountsPayable';
import { SupplierManager } from './components/SupplierManager';
import { SystemConfig } from './components/SystemConfig';
import { Liquidations } from './components/Liquidations';
import { RegGasto } from './components/RegGasto';
import { RouteMap } from './components/RouteMap';
import { QuotationManager } from './components/QuotationManager';
import { GuiaRemisionForm } from './components/GuiaRemisionForm';

import { 
  Sale, Customer, Service, ViewState, AppContextType, ProductionLog, 
  PaymentMethod, TicketConfig, Employee, Category, MeasurementUnit, SaleStatus,
  Expense, ExpenseCategory, WashType, PickupRequest, CashShift, SaasConfig, Income, WasteLog, Purchase, Supplier, PackagingEntry,
  Quotation, QuotationItem, GuiaRemision
} from './types';

import { INITIAL_TICKET_CONFIG, INITIAL_SERVICES, INITIAL_CUSTOMERS, INITIAL_EMPLOYEES, INITIAL_PAYMENT_METHODS, INITIAL_SALES, INITIAL_CATEGORIES, INITIAL_UNITS, INITIAL_SUPPLIERS } from './constants';
import { api } from './services/api';
import { supabase } from './services/supabaseClient';

export const AppContext = React.createContext<AppContextType>({} as AppContextType);

const mapTenantToTicketConfig = (tenant: any, currentConfig: TicketConfig): TicketConfig => {
  return {
    ...currentConfig,
    shopName: tenant.nombre_comercial || tenant.razon_social || currentConfig.shopName,
    ruc: tenant.ruc || currentConfig.ruc,
    address: tenant.direccion || currentConfig.address,
    phone: tenant.telefono || currentConfig.phone,
    logoUrl: tenant.logo_url || currentConfig.logoUrl,
    solUser: tenant.usuario_sol || currentConfig.solUser,
    solPassword: tenant.pass_sol || currentConfig.solPassword,
    signaturePassword: tenant.firma_contra || currentConfig.signaturePassword,
    productionMode: tenant.tipo_proceso === '1'
  };
};

const mapTicketConfigToTenant = (config: TicketConfig, existingTenantId?: string): any => {
  const tenant: any = {
    ruc: config.ruc || '',
    razon_social: config.shopName || '',
    nombre_comercial: config.shopName || '',
    direccion: config.address || '',
    telefono: config.phone || '',
    logo_url: config.logoUrl || '',
    usuario_sol: config.solUser || 'MODDATOS',
    pass_sol: config.solPassword || 'MODDATOS',
    firma_contra: config.signaturePassword || 'MODDATOS',
    firma_pas: config.signaturePassword || 'MODDATOS',
    tipo_proceso: config.productionMode ? '1' : '3',
    ubigeo: '150101',
    departamento: 'LIMA',
    provincia: 'LIMA',
    distrito: 'LIMA',
    codigo_pais: 'PE',
    activo: true
  };
  if (existingTenantId) {
    tenant.id = existingTenantId;
  }
  return tenant;
};

// Non-caching hook for client states to support real-time Supabase operations exclusively
const usePersistentState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  return useState<T>(initialValue);
};

const App: React.FC = () => {
  const [dbSyncing, setDbSyncing] = useState(true);
  const [sales, setSales] = usePersistentState<Sale[]>('wc_sales', []);
  const [customers, setCustomers] = usePersistentState<Customer[]>('wc_customers', []);
  const [suppliers, setSuppliers] = usePersistentState<Supplier[]>('wc_suppliers', []);
  const [services, setServices] = usePersistentState<Service[]>('wc_services', []); 
  const [employees, setEmployees] = usePersistentState<Employee[]>('wc_employees', []);
  const [paymentMethods, setPaymentMethods] = usePersistentState<PaymentMethod[]>('wc_payment_methods', []);
  const [categories, setCategories] = usePersistentState<Category[]>('wc_categories', []);
  const [units, setUnits] = usePersistentState<MeasurementUnit[]>('wc_units', []);
  const [zones, setZones] = usePersistentState<string[]>('wc_zones', ['NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO', 'CALLAO']);
  
  const [productionLogs, setProductionLogs] = usePersistentState<ProductionLog[]>('wc_production_logs', []);
  const [wasteLogs, setWasteLogs] = usePersistentState<WasteLog[]>('wc_waste_logs', []);
  const [purchases, setPurchases] = usePersistentState<Purchase[]>('wc_purchases', []);
  const [apiToken, setApiToken] = usePersistentState<string>('wc_api_token', 'sk_1788.HCItQaSi85wlaVxswQnuEhnf7hJIRVB3');
  const [decolectaUrl, setDecolectaUrl] = usePersistentState<string>('wc_decolecta_url', 'https://api.decolecta.com/v1');
  
  const [quotations, setQuotations] = usePersistentState<Quotation[]>('wc_quotations', []);
  const [activeQuotationForPOS, setActiveQuotationForPOS] = useState<Quotation | null>(null);

  const addQuotation = (q: Quotation) => setQuotations(prev => [q, ...prev]);
  const updateQuotation = (q: Quotation) => setQuotations(prev => prev.map(item => item.id === q.id ? q : item));
  const deleteQuotation = (id: string) => setQuotations(prev => prev.map(item => item.id === id ? { ...item, deleted: true } : item));
  
  const [expenses, setExpenses] = usePersistentState<Expense[]>('wc_expenses', []);
  const [expenseCategories, setExpenseCategories] = usePersistentState<ExpenseCategory[]>('wc_expense_categories', [
      { id: '1', name: 'Alquiler', type: 'FIJO' },
      { id: '2', name: 'Servicios Básicos', type: 'FIJO' },
      { id: '3', name: 'Insumos', type: 'VARIABLE' },
      { id: '4', name: 'Transporte', type: 'VARIABLE' },
      { id: '5', name: 'Gasto de Ruta', type: 'VARIABLE' },
  ]);
  
  const [washTypes, setWashTypes] = usePersistentState<WashType[]>('wc_wash_types', [
      { id: '1', name: 'Lavado al Agua', description: 'Lavado estándar' },
      { id: '2', name: 'Lavado en Seco', description: 'Para prendas delicadas' }
  ]);
  
  const [pickupRequests, setPickupRequests] = usePersistentState<PickupRequest[]>('wc_pickup_requests', []);
  const [currentShift, setCurrentShift] = usePersistentState<CashShift | null>('wc_current_shift', null);
  const [saasConfig, setSaasConfig] = usePersistentState<SaasConfig>('wc_saas_config', { warningActive: false });
  const [incomes, setIncomes] = usePersistentState<Income[]>('wc_incomes', []); 
  const [ticketConfig, setTicketConfig] = usePersistentState<TicketConfig>('wc_ticket_config', INITIAL_TICKET_CONFIG);
  const [lastOrderNumber, setLastOrderNumber] = usePersistentState<number>('wc_last_order_id', 1003);
  const [guiasRemision, setGuiasRemision] = usePersistentState<GuiaRemision[]>('wc_guias_remision', []);

  const [theme, setTheme] = usePersistentState<string>('wc_theme', '#51B01E'); 
  const [currency, setCurrency] = useState<string>('S/');
  const [exchangeRate, setExchangeRate] = usePersistentState<number>('wc_exchange_rate', 3.75);
  const [currentView, setCurrentView] = useState<ViewState>('pos');

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  useEffect(() => {
      const storedUser = sessionStorage.getItem('winter_clean_user');
      if (storedUser) {
          try {
              setCurrentUser(JSON.parse(storedUser));
          } catch (e) {
              sessionStorage.removeItem('winter_clean_user');
          }
      }
  }, []);

  // Fetch real data from Supabase and handle auto-seeding if empty
  useEffect(() => {
    const fetchAllData = async () => {
      setDbSyncing(true);
      try {
        console.log("Connecting to Supabase and pulling active records...");
        
        // Fetch each data source in parallel for lightning-fast performance
        const [
          dbEmployees,
          dbCustomers,
          dbServices,
          dbExpenses,
          dbProduction,
          dbWaste,
          dbPickup,
          dbShifts,
          dbCategories,
          dbExpenseCategories,
          dbUnits,
          dbWashTypes,
          dbPaymentMethods,
          dbIncomes,
          dbSales,
        ] = await Promise.all([
          api.employees.getAll(),
          api.customers.getAll(),
          api.services.getAll(),
          api.expenses.getAll(),
          api.production.getAll(),
          api.waste.getAll(),
          api.pickup.getAll(),
          api.shifts.getAll(),
          api.categories.getAll(),
          api.expenseCategories.getAll(),
          api.units.getAll(),
          api.washTypes.getAll(),
          api.paymentMethods.getAll(),
          api.incomes.getAll(),
          api.sales.getAll(),
        ]);

        // Check if DB has already been seeded to prevent auto-repopulating empty tables on subsequent loads
        let hasBeenSeeded = false;
        try {
          const seededStatus = await api.settings.get('wc_seeded_status', null);
          if (seededStatus === 'true' || localStorage.getItem('wc_seeded_status') === 'true') {
            hasBeenSeeded = true;
          }
        } catch (err) {
          console.error("Error reading seeded status:", err);
        }

        const databaseHasAnyData = (dbServices && dbServices.length > 0) || 
                                   (dbEmployees && dbEmployees.length > 1) || // admin is always 1, more means other data exists
                                   (dbCategories && dbCategories.length > 0);
        
        if (databaseHasAnyData) {
          hasBeenSeeded = true;
        }

        // Seeding default categories if empty
        try {
          if (dbCategories && dbCategories.length > 0) {
            setCategories(dbCategories);
          } else if (!hasBeenSeeded) {
            console.log("Seeding default categories to Supabase...");
            for (const cat of INITIAL_CATEGORIES) {
              await api.categories.upsert(cat);
            }
            setCategories(INITIAL_CATEGORIES);
          } else {
            setCategories([]);
          }
        } catch (catError) {
          console.error("Failed to seed categories:", catError);
          setCategories(INITIAL_CATEGORIES);
        }

        // Seeding default units if empty
        try {
          if (dbUnits && dbUnits.length > 0) {
            setUnits(dbUnits);
          } else if (!hasBeenSeeded) {
            console.log("Seeding default units to Supabase...");
            for (const uni of INITIAL_UNITS) {
              await api.units.upsert(uni);
            }
            setUnits(INITIAL_UNITS);
          } else {
            setUnits([]);
          }
        } catch (unitError) {
          console.error("Failed to seed units:", unitError);
          setUnits(INITIAL_UNITS);
        }

        // Seeding default payment methods if empty
        try {
          if (dbPaymentMethods && dbPaymentMethods.length > 0) {
            setPaymentMethods(dbPaymentMethods);
          } else if (!hasBeenSeeded) {
            console.log("Seeding default payment methods to Supabase...");
            for (const pm of INITIAL_PAYMENT_METHODS) {
              await api.paymentMethods.upsert(pm);
            }
            setPaymentMethods(INITIAL_PAYMENT_METHODS);
          } else {
            setPaymentMethods([]);
          }
        } catch (pmError) {
          console.error("Failed to seed payment methods:", pmError);
          setPaymentMethods(INITIAL_PAYMENT_METHODS);
        }

        // Seeding default employees if empty
        try {
          if (dbEmployees && dbEmployees.length > 0) {
            setEmployees(dbEmployees);
          } else if (!hasBeenSeeded) {
            console.log("Seeding default employees to Supabase...");
            for (const emp of INITIAL_EMPLOYEES) {
              await api.employees.upsert(emp);
            }
            setEmployees(INITIAL_EMPLOYEES);
          } else {
            setEmployees([]);
          }
        } catch (empError) {
          console.error("Failed to seed employees:", empError);
          setEmployees(INITIAL_EMPLOYEES);
        }

        // Seeding default services (products / raw materials) if empty
        try {
          if (dbServices && dbServices.length > 0) {
            setServices(dbServices);
          } else if (!hasBeenSeeded) {
            console.log("Seeding default services to Supabase...");
            for (const srv of INITIAL_SERVICES) {
              await api.services.upsert(srv);
            }
            setServices(INITIAL_SERVICES);
          } else {
            setServices([]);
          }
        } catch (srvError) {
          console.error("Failed to seed database services:", srvError);
          setServices(INITIAL_SERVICES);
        }

        // Mark in database and local storage that the database has been initialized/seeded
        if (!hasBeenSeeded) {
          try {
            await api.settings.set('wc_seeded_status', 'true');
            localStorage.setItem('wc_seeded_status', 'true');
          } catch (err) {
            console.error("Failed to save seeded status:", err);
          }
        }

        // Apply fallback or loaded values for other states
        if (dbCustomers) setCustomers(dbCustomers);
        if (dbExpenses) setExpenses(dbExpenses);
        if (dbProduction) setProductionLogs(dbProduction);
        if (dbWaste) setWasteLogs(dbWaste);
        if (dbPickup) setPickupRequests(dbPickup);
        if (dbExpenseCategories) setExpenseCategories(dbExpenseCategories);
        if (dbWashTypes) setWashTypes(dbWashTypes);
        if (dbIncomes) setIncomes(dbIncomes);
        if (dbSales) setSales(dbSales);

        // Recover open cash shift if any exists
        if (dbShifts && dbShifts.length > 0) {
          const openShift = dbShifts.find(s => s.status === 'open');
          if (openShift) {
            setCurrentShift(openShift);
          }
        }

        // Load settings from settings table
        const savedTheme = await api.settings.get('wc_theme', null);
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          setTheme('#51B01E');
        }

        const savedExchangeRate = await api.settings.get('wc_exchange_rate', null);
        if (savedExchangeRate) setExchangeRate(Number(savedExchangeRate));

        const savedTicketConfig = await api.settings.get('wc_ticket_config', null);
        let finalConfig = savedTicketConfig || INITIAL_TICKET_CONFIG;
        try {
          const dbTenant = await api.tenants.get();
          if (dbTenant) {
            finalConfig = mapTenantToTicketConfig(dbTenant, finalConfig);
          }
        } catch (err) {
          console.error("Error loading tenant from tenants table:", err);
        }
        setTicketConfig(finalConfig);

        const savedLastOrderId = await api.settings.get('wc_last_order_id', null);
        if (savedLastOrderId) setLastOrderNumber(Number(savedLastOrderId));

        console.log("🚀 Supabase tables synchronized successfully!");
      } catch (error) {
        console.error("❌ Error loading data from Supabase:", error);
      } finally {
        setDbSyncing(false);
      }
    };

    fetchAllData();
  }, []);

  const themeStyles = useMemo(() => {
    return {
        primary: 'bg-[#51B01E]',
        hover: 'hover:bg-[#439618]',
        text: 'text-[#51B01E]',
        bgLight: 'bg-[#51B01E]/10',
        border: 'border-[#51B01E]/20',
        ring: 'focus:ring-[#51B01E]',
        badge: 'bg-[#51B01E]/10 text-[#51B01E]'
    };
  }, []);

  const handleSetTheme = async (t: string) => {
    setTheme(t);
    await api.settings.set('wc_theme', t);
  };

  const handleSetExchangeRate = async (r: number) => {
    setExchangeRate(r);
    await api.settings.set('wc_exchange_rate', r);
  };

  const handleSetTicketConfig = async (c: TicketConfig) => {
    setTicketConfig(c);
    await api.settings.set('wc_ticket_config', c);
    
    // Guardar también en la tabla tenants de Supabase
    try {
      const existingTenant = await api.tenants.get();
      const tenantPayload = mapTicketConfigToTenant(c, existingTenant?.id);
      await api.tenants.save(tenantPayload);
      console.log("Datos de empresa guardados en la tabla tenants de Supabase con éxito.");
    } catch (err) {
      console.error("Error al guardar datos en la tabla tenants:", err);
    }
  };

  const getNextOrderNumber = () => {
    const next = lastOrderNumber + 1;
    setLastOrderNumber(next);
    api.settings.set('wc_last_order_id', next);
    return next.toString().padStart(6, '0');
  };

  const addSale = async (sale: Sale) => {
    setSales(prev => [sale, ...prev]);
    await api.sales.create(sale);
    
    // Auto-deduct stock if enabled
    setServices(prevServices => {
        return prevServices.map(service => {
            const soldItem = sale.items.find(item => item.serviceId === service.id);
            if (soldItem && service.trackStock) {
                const currentStock = service.stock || 0;
                const newStock = Math.max(0, currentStock - soldItem.quantity);
                const updated = { ...service, stock: newStock };
                api.services.update(service.id, updated);
                return updated;
            }
            return service;
        });
    });
  };

  const addPurchase = (purchase: Purchase) => {
    const purchaseWithStatus = {
      status: 'pendiente' as const,
      ...purchase
    };
    setPurchases(prev => [purchaseWithStatus, ...prev]);
  };

  const receivePurchase = async (purchaseId: string, invoiceNumber: string, dayExchangeRate: number, receivedItems: PurchaseItem[], finalPaymentMethodId?: string) => {
    setPurchases(prev => {
      return prev.map(p => {
        if (p.id === purchaseId) {
          const updatedItems = receivedItems.map(item => {
            let cost = item.cost;
            let costUsd = item.costUsd;
            let subtotal = item.subtotal;
            let subtotalUsd = item.subtotalUsd;

            if (p.currency === 'USD') {
              cost = (costUsd || 0) * dayExchangeRate;
              subtotal = (subtotalUsd || 0) * dayExchangeRate;
            } else {
              costUsd = cost / dayExchangeRate;
              subtotalUsd = subtotal / dayExchangeRate;
            }

            return {
              ...item,
              cost,
              costUsd,
              subtotal,
              subtotalUsd
            };
          });

          const total = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
          const totalUsd = updatedItems.reduce((sum, item) => sum + (item.subtotalUsd || 0), 0);

          return {
            ...p,
            status: 'recibido',
            invoiceNumber,
            receivedDate: new Date().toISOString(),
            exchangeRate: dayExchangeRate,
            items: updatedItems,
            total,
            totalUsd,
            paymentMethodId: finalPaymentMethodId || p.paymentMethodId
          };
        }
        return p;
      });
    });

    const targetPurchase = purchases.find(p => p.id === purchaseId);
    if (targetPurchase) {
      const updatedItems = receivedItems.map(item => {
        let cost = item.cost;
        let costUsd = item.costUsd;
        let subtotal = item.subtotal;
        let subtotalUsd = item.subtotalUsd;

        if (targetPurchase.currency === 'USD') {
          cost = (costUsd || 0) * dayExchangeRate;
          subtotal = (subtotalUsd || 0) * dayExchangeRate;
        } else {
          costUsd = cost / dayExchangeRate;
          subtotalUsd = subtotal / dayExchangeRate;
        }

        return {
          ...item,
          cost,
          costUsd,
          subtotal,
          subtotalUsd
        };
      });

      const total = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

      // Upgrade services stock and save to db
      setServices(prevServices => {
          return prevServices.map(service => {
              const pItem = updatedItems.find(pi => pi.insumoId === service.id);
              if (pItem) {
                  const updated = { 
                      ...service, 
                      stock: (service.stock || 0) + pItem.quantity,
                      price: pItem.cost
                  };
                  api.services.update(service.id, updated);
                  return updated;
              }
              return service;
          });
      });

      // Register purchase expense
      const newExpense: Expense = {
          id: `PUR-${targetPurchase.id}`,
          description: `Compra [OC: ${targetPurchase.id} | Factura: ${invoiceNumber}]: ${updatedItems.map(i => i.insumoName).join(', ')}`,
          amount: total, 
          categoryId: '3', 
          category: 'Insumos',
          type: 'VARIABLE',
          date: new Date().toISOString(),
          paymentMethodId: finalPaymentMethodId || targetPurchase.paymentMethodId,
          staffName: targetPurchase.createdBy,
          status: 'confirmado'
      };
      setExpenses(prev => [newExpense, ...prev]);
      await api.expenses.create(newExpense);
    }
  };

  const updateSale = async (sale: Sale) => {
    setSales(prev => prev.map(s => s.id === sale.id ? sale : s));
    await api.sales.update(sale);
  };

  const updateSaleStatus = async (id: string, status: SaleStatus) => {
    setSales(prev => prev.map(s => {
      if (s.id === id) {
          const updated = { ...s, status };
          api.sales.update(updated);
          return updated;
      }
      return s;
    }));
  };

  const deleteSale = async (id: string) => {
    setSales(prev => prev.map(s => {
      if (s.id === id) {
          const updated = { ...s, deleted: true };
          api.sales.update(updated);
          return updated;
      }
      return s;
    }));
  };

  const addGuiaRemision = (g: GuiaRemision) => setGuiasRemision(prev => [g, ...prev]);
  const updateGuiaRemision = (g: GuiaRemision) => setGuiasRemision(prev => prev.map(item => item.id === g.id ? g : item));

  const addCustomer = async (c: Customer) => {
    setCustomers(prev => [...prev, c]);
    await api.customers.create(c);
  };

  const updateCustomer = async (c: Customer) => {
    setCustomers(prev => prev.map(cust => cust.id === c.id ? c : cust));
    await api.customers.update(c.id, c);
  };

  const deleteCustomer = async (id: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
          const updated = { ...c, deleted: true };
          api.customers.update(id, updated);
          return updated;
      }
      return c;
    }));
  };

  const refreshCustomers = async () => {
    try {
      const dbCustomers = await api.customers.getAll();
      if (dbCustomers) {
        setCustomers(dbCustomers);
      }
    } catch (error) {
      console.error("Error refreshing customers from Supabase:", error);
    }
  };

  const addSupplier = (s: Supplier) => setSuppliers(prev => [...prev, s]);
  const updateSupplier = (s: Supplier) => setSuppliers(prev => prev.map(sup => sup.id === s.id ? s : sup));
  const deleteSupplier = (id: string) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, deleted: true } : s));

  const addProduct = async (p: Service) => {
    setServices(prev => [...prev, p]);
    await api.services.create(p);
  };

  const updateProduct = async (p: Service) => {
    setServices(prev => prev.map(prod => prod.id === p.id ? p : prod));
    await api.services.update(p.id, p);
  };

  const deleteProduct = async (id: string) => {
    setServices(prev => prev.map(p => {
      if (p.id === id) {
          const updated = { ...p, deleted: true };
          api.services.update(id, updated);
          return updated;
      }
      return p;
    }));
  };

  const addEmployee = async (e: Employee) => {
    setEmployees(prev => [...prev, e]);
    await api.employees.create(e);
  };

  const updateEmployee = async (e: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === e.id ? e : emp));
    await api.employees.update(e.id, e);
  };

  const deleteEmployee = async (id: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === id) {
          const updated = { ...e, deleted: true };
          api.employees.update(id, updated);
          return updated;
      }
      return e;
    }));
  };

  const addCategory = async (c: Category) => {
    setCategories(prev => [...prev, c]);
    await api.categories.create(c);
  };

  const updateCategory = async (c: Category) => {
    setCategories(prev => prev.map(cat => cat.id === c.id ? c : cat));
    await api.categories.update(c.id, c);
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id === id) {
          const updated = { ...c, deleted: true };
          api.categories.update(id, updated);
          return updated;
      }
      return c;
    }));
  };

  const addUnit = async (u: MeasurementUnit) => {
    setUnits(prev => [...prev, u]);
    await api.units.create(u);
  };

  const deleteUnit = async (id: string) => {
    setUnits(prev => prev.map(u => {
      if (u.id === id) {
          const updated = { ...u, deleted: true };
          api.units.update(id, updated);
          return updated;
      }
      return u;
    }));
  };

  const addExpense = async (e: Expense) => {
    setExpenses(prev => [...prev, e]);
    await api.expenses.create(e);
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.map(e => {
      if (e.id === id) {
          const updated = { ...e, deleted: true };
          api.expenses.update(id, updated);
          return updated;
      }
      return e;
    }));
  };

  const updateExpense = async (e: Expense) => {
    setExpenses(prev => prev.map(ex => ex.id === e.id ? e : ex));
    await api.expenses.update(e.id, e);
  };
  
  const addExpenseCategory = async (cat: ExpenseCategory) => {
    setExpenseCategories(prev => [...prev, cat]);
    await api.expenseCategories.create(cat);
  };

  const deleteExpenseCategory = async (id: string) => {
    setExpenseCategories(prev => prev.map(c => {
      if (c.id === id) {
          const updated = { ...c, deleted: true };
          api.expenseCategories.update(id, updated);
          return updated;
      }
      return c;
    }));
  };

  const addWashType = async (wt: WashType) => {
    setWashTypes(prev => [...prev, wt]);
    await api.washTypes.create(wt);
  };

  const deleteWashType = async (id: string) => {
    setWashTypes(prev => prev.map(w => {
      if (w.id === id) {
          const updated = { ...w, deleted: true };
          api.washTypes.update(id, updated);
          return updated;
      }
      return w;
    }));
  };

  const addPickupRequest = async (req: PickupRequest) => {
    setPickupRequests(prev => [...prev, req]);
    await api.pickup.create(req);
  };

  const updatePickupRequest = async (req: PickupRequest) => {
    setPickupRequests(prev => prev.map(r => r.id === req.id ? req : r));
    await api.pickup.update(req.id, req);
  };

  const deletePickupRequest = async (id: string) => {
    setPickupRequests(prev => prev.map(r => {
      if (r.id === id) {
          const updated = { ...r, deleted: true };
          api.pickup.update(id, updated);
          return updated;
      }
      return r;
    }));
  };

  const addPaymentMethod = async (pm: PaymentMethod) => {
    setPaymentMethods(prev => [...prev, pm]);
    await api.paymentMethods.create(pm);
  };

  const updatePaymentMethod = async (pm: PaymentMethod) => {
    setPaymentMethods(prev => prev.map(p => p.id === pm.id ? pm : p));
    await api.paymentMethods.update(pm.id, pm);
  };

  const deletePaymentMethod = async (id: string) => {
    setPaymentMethods(prev => prev.map(p => {
      if (p.id === id) {
          const updated = { ...p, deleted: true };
          api.paymentMethods.update(id, updated);
          return updated;
      }
      return p;
    }));
  };

  const openCashShift = async (initialAmount: number, user: string) => {
      const newShift: CashShift = {
          id: Date.now().toString(),
          openedAt: new Date().toISOString(),
          openedBy: user,
          initialAmount,
          totalCashSales: 0,
          totalNonCashSales: 0,
          totalCashExpenses: 0,
          totalNonCashExpenses: 0,
          totalOtherIncome: 0,
          expectedAmount: initialAmount,
          status: 'open'
      };
      setCurrentShift(newShift);
      await api.shifts.create(newShift);
  };

  const closeCashShift = async (finalAmount: number, notes: string, user: string) => {
      if (currentShift) {
          const updated = {
              ...currentShift,
              closedAt: new Date().toISOString(),
              closedBy: user,
              finalAmount,
              notes,
              status: 'closed' as const
          };
          setCurrentShift(null);
          await api.shifts.update(updated.id, updated);
      }
  };

  const addIncome = async (income: Income) => {
      setIncomes(prev => [...prev, income]);
      await api.incomes.create(income);
  };

  const addZone = (zone: string) => {
    if (!zones.includes(zone.toUpperCase())) {
      setZones(prev => [...prev, zone.toUpperCase()]);
    }
  };

  useEffect(() => {
      if (currentShift && currentShift.status === 'open') {
          const shiftStart = new Date(currentShift.openedAt).getTime();
          const shiftSales = sales.filter(s => !s.deleted && new Date(s.date).getTime() >= shiftStart);
          let cashSales = 0;
          let nonCashSales = 0;
          shiftSales.forEach(s => {
              s.payments.forEach(p => {
                  if (new Date(p.date || s.date).getTime() >= shiftStart) {
                      if (p.methodName.toLowerCase() === 'efectivo') {
                          cashSales += p.amount;
                      } else {
                          nonCashSales += p.amount;
                      }
                  }
              });
              if (s.change && s.change > 0) {
                  cashSales -= s.change;
              }
          });
          const shiftExpenses = expenses.filter(e => !e.deleted && new Date(e.date).getTime() >= shiftStart);
          const cashExpenses = shiftExpenses.filter(e => {
             const pm = paymentMethods.find(p => p.id === e.paymentMethodId);
             return pm?.name.toLowerCase() === 'efectivo';
          }).reduce((acc, e) => acc + e.amount, 0);
          const nonCashExpensesTotal = shiftExpenses.filter(e => {
             const pm = paymentMethods.find(p => p.id === e.paymentMethodId);
             return pm?.name.toLowerCase() !== 'efectivo';
          }).reduce((acc, e) => acc + e.amount, 0);
          const shiftIncome = incomes.filter(i => new Date(i.date).getTime() >= shiftStart).reduce((acc, i) => acc + i.amount, 0);
          const expected = currentShift.initialAmount + cashSales + shiftIncome - cashExpenses;
          setCurrentShift(prev => prev ? ({
              ...prev,
              totalCashSales: cashSales,
              totalNonCashSales: nonCashSales,
              totalCashExpenses: cashExpenses,
              totalNonCashExpenses: nonCashExpensesTotal,
              totalOtherIncome: shiftIncome,
              expectedAmount: expected,
          }) : null);
      }
  }, [sales, expenses, incomes, paymentMethods]); 

  const produceItem = (log: ProductionLog): { success: boolean; message: string } => {
      const product = services.find(s => s.id === log.productId && !s.deleted);
      if (!product) return { success: false, message: 'Producto no encontrado' };
      if (product.type !== 'PRODUCTO_TERMINADO') return { success: false, message: 'Solo se pueden producir Productos Terminados' };
      if (!product.recipe || product.recipe.length === 0) return { success: false, message: 'El producto no tiene receta definida' };
      
      // Validation: Check if ingredients are sufficient
      for (const ingredient of product.recipe) {
          const insumo = services.find(s => s.id === ingredient.id && !s.deleted);
          if (!insumo) return { success: false, message: `Insumo no encontrado: ${ingredient.name}` };
          const requiredQty = ingredient.quantity * log.quantityProduced;
          if ((insumo.stock || 0) < requiredQty) {
              return { success: false, message: `Stock insuficiente de ${insumo.name}. Requiere: ${requiredQty}, Disponible: ${insumo.stock}` };
          }
      }

      // Action: Deduct ingredients and increase bulk stock
      let updatedServices = [...services];
      product.recipe.forEach(ingredient => {
          updatedServices = updatedServices.map(s => {
              if (s.id === ingredient.id) {
                  const requiredQty = ingredient.quantity * log.quantityProduced;
                  return { ...s, stock: Math.max(0, (s.stock || 0) - requiredQty) };
              }
              return s;
          });
      });
      
      updatedServices = updatedServices.map(s => {
          if (s.id === product.id) {
              return { ...s, stock: (s.stock || 0) + log.quantityProduced };
          }
          return s;
      });

      setServices(updatedServices);
      setProductionLogs(prev => [{...log, packagedVolume: 0, packaging: [], status: 'open'}, ...prev]);
      return { success: true, message: `Producción de ${log.quantityProduced}L confirmada. Lote: ${log.batchNumber}` };
  };

  const addPackagingToBatch = (batchId: string, entry: PackagingEntry): { success: boolean; message: string } => {
      const batch = productionLogs.find(b => b.id === batchId);
      if (!batch) return { success: false, message: 'Lote no encontrado' };

      const available = batch.quantityProduced - batch.packagedVolume;
      if (entry.totalVolume > available + 0.01) {
          return { success: false, message: `Volumen insuficiente en el lote. Disponible: ${available.toFixed(2)}L` };
      }

      const bulkProduct = services.find(s => s.id === batch.productId);
      const targetSku = services.find(s => s.id === entry.targetProductId);

      if (!bulkProduct || (bulkProduct.stock || 0) < entry.totalVolume - 0.01) {
          return { success: false, message: `Stock insuficiente del producto a granel (${bulkProduct?.name}).` };
      }

      // Update stocks
      const updatedServices = services.map(s => {
          if (s.id === bulkProduct.id) {
              return { ...s, stock: Math.max(0, (s.stock || 0) - entry.totalVolume) };
          }
          if (s.id === entry.targetProductId) {
              return { ...s, stock: (s.stock || 0) + entry.quantity };
          }
          return s;
      });

      setServices(updatedServices);

      // Update Production Logs
      const updatedLogs = productionLogs.map(l => {
          if (l.id === batchId) {
              const newPackagedVolume = l.packagedVolume + entry.totalVolume;
              return {
                  ...l,
                  packagedVolume: newPackagedVolume,
                  packaging: [...(l.packaging || []), entry],
                  status: newPackagedVolume >= l.quantityProduced - 0.1 ? 'closed' : 'open'
              } as ProductionLog;
          }
          return l;
      });

      setProductionLogs(updatedLogs);
      return { success: true, message: `Envasado de ${entry.quantity} unidades registrado con éxito.` };
  };

  const registerWaste = (log: WasteLog): { success: boolean; message: string } => {
      const product = services.find(s => s.id === log.productId && !s.deleted);
      if (!product) return { success: false, message: 'Producto no encontrado' };
      if (!product.trackStock) return { success: false, message: 'Este producto no controla stock' };
      const updatedServices = services.map(s => {
          if (s.id === product.id) {
              return { ...s, stock: Math.max(0, (s.stock || 0) - log.quantity) };
          }
          return s;
      });
      setServices(updatedServices);
      setWasteLogs(prev => [log, ...prev]);
      return { success: true, message: `Merma registrada para ${log.productName}` };
  };

  const login = async (u: string, p: string) => {
      const user = employees.find(e => 
          e.username.toLowerCase() === u.toLowerCase() && 
          e.password === p && 
          !e.deleted && 
          e.active
      );
      if (user) {
          try {
              // Si el login es un correo electonico lo usamos directamente, sino usamos gmail.com
              const emailToUse = user.username.includes('@') ? user.username : `${user.username}@gmail.com`;
              const { error } = await supabase.auth.signInWithPassword({
                  email: emailToUse,
                  password: p
              });
              if (error) {
                  console.warn("No se pudo iniciar sesión en Supabase Auth, continuando de forma local:", error.message);
              } else {
                  console.log("Sesión de Supabase Auth iniciada para:", emailToUse);
                  // Load tenant config immediately upon successful authentication
                  try {
                      const dbTenant = await api.tenants.get();
                      if (dbTenant) {
                          setTicketConfig(prev => mapTenantToTicketConfig(dbTenant, prev));
                      }
                  } catch (tenantErr) {
                      console.error("Could not fetch tenant config after login:", tenantErr);
                  }
              }
          } catch (supErr) {
              console.error("Error al autenticar con Supabase Auth:", supErr);
          }

          setCurrentUser(user);
          sessionStorage.setItem('winter_clean_user', JSON.stringify(user));
          setCurrentView(user.permissions.includes('pos') ? 'pos' : (user.permissions[0] || 'pos'));
          return true;
      }
      return false;
  };

  const logout = () => {
      sessionStorage.removeItem('winter_clean_user');
      localStorage.removeItem('winter_clean_user'); 
      setCurrentUser(null);
  };

  const contextValue: AppContextType = {
    sales, quotations, activeQuotationForPOS, setActiveQuotationForPOS, addQuotation, updateQuotation, deleteQuotation,
    customers, suppliers, services, employees, paymentMethods, categories, units, productionLogs, wasteLogs,
    expenses, expenseCategories, washTypes, pickupRequests, currentShift, saasConfig, purchases, apiToken, decolectaUrl, zones,
    currentUser, login, logout,
    theme, themeStyles, currency, exchangeRate, ticketConfig, currentView,
    setCurrentView, setTheme, setCurrency, setExchangeRate, setTicketConfig: handleSetTicketConfig, setSaasConfig, setCurrentUser, getNextOrderNumber, setApiToken, setDecolectaUrl, setZones, addZone,
    addSale, updateSale, updateSaleStatus, deleteSale,
    addCustomer, updateCustomer, deleteCustomer, refreshCustomers,
    addSupplier, updateSupplier, deleteSupplier,
    addProduct, updateProduct, deleteProduct,
    addService: addProduct, updateService: updateProduct, deleteService: deleteProduct,
    addEmployee, updateEmployee, deleteEmployee,
    addCategory, updateCategory, deleteCategory,
    addUnit, deleteUnit,
    addExpense, deleteExpense, updateExpense,
    addExpenseCategory, deleteExpenseCategory,
    addWashType, deleteWashType,
    addPickupRequest, updatePickupRequest, deletePickupRequest,
    addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
    openCashShift, closeCashShift, addIncome,
    produceItem, registerWaste, addPurchase, receivePurchase, addPackagingToBatch,
    guiasRemision, addGuiaRemision, updateGuiaRemision
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <InventoryManager />;
      case 'production': 
      case 'prod_bulk':
      case 'prod_packaged':
      case 'prod_history':
      case 'prod_waste':
        return <ProductionPanel />;
      case 'pos': return <Pos />; 
      case 'logistics': return <Logistics />; 
      case 'finance': return <FinanceManager />;
      case 'customers': return <CustomerManager />;
      case 'employees': return <EmployeeManager />;
      case 'settings': return <Settings />;
      case 'admin_saas': return <AdminSaas />;
      case 'programmer': return <AdminSaas />; 
      case 'sales_history': return <SalesHistory />;
      case 'supplies': return <SuppliesControl />;
      case 'reports': return <ReportsPanel />;
      case 'purchases': return <PurchaseManager />;
      case 'collections': return <Collections />;
      case 'accounts_payable': return <AccountsPayable />;
      case 'suppliers': return <SupplierManager />;
      case 'system_config': return <SystemConfig />;
      case 'liquidations': return <Liquidations />;
      case 'reg_gasto': return <RegGasto />;
      case 'route': return <RouteMap />;
      case 'quotations': return <QuotationManager />;
      case 'guia_remision': return <GuiaRemisionForm />;
      default: return <Dashboard />;
    }
  };

  if (!currentUser) {
      return (
          <AppContext.Provider value={contextValue}>
              <Login />
          </AppContext.Provider>
      );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Layout currentView={currentView} onChangeView={setCurrentView}>
        {renderView()}
      </Layout>
    </AppContext.Provider>
  );
};

export default App;
