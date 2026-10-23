-- =============================================================================
-- TaskMate — Supabase Database Schema & Security Setup
-- =============================================================================
-- This script configures the `public.tasks` table, automated timestamps,
-- performance indexes, and strict Row Level Security (RLS).
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/tyapfcjbwlnkvypdkekw
-- 2. Navigate to "SQL Editor" on the left navigation bar.
-- 3. Click "New Query", paste the entire contents of this file, and click "Run".
-- =============================================================================

-- 1. Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the `tasks` table if it doesn't already exist (Non-destructive)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 255),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT NOT NULL DEFAULT 'work' CHECK (category IN ('work', 'personal', 'study', 'goals')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    owner_id UUID NOT NULL
);

-- 3. High-performance lookup & ordering indexes
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON public.tasks (owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_completed ON public.tasks (owner_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks (created_at DESC);

-- 4. Trigger to automatically keep `updated_at` current on task modifications
CREATE OR REPLACE FUNCTION public.handle_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_tasks_updated_at();

-- 5. Row Level Security (RLS) Configuration
-- Enable RLS on the table to restrict all direct unauthorized access
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- CRITICAL SECURITY REQUIREMENT:
-- Revoke all direct read/write privileges from the public and anonymous roles.
-- Direct attempts to query or mutate tasks via the public REST API using the
-- shared publishable key will be rejected.
REVOKE ALL ON TABLE public.tasks FROM anon;
REVOKE ALL ON TABLE public.tasks FROM public;

-- Grant full table access to the service_role (used by the secure TaskMate server API)
GRANT ALL ON TABLE public.tasks TO service_role;

-- Optional policy: If Supabase Authenticated users are ever connected in the future,
-- ensure each user can only read, write, update, or delete tasks where owner_id matches auth.uid().
DROP POLICY IF EXISTS "Authenticated users manage own tasks" ON public.tasks;
CREATE POLICY "Authenticated users manage own tasks"
    ON public.tasks
    FOR ALL
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- =============================================================================
-- Verification Query:
-- Run the following to confirm table creation and RLS status:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks';
-- =============================================================================
