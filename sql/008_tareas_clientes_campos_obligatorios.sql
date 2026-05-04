-- =============================================================================
-- Pendientes — alinear BD con formulario “Nuevo / Editar cliente” (tarea.html)
-- Ejecutar en Supabase → SQL Editor (revisar resultados de cada bloque).
--
-- Columnas que usa la app (fuente: insert/update en pendientes/tarea.html):
--   nombre, tipo, url_tienda, email, telefono, status, notes, cumpleanos, avatar_url
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Ver tipos y nullability actuales (no modifica nada)
-- -----------------------------------------------------------------------------
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tareas_clientes'
order by ordinal_position;

-- -----------------------------------------------------------------------------
-- 1) Revisar filas que no cumplirían NOT NULL (ajustá umbrales antes del backfill)
-- -----------------------------------------------------------------------------
select id, nombre, tipo, url_tienda, email, telefono, status, notes, cumpleanos, avatar_url
from public.tareas_clientes
where nombre is null or trim(both from nombre) = ''
   or tipo is null or trim(both from tipo) = ''
   or url_tienda is null or trim(both from url_tienda) = ''
   or email is null or trim(both from email) = ''
   or telefono is null or trim(both from telefono) = ''
   or status is null or trim(both from status) = ''
   or notes is null or trim(both from notes) = ''
   or cumpleanos is null
   or avatar_url is null or trim(both from avatar_url) = '';

-- -----------------------------------------------------------------------------
-- 2) BACKFILL — editá los literales según tu criterio de negocio y volvé a correr.
--    Sin esto, ALTER SET NOT NULL fallará si hay NULLs o textos vacíos.
-- -----------------------------------------------------------------------------
update public.tareas_clientes
set
  nombre = coalesce(nullif(trim(nombre), ''), '(sin nombre)'),
  tipo = coalesce(nullif(trim(tipo), ''), '(sin tienda)'),
  url_tienda = coalesce(nullif(trim(url_tienda), ''), 'https://example.invalid'),
  email = coalesce(nullif(trim(email), ''), 'pendiente@example.invalid'),
  telefono = coalesce(nullif(trim(telefono), ''), '+000000000'),
  status = coalesce(nullif(trim(status), ''), 'onboarding'),
  notes = coalesce(nullif(trim(notes), ''), '(sin notas)'),
  cumpleanos = coalesce(cumpleanos, date '1970-01-01')
where true;

-- Si cumpleanos es tipo text en tu proyecto, usá en su lugar:
--   cumpleanos = coalesce(nullif(trim(cumpleanos::text), ''), '1970-01-01')

-- Para avatar_url: solo si vas a aplicar NOT NULL en el paso 4b (leé la nota abajo).
-- Si hay filas sin foto, necesitás una URL placeholder (ideal: una imagen en Storage).
-- update public.tareas_clientes
-- set avatar_url = 'https://TU_DOMINIO/public/placeholder-client.png'
-- where avatar_url is null or trim(both from avatar_url) = '';

-- -----------------------------------------------------------------------------
-- 3) Restricción de estado (valores que usa el select del formulario)
-- -----------------------------------------------------------------------------
alter table public.tareas_clientes
  drop constraint if exists tareas_clientes_status_check;

alter table public.tareas_clientes
  add constraint tareas_clientes_status_check
  check (status in ('activo', 'onboarding'));

-- -----------------------------------------------------------------------------
-- 4a) NOT NULL en campos de datos (no incluye avatar_url todavía)
-- -----------------------------------------------------------------------------
alter table public.tareas_clientes alter column nombre set not null;
alter table public.tareas_clientes alter column tipo set not null;
alter table public.tareas_clientes alter column url_tienda set not null;
alter table public.tareas_clientes alter column email set not null;
alter table public.tareas_clientes alter column telefono set not null;
alter table public.tareas_clientes alter column status set not null;
alter table public.tareas_clientes alter column notes set not null;
alter table public.tareas_clientes alter column cumpleanos set not null;

-- -----------------------------------------------------------------------------
-- 4b) avatar_url NOT NULL — IMPORTANTE
--
-- Hoy el front hace: INSERT (sin avatar_url) → sube imagen a Storage → UPDATE con URL.
-- Si activás NOT NULL en avatar_url SIN default, el INSERT fallará.
--
-- Opciones:
--   A) No poner NOT NULL en avatar_url y dejar la validación solo en la app.
--   B) Subir la foto en el cliente ANTES del insert (cambio de código) y mandar
--      avatar_url en el primer INSERT.
--   C) Transitorio: default vacío (no refleja bien “foto obligatoria” en BD):
--        alter table public.tareas_clientes
--          alter column avatar_url set default '';
--        alter table public.tareas_clientes
--          alter column avatar_url set not null;
--      (y luego quitar default cuando el flujo inserte siempre con URL).
--   D) Función / Edge que inserta en un solo paso con URL ya resuelta.
-- -----------------------------------------------------------------------------

-- Descomentar solo si elegís una estrategia compatible con tu flujo:
-- alter table public.tareas_clientes alter column avatar_url set not null;

comment on column public.tareas_clientes.nombre is 'Obligatorio en formulario Pendientes.';
comment on column public.tareas_clientes.tipo is 'Nombre tienda — obligatorio en formulario.';
comment on column public.tareas_clientes.url_tienda is 'URL tienda — obligatorio en formulario.';
comment on column public.tareas_clientes.email is 'Uno o más correos (texto multilínea) — obligatorio.';
comment on column public.tareas_clientes.telefono is 'Obligatorio en formulario.';
comment on column public.tareas_clientes.status is 'activo | onboarding.';
comment on column public.tareas_clientes.notes is 'Brief / notas — obligatorio.';
comment on column public.tareas_clientes.cumpleanos is 'Fecha cumple contacto — obligatorio en formulario.';
comment on column public.tareas_clientes.avatar_url is 'Foto; validación estricta en app; NOT NULL opcional (ver 4b).';
