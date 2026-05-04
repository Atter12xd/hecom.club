-- =============================================================================
-- Pendientes — categorías de cliente en `tareas_clientes.status`
-- Valores: top | bueno | potencial (columna sigue llamándose `status` en BD).
--
-- Si aplicaste `008` con CHECK (`activo`, `onboarding`), NO podés hacer primero
-- los UPDATE a `bueno`/`potencial`: cada UPDATE sigue validando contra el CHECK
-- viejo y falla con ERROR 23514. Orden correcto: DROP → UPDATE → ADD CHECK.
-- =============================================================================

-- 1) Sacar el CHECK viejo (sin esto, los UPDATE de abajo revientan)
alter table public.tareas_clientes
  drop constraint if exists tareas_clientes_status_check;

-- 2) Datos existentes → nuevas categorías (ajustá el mapeo si tu negocio difiere)
update public.tareas_clientes
set status = 'bueno'
where lower(trim(status)) = 'activo';

update public.tareas_clientes
set status = 'potencial'
where lower(trim(status)) = 'onboarding';

-- 3) Cualquier otro valor raro → potencial (para que el CHECK nuevo no falle)
update public.tareas_clientes
set status = 'potencial'
where lower(trim(coalesce(status, ''))) not in ('top', 'bueno', 'potencial');

-- 4) CHECK acorde al formulario actual (pendientes/tarea.html)
alter table public.tareas_clientes
  add constraint tareas_clientes_status_check
  check (status in ('top', 'bueno', 'potencial'));

comment on column public.tareas_clientes.status is 'Categoría cliente: top | bueno | potencial.';
