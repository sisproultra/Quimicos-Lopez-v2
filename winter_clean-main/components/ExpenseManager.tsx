import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Expense, ExpenseCategory, ExpenseType, PaymentMethod } from '../types';
import { Plus, Trash2, DollarSign, Tag, X, CreditCard, Banknote, Smartphone, QrCode, Wallet, AlertTriangle, Briefcase, User, Building, Clock } from 'lucide-react';

// Explicit Color Maps for Tailwind JIT
const PM_COLOR_STYLES: Record<string, string> = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
};

export const ExpenseManager: React.FC = () => {
  const { 
      expenses, addExpense, deleteExpense, paymentMethods, 
      themeStyles: themeColors, currency,
      expenseCategories, addExpenseCategory, deleteExpenseCategory,
      employees 
  } = useContext(AppContext);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ExpenseType>('VARIABLE');
  
  // Active methods
  const activePaymentMethods = useMemo(() => paymentMethods.filter(pm => pm.isActive && !pm.deleted), [paymentMethods]);

  // New Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<ExpenseType>('VARIABLE');
  const [newCatStaffRelated, setNewCatStaffRelated] = useState(false);

  // Delete Modal State
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const [formData, setFormData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    paymentMethodId: activePaymentMethods[0]?.id || '',
    type: 'VARIABLE'
  });

  const PaymentMethodIcon = ({ pm, size = 16 }: { pm: PaymentMethod, size?: number }) => {
    if (pm.imageIcon) {
      return <img src={pm.imageIcon} className="rounded-sm object-contain" style={{ width: size, height: size }} alt="" />;
    }
    switch(pm.icon) {
      case 'Smartphone': return <Smartphone size={size} />;
      case 'Banknote': return <Banknote size={size} />;
      case 'QrCode': return <QrCode size={size} />;
      case 'Clock': return <Clock size={size} />;
      case 'Wallet': return <Wallet size={size} />;
      default: return <CreditCard size={size} />;
    }
  };

  // Get category object from ID or default
  const handleCategoryChange = (catId: string) => {
      const cat = expenseCategories.find(c => c.id === catId);
      if (cat) {
          setFormData(prev => ({
              ...prev,
              categoryId: cat.id,
              category: cat.name,
              type: cat.type, 
          }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date || !formData.categoryId) return;

    const cat = expenseCategories.find(c => c.id === formData.categoryId);
    const selectedDate = new Date(formData.date + 'T00:00:00'); 
    const now = new Date();
    const isToday = selectedDate.getDate() === now.getDate() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getFullYear() === now.getFullYear();
    const finalDate = isToday ? now.toISOString() : new Date(formData.date).toISOString();

    const newExpense: Expense = {
        id: Date.now().toString(),
        description: formData.description,
        amount: formData.amount,
        categoryId: formData.categoryId,
        category: cat ? cat.name : 'General',
        type: activeTab,
        date: finalDate, 
        paymentMethodId: formData.paymentMethodId,
        staffId: formData.staffId,
        staffName: employees.find(e => e.id === formData.staffId)?.firstName
    };

    addExpense(newExpense);
    closeModal();
  };

  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCatName) return;
      const newCat: ExpenseCategory = {
          id: Date.now().toString(),
          name: newCatName,
          type: newCatType,
          isStaffRelated: newCatStaffRelated
      };
      addExpenseCategory(newCat);
      setIsCatModalOpen(false);
      setNewCatName('');
      setNewCatStaffRelated(false);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  const openModal = () => {
      const firstCat = expenseCategories.find(c => c.type === activeTab);
      const todayStr = new Date().toLocaleDateString('en-CA');

      setFormData({ 
        date: todayStr, 
        paymentMethodId: activePaymentMethods[0]?.id || '',
        type: activeTab,
        categoryId: firstCat?.id || '',
        category: firstCat?.name || ''
    });
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
  };

  // Filter Deleted Expenses
  const filteredExpenses = expenses
        .filter(e => !e.deleted && e.type === activeTab)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const availableCategories = expenseCategories.filter(c => c.type === activeTab);

  const selectedCatObj = expenseCategories.find(c => c.id === formData.categoryId);
  const needsStaff = selectedCatObj?.isStaffRelated;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestión de Gastos</h2>
            <p className="text-slate-500">Control de egresos operativos y administrativos.</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={() => setIsCatModalOpen(true)}
                className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
             >
                <Tag size={18} /> Conceptos
             </button>
            <button 
                onClick={openModal}
                className={`flex items-center gap-2 ${themeColors.primary} text-white px-4 py-2 rounded-lg ${themeColors.hover} transition-colors shadow-md`}
            >
                <Plus size={20} /> Registrar Gasto
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('VARIABLE')}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'VARIABLE' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <DollarSign size={16} /> Gastos Variables / Caja
          </button>
          <button
            onClick={() => setActiveTab('FIJO')}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'FIJO' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <Building size={16} /> Gastos Fijos / Admin
          </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
             <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Listado de Gastos ({activeTab === 'VARIABLE' ? 'Operativos' : 'Administrativos'})</span>
             <span className="text-lg font-bold text-red-600">Total: {currency} {totalExpenses.toFixed(2)}</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">Fecha</th>
                        <th className="p-4 font-semibold">Concepto</th>
                        <th className="p-4 font-semibold">Detalle / Personal</th>
                        <th className="p-4 font-semibold">Método Pago</th>
                        <th className="p-4 font-semibold">Monto</th>
                        <th className="p-4 font-semibold text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredExpenses.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                No hay gastos registrados en esta categoría.
                            </td>
                        </tr>
                    ) : (
                        filteredExpenses.map(expense => {
                            const pm = paymentMethods.find(p => p.id === expense.paymentMethodId);
                            
                            return (
                            <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-600 text-sm">
                                    {new Date(expense.date).toLocaleDateString()}
                                    <br/>
                                    <span className="text-xs text-slate-400">{new Date(expense.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold 
                                        ${expense.type === 'FIJO' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-700">
                                    <p className="font-medium">{expense.description}</p>
                                    {expense.staffName && (
                                        <div className="flex items-center gap-1 text-xs text-blue-600 mt-1 bg-blue-50 w-fit px-2 py-0.5 rounded">
                                            <User size={12} />
                                            {expense.staffName}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    {pm ? (
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded-md ${PM_COLOR_STYLES[pm.color] || 'bg-slate-100 text-slate-600'}`}>
                                                <PaymentMethodIcon pm={pm} />
                                            </div>
                                            <span className="text-sm text-slate-600">{pm.name}</span>
                                        </div>
                                    ) : <span className="text-slate-400">-</span>}
                                </td>
                                <td className="p-4 font-bold text-red-600">
                                    - {currency} {expense.amount.toFixed(2)}
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => setExpenseToDelete(expense)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        )})
                    )}
                </tbody>
            </table>
         </div>
      </div>

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Gasto?</h3>
            <p className="text-slate-500 mb-6 text-sm">
              Estás eliminando <span className="font-bold">{expenseToDelete.description}</span>. (Soft Delete)
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {isCatModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Nuevo Concepto</h3>
                      <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleAddCategory} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Concepto</label>
                          <input 
                            required
                            placeholder="Ej. Publicidad FB, Transporte"
                            className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none`}
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Gasto</label>
                          <select 
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none bg-white"
                            value={newCatType}
                            onChange={e => setNewCatType(e.target.value as ExpenseType)}
                          >
                              <option value="VARIABLE">Variable (Operativo / Diario)</option>
                              <option value="FIJO">Fijo (Admin / Mensual)</option>
                          </select>
                      </div>
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 accent-blue-600"
                            checked={newCatStaffRelated}
                            onChange={e => setNewCatStaffRelated(e.target.checked)}
                          />
                          <div className="flex-1">
                              <span className="block text-sm font-bold text-slate-700">Relacionado a Personal</span>
                              <span className="block text-xs text-slate-400">Habilita selector de empleados</span>
                          </div>
                      </label>
                      <button type="submit" className={`w-full py-3 rounded-xl font-bold text-white ${themeColors.primary} shadow-lg`}>
                          Crear Concepto
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                  Registrar Gasto {activeTab === 'VARIABLE' ? 'Variable' : 'Fijo'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría / Concepto</label>
                <select 
                    className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none bg-white`}
                    value={formData.categoryId || ''}
                    onChange={e => handleCategoryChange(e.target.value)}
                >
                    <option value="" disabled>Seleccionar...</option>
                    {availableCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              {needsStaff && (
                  <div className="animate-fade-in bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <label className="block text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                          <User size={12} /> Empleado Asociado
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        value={formData.staffId || ''}
                        onChange={e => setFormData({...formData, staffId: e.target.value})}
                      >
                          <option value="" disabled>Seleccionar personal...</option>
                          {employees.filter(e => e.active && !e.deleted).map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.role})</option>
                          ))}
                      </select>
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción Detallada</label>
                <input
                  type="text"
                  required
                  placeholder={needsStaff ? "Ej. Adelanto de sueldo, Pago mes..." : "Ej. Compra de detergente..."}
                  className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none`}
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Monto ({currency})</label>
                   <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className={`w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none`}
                        value={formData.amount || ''}
                        onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                   <div className="relative">
                      <input
                        type="date"
                        required
                        className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none`}
                        value={formData.date || ''}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método Pago</label>
                <select 
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none bg-white`}
                    value={formData.paymentMethodId || ''}
                    onChange={e => setFormData({...formData, paymentMethodId: e.target.value})}
                >
                    <option value="" disabled>Seleccionar...</option>
                    {activePaymentMethods.map(pm => (
                        <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                </select>
              </div>

              <button 
                type="submit"
                className={`w-full ${themeColors.primary} text-white font-bold py-3 rounded-xl mt-4 shadow-lg transition-all hover:brightness-110`}
              >
                Guardar Gasto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
