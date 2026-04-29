-- Ejecutar en Supabase SQL Editor (mismo cambio que holistic-app migrations).
-- Renombra clientes.codigo → clientes.dni; los valores existentes no se pierden.

alter table public.clientes rename column codigo to dni;

comment on column public.clientes.dni is
  'DNI, CE, pasaporte u otro identificador del titular (antes columna codigo).';
