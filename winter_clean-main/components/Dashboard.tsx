
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Activity, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  PieChart as PieChartIcon, 
  Calendar, 
  User, 
  CreditCard, 
  Wallet, 
  AlertCircle, 
  BarChart2, 
  Repeat,
  Printer,
  FileText,
  Filter,
  RefreshCcw,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS_GENDER = ['#3b82f6', '#ec4899', '#94a3b8'];
const COLORS_PAYMENT = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#64748b'];

export const Dashboard: React.FC = () => {
  const { sales, customers, services, expenses, theme, themeStyles: themeColors, currency, ticketConfig, purchases, paymentMethods } = useContext(AppContext);
  
  // --- FILTERS STATE ---
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [topMetric, setTopMetric] = useState<'revenue' | 'visits'>('revenue');

  // --- FILTERED DATA LOGIC ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return saleDate >= startDate && saleDate <= endDate && !s.deleted;
    });
  }, [sales, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const expDate = e.date.split('T')[0];
      return expDate >= startDate && expDate <= endDate && !e.deleted;
    });
  }, [expenses, startDate, endDate]);

  const validSales = useMemo(() => filteredSales.filter(s => s.status !== 'cancelado'), [filteredSales]);
  
  // --- STATS CALCULATIONS ---
  const totalRevenue = validSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const avgTicket = validSales.length > 0 ? totalRevenue / validSales.length : 0;
  const totalDebt = validSales.reduce((sum, sale) => sale.balance > 0 ? sum + sale.balance : sum, 0);

  // Nueva métrica: Cuentas por Pagar (Compras al crédito)
  const totalAccountsPayable = useMemo(() => {
    return purchases
      .filter(p => !p.deleted)
      .filter(p => {
        const method = paymentMethods.find(m => m.id === p.paymentMethodId);
        return method?.name.toLowerCase().includes('crédito');
      })
      .reduce((acc, p) => acc + p.total, 0);
  }, [purchases, paymentMethods]);

  const newCustomersCount = useMemo(() => {
    const uniqueInPeriod = new Set(validSales.map(s => s.customerId)).size;
    return uniqueInPeriod;
  }, [validSales]);

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    validSales.forEach(s => {
      const day = new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      dailyMap[day] = (dailyMap[day] || 0) + s.total;
    });
    return Object.entries(dailyMap).map(([name, amount]) => ({ name, amount }));
  }, [validSales]);

  const paymentData = useMemo(() => {
      const map: Record<string, number> = {};
      validSales.forEach(s => {
          s.payments.forEach(p => {
              const name = p.methodName || 'Desconocido';
              map[name] = (map[name] || 0) + p.amount;
          });
      });
      return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [validSales]);

  const topCategories = useMemo(() => {
      const catMap: Record<string, number> = {};
      validSales.forEach(sale => {
          sale.items.forEach(item => {
             const service = services.find(s => s.id === item.serviceId);
             const category = service ? service.category : 'Otros';
             catMap[category] = (catMap[category] || 0) + item.subtotal;
          });
      });
      return Object.entries(catMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  }, [validSales, services]);

  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const salesByDay = new Array(7).fill(0);
    validSales.forEach(s => {
        const d = new Date(s.date).getDay();
        salesByDay[d] += s.total;
    });
    return days.map((day, index) => ({ name: day, total: salesByDay[index] }));
  }, [validSales]);

  const topSpenders = useMemo(() => {
    const spenderMap: Record<string, number> = {};
    validSales.forEach(sale => {
        const key = sale.customerId;
        spenderMap[key] = (spenderMap[key] || 0) + sale.total;
    });
    return Object.entries(spenderMap)
        .map(([id, total]) => {
            const customer = customers.find(c => c.id === id);
            const name = customer ? customer.name : 'Cliente S/N';
            return { id, name, value: total };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [validSales, customers]);

  const frequentVisitors = useMemo(() => {
     const visitMap: Record<string, number> = {};
     validSales.forEach(sale => {
         const key = sale.customerId;
         visitMap[key] = (visitMap[key] || 0) + 1;
     });
     return Object.entries(visitMap)
        .map(([id, count]) => {
             const customer = customers.find(c => c.id === id);
             const name = customer ? customer.name : 'Cliente S/N';
             return { id, name, value: count };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [validSales, customers]);

  const currentTopList = topMetric === 'revenue' ? topSpenders : frequentVisitors;

  const operationalMetrics = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
        if (sale.status === 'pendiente') acc.pending++;
        else if (['en_preparacion', 'despachado', 'en_ruta', 'por_lavar'].includes(sale.status)) acc.inProgress++;
        else if (sale.status === 'entregado' || sale.status === 'lavado') acc.delivered++;
        return acc;
    }, { pending: 0, inProgress: 0, delivered: 0 });
  }, [filteredSales]);

  const handlePrintFullReport = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    const logoHtml = ticketConfig.logoUrl ? `<img src="${ticketConfig.logoUrl}" style="max-height: 60px; margin-bottom: 10px;" />` : '';
    const today = new Date().toLocaleString();

    printWindow.document.write(`
        <html>
            <head>
                <title>Reporte de Resumen - ${ticketConfig.shopName}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
                    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 24px; color: #0f172a; }
                    .header p { margin: 5px 0 0 0; font-size: 14px; color: #64748b; }
                    .period-badge { display: inline-block; background: #f1f5f9; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-top: 10px; }
                    .section { margin-bottom: 30px; }
                    .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #475569; border-left: 4px solid ${theme}; padding-left: 10px; margin-bottom: 15px; background: #f8fafc; padding-top: 5px; padding-bottom: 5px; }
                    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                    .card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
                    .card h3 { margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; }
                    .card .value { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    th { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; }
                    td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
                    .text-right { text-align: right; }
                    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${logoHtml}
                    <h1>REPORTE DE RESUMEN EJECUTIVO</h1>
                    <p>${ticketConfig.shopName}</p>
                    <div class="period-badge">PERIODO: ${startDate} al ${endDate}</div>
                </div>
                <div class="section">
                    <div class="section-title">Resumen Financiero</div>
                    <div class="grid">
                        <div class="card">
                            <h3>Ventas Totales</h3>
                            <div class="value">${currency} ${totalRevenue.toFixed(2)}</div>
                        </div>
                        <div class="card">
                            <h3>Gastos Totales</h3>
                            <div class="value">${currency} ${totalExpenses.toFixed(2)}</div>
                        </div>
                        <div class="card">
                            <h3>Ganancia Neta</h3>
                            <div class="value" style="color: ${netProfit >= 0 ? '#059669' : '#dc2626'}">${currency} ${netProfit.toFixed(2)}</div>
                        </div>
                        <div class="card">
                            <h3>Cuentas por Cobrar</h3>
                            <div class="value" style="color: #dc2626">${currency} ${totalDebt.toFixed(2)}</div>
                        </div>
                        <div class="card">
                            <h3>Cuentas por Pagar</h3>
                            <div class="value" style="color: #ea580c">${currency} ${totalAccountsPayable.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                <!-- ... resto del reporte ... -->
                <script>window.onload = function() { window.print(); }</script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  const resetFilters = () => {
    const d = new Date();
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 lg:p-6 space-y-6 animate-fade-in pb-20">
      
      {/* --- TOP BAR & FILTERS --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Panel de Control</h2>
          <p className="text-slate-500 text-xs">Rendimiento del negocio en tiempo real.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                    <Calendar size={14} className="text-slate-400" />
                </div>
                <div className="flex items-center gap-2 px-1">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-[12px] font-bold text-slate-700 outline-none w-28"
                    />
                    <ArrowRight size={12} className="text-slate-300" />
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-[12px] font-bold text-slate-700 outline-none w-28"
                    />
                </div>
                <button onClick={resetFilters} className="p-1.5 text-slate-400 hover:text-indigo-600"><RefreshCcw size={14} /></button>
            </div>

            <button 
              onClick={handlePrintFullReport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all shadow-md"
            >
              <Printer size={16} /> Reporte A4
            </button>
        </div>
      </div>

      {/* --- SECCIÓN 1: RESUMEN FINANCIERO (COMPACTO) --- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Ingresos" 
          value={`${currency}${totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          color="text-emerald-600" 
          bg="bg-emerald-50"
        />
         <StatCard 
          title="Egresos" 
          value={`${currency}${totalExpenses.toLocaleString()}`} 
          icon={TrendingDown} 
          color="text-rose-600" 
          bg="bg-rose-50"
        />
        <StatCard 
          title="Utilidad" 
          value={`${currency}${netProfit.toLocaleString()}`} 
          icon={TrendingUp} 
          color={netProfit >= 0 ? "text-blue-600" : "text-rose-600"} 
          bg={netProfit >= 0 ? "bg-blue-50" : "bg-rose-50"}
        />
        <StatCard 
          title="Por Cobrar" 
          value={`${currency}${totalDebt.toLocaleString()}`} 
          icon={Wallet} 
          color="text-amber-600" 
          bg="bg-amber-50"
        />
        <StatCard 
          title="Por Pagar" 
          value={`${currency}${totalAccountsPayable.toLocaleString()}`} 
          icon={CreditCard} 
          color="text-orange-600" 
          bg="bg-orange-50"
        />
      </div>

      {/* --- SECCIÓN 2: KPIs OPERATIVOS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">Ticket Promedio</p>
                  <h3 className="text-lg font-bold text-slate-800">{currency}{avgTicket.toFixed(2)}</h3>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><BarChart2 size={18} /></div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">Pedidos Totales</p>
                  <h3 className="text-lg font-bold text-slate-800">{filteredSales.length}</h3>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><ShoppingBag size={18} /></div>
          </div>

           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">Clientes Activos</p>
                  <h3 className="text-lg font-bold text-slate-800">{newCustomersCount}</h3>
              </div>
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Users size={18} /></div>
          </div>
      </div>

      {/* --- SECCIÓN 3: GRÁFICOS --- */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={16} /></div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">Métodos de Pago</h3>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={paymentData}
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                        >
                            {paymentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_PAYMENT[index % COLORS_PAYMENT.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                             contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                             formatter={(value: number) => [`${currency}${value.toFixed(2)}`, 'Monto']}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="font-bold text-slate-800 text-sm">Ventas Diarias</h3>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500"><Activity size={16}/></div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} tickFormatter={(value) => `${currency}${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f8fafc'}}
                  formatter={(value: number) => [`${currency}${value.toFixed(2)}`, 'Monto']}
                />
                <Bar dataKey="amount" fill={theme} radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN 4: ESTADO OPERATIVO Y RANKING --- */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Estado Operativo</h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
             <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex justify-between items-center transition-all hover:translate-x-1">
               <div>
                 <div className="text-amber-800 font-black text-lg">{operationalMetrics.pending}</div>
                 <div className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Pendientes</div>
               </div>
               <Clock className="text-amber-400" size={24} />
             </div>
             <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex justify-between items-center transition-all hover:translate-x-1">
               <div>
                 <div className="text-indigo-800 font-black text-lg">{operationalMetrics.inProgress}</div>
                 <div className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider">En Proceso</div>
               </div>
               <ShoppingBag className="text-indigo-400" size={24} />
             </div>
             <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex justify-between items-center transition-all hover:translate-x-1">
               <div>
                  <div className="text-emerald-800 font-black text-lg">{operationalMetrics.delivered}</div>
                  <div className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Entregados</div>
               </div>
               <Sparkles className="text-emerald-400" size={24} />
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-80">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><BarChart2 size={16} /></div>
                        <h3 className="font-bold text-slate-800 text-sm">Top Clientes</h3>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        <button onClick={() => setTopMetric('revenue')} className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${topMetric === 'revenue' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Ingresos</button>
                        <button onClick={() => setTopMetric('visits')} className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${topMetric === 'visits' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Visitas</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
                    {currentTopList.map((customer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-[10px] ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</div>
                                <span className="font-bold text-slate-700 text-xs truncate max-w-[100px]">{customer.name}</span>
                            </div>
                            <div className="font-mono font-bold text-slate-800 text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">
                                {topMetric === 'revenue' ? `${currency}${customer.value.toLocaleString()}` : `${customer.value} Pedidos`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-80">
                 <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><PieChartIcon size={16} /></div>
                    <h3 className="font-bold text-slate-800 text-sm">Categorías</h3>
                </div>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCategories} layout="vertical" margin={{left: -20, right: 10}}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 9, fontWeight: 700}} width={80} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', fontSize: '11px' }} formatter={(value: number) => [`${currency}${value.toFixed(2)}`, 'Ventas']} />
                            <Bar dataKey="value" fill={theme} radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md h-full flex flex-col justify-between">
    <div className="flex justify-between items-start mb-2">
      <div className={`${bg} ${color} p-2 rounded-lg`}>
        <Icon size={18} />
      </div>
    </div>
    <div>
        <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</h3>
        <p className="text-lg font-black mt-0.5 text-slate-800 truncate">{value}</p>
    </div>
  </div>
);
