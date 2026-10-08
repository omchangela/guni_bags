import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Toast, useToast, SkeletonRow, ConfirmModal } from '@/components/ui';
import { getPayouts, addPayout, deletePayout, getEmployees } from '@/lib/api';
import { Plus, Trash2, IndianRupee, Banknote, Smartphone, Building2, X } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const fmtCur = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(n)}`;
const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);

interface Payout {
  id: string; employeeId: string; employeeName: string; date: string;
  payoutAmount: number; pendingBeforePayout: number; remainingAmount: number;
  paymentMode: string; referenceNote: string; createdAt: string;
}
interface Employee { id: string; name: string; }

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
  { value: 'CHEQUE', label: 'Cheque', icon: IndianRupee },
];

const emptyForm = { employeeId: '', date: today(), payoutAmount: '', paymentMode: 'CASH', referenceNote: '' };

export default function PayoutsPage() {
  const { toast, show, hide } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Payout | null>(null);

  useEffect(() => {
    getEmployees().then(r => setEmployees(r.data.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterEmployee) params.employeeId = filterEmployee;
      if (filterStart) params.startDate = filterStart;
      if (filterEnd) params.endDate = filterEnd;
      const res = await getPayouts(params);
      setPayouts(res.data.data);
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to load payouts', 'error');
    } finally { setLoading(false); }
  }, [filterEmployee, filterStart, filterEnd]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.payoutAmount) { show('Employee and amount required', 'error'); return; }
    setSaving(true);
    try {
      await addPayout({ ...form, payoutAmount: parseFloat(form.payoutAmount) });
      show('Payout recorded successfully'); setShowModal(false); load();
    } catch (err: any) {
      show(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePayout(confirmDelete.id);
      show('Payout removed'); setConfirmDelete(null); load();
    } catch (err: any) {
      show(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const modeIcon = (mode: string) => {
    const m = PAYMENT_MODES.find(p => p.value === mode);
    return m ? <m.icon size={13} /> : null;
  };

  const totalPaid = payouts.reduce((s, p) => s + p.payoutAmount, 0);

  return (
    <>
      <Head>
        <title>Payouts — Gunny Bags Manager</title>
        <meta name="description" content="Employee payout and advance payment records" />
      </Head>
      <Layout>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="form-input" style={{ width: 'auto' }}>
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="form-input" style={{ width: 'auto' }} placeholder="From" />
          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="form-input" style={{ width: 'auto' }} placeholder="To" />
          <button className="btn-primary" onClick={() => setShowModal(true)} id="add-payout-btn">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> Record Payout</span>
          </button>
        </div>

        {/* Summary */}
        <div className="stats-overview-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="stat-card">
            <div className="stat-card-label">Payouts Recorded</div>
            <div className="stat-card-main-val" style={{ fontSize: 26 }}>{payouts.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Amount Disbursed</div>
            <div className="stat-card-main-val" style={{ fontSize: 26, color: '#34d399' }}>{fmtCur(totalPaid)}</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Amount Paid</th>
                  <th>Pending Before</th>
                  <th>Remaining After</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [1, 2, 3].map(i => <SkeletonRow key={i} cols={8} />) :
                payouts.length ? payouts.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.date}</td>
                    <td style={{ fontWeight: 600 }}>{p.employeeName}</td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>{fmtCur(p.payoutAmount)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmtCur(p.pendingBeforePayout)}</td>
                    <td style={{ fontWeight: 600, color: p.remainingAmount > 0 ? '#fbbf24' : '#34d399' }}>
                      {fmtCur(p.remainingAmount)}
                    </td>
                    <td>
                      <span className="badge badge-indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {modeIcon(p.paymentMode)} {p.paymentMode.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.referenceNote || '—'}
                    </td>
                    <td>
                      <button onClick={() => setConfirmDelete(p)} style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#f87171' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>No payout records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Record Payout</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
                    Pending balance is auto-calculated from work entries
                  </p>
                </div>
                <button type="button" className="btn-icon" onClick={() => setShowModal(false)} aria-label="Close modal">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Employee *</label>
                    <select className="form-input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} required>
                      <option value="">Select Employee</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">Amount (₹) *</label>
                  <input type="number" min="1" step="0.01" className="form-input" value={form.payoutAmount}
                    onChange={e => setForm(f => ({ ...f, payoutAmount: e.target.value }))} placeholder="3000" required />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">Payment Mode</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PAYMENT_MODES.map(m => (
                      <button key={m.value} type="button"
                        onClick={() => setForm(f => ({ ...f, paymentMode: m.value }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                          border: `1px solid ${form.paymentMode === m.value ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                          background: form.paymentMode === m.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                          color: form.paymentMode === m.value ? '#a5b4fc' : 'var(--text-secondary)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        }}>
                        <m.icon size={14} /> {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group mb-6">
                  <label className="form-label">Reference Note</label>
                  <input className="form-input" value={form.referenceNote} onChange={e => setForm(f => ({ ...f, referenceNote: e.target.value }))} placeholder="Weekly payment / Advance for festival…" />
                </div>
                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Recording…' : 'Record Payout'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDelete && (
          <ConfirmModal title="Revert Payout" danger
            message={`Remove payout of ${fmtCur(confirmDelete.payoutAmount)} to ${confirmDelete.employeeName}? This will re-add to pending balance.`}
            onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </Layout>
    </>
  );
}
