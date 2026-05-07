-- Ejecutar en Supabase SQL Editor (proyecto activo).
-- Formularios publicos cliente -> borrador esperando gerente.

CREATE TABLE IF NOT EXISTS public.credito_client_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_id TEXT NOT NULL,
  client_name TEXT,
  tipo TEXT NOT NULL,
  monto NUMERIC NOT NULL CHECK (monto > 0),
  fecha_pago DATE NOT NULL,
  telefono TEXT,
  detalle TEXT,
  comprobante_url TEXT,
  source TEXT DEFAULT 'credito_cliente_form',
  payload JSONB DEFAULT '{}'::jsonb,
  approval_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (approval_status IN (
      'pending_review',
      'needs_client_edit',
      'accepted',
      'rejected'
    )),
  manager_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_ccfs_client_created
  ON public.credito_client_form_submissions (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ccfs_pending
  ON public.credito_client_form_submissions (approval_status, created_at DESC);

COMMENT ON COLUMN public.credito_client_form_submissions.approval_status IS
  'pending_review=borrador; needs_client_edit=cliente debe corregir; accepted/rejected= cerrado';

