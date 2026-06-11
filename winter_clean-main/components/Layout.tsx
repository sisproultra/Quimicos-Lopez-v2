import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { ViewState } from '../types';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Package, 
  Factory, 
  Truck, 
  DollarSign, 
  Settings as SettingsIcon,
  Shield,
  Menu,
  Beaker,
  User,
  ClipboardList,
  FileText,
  Droplets,
  BarChart,
  LogOut,
  ShoppingBag,
  CreditCard,
  Wallet,
  Briefcase,
  Terminal,
  Scale,
  MinusCircle,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Archive,
  History,
  AlertTriangle
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  exchangeRateData?: { compra: number; venta: number; fecha: string } | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, exchangeRateData }) => {
  const { themeStyles: themeColors, ticketConfig, currentUser, logout, sales, expenses } = useContext(AppContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProductionMenuOpen, setIsProductionMenuOpen] = useState(false);

  const isFullWidthView = ['dashboard', 'pos', 'logistics', 'production', 'route', 'prod_bulk', 'prod_packaged', 'prod_history', 'prod_waste', 'sales_history'].includes(currentView);

  const hasPendingLiquidations = useMemo(() => {
    const pendingPayments = sales.some(s => !s.deleted && s.payments.some(p => (p.status || 'por_validar') === 'por_validar'));
    const pendingExpenses = expenses.some(e => !e.deleted && e.status === 'por_validar');
    return pendingPayments || pendingExpenses;
  }, [sales, expenses]);

  const hasPermission = (view: ViewState) => {
      if (!currentUser) return true;
      if (view === 'programmer' || view === 'admin_saas' || view === 'system_config') {
          return currentUser.role === 'programmer';
      }
      if (currentUser.role === 'admin') return true;
      return currentUser.permissions.includes(view);
  };

  const NavItem = ({ view, icon: Icon, label, blink, onClick }: { view: ViewState, icon: any, label: string, blink?: boolean, onClick?: () => void }) => {
    if (!hasPermission(view)) return null;

    const isActive = currentView === view;

    return (
      <button
        onClick={() => {
          if (onClick) onClick();
          onChangeView(view);
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
          isActive 
            ? `bg-gradient-to-r from-[#51B01E] to-[#439618] text-white shadow-lg shadow-emerald-950/40 font-bold scale-[1.02]` 
            : `text-slate-400 hover:text-white hover:bg-slate-900/60 hover:scale-[1.01]`
        } ${blink ? 'animate-pulse bg-red-950/30 border border-red-900/30' : ''}`}
      >
        {isActive && (
          <span className="absolute left-1 top-1/4 bottom-1/4 w-1 bg-white rounded-r-md"></span>
        )}
        <div className={`transition-transform duration-300 group-hover:scale-110 ${blink ? 'text-red-500 animate-bounce' : isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#51B01E]'}`}>
          <Icon size={18} />
        </div>
        <span className={`text-[13px] tracking-wide text-left ${blink ? 'text-red-400 font-extrabold' : 'font-semibold'}`}>{label}</span>
        
        {!isActive && !blink && (
          <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#51B01E] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        )}
      </button>
    );
  };

  const handleLogout = () => {
      logout();
  };

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-100 border-r border-slate-900 transform transition-transform duration-250 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col relative overflow-hidden flex-shrink-0
      `}>
        {/* Subtle decorative glowing backdrops in sidebar */}
        <div className="absolute top-0 -left-12 w-32 h-32 bg-[#51B01E]/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-20 -right-12 w-32 h-32 bg-[#DC2626]/8 rounded-full blur-2xl pointer-events-none"></div>

        <div className="p-5 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center gap-3 relative z-10">
          <div className="bg-white p-1.5 rounded-2xl shadow-md ring-2 ring-[#51B01E]/30 hover:scale-105 hover:rotate-1 transition-all duration-300 flex-shrink-0">
            <img 
              src="https://i.ibb.co/G4kXfrPz/logosinfondolopoez.png" 
              alt="Logo Lopez" 
              className="h-10 w-auto object-contain max-w-[50px]" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-[#51B01E] tracking-wider leading-tight uppercase bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/20 truncate">QUÍMICOS LOPEZ</span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wide leading-none mt-1 uppercase">SISTEMA COMERCIAL</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto relative z-10">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-4 mt-2 select-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#51B01E] rounded-full"></span>
            OPERACIÓN
          </div>
          <NavItem view="pos" icon={ShoppingCart} label="Nueva Venta" />
          <NavItem view="quotations" icon={FileText} label="Cotizaciones López" />
          {/* <NavItem view="guia_remision" icon={Truck} label="Guías de Remisión" /> */}
          <NavItem view="inventory" icon={Package} label="Productos" />
          <NavItem view="customers" icon={Users} label="Clientes" />
          <NavItem view="purchases" icon={ShoppingBag} label="Compra" />
          <NavItem view="sales_history" icon={ClipboardList} label="Ventas" />
          <NavItem view="accounts_payable" icon={Wallet} label="Cuentas por Pagar" />
          <NavItem view="finance" icon={DollarSign} label="Cobranzas" />
          
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-4 mt-6 select-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#DC2626] rounded-full"></span>
            ADMINISTRACIÓN
          </div>
          <NavItem view="suppliers" icon={Briefcase} label="Proveedores" />
          <NavItem view="employees" icon={User} label="Personal" />
          <NavItem view="settings" icon={SettingsIcon} label="Configuración" />

          {currentUser?.role === 'programmer' && (
              <>
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-3 px-4 mt-6 select-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                    PROGRAMADOR
                  </div>
                  <NavItem view="system_config" icon={Terminal} label="Config Sistema" />
                  <NavItem view="programmer" icon={Shield} label="Admin del Sistema" />
              </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-900 bg-slate-950/40 relative z-10">
            <div className="flex items-center gap-2 px-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-850 relative overflow-hidden group">
                <span className="absolute -top-6 -right-6 w-12 h-12 bg-[#51B01E]/5 rounded-full blur-lg"></span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#51B01E] to-[#84CC16] flex items-center justify-center text-white font-black text-xs shadow-md shadow-emerald-950/50 flex-shrink-0">
                    {currentUser?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-200 truncate leading-snug">{currentUser?.firstName || 'Usuario'}</p>
                    <p className="text-[9px] text-slate-400 truncate font-semibold uppercase tracking-wider">{currentUser?.role || 'Invitado'}</p>
                </div>
                <button 
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 text-xs font-black text-red-400 bg-red-950/40 hover:bg-red-900/50 hover:text-red-300 border border-red-900/30 transition-all px-2.5 py-1.5 rounded-xl cursor-pointer shadow-sm relative z-10 active:scale-95" 
                    title="Cerrar Sesión"
                >
                    <LogOut size={13} />
                    <span className="hidden sm:inline text-[11px]">Salir</span>
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 relative overflow-hidden">
        {/* Subtle decorative glowing mesh waves in main workspace area */}
        <div className="absolute top-1/4 right-[10%] w-[600px] h-[600px] bg-[#51B01E]/3 rounded-full blur-[130px] pointer-events-none select-none"></div>
        <div className="absolute bottom-1/4 left-[10%] w-[600px] h-[600px] bg-[#DC2626]/2 rounded-full blur-[130px] pointer-events-none select-none"></div>

        <header className="h-16 bg-slate-950 text-white border-b border-slate-900 flex items-center justify-between px-4 flex-shrink-0 relative z-20">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-300 hover:bg-slate-900 rounded-lg">
              <Menu size={24} />
            </button>
            <span className="font-extrabold text-sm tracking-tight text-white uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#51B01E] animate-pulse"></span>
              {ticketConfig.shopName && !ticketConfig.shopName.includes('Winter Clean') ? ticketConfig.shopName : 'Químicos López'}
            </span>
          </div>

          {/* Tipo de Cambio SUNAT */}
          {exchangeRateData ? (
            <div className="flex items-center gap-2.5 bg-slate-900/85 border border-slate-800/80 px-3 py-1.5 rounded-xl">
               <div className="hidden sm:flex flex-col text-right leading-none">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Tasa de Cambio</span>
                 <span className="text-[9px] text-slate-400 font-bold mt-1 leading-none">SUNAT: {exchangeRateData.fecha}</span>
               </div>
               <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>
               <div className="flex gap-2.5 text-[11px] font-mono font-bold leading-none select-none">
                  <div className="flex flex-col items-center">
                     <span className="text-[7px] font-extrabold text-[#51B01E] uppercase tracking-wider scale-95 leading-none">Compra</span>
                     <span className="text-slate-100 text-[11px] font-black mt-1 leading-none">S/ {exchangeRateData.compra.toFixed(3)}</span>
                  </div>
                  <div className="h-4.5 w-px bg-slate-800/80"></div>
                  <div className="flex flex-col items-center">
                     <span className="text-[7px] font-extrabold text-blue-400 uppercase tracking-wider scale-95 leading-none">Venta</span>
                     <span className="text-slate-100 text-[11px] font-black mt-1 leading-none">S/ {exchangeRateData.venta.toFixed(3)}</span>
                  </div>
               </div>
            </div>
          ) : (
            <div className="text-[10px] font-bold text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-[#51B01E] animate-pulse"></span>
               TC SUNAT...
            </div>
          )}
        </header>

        <div className={`flex-1 ${isFullWidthView ? 'h-full' : 'overflow-y-auto p-4 lg:p-8'} relative z-10`}>
          <div className={`${isFullWidthView ? 'h-full' : 'max-w-7xl mx-auto h-full'}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
