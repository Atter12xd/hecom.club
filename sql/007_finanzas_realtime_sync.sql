-- Finanzas: recarga automática vía Supabase Realtime al cambiar Crédito o tablas finanzas_app_*.
-- Ejecutar en SQL Editor del proyecto. Si la tabla ya está en la publicación, Postgres avisa y podés ignorar.

alter publication supabase_realtime add table public.cobros;
alter publication supabase_realtime add table public.gastos;
alter publication supabase_realtime add table public.garantias;
alter publication supabase_realtime add table public.clientes;

alter publication supabase_realtime add table public.finanzas_app_ingresos;
alter publication supabase_realtime add table public.finanzas_app_gastos;
alter publication supabase_realtime add table public.finanzas_app_cuentas_cobrar;
alter publication supabase_realtime add table public.finanzas_app_deudas;
alter publication supabase_realtime add table public.finanzas_app_sueldos;
alter publication supabase_realtime add table public.finanzas_app_impuestos;
