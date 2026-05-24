export interface InvoiceStatus {
  id: number
  name: string
  color: string
  sort_order: number
  is_stalled: boolean
  created_by: string | null
  is_system: boolean
}

export interface PendingInvoice {
  id: number
  project_name: string
  termin: string
  amount: number
  status_id: number
  notes: string
  created_at: string
  updated_at: string
  status_updated_at: string
  user_id: string
  invoice_statuses?: InvoiceStatus
}

export interface DisbursedInvoice {
  id: number
  project_name: string
  termin: string
  amount: number
  disbursement_status: string
  disbursed_at: string | null
  original_pending_id: number | null
  created_at: string
  user_id: string
}

export type PendingInvoiceInsert = Omit<PendingInvoice, 'id' | 'created_at' | 'updated_at' | 'status_updated_at' | 'invoice_statuses'>
export type DisbursedInvoiceInsert = Omit<DisbursedInvoice, 'id' | 'created_at'>
