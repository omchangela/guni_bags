import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Toast, useToast, SkeletonRow, ConfirmModal } from '@/components/ui';
import { getWorkEntries, addWorkEntry, updateWorkEntry, deleteWorkEntry, getEmployees } from '@/lib/api';
import { Plus, Search, Pencil, Trash2, Package, X } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const fmtCur = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(n)}`;
const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);

interface WorkEntry {
  id: string; employeeId: string; employeeName: string; date: string;
  bagCount: number; ratePerBag: number; totalAmount: number; time: string; notes: string;
}
interface Employee { id: string; name: string; ratePerBag: number; }

const emptyForm = { employeeId: '', date: today(), bagCount: '', ratePerBag: '', time: '', notes: '' };

export default function WorkEntriesPage() {
  const { toast, show, hide } = useToast();
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(today());
  const [filterEmployee, setFilterEmployee] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WorkEntry | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    getEmployees().then(r => setEmployees(r.data.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (filterDate) params.date = filterDate;
      if (filterEmployee) params.employeeId = filterEmployee;
      const res = await getWorkEntries(params);
      setEntries(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalCount(res.data.pagination.totalCount);
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to load entries', 'error');
    } finally { setLoading(false); }
  }, [filterDate, filterEmployee, page]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: filterDate || today() });
    setShowModal(true);
  };
  const openEdit = (entry: WorkEntry) => {
    setEditing(entry);
    setForm({
      employeeId: entry.employeeId, date: entry.date,
      bagCount: String(entry.bagCount), ratePerBag: String(entry.ratePerBag),
      time: entry.time || '', notes: entry.notes || '',
    });
    setShowModal(true);
  };

  const handleEmpChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    setForm(f => ({ ...f, employeeId: empId, ratePerBag: emp ? String(emp.ratePerBag) : f.ratePerBag }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.bagCount) { show('Employee and bag count are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, bagCount: parseInt(form.bagCount), ratePerBag: parseFloat(form.ratePerBag) };
      if (editing) { await updateWorkEntry(editing.id, payload); show('Entry updated'); }
      else { await addWorkEntry(payload); show('Work entry added'); }
      setShowModal(false); load();
    } catch (err: any) {
      show(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteWorkEntry(confirmDelete.id);
      show('Entry deleted'); setConfirmDelete(null); load();
    } catch (err: any) {
      show(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const totalBags = entries.reduce((s, e) => s + e.bagCount, 0);
  const totalAmt = entries.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <>
      <Head>
        <title>Work Entries — Gunny Bags Manager</title>
        <meta name="description" content="Daily bag work entries for all employees" />
      </Head>
      <Layout>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(1); }}
            className="form-input" style={{ width: 'auto' }} />
          <select value={filterEmployee} onChange={e => { setFilterEmployee(e.target.value); setPage(1); }}
            className="form-input" style={{ width: 'auto' }}>
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button className="btn-primary" onClick={openAdd} id="add-work-entry-btn">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> Add Entry</span>
          </button>
        </div>

        {/* Summary */}
        <div className="stats-overview-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { label: 'Total Entries', value: totalCount },
            { label: 'Total Bags Produced', value: `${fmt(totalBags)} bags` },
            { label: 'Total Wages Payable', value: fmtCur(totalAmt) },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <div className="stat-card-label">{c.label}</div>
              <div className="stat-card-main-val" style={{ fontSize: 26 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Bags</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Time</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [1, 2, 3, 4].map(i => <SkeletonRow key={i} cols={8} />) :
                entries.length ? entries.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{entry.date}</td>
                    <td style={{ fontWeight: 600 }}>{entry.employeeName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Package size={13} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 700 }}>{fmt(entry.bagCount)}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>₹{entry.ratePerBag}</td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>{fmtCur(entry.totalAmount)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{entry.time || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.notes || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(entry)} style={{ background: 'rgba(99,102,241,0.12)', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#a5b4fc' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(entry)} style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#f87171' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>No entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
              <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  {editing ? 'Edit Work Entry' : 'Add Work Entry'}
                </h3>
                <button type="button" className="btn-icon" onClick={() => setShowModal(false)} aria-label="Close modal">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Employee *</label>
                    <select className="form-input" value={form.employeeId} onChange={e => handleEmpChange(e.target.value)} required>
                      <option value="">Select Employee</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Bag Count *</label>
                    <input type="number" min="1" className="form-input" value={form.bagCount}
                      onChange={e => setForm(f => ({ ...f, bagCount: e.target.value }))} placeholder="150" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Rate per Bag (₹)</label>
                    <input type="number" step="0.5" min="0" className="form-input" value={form.ratePerBag}
                      onChange={e => setForm(f => ({ ...f, ratePerBag: e.target.value }))} placeholder="5.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Time (optional)</label>
                    <input type="time" className="form-input" value={form.time?.replace(/(\d{2}:\d{2}).*/, '$1')}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    {form.bagCount && form.ratePerBag && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, width: '100%' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total: </span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#34d399' }}>
                          ₹{(parseInt(form.bagCount || '0') * parseFloat(form.ratePerBag || '0')).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group mb-6">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Lot 2 stitching…" />
                </div>
                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Add Entry'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDelete && (
          <ConfirmModal title="Delete Entry" danger
            message={`Delete work entry for ${confirmDelete.employeeName} (${confirmDelete.bagCount} bags)?`}
            onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </Layout>
    </>
  );
}
