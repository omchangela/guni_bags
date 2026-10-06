import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { Toast, useToast, SkeletonRow, ConfirmModal } from '@/components/ui';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '@/lib/api';
import { Plus, Search, Pencil, Trash2, UserCheck, UserX, ChevronRight } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const fmtCur = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(n)}`;

interface Employee {
  id: string; name: string; mobile: string; ratePerBag: number; isActive: boolean;
  address: string; notes: string; totalBags: number; totalEarned: number;
  totalPaid: number; pendingAmount: number; createdAt: string;
}

const emptyForm = { name: '', mobile: '', ratePerBag: 5, isActive: true, address: '', notes: '' };

export default function EmployeesPage() {
  const { toast, show, hide } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployees(search ? { search } : {});
      setEmployees(res.data.data);
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to load employees', 'error');
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, mobile: emp.mobile || '', ratePerBag: emp.ratePerBag, isActive: emp.isActive, address: emp.address, notes: emp.notes });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { show('Name is required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateEmployee(editing.id, form);
        show('Employee updated successfully');
      } else {
        await addEmployee(form);
        show('Employee added successfully');
      }
      setShowModal(false); load();
    } catch (err: any) {
      show(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEmployee(confirmDelete.id);
      show('Employee deactivated'); setConfirmDelete(null); load();
    } catch (err: any) {
      show(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <>
      <Head>
        <title>Employees — Gunny Bags Manager</title>
        <meta name="description" content="Manage gunny bags workers and view their earnings" />
      </Head>
      <Layout>
        {/* Header row */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="text" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)}
              className="form-input" style={{ paddingLeft: 36 }} />
          </div>
          <button className="btn-primary" onClick={openAdd} id="add-employee-btn">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> Add Employee</span>
          </button>
        </div>

        {/* Summary cards */}
        <div className="stats-overview-grid mb-6">
          {[
            { label: 'Total Workers', value: employees.length },
            { label: 'Active Today', value: employees.filter(e => e.isActive).length },
            { label: 'Total Bags', value: fmt(employees.reduce((s, e) => s + e.totalBags, 0)) },
            { label: 'Total Pending', value: fmtCur(employees.reduce((s, e) => s + e.pendingAmount, 0)) },
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
                  <th>Employee</th>
                  <th>Mobile</th>
                  <th>Rate/Bag</th>
                  <th>Total Bags</th>
                  <th>Earned</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4].map(i => <SkeletonRow key={i} cols={9} />)
                ) : employees.length ? (
                  employees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <Link href={`/reports?employeeId=${emp.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {emp.name}
                          <ChevronRight size={12} style={{ color: 'var(--accent)' }} />
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{emp.mobile || '—'}</td>
                      <td><span className="badge badge-indigo">₹{emp.ratePerBag}</span></td>
                      <td>{fmt(emp.totalBags)}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>{fmtCur(emp.totalEarned)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{fmtCur(emp.totalPaid)}</td>
                      <td style={{ fontWeight: 700, color: emp.pendingAmount > 0 ? '#fbbf24' : '#34d399' }}>
                        {fmtCur(emp.pendingAmount)}
                      </td>
                      <td>
                        <span className={`badge ${emp.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(emp)} title="Edit"
                            style={{ background: 'rgba(99,102,241,0.12)', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#a5b4fc' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(emp)} title="Delete"
                            style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#f87171' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                  {editing ? 'Edit Employee' : 'Add Employee'}
                </h2>
              </div>
              <form onSubmit={handleSave} style={{ padding: '24px 28px' }}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ramesh Kumar" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Mobile</label>
                    <input className="form-input" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="9876543210" maxLength={10} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Rate per Bag (₹)</label>
                    <input className="form-input" type="number" step="0.5" min="0" value={form.ratePerBag}
                      onChange={e => setForm(f => ({ ...f, ratePerBag: parseFloat(e.target.value) }))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                    <label style={{ fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                      Active Employee
                    </label>
                  </div>
                </div>
                <div className="mb-4">
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Address</label>
                  <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Main Bazar, Market Yard" />
                </div>
                <div className="mb-6">
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Notes</label>
                  <textarea className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" rows={2} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Add Employee'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDelete && (
          <ConfirmModal
            title="Deactivate Employee" danger
            message={`Are you sure you want to deactivate ${confirmDelete.name}? They will be set as inactive.`}
            onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </Layout>
    </>
  );
}
