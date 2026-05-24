import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatRupiah, formatShortDate, daysSince, STALLED_THRESHOLD_DAYS } from '../lib/utils'
import type { PendingInvoice, DisbursedInvoice, InvoiceStatus } from '../types'
import { LogOut, Plus, Pencil, Trash2, CircleArrowDown as ArrowDownCircle, TriangleAlert as AlertTriangle, Clock, TrendingUp, Loader as Loader2, ChevronDown, X, Check, Save, Settings, Palette } from 'lucide-react'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([])
  const [disbursedInvoices, setDisbursedInvoices] = useState<DisbursedInvoice[]>([])
  const [statuses, setStatuses] = useState<InvoiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'disbursed' | 'statuses'>('pending')

  // Form states
  const [showPendingForm, setShowPendingForm] = useState(false)
  const [showDisbursedForm, setShowDisbursedForm] = useState(false)
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [editingPending, setEditingPending] = useState<PendingInvoice | null>(null)
  const [editingDisbursed, setEditingDisbursed] = useState<DisbursedInvoice | null>(null)
  const [editingStatus, setEditingStatus] = useState<InvoiceStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [moveModal, setMoveModal] = useState<PendingInvoice | null>(null)

  // Status form
  const [sfName, setSfName] = useState('')
  const [sfColor, setSfColor] = useState('#3b82f6')
  const [sfSortOrder, setSfSortOrder] = useState(0)
  const [sfIsStalled, setSfIsStalled] = useState(false)

  // Pending form
  const [pfProjectName, setPfProjectName] = useState('')
  const [pfTermin, setPfTermin] = useState('')
  const [pfAmount, setPfAmount] = useState('')
  const [pfStatusId, setPfStatusId] = useState<number>(1)
  const [pfNotes, setPfNotes] = useState('')

  // Disbursed form
  const [dfProjectName, setDfProjectName] = useState('')
  const [dfTermin, setDfTermin] = useState('')
  const [dfAmount, setDfAmount] = useState('')
  const [dfDisbursementStatus, setDfDisbursementStatus] = useState('')
  const [dfDisbursedAt, setDfDisbursedAt] = useState('')

  // Move form
  const [mfDisbursementStatus, setMfDisbursementStatus] = useState('')
  const [mfDisbursedAt, setMfDisbursedAt] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [pendingRes, disbursedRes, statusRes] = await Promise.all([
      supabase.from('pending_invoices').select('*, invoice_statuses(*)').order('id', { ascending: true }),
      supabase.from('disbursed_invoices').select('*').order('id', { ascending: true }),
      supabase.from('invoice_statuses').select('*').order('sort_order', { ascending: true }),
    ])
    if (pendingRes.data) setPendingInvoices(pendingRes.data as PendingInvoice[])
    if (disbursedRes.data) setDisbursedInvoices(disbursedRes.data as DisbursedInvoice[])
    if (statusRes.data) setStatuses(statusRes.data as InvoiceStatus[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const totalDisbursed = disbursedInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const totalDisbursedThisMonth = disbursedInvoices
    .filter(inv => inv.disbursed_at && new Date(inv.disbursed_at).getMonth() === currentMonth && new Date(inv.disbursed_at).getFullYear() === currentYear)
    .reduce((sum, inv) => sum + inv.amount, 0)

  const stalledInvoices = pendingInvoices.filter(inv => {
    const status = statuses.find(s => s.id === inv.status_id)
    return status?.is_stalled && daysSince(inv.status_updated_at) > STALLED_THRESHOLD_DAYS
  })

  const resetPendingForm = () => {
    setPfProjectName(''); setPfTermin(''); setPfAmount(''); setPfStatusId(statuses[0]?.id ?? 1); setPfNotes('')
    setEditingPending(null); setShowPendingForm(false)
  }

  const resetDisbursedForm = () => {
    setDfProjectName(''); setDfTermin(''); setDfAmount(''); setDfDisbursementStatus(''); setDfDisbursedAt('')
    setEditingDisbursed(null); setShowDisbursedForm(false)
  }

  const startEditPending = (inv: PendingInvoice) => {
    setEditingPending(inv)
    setPfProjectName(inv.project_name)
    setPfTermin(inv.termin)
    setPfAmount(inv.amount.toString())
    setPfStatusId(inv.status_id)
    setPfNotes(inv.notes)
    setShowPendingForm(true)
  }

  const startEditDisbursed = (inv: DisbursedInvoice) => {
    setEditingDisbursed(inv)
    setDfProjectName(inv.project_name)
    setDfTermin(inv.termin)
    setDfAmount(inv.amount.toString())
    setDfDisbursementStatus(inv.disbursement_status)
    setDfDisbursedAt(inv.disbursed_at ?? '')
    setShowDisbursedForm(true)
  }

  const savePending = async () => {
    setSaving(true)
    const amount = parseInt(pfAmount.replace(/\D/g, ''), 10) || 0
    if (editingPending) {
      const statusChanged = editingPending.status_id !== pfStatusId
      await supabase.from('pending_invoices').update({
        project_name: pfProjectName, termin: pfTermin, amount, status_id: pfStatusId,
        notes: pfNotes, updated_at: new Date().toISOString(),
        ...(statusChanged ? { status_updated_at: new Date().toISOString() } : {}),
      }).eq('id', editingPending.id)
    } else {
      await supabase.from('pending_invoices').insert({
        project_name: pfProjectName, termin: pfTermin, amount, status_id: pfStatusId,
        notes: pfNotes, user_id: user!.id,
      })
    }
    resetPendingForm(); setSaving(false); fetchData()
  }

  const saveDisbursed = async () => {
    setSaving(true)
    const amount = parseInt(dfAmount.replace(/\D/g, ''), 10) || 0
    if (editingDisbursed) {
      await supabase.from('disbursed_invoices').update({
        project_name: dfProjectName, termin: dfTermin, amount,
        disbursement_status: dfDisbursementStatus,
        disbursed_at: dfDisbursedAt || null,
      }).eq('id', editingDisbursed.id)
    } else {
      await supabase.from('disbursed_invoices').insert({
        project_name: dfProjectName, termin: dfTermin, amount,
        disbursement_status: dfDisbursementStatus,
        disbursed_at: dfDisbursedAt || null,
        user_id: user!.id,
      })
    }
    resetDisbursedForm(); setSaving(false); fetchData()
  }

  const deletePending = async (id: number) => {
    if (!confirm('Hapus tagihan ini?')) return
    await supabase.from('pending_invoices').delete().eq('id', id)
    fetchData()
  }

  const deleteDisbursed = async (id: number) => {
    if (!confirm('Hapus data pencairan ini?')) return
    await supabase.from('disbursed_invoices').delete().eq('id', id)
    fetchData()
  }

  const moveToDisbursed = async () => {
    if (!moveModal || !mfDisbursedAt) return
    setSaving(true)
    await supabase.from('disbursed_invoices').insert({
      project_name: moveModal.project_name,
      termin: moveModal.termin,
      amount: moveModal.amount,
      disbursement_status: mfDisbursementStatus || `sdh cair tgl ${formatShortDate(mfDisbursedAt)}`,
      disbursed_at: mfDisbursedAt,
      original_pending_id: moveModal.id,
      user_id: user!.id,
    })
    await supabase.from('pending_invoices').delete().eq('id', moveModal.id)
    setMoveModal(null); setMfDisbursementStatus(''); setMfDisbursedAt(''); setSaving(false); fetchData()
  }

  const updatePendingStatus = async (inv: PendingInvoice, newStatusId: number) => {
    await supabase.from('pending_invoices').update({
      status_id: newStatusId,
      status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', inv.id)
    fetchData()
  }

  const handleAmountChange = (value: string, setter: (v: string) => void) => {
    const raw = value.replace(/\D/g, '')
    if (raw) {
      setter(parseInt(raw, 10).toLocaleString('id-ID'))
    } else {
      setter('')
    }
  }

  const resetStatusForm = () => {
    setSfName(''); setSfColor('#3b82f6'); setSfSortOrder(statuses.length + 1); setSfIsStalled(false)
    setEditingStatus(null); setShowStatusForm(false)
  }

  const startEditStatus = (s: InvoiceStatus) => {
    setEditingStatus(s)
    setSfName(s.name); setSfColor(s.color); setSfSortOrder(s.sort_order); setSfIsStalled(s.is_stalled)
    setShowStatusForm(true)
  }

  const saveStatus = async () => {
    setSaving(true)
    if (editingStatus) {
      await supabase.from('invoice_statuses').update({
        name: sfName, color: sfColor, sort_order: sfSortOrder, is_stalled: sfIsStalled,
      }).eq('id', editingStatus.id)
    } else {
      await supabase.from('invoice_statuses').insert({
        name: sfName, color: sfColor, sort_order: sfSortOrder, is_stalled: sfIsStalled,
        created_by: user!.id, is_system: false,
      })
    }
    resetStatusForm(); setSaving(false); fetchData()
  }

  const deleteStatus = async (id: number) => {
    const status = statuses.find(s => s.id === id)
    if (status?.is_system) {
      alert('Status sistem tidak dapat dihapus.')
      return
    }
    const inUse = pendingInvoices.some(inv => inv.status_id === id)
    if (inUse) {
      alert('Status ini sedang digunakan oleh tagihan. Ubah status tagihan terlebih dahulu sebelum menghapus.')
      return
    }
    if (!confirm('Hapus kategori status ini?')) return
    await supabase.from('invoice_statuses').delete().eq('id', id)
    fetchData()
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Invoice & Disbursement Tracker</h1>
              <p className="text-xs text-slate-400">Pelacakan Tagihan & Pencairan Proyek</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
            <button onClick={signOut} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Rencana Tagihan"
            value={formatRupiah(totalPending)}
            color="rose"
            icon={<Clock className="w-5 h-5" />}
          />
          <SummaryCard
            title="Total Tagihan Cair"
            value={formatRupiah(totalDisbursed)}
            color="blue"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <SummaryCard
            title="Cair Bulan Ini"
            value={formatRupiah(totalDisbursedThisMonth)}
            color="emerald"
            icon={<Check className="w-5 h-5" />}
          />
          <SummaryCard
            title="Tagihan Tertunda"
            value={`${stalledInvoices.length} item`}
            color={stalledInvoices.length > 0 ? 'amber' : 'slate'}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>

        {/* Stalled Alerts */}
        {stalledInvoices.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Tagihan tertunda lebih dari {STALLED_THRESHOLD_DAYS} hari
            </div>
            <div className="space-y-1">
              {stalledInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">{inv.project_name} - {inv.termin}</span>
                  <span className="text-amber-600 font-medium">{formatRupiah(inv.amount)} ({daysSince(inv.status_updated_at)} hari)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'pending' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rencana Tagihan
          </button>
          <button
            onClick={() => setActiveTab('disbursed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'disbursed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tagihan Sudah Cair
          </button>
          <button
            onClick={() => setActiveTab('statuses')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'statuses' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5 inline mr-1" />
            Kelola Status
          </button>
        </div>

        {/* Pending Invoices Table */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Rencana Tagihan</h2>
              <button
                onClick={() => { resetPendingForm(); setShowPendingForm(true) }}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-rose-50 text-rose-900">
                    <th className="px-4 py-3 text-left font-semibold w-12">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama Proyek / Uraian</th>
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Termin</th>
                    <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Nilai (Rp)</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Keterangan</th>
                    <th className="px-4 py-3 text-center font-semibold w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingInvoices.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada data rencana tagihan</td></tr>
                  )}
                  {pendingInvoices.map(inv => {
                    const status = statuses.find(s => s.id === inv.status_id)
                    const isStalled = status?.is_stalled && daysSince(inv.status_updated_at) > STALLED_THRESHOLD_DAYS
                    return (
                      <tr key={inv.id} className={`hover:bg-slate-50 transition ${isStalled ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 text-slate-500">{inv.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{inv.project_name}</td>
                        <td className="px-4 py-3 text-slate-700">{inv.termin}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">{formatRupiah(inv.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="relative inline-block">
                            <select
                              value={inv.status_id}
                              onChange={(e) => updatePendingStatus(inv, parseInt(e.target.value))}
                              className="appearance-none text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer pr-6"
                              style={{
                                backgroundColor: `${status?.color}20`,
                                color: status?.color,
                              }}
                            >
                              {statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: status?.color }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{inv.notes || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => startEditPending(inv)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setMoveModal(inv)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Pindah ke Cair">
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => deletePending(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {pendingInvoices.length > 0 && (
                    <tr className="bg-rose-100 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-rose-900 text-right">JUMLAH</td>
                      <td className="px-4 py-3 text-right text-rose-900 whitespace-nowrap">{formatRupiah(totalPending)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Disbursed Invoices Table */}
        {activeTab === 'disbursed' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Tagihan yang Sudah Cair</h2>
              <button
                onClick={() => { resetDisbursedForm(); setShowDisbursedForm(true) }}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50 text-blue-900">
                    <th className="px-4 py-3 text-left font-semibold w-12">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama Proyek / Uraian</th>
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Termin</th>
                    <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Nilai (Rp)</th>
                    <th className="px-4 py-3 text-left font-semibold">Status Pencairan</th>
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Tgl Cair</th>
                    <th className="px-4 py-3 text-center font-semibold w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {disbursedInvoices.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada data tagihan yang sudah cair</td></tr>
                  )}
                  {disbursedInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-500">{inv.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{inv.project_name}</td>
                      <td className="px-4 py-3 text-slate-700">{inv.termin}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">{formatRupiah(inv.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{inv.disbursement_status || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatShortDate(inv.disbursed_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditDisbursed(inv)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteDisbursed(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {disbursedInvoices.length > 0 && (
                    <tr className="bg-blue-100 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-blue-900 text-right">JUMLAH</td>
                      <td className="px-4 py-3 text-right text-blue-900 whitespace-nowrap">{formatRupiah(totalDisbursed)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status Management */}
        {activeTab === 'statuses' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                <Palette className="w-5 h-5" /> Kelola Kategori Status
              </h2>
              <button
                onClick={() => { resetStatusForm(); setShowStatusForm(true) }}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" /> Tambah Status
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                Kelola kategori status untuk tagihan. Status bertanda &quot;Tertunda&quot; akan memicu notifikasi jika tagihan tidak berubah lebih dari {STALLED_THRESHOLD_DAYS} hari.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {statuses.map(s => (
                  <div key={s.id} className="border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-4 h-4 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: s.color }} />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{s.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Urutan: {s.sort_order}
                          {s.is_system && (
                            <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
                              <Settings className="w-3 h-3" /> Sistem
                            </span>
                          )}
                          {s.is_stalled && (
                            <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="w-3 h-3" /> Tertunda
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${s.color}20`, color: s.color }}
                          >
                            {s.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditStatus(s)} disabled={s.is_system} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed" title={s.is_system ? 'Status sistem tidak dapat diedit' : 'Edit'}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteStatus(s.id)} disabled={s.is_system} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed" title={s.is_system ? 'Status sistem tidak dapat dihapus' : 'Hapus'}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {statuses.length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-400">Belum ada kategori status</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pending Invoice Form Modal */}
      {(showPendingForm || editingPending) && (
        <Modal onClose={resetPendingForm} title={editingPending ? 'Edit Rencana Tagihan' : 'Tambah Rencana Tagihan'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Proyek / Uraian Pekerjaan</label>
              <input type="text" value={pfProjectName} onChange={e => setPfProjectName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500" placeholder="Nama proyek" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Termin / Tahapan</label>
                <input type="text" value={pfTermin} onChange={e => setPfTermin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500" placeholder="Termin 5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nilai (Rp)</label>
                <input type="text" value={pfAmount} onChange={e => handleAmountChange(e.target.value, setPfAmount)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={pfStatusId} onChange={e => setPfStatusId(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500">
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Tambahan</label>
              <textarea value={pfNotes} onChange={e => setPfNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500" placeholder="Catatan khusus..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={resetPendingForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">Batal</button>
              <button onClick={savePending} disabled={saving || !pfProjectName}
                className="flex items-center gap-1.5 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Disbursed Invoice Form Modal */}
      {(showDisbursedForm || editingDisbursed) && (
        <Modal onClose={resetDisbursedForm} title={editingDisbursed ? 'Edit Tagihan Cair' : 'Tambah Tagihan Cair'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Proyek / Uraian Pekerjaan</label>
              <input type="text" value={dfProjectName} onChange={e => setDfProjectName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nama proyek" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Termin / Tahapan</label>
                <input type="text" value={dfTermin} onChange={e => setDfTermin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Termin 5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nilai (Rp)</label>
                <input type="text" value={dfAmount} onChange={e => handleAmountChange(e.target.value, setDfAmount)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status Pencairan</label>
              <input type="text" value={dfDisbursementStatus} onChange={e => setDfDisbursementStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="sdh cair tgl ..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Cair</label>
              <input type="date" value={dfDisbursedAt} onChange={e => setDfDisbursedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={resetDisbursedForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">Batal</button>
              <button onClick={saveDisbursed} disabled={saving || !dfProjectName}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Move to Disbursed Modal */}
      {moveModal && (
        <Modal onClose={() => { setMoveModal(null); setMfDisbursementStatus(''); setMfDisbursedAt('') }} title="Pindahkan ke Tagihan Cair">
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
              <strong>{moveModal.project_name}</strong> - {moveModal.termin} &mdash; {formatRupiah(moveModal.amount)}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status Pencairan</label>
              <input type="text" value={mfDisbursementStatus} onChange={e => setMfDisbursementStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sdh cair tgl ..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Cair *</label>
              <input type="date" value={mfDisbursedAt} onChange={e => setMfDisbursedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setMoveModal(null); setMfDisbursementStatus(''); setMfDisbursedAt('') }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">Batal</button>
              <button onClick={moveToDisbursed} disabled={saving || !mfDisbursedAt}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
                Pindahkan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Form Modal */}
      {(showStatusForm || editingStatus) && (
        <Modal onClose={resetStatusForm} title={editingStatus ? 'Edit Kategori Status' : 'Tambah Kategori Status'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Status</label>
              <input type="text" value={sfName} onChange={e => setSfName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="Proses AIIB" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Warna</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={sfColor} onChange={e => setSfColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5" />
                  <input type="text" value={sfColor} onChange={e => setSfColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Urutan</label>
                <input type="number" value={sfSortOrder} onChange={e => setSfSortOrder(parseInt(e.target.value) || 0)} min={0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="sfIsStalled" checked={sfIsStalled} onChange={e => setSfIsStalled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <label htmlFor="sfIsStalled" className="text-sm text-slate-700">
                Tandai sebagai status &quot;Tertunda&quot; (memunculkan notifikasi jika tagihan mandek)
              </label>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="text-xs text-slate-500 mr-2">Preview:</span>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${sfColor}20`, color: sfColor }}
              >
                {sfName || 'Nama Status'}
              </span>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={resetStatusForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">Batal</button>
              <button onClick={saveStatus} disabled={saving || !sfName}
                className="flex items-center gap-1.5 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SummaryCard({ title, value, color, icon }: {
  title: string; value: string; color: 'rose' | 'blue' | 'emerald' | 'amber' | 'slate'; icon: React.ReactNode
}) {
  const bgMap = { rose: 'bg-rose-50', blue: 'bg-blue-50', emerald: 'bg-emerald-50', amber: 'bg-amber-50', slate: 'bg-slate-50' }
  const iconBgMap = { rose: 'bg-rose-100 text-rose-600', blue: 'bg-blue-100 text-blue-600', emerald: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600', slate: 'bg-slate-100 text-slate-600' }
  const valueColorMap = { rose: 'text-rose-900', blue: 'text-blue-900', emerald: 'text-emerald-900', amber: 'text-amber-900', slate: 'text-slate-900' }

  return (
    <div className={`${bgMap[color]} rounded-xl p-5 border border-transparent`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-600 font-medium">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgMap[color]}`}>{icon}</div>
      </div>
      <div className={`text-xl font-bold ${valueColorMap[color]}`}>{value}</div>
    </div>
  )
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
