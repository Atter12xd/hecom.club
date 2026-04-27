# README_CREDITO_MIGRACION

Documento de handoff para migrar `Crédito` (y módulos relacionados) a Hecom.

## 1) Frontend exacto a portar

Copiar estos artefactos desde este repo:

- `credito.html`
- `credito-app/` completo:
  - `credito-app/credito-app.js`
  - `credito-app/credito-app.css`
  - `credito-app/auth-config.js`
  - `credito-app/favicon/*`
  - `credito-app/logo/*`

Adicionales del mismo paquete operativo:

- `pendientes/`
- `creativos/`
- `finanzas/`
- `acceso-pendientes.html`
- `acceso-creativos.html`
- `acceso-finanzas.html`
- `login.html`

APIs usadas por el frontend:

- `api/cobranzaClaudeSuggest.js`
- `api/borrador-correo-proxy.js` (si mantienen ese flujo)

## 2) Mapa de rutas reales

### Entry real de Crédito

- Ruta pública: `/credito`
- También resuelve `/credito.html`
- `credito.html` monta React en `#root` y carga:
  - `/credito-app/credito-app.js`
  - `/credito-app/credito-app.css`

### Rutas funcionales relacionadas

- `/pendientes` -> `pendientes/tarea.html`
- `/creativos` -> `creativos/creativo.html`
- `/finanzas` -> `finanzas/finanzas.html`
- `/acceso-pendientes`, `/acceso-creativos`, `/acceso-finanzas`

### Endpoints consumidos por frontend

- Supabase Auth: `${PUBLIC_SUPABASE_URL}/auth/v1/*`
- Supabase REST: `${PUBLIC_SUPABASE_URL}/rest/v1/*`
- Supabase Functions: `${PUBLIC_SUPABASE_URL}/functions/v1/*`
  - `magic-link-login`
  - `dar-acceso-cliente`
  - `invite-gerente`
  - `cobranza-enviar`
  - `borrador-correo-enviar`
- API propia Vercel:
  - `/api/cobranzaClaudeSuggest`
  - `/api/borrador-correo-proxy` (si aplica)

## 3) Variables de entorno necesarias

### Obligatorias (Hecom)

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

### Obligatorias si usan IA de Cobranza en API local

- `ANTHROPIC_API_KEY`

### Opcionales / recomendadas

- `ANTHROPIC_MODEL` (si quieren fijar modelo)
- `COBRANZA_CORS_ORIGINS` (extra allowlist CORS API de cobranza IA)
- `PUBLIC_MARKETING_STORAGE_API` (si usan storage API externa)
- Branding en functions (según flujo):
  - `EMAIL_BRAND_NAME`
  - `COBRANZA_BRAND_NAME`
  - `EMAIL_LOGO_URL` / `COBRANZA_LOGO_URL`
  - `APP_URL` / `PUBLIC_APP_URL`
  - `INVITE_REDIRECT_URL`

## 4) Reglas de acceso y datos (alto nivel)

### Tablas nucleares de Crédito

- `clientes`
- `gastos`
- `cobros`
- `garantias`
- `clientes_acceso`
- `gerentes`
- `cobranza_bandeja`
- `cobranza_eventos`

### Otras usadas por módulos relacionados

- `creativos_*`
- `tareas_*`
- `finanzas_app_*`

### Lógica de acceso

- Gerente: acceso total (según RLS `is_gerente()` y políticas de gerente all).
- Cliente: acceso restringido por `client_id` vía `clientes_acceso` + RLS.
- UI valida sesión y rol con:
  - `isGerente()` (tabla `gerentes`)
  - `getClientIdForUser()` (tabla `clientes_acceso`)

## 5) Versión congelada de referencia

- Repo fuente: `Atter12xd/marketing`
- Commit de referencia: `1f699a6`
- Nota: el deployment “con datos reales” debe validarse por URL de producción al momento de desplegar en Hecom.

## Validación final esperada en Hecom

1. `/credito` carga dashboard con estilos correctos.
2. `/credito` consume sesión magic link y limpia hash (`#access_token` no queda).
3. Datos reales visibles (no demo vacío).
4. Cobranza IA responde en `/api/cobranzaClaudeSuggest`.
5. Sin dependencia a rewrites de `marketingconholistic.com` para rutas migradas.
