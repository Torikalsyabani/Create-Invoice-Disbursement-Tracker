/*
  # Create Invoice Tracking Tables

  1. New Tables
    - `invoice_statuses`
      - `id` (serial, primary key)
      - `name` (text, unique) - Status name like "Proses AIIB", "Menunggu Logbook", etc.
      - `color` (text) - Hex color for UI display
      - `sort_order` (int) - Display order
      - `is_stalled` (boolean) - Whether this status indicates a stalled invoice
    - `pending_invoices`
      - `id` (serial, primary key)
      - `project_name` (text) - Nama Proyek / Uraian Pekerjaan
      - `termin` (text) - Termin / Tahapan (e.g., "Termin 5", "MC 1")
      - `amount` (bigint) - Nilai dalam Rupiah
      - `status_id` (int, FK to invoice_statuses) - Current status
      - `notes` (text) - Keterangan Tambahan
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `status_updated_at` (timestamptz) - When status was last changed (for stalled detection)
      - `user_id` (uuid, FK to auth.users) - Owner of the record
    - `disbursed_invoices`
      - `id` (serial, primary key)
      - `project_name` (text)
      - `termin` (text)
      - `amount` (bigint)
      - `disbursement_status` (text) - e.g., "sdh cair tgl 6/5/2026", "sp2d tgl 21/5/2026"
      - `disbursed_at` (date) - Tanggal Cair
      - `original_pending_id` (int) - Reference to original pending invoice
      - `created_at` (timestamptz)
      - `user_id` (uuid, FK to auth.users)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can CRUD their own data

  3. Important Notes
    - Stalled invoice detection uses `status_updated_at` and `is_stalled` flag
    - Default statuses are seeded for common workflow states
*/

-- Create invoice statuses table
CREATE TABLE IF NOT EXISTS invoice_statuses (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#f59e0b',
  sort_order int NOT NULL DEFAULT 0,
  is_stalled boolean NOT NULL DEFAULT false
);

-- Seed default statuses
INSERT INTO invoice_statuses (name, color, sort_order, is_stalled) VALUES
  ('Proses AIIB', '#3b82f6', 1, false),
  ('Menunggu Laporan Bulanan', '#f59e0b', 2, true),
  ('Menunggu Logbook', '#ef4444', 3, true),
  ('Proses Satker', '#8b5cf6', 4, false),
  ('Jadwal Tagihan', '#10b981', 5, false)
ON CONFLICT (name) DO NOTHING;

-- Create pending invoices table
CREATE TABLE IF NOT EXISTS pending_invoices (
  id serial PRIMARY KEY,
  project_name text NOT NULL,
  termin text NOT NULL DEFAULT '',
  amount bigint NOT NULL DEFAULT 0,
  status_id int NOT NULL REFERENCES invoice_statuses(id) ON DELETE RESTRICT,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status_updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create disbursed invoices table
CREATE TABLE IF NOT EXISTS disbursed_invoices (
  id serial PRIMARY KEY,
  project_name text NOT NULL,
  termin text NOT NULL DEFAULT '',
  amount bigint NOT NULL DEFAULT 0,
  disbursement_status text NOT NULL DEFAULT '',
  disbursed_at date,
  original_pending_id int,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE invoice_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursed_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_statuses (readable by all authenticated users)
CREATE POLICY "Authenticated users can read statuses"
  ON invoice_statuses FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for pending_invoices
CREATE POLICY "Users can read own pending invoices"
  ON pending_invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending invoices"
  ON pending_invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending invoices"
  ON pending_invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending invoices"
  ON pending_invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for disbursed_invoices
CREATE POLICY "Users can read own disbursed invoices"
  ON disbursed_invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disbursed invoices"
  ON disbursed_invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disbursed invoices"
  ON disbursed_invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disbursed invoices"
  ON disbursed_invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_invoices_user_id ON pending_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_invoices_status_id ON pending_invoices(status_id);
CREATE INDEX IF NOT EXISTS idx_disbursed_invoices_user_id ON disbursed_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_disbursed_invoices_disbursed_at ON disbursed_invoices(disbursed_at);
