-- Repro migration for IMSS obrero / ISR retenido columns.
-- These columns were originally applied directly to production via MCP (Bloque A,
-- 2026-05-24) without a tracked migration. The payroll engine
-- (lib/payroll/engine.ts:recalcularYPersistir) writes imss_obrero and isr_retenido
-- to both tables; without these columns a recalculo fails with error 42703.
-- Idempotent so it is safe to run against the existing production DB.

ALTER TABLE public.nomina_lineas_calculadas
  ADD COLUMN IF NOT EXISTS imss_obrero numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS isr_retenido numeric NOT NULL DEFAULT 0;

ALTER TABLE public.lineas_nomina
  ADD COLUMN IF NOT EXISTS imss_obrero numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS isr_retenido numeric NOT NULL DEFAULT 0;
