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

### Pendientes — un solo archivo para iterar (importante para IAs)

- **Fuente de verdad al editar:** `pendientes/tarea.html` en la **raiz del repo** (`hecom.club/pendientes/tarea.html`). La URL publica `/pendientes/...` en Vercel se resuelve contra esa carpeta `pendientes/` del proyecto, no contra `public/pendientes/`.
- **`public/pendientes/tarea.html`** es una **copia** que en la practica duplica trabajo si se parchean **los dos** en cada cambio. Para avanzar rapido: **cambiar solo** `pendientes/tarea.html`. Copiar a `public/` solo si un pipeline o release lo exige de forma explicita.
- **Si en el navegador no ves los ultimos cambios** (sigue el texto o HTML viejo), es muy probable que el entorno este sirviendo la copia bajo `public/pendientes/` o cache CDN. Solucion: **volver a copiar** el canonico a public, p. ej. `pendientes/tarea.html` → `public/pendientes/tarea.html`, y desplegar; luego recarga dura (Ctrl+Shift+R).
- Objetivo: evitar divergencia y turnos dobles en cada PR o prompt.

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

#### Crédito — Métricas (toolbar Usuario / Período), por qué Pendientes “sí” y esto a veces “no”

- **Pendientes** es básicamente un solo `tarea.html`: tocás un archivo y el deploy sirve ese HTML.
- **Crédito** es SPA: `credito.html` + bundle `credito-app.js` + `credito-app/credito-app.css`. Los cambios de **solo CSS** pueden no verse si el navegador mantiene una copia vieja del `.css` (mismo `?v=` en el `<link>`) o si no se desplegó el artefacto en `public/credito-app/`.
- **Ajuste de layout en Métricas** (alinear filtro Usuario con Período, sin hueco feo):
  - Reglas extra al **final** de `credito-app/credito-app.css` (y copia en `public/`).
  - Bloque **`<style id="hm-credito-metrics-toolbar-align">`** en `credito.html` y **`public/credito.html`**: va en el mismo documento que responde `https://www.hecom.club/credito` (Vercel reescribe a `credito.html`), con `Cache-Control: no-store` para esa ruta, así el fix viaja con la página sin depender solo del caché del CSS grande.
  - El componente de búsqueda `hf()` en el bundle **apila** etiqueta “Usuario” y el input en **columna**; Período es más compacto. El CSS de refuerzo pone **label + input en una fila** (flex) para acercar el aspecto al bloque Período.
- Tras editar: **subir `credito.html` + `credito-app.css`** (y bundle si tocás JS), **subir `?v=`** del `<link>` del CSS al cambiar el archivo, y mantener **alineados** `credito.html` en la raíz y `public/credito.html` si el pipeline usa ambos.

### Pendientes

- **`pendientes/tarea.html`** — canonico; todos los cambios de UI/JS de Pendientes van aqui.
- `public/pendientes/tarea.html` — copia opcional; no mantenerla a mano en cada cambio salvo que el deploy lo requiera (ver seccion *Pendientes — un solo archivo* arriba).

### Creativos

- `creativos/creativo.html`
- `public/creativos/creativo.html` (copia deploy)

### Finanzas

- `finanzas/finanzas.html`
- `public/finanzas/finanzas.html` (copia deploy)

### Copia de seguridad (`/backup-dashboard`)

Deploy real en **`hecom.club`** (Vercel sirve rutas locales; ya no hay proxy externo).

- **En vivo**: con sesión del Club (misma inyección que Finanzas vía `/api/auth-config`), el dashboard usa `scripts/live-fetch.js` y los mismos `select` que el export CLI; sin sesión redirige a `/login`; `?offline=1` fuerza sólo lectura del JSON guardado (`data/backup.json`) más clave.
- `backup-dashboard/index.html`
- `backup-dashboard/scripts/export-from-supabase.js` (CLI snapshots)
- `backup-dashboard/scripts/live-fetch.js`
- `backup-dashboard/data/backup.json`
- `public/backup-dashboard/` mismos archivos (copia deploy, igual que finanzas/creativos).

