/*
  # Add CRUD policies for invoice_statuses

  1. Security Changes
    - Add INSERT, UPDATE, DELETE policies for invoice_statuses
    - Currently only SELECT is allowed for authenticated users
    - Now authenticated users can also create, update, and delete statuses
*/

CREATE POLICY "Authenticated users can insert statuses"
  ON invoice_statuses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update statuses"
  ON invoice_statuses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete statuses"
  ON invoice_statuses FOR DELETE
  TO authenticated
  USING (true);
