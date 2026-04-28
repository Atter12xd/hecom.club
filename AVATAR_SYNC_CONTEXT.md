# Contexto tecnico: sincronizacion de foto (Credito, Pendientes, Creativos, Finanzas)

Este documento explica como funciona hoy la foto de gerente/perfil entre modulos y que tocar para no romper la sincronizacion.

## Objetivo funcional

Cuando un gerente cambia su foto en cualquiera de estos modulos:

- `Credito`
- `Pendientes`
- `Creativos`
- `Finanzas` (lectura)

la misma foto debe verse en todos.

## Fuente de verdad

La fuente de verdad persistente es:

- Tabla `gerentes`
- Columna `avatar_url`

El cache local (`localStorage`) acelera la UI, pero no reemplaza la BD.

## Stack y piezas clave

- Frontend: HTML + JS (incluye bundle minificado en Credito).
- Backend: Supabase (Auth, PostgREST, Storage).
- Bucket de imagenes: `avatars`.
- Fallback opcional de subida: `window.__MARKETING_STORAGE_API__`.

## Donde hacer cambios (regla operativa)

Para evitar cambios que luego se pierden:

1. Editar primero en fuente (`marketing/marketing`) cuando exista version editable.
2. Compilar/build.
3. Sincronizar artefactos finales a `hecom.club` (y `hecom.club/public`) que es donde vive el deploy real.

Excepcion: si solo hay archivo directo en `hecom.club` (por ejemplo HTML de modulo no compilado), se edita ahi y su copia en `public/`.

## Supabase en este repo (importante)

La carpeta `supabase/` en el repo es referencia historica de scripts/migrations.
En operacion real, los SQL se ejecutan manualmente en Supabase SQL Editor.

Implicacion para futuras IAs:

- No asumir que correr migrations locales cambiara produccion.
- Usar `supabase/` para contexto de esquema/politicas.
- Si se requiere cambio DB real, preparar SQL para ejecutar en el proyecto Supabase activo.

## Archivos clave por modulo

### Credito

- `credito.html`
- `public/credito-app/credito-app.js`
- `credito-app/credito-app.js` (copia sincronizada)

Nota: en Credito, el JS suele venir minificado en `hecom.club`. Fuente editable habitual: `marketing/marketing/holistic-app/src/App.jsx`.

### Pendientes

- `pendientes/tarea.html`
- `public/pendientes/tarea.html` (copia deploy)

### Creativos

- `creativos/creativo.html`
- `public/creativos/creativo.html` (copia deploy)

### Finanzas

- `finanzas/finanzas.html`
- `public/finanzas/finanzas.html` (copia deploy)

## Flujo correcto de cambio de foto

### 1) Obtener usuario actual

Siempre desde `supabase.auth.getUser()` y normalizar email:

- `trim()`
- `toLowerCase()`

### 2) Subir archivo

Subida de imagen a:

- `avatars/<email_slug>/avatar.<ext>`

usando:

- `supabase.storage.from('avatars').upload(..., { upsert: true })`
- o marketing-storage si esta activo.

### 3) URL final

Generar URL publica HTTPS + cache bust (`?t=<timestamp>`).

### 4) Sincronizacion inmediata local (IMPORTANTE)

Antes o independientemente del `update` en BD, persistir URL en:

- `holistic_gerente_avatar_url` (clave global recomendada)
- `hm_gerente_avatar_url` (legacy Credito)
- `tareas_avatar_url`
- `creativos_avatar_url`

Esto evita que la UI "espere F5" cuando BD tarda o si un PATCH falla.

### 5) Persistir en Supabase (fuente de verdad)

Ejecutar:

- `supabase.from('gerentes').update({ avatar_url: url }).eq('email', emailNormalizado)`

Si falla, no romper UI local; loggear error.

### 6) Refrescar estado en memoria/UI

Actualizar:

- Sidebar avatar del modulo actual.
- Estructuras en memoria (ejemplo: `ATTENDANCE_MEMBERS[].photo` en Pendientes).
- Render de vistas que consumen esa data (ejemplo Asistencia).

## Prioridad de lectura de avatar (recomendada)

Para sidebar de gerente:

1. `localStorage.holistic_gerente_avatar_url` (si es URL http/https valida)
2. `row.avatar_url` de `gerentes` cargado en memoria
3. clave local del modulo (`tareas_avatar_url`, `creativos_avatar_url`, etc.)
4. fallback OAuth (`user_metadata.picture/avatar_url`)

Esto evita mostrar foto vieja cuando el objeto en memoria aun no se refresco.

## Estado actual por modulo

### Credito

- `credito.html` instala bridge global:
  - `window.__holisticCommitGerenteAvatarFile(file, done)`
  - `window.__holisticPersistGerenteAvatarLocal(url)`
- `public/credito-app/credito-app.js` llama al bridge desde el input de foto.
- Se sincroniza copia en `credito-app/credito-app.js`.

### Pendientes

- Sube a `avatars`, sincroniza claves locales globales, actualiza sidebar.
- Actualiza Asistencia para que la foto se vea sin F5.
- `reloadTareasData()` debe repintar `renderers.attendance()`.

### Creativos

- Flujo equivalente a Pendientes (subida + local sync + update BD + refresh UI).

### Finanzas

- De momento consume foto (lectura) y prioriza `holistic_gerente_avatar_url` antes de la fila de BD en memoria.

## Eventos cross-tab

Se usa listener `window.addEventListener('storage', ...)` para refrescar avatar cuando cambia:

- `holistic_gerente_avatar_url`
- `hm_gerente_avatar_url`

Nota: `storage` solo dispara entre pestañas del mismo origen.

## Reglas para no romper sincronizacion

1. No usar solo `FileReader + dataURL` como flujo principal.
2. No depender solo de una clave local por modulo.
3. No omitir `toLowerCase()` en email del `eq('email', ...)`.
4. Si cambias el flujo de upload, mantener:
   - subida
   - update `gerentes.avatar_url`
   - sync de claves locales
   - refresh de estado/UI
5. Si cambias un archivo en carpeta raiz, evaluar si existe copia en `public/` y sincronizar.
6. En Credito, priorizar cambio en fuente `marketing/marketing/holistic-app/src/` y luego build + sync a `hecom.club`.
7. Mantener cache-bust en recursos cuando se parchea bundle (`?v=...`) para evitar falso negativo por cache.

## Checklist rapido al modificar avatar

- [ ] Cambia foto en Credito -> se ve al instante en Credito.
- [ ] Abre Pendientes sin F5 duro -> se ve foto nueva.
- [ ] Abre Creativos sin F5 duro -> se ve foto nueva.
- [ ] En Pendientes/Asistencia tambien cambia la foto.
- [ ] En BD `gerentes.avatar_url` quedo con URL nueva.
- [ ] No hay dependencia de un dominio distinto (`www` vs apex).

## Problemas comunes

- `www.hecom.club` y `hecom.club` no comparten `localStorage`.
- RLS/permisos impiden `update` en `gerentes`.
- Bundle viejo en cache del navegador.
- Se edito solo archivo raiz, pero el deploy sirve `public/...`.

## Convencion recomendada a futuro

Crear un helper compartido unico (por ejemplo `avatar-sync.js`) y usarlo en los 3 modulos para:

- `commitAvatar(file)`
- `persistAvatarLocal(url)`
- `applyAvatarToSidebar(...)`
- `syncAvatarToGerentes(url, email)`

Asi se evita divergencia entre implementaciones.