Fuente editable paralela en `marketing/marketing/backup-dashboard` solo como referencia; tras cambios ahí, sincronizar artefactos a `hecom.club` para no perderlos en deploy.

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

Para el **nombre visible** del gerente, mantener alineadas (como referencia Creativos):

- `holistic_gerente_nombre`
- `creativos_user_name`

Tras cargar fila `gerentes`, conviene escribir ambas si hay `display_name` o `nombre` + `apellido`.

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
- En fuente React (`marketing/marketing/holistic-app/src/App.jsx`), el input de foto del gerente debe usar ese bridge cuando exista; al guardar nombre/foto, escribir las mismas claves `localStorage` que Creativos (avatar + nombre).
- Tras `npm run build`, sincronizar `dist/credito-app.*` a `credito-app/` y `public/credito-app/`; subir `?v=` en `credito.html` / `public/credito.html`.

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

Varios modulos tambien refrescan perfil al volver a la pestaña (`focus` / `visibilitychange`) para alinear con BD si `storage` no aplicó.

## Login entre modulos

Los modulos internos deben mandar a **`https://www.hecom.club/login`** si no hay sesion valida (sin pantallas de login alternas por ruta). El usuario entra por Destinos / login unificado.

## Seguridad y logs (evitar regresiones)

- **`/api/client-log`** (`api/client-log.js`): antes de loguear, sanea `detail` y cabeceras tipo `Referer` (sin tokens en query/hash, sin campos tipo `access_token` / `refresh_token`, URLs acotadas).
- **`credito.html`**: los envios a client-log usan path saneado; helpers tipo `hmDumpAuthUser` solo con **`?debug=1`** (o equivalente); en prod la consola suele estar silenciada salvo errores.
- **No volver a agregar** `console.info` con email completo o datos de sesion para “debug de sync” en produccion; si hace falta diagnostico, usar `?debug=1` o logs backend ya sanitizados.

## Reglas para no romper sincronizacion

1. No usar solo `FileReader + dataURL` como flujo principal.
2. No depender solo de una clave local por modulo.
3. No omitir `toLowerCase()` en email del `eq('email', ...)`.
4. Si cambias el flujo de upload, mantener:
   - subida
   - update `gerentes.avatar_url`
   - sync de claves locales
   - refresh de estado/UI
5. Si cambias un archivo en carpeta raiz, evaluar si existe copia en `public/` y sincronizar **cuando haga falta para deploy**; en **Pendientes** priorizar solo `pendientes/tarea.html` (ver seccion dedicada).
6. En Credito, priorizar cambio en fuente `marketing/marketing/holistic-app/src/` y luego build + sync a `hecom.club`.
7. Mantener cache-bust en recursos cuando se parchea bundle (`?v=...`) para evitar falso negativo por cache.

## Checklist rapido al modificar avatar

- [ ] Cambia foto en Credito -> se ve al instante en Credito.
- [ ] Abre Pendientes sin F5 duro -> se ve foto nueva.
- [ ] Abre Creativos sin F5 duro -> se ve foto nueva.
- [ ] En Pendientes/Asistencia tambien cambia la foto.
- [ ] En BD `gerentes.avatar_url` quedo con URL nueva.
- [ ] Nombre en sidebar consistente con `gerentes.display_name` / nombre guardado.
- [ ] No hay dependencia de un dominio distinto (`www` vs apex).

## Problemas comunes

- `www.hecom.club` y `hecom.club` no comparten `localStorage`.
- RLS/permisos impiden `update` en `gerentes`.
- Bundle viejo en cache del navegador.
- Se edito solo archivo raiz, pero el deploy sirve `public/...` (en **Pendientes** el caso habitual es al reves: la ruta `/pendientes/` usa la carpeta `pendientes/` en raiz; una copia vieja en `public/pendientes/` no sustituye al canonico salvo URL distinta).

## Convencion recomendada a futuro

Crear un helper compartido unico (por ejemplo `avatar-sync.js`) y usarlo en los 3 modulos para:

- `commitAvatar(file)`
- `persistAvatarLocal(url)`
- `applyAvatarToSidebar(...)`
- `syncAvatarToGerentes(url, email)`

Asi se evita divergencia entre implementaciones.
