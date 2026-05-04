-- Ejecutar en Supabase SQL Editor (producción).
-- Instagram del cliente / marca (handle o URL).

alter table public.tareas_clientes
  add column if not exists instagram text;

comment on column public.tareas_clientes.instagram is
  'Instagram: @usuario o URL https://instagram.com/... (opcional).';
