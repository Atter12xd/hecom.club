-- Ejecutar en Supabase SQL Editor (producción).
-- Instagram del cliente / marca (handle o URL).

alter table public.tareas_clientes
  add column if not exists instagram text;

comment on column public.tareas_clientes.instagram is
  'Instagram: @usuario o URL — obligatorio en formulario Pendientes.';

-- Opcional en BD (tras rellenar filas que queden en NULL):
-- update public.tareas_clientes set instagram = '(pendiente)' where instagram is null or trim(instagram) = '';
-- alter table public.tareas_clientes alter column instagram set not null;
