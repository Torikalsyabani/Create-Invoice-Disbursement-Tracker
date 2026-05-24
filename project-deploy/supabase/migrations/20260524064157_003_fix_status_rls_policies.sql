/*
  # Fix RLS policies for invoice_statuses

  1. Changes
    - Add `created_by` (uuid) column to invoice_statuses referencing auth.users
    - Set default value for existing rows to NULL (shared system statuses)
    - Add `is_system` boolean column to mark seeded/default statuses that all users share
    - Replace permissive RLS policies with restrictive ones:
      - SELECT: All authenticated users can see all statuses (shared resource)
      - INSERT: Authenticated users can only insert with their own user_id as created_by
      - UPDATE: Users can only update statuses they created (not system statuses)
      - DELETE: Users can only delete statuses they created (not system statuses)

  2. Security
    - Drop existing permissive policies (USING true / WITH CHECK true)
    - Create restrictive policies that check created_by ownership
    - System statuses (is_system = true) cannot be updated or deleted by regular users
*/

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_statuses' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE invoice_statuses ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_system column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_statuses' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE invoice_statuses ADD COLUMN is_system boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Mark seeded statuses as system statuses
UPDATE invoice_statuses SET is_system = true WHERE created_by IS NULL;

-- Drop permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert statuses" ON invoice_statuses;
DROP POLICY IF EXISTS "Authenticated users can update statuses" ON invoice_statuses;
DROP POLICY IF EXISTS "Authenticated users can delete statuses" ON invoice_statuses;

-- Create restrictive policies

-- INSERT: Users can only create statuses with their own id as created_by
CREATE POLICY "Users can insert statuses with own id"
  ON invoice_statuses FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: Users can only update statuses they created (not system ones)
CREATE POLICY "Users can update own custom statuses"
  ON invoice_statuses FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND is_system = false)
  WITH CHECK (created_by = auth.uid() AND is_system = false);

-- DELETE: Users can only delete statuses they created (not system ones)
CREATE POLICY "Users can delete own custom statuses"
  ON invoice_statuses FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND is_system = false);
