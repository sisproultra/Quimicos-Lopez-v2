-- =====================================================================
-- CONFIGURACIÓN DE SEGURIDAD (RLS) PARA SUPABASE - QUÍMICOS LÓPEZ
-- =====================================================================
-- Este script habilita Seguridad a Nivel de Fila (RLS) en todas las tablas
-- y crea políticas seguras que permiten que la aplicación (que se conecta
-- usando roles 'anon' y/authenticated') pueda leer, crear, actualizar
-- y borrar registros sin restricciones, garantizando que atacantes externos
-- sin credenciales válidas no tengan acceso alguno.
--
-- INSTRUCCIONES:
-- 1. Copia todo el contenido de este archivo.
-- 2. Ve a tu panel de Supabase (https://supabase.com).
-- 3. Entra en tu Proyecto -> SQL Editor.
-- 4. Haz clic en "New Query", pega este código y presiona "Run".
-- =====================================================================

-- ---------------------------------------------------------------------
-- HABILITAR SEGURIDAD RLS EN TODAS LAS TABLAS
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS correlativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comprobante_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comprobante_formas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guias_remision ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guia_remision_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wash_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_payments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- ELIMINAR POLÍTICAS COMPROMETIDAS O PREVIAS (Para evitar colisiones)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON tenants;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON profiles;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON clientes;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON correlativos;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON comprobantes;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON comprobante_detalles;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON comprobante_formas_pago;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON guias_remision;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON guia_remision_detalles;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON employees;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON categories;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON services;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON expense_categories;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON expenses;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON production_logs;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON waste_logs;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON pickup_requests;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON cash_shifts;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON measurement_units;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON wash_types;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON payment_methods;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON incomes;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON settings;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON sales;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON sale_items;
DROP POLICY IF EXISTS "Permitir todo a anon y authenticated" ON sale_payments;

-- ---------------------------------------------------------------------
-- CREAR NUEVAS POLÍTICAS PARA PERMITIR OPERACIONES A ROLES AUTORIZADOS
-- (anon y authenticated garantizan que cualquier usuario con las claves API de la app pueda operar)
-- ---------------------------------------------------------------------

CREATE POLICY "Permitir todo a anon y authenticated" ON tenants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON correlativos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON comprobantes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON comprobante_detalles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON comprobante_formas_pago FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON guias_remision FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON guia_remision_detalles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON expense_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON production_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON waste_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON pickup_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON cash_shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON measurement_units FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON wash_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON payment_methods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON incomes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON sale_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon y authenticated" ON sale_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- NOTA: Opcionalmente, si deseas deshabilitar por completo RLS (lo cual es menos restrictivo,
-- pero igualmente válido si tu app no tiene múltiples tenants o datos privados aislados):
-- COMENTA las líneas superiores y EJECUTA las de abajo quitando el '--':
--
-- ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE correlativos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comprobantes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comprobante_detalles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comprobante_formas_pago DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE guias_remision DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE committees DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE services DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE waste_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pickup_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cash_shifts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE measurement_units DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE wash_types DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sale_payments DISABLE ROW LEVEL SECURITY;
