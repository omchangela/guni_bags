import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Toast, useToast, SkeletonRow, ConfirmModal } from '@/components/ui';
import {
  getPlatformStats,
  getAdminUsers,
  getAdminUserDetails,
  toggleTenantStatus,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  addAdminWorker,
  deleteAdminWorker,
  addAdminWorkEntry,
  deleteAdminWorkEntry,
  addAdminPayout,
  deleteAdminPayout,
} from '@/lib/api';
import {
  Building2,
  Users,
  Package,
  IndianRupee,
  Search,
  ShieldCheck,
  Eye,
  Power,
  RefreshCw,
  Phone,
  Wallet,
  ClipboardList,
  X,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';

const fmt = (n: number | undefined | null) => new Intl.NumberFormat('en-IN').format(n || 0);
const fmtCur = (n: number | undefined | null) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n || 0))}`;
const fmtDate = (d: string | undefined) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};
const todayStr = () => new Date().toISOString().split('T')[0];

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  newTenantsToday: number;
  totalWorkers: number;
  activeWorkers: number;
  totalBagsCompleted: number;
  totalWorkAmount: number;
  totalPayouts: number;
  totalPendingPayout: number;
  totalEntries: number;
}

interface TenantUser {
  id: string;
  name: string;
  businessName: string;
  mobile: string;
  countryCode: string;
  role: string;
  isActive: boolean;
  workerCount: number;
  totalBags: number;
  totalAmount: number;
  totalPaid: number;
  pendingAmount: number;
  createdAt: string;
}

interface TenantDetailData {
  tenant: {
    id: string;
    name: string;
    businessName: string;
    mobile: string;
    countryCode: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  stats: {
    workerCount: number;
    totalBags: number;
    totalEarned: number;
    totalPaid: number;
    pendingAmount: number;
  };
  workers: Array<{
    id: string;
    name: string;
    mobile: string;
    ratePerBag: number;
    isActive: boolean;
    address: string;
    totalBags: number;
    totalEarned: number;
    createdAt: string;
  }>;
  recentWork: Array<{
    id: string;
    employeeName: string;
    date: string;
    bagCount: number;
    ratePerBag: number;
    totalAmount: number;
    notes: string;
  }>;
  recentPayouts: Array<{
    id: string;
    employeeName: string;
    date: string;
    payoutAmount: number;
    paymentMode: string;
    referenceNote: string;
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast, show } = useToast();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    businessName: '',
    mobile: '',
    role: 'OWNER',
    isActive: true,
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit User Modal State
  const [editingTenant, setEditingTenant] = useState<TenantUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    businessName: '',
    mobile: '',
    role: 'OWNER',
    isActive: true,
  });
  const [updatingUser, setUpdatingUser] = useState(false);

  // Delete User Confirm State
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Drill-down Modal State
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'workers' | 'work' | 'payouts'>('workers');

  // Resource Form States (Inside Drilldown Modal)
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [workerForm, setWorkerForm] = useState({ name: '', mobile: '', ratePerBag: 5.0, address: '', notes: '' });
  const [savingWorker, setSavingWorker] = useState(false);

  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [workForm, setWorkForm] = useState({ employeeId: '', date: todayStr(), bagCount: '', notes: '' });
  const [savingWork, setSavingWork] = useState(false);

  const [showAddPayoutModal, setShowAddPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ employeeId: '', date: todayStr(), payoutAmount: '', paymentMode: 'CASH', referenceNote: '' });
  const [savingPayout, setSavingPayout] = useState(false);

  // Status Toggle Modal State
  const [confirmToggleTarget, setConfirmToggleTarget] = useState<TenantUser | null>(null);

  // Master Super Admin validation (admin@admin.com only)
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role !== 'SUPER_ADMIN') {
          show('Access Denied: Master Dashboard is restricted to Master Admin (admin@admin.com)', 'error');
          router.replace('/');
        }
      } catch {
        router.replace('/login');
      }
    } else {
      router.replace('/login');
    }
  }, [router, show]);

  // Load Platform Stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await getPlatformStats();
      setStats(res.data.data);
    } catch (err: any) {
      console.error(err);
      show(err.response?.data?.message || 'Failed to load platform statistics', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [show]);

  // Load Tenants List
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params: { search?: string; status?: string } = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await getAdminUsers(params);
      setUsers(res.data.data || []);
    } catch (err: any) {
      console.error(err);
      show(err.response?.data?.message || 'Failed to load business tenants', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [search, statusFilter, show]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Inspect Tenant Data
  const handleInspectTenant = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setLoadingDetail(true);
    setDetailTab('workers');
    try {
      const res = await getAdminUserDetails(tenantId);
      setTenantDetail(res.data.data);
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to fetch tenant details', 'error');
      setSelectedTenantId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Reload Detail
  const reloadTenantDetail = async () => {
    if (!selectedTenantId) return;
    try {
      const res = await getAdminUserDetails(selectedTenantId);
      setTenantDetail(res.data.data);
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) { show('Full name is required', 'error'); return; }
    if (!createForm.mobile.match(/^\d{10}$/)) { show('Enter a valid 10-digit mobile', 'error'); return; }
    setCreatingUser(true);
    try {
      await createAdminUser(createForm);
      show('Business tenant created successfully!');
      setShowCreateModal(false);
      setCreateForm({ name: '', businessName: '', mobile: '', role: 'OWNER', isActive: true });
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to create business user', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  // Open Edit User
  const openEditModal = (t: TenantUser) => {
    setEditingTenant(t);
    setEditForm({
      name: t.name,
      businessName: t.businessName,
      mobile: t.mobile,
      role: t.role,
      isActive: t.isActive,
    });
  };

  // Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setUpdatingUser(true);
    try {
      await updateAdminUser(editingTenant.id, editForm);
      show('Business details updated successfully');
      setEditingTenant(null);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setUpdatingUser(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      show('Business user and all records deleted permanently');
      setDeleteTarget(null);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  // Toggle Account Status
  const handleConfirmToggle = async () => {
    if (!confirmToggleTarget) return;
    try {
      const newStatus = !confirmToggleTarget.isActive;
      await toggleTenantStatus(confirmToggleTarget.id, newStatus);
      show(`Business ${newStatus ? 'activated' : 'suspended'} successfully`);
      setConfirmToggleTarget(null);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to update account status', 'error');
    }
  };

  // Add Worker for Tenant
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    if (!workerForm.name.trim()) { show('Worker name is required', 'error'); return; }
    setSavingWorker(true);
    try {
      await addAdminWorker(selectedTenantId, workerForm);
      show('Worker added to business fleet');
      setShowAddWorkerModal(false);
      setWorkerForm({ name: '', mobile: '', ratePerBag: 5.0, address: '', notes: '' });
      reloadTenantDetail();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to add worker', 'error');
    } finally {
      setSavingWorker(false);
    }
  };

  // Delete Worker for Tenant
  const handleDeleteWorker = async (workerId: string) => {
    if (!selectedTenantId) return;
    if (!confirm('Are you sure you want to delete this worker? All their entries will be removed.')) return;
    try {
      await deleteAdminWorker(selectedTenantId, workerId);
      show('Worker removed successfully');
      reloadTenantDetail();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to delete worker', 'error');
    }
  };

  // Add Work Entry for Tenant
  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    if (!workForm.employeeId) { show('Select a worker', 'error'); return; }
    if (!workForm.bagCount || parseInt(workForm.bagCount) <= 0) { show('Enter valid bag count', 'error'); return; }
    setSavingWork(true);
    try {
      await addAdminWorkEntry(selectedTenantId, workForm);
      show('Work production entry recorded');
      setShowAddWorkModal(false);
      setWorkForm({ employeeId: '', date: todayStr(), bagCount: '', notes: '' });
      reloadTenantDetail();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to record work entry', 'error');
    } finally {
      setSavingWork(false);
    }
  };

  // Delete Work Entry for Tenant
  const handleDeleteWork = async (entryId: string) => {
    if (!selectedTenantId) return;
    if (!confirm('Delete this work entry?')) return;
    try {
      await deleteAdminWorkEntry(selectedTenantId, entryId);
      show('Work entry deleted');
      reloadTenantDetail();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to delete entry', 'error');
    }
  };

  // Add Payout for Tenant
  const handleAddPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    if (!payoutForm.employeeId) { show('Select a worker', 'error'); return; }
    if (!payoutForm.payoutAmount || parseFloat(payoutForm.payoutAmount) <= 0) { show('Enter valid payout amount', 'error'); return; }
    setSavingPayout(true);
    try {
      await addAdminPayout(selectedTenantId, payoutForm);
      show('Payout recorded successfully');
      setShowAddPayoutModal(false);
      setPayoutForm({ employeeId: '', date: todayStr(), payoutAmount: '', paymentMode: 'CASH', referenceNote: '' });
      reloadTenantDetail();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to record payout', 'error');
    } finally {
      setSavingPayout(false);
    }
  };

  // Delete Payout for Tenant
  const handleDeletePayout = async (payoutId: string) => {
    if (!selectedTenantId) return;
    if (!confirm('Delete this payout record?')) return;
    try {
      await deleteAdminPayout(selectedTenantId, payoutId);
      show('Payout record deleted');
      reloadTenantDetail();
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to delete payout', 'error');
    }
  };

  return (
    <>
      <Head>
        <title>Master Admin Panel — Gunny Bags SaaS</title>
        <meta name="description" content="Master Admin Control Center: Create users, edit businesses, and manage all factory data" />
      </Head>

      <Layout>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}

        {/* ─── HERO HEADER ─────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(19, 25, 41, 0.9) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 18,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(245, 158, 11, 0.2)',
                color: 'var(--amber-light)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: 11,
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 20,
                letterSpacing: '0.05em',
              }}>
                <ShieldCheck size={14} /> MASTER SAAS CONTROL PANEL
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                • Restricted to admin@admin.com
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text-white)',
              letterSpacing: '-0.02em',
            }}>
              Master Platform Overview & User Management
            </h2>
            <p style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 4,
              maxWidth: 700,
              lineHeight: 1.5,
            }}>
              Create and onboard new business tenants, manage factory workers, inspect real-time production, update account details, and control access platform-wide.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
              }}
            >
              <Plus size={16} color="#000" />
              <span>+ Create Business User</span>
            </button>

            <button
              onClick={() => { fetchStats(); fetchUsers(); }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCw size={15} className={loadingStats || loadingUsers ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ─── PLATFORM KPI CARDS ──────────────────────────────────────────── */}
        <div className="stats-overview-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card theme-amber">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL BUSINESSES</span>
              <div className="stat-card-icon-badge badge-amber">
                <Building2 size={18} />
              </div>
            </div>
            <div className="stat-card-main-val">
              {loadingStats ? '-' : fmt(stats?.totalTenants)}
            </div>
            <div className="stat-card-caption" style={{ color: 'var(--amber-light)' }}>
              {stats?.activeTenants || 0} Active • {(stats?.totalTenants || 0) - (stats?.activeTenants || 0)} Suspended
            </div>
          </div>

          <div className="stat-card theme-indigo">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL WORKERS</span>
              <div className="stat-card-icon-badge badge-indigo">
                <Users size={18} />
              </div>
            </div>
            <div className="stat-card-main-val">
              {loadingStats ? '-' : fmt(stats?.totalWorkers)}
            </div>
            <div className="stat-card-caption">
              {stats?.activeWorkers || 0} active in factory fleets
            </div>
          </div>

          <div className="stat-card theme-emerald">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL BAGS PRODUCED</span>
              <div className="stat-card-icon-badge badge-emerald">
                <Package size={18} />
              </div>
            </div>
            <div className="stat-card-main-val">
              {loadingStats ? '-' : fmt(stats?.totalBagsCompleted)}
            </div>
            <div className="stat-card-caption" style={{ color: 'var(--emerald-light)' }}>
              Across {fmt(stats?.totalEntries)} logged entries
            </div>
          </div>

          <div className="stat-card theme-indigo">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL PRODUCTION VALUE</span>
              <div className="stat-card-icon-badge badge-indigo">
                <IndianRupee size={18} />
              </div>
            </div>
            <div className="stat-card-main-val">
              {loadingStats ? '-' : fmtCur(stats?.totalWorkAmount)}
            </div>
            <div className="stat-card-caption">
              Wages earned across all factories
            </div>
          </div>

          <div className="stat-card theme-emerald">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL PAID OUT</span>
              <div className="stat-card-icon-badge badge-emerald">
                <Wallet size={18} />
              </div>
            </div>
            <div className="stat-card-main-val">
              {loadingStats ? '-' : fmtCur(stats?.totalPayouts)}
            </div>
            <div className="stat-card-caption" style={{ color: 'var(--emerald-light)' }}>
              Disbursed to workers
            </div>
          </div>

          <div className="stat-card theme-rose">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL PENDING BALANCE</span>
              <div className="stat-card-icon-badge badge-rose">
                <IndianRupee size={18} />
              </div>
            </div>
            <div className="stat-card-main-val" style={{ color: 'var(--rose-light)' }}>
              {loadingStats ? '-' : fmtCur(stats?.totalPendingPayout)}
            </div>
            <div className="stat-card-caption" style={{ color: 'var(--rose-light)' }}>
              Outstanding worker wages
            </div>
          </div>
        </div>

        {/* ─── TENANTS TABLE SECTION ───────────────────────────────────────── */}
        <div className="table-card">
          <div className="table-card-header" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-white)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Building2 size={20} color="var(--indigo-light)" />
                All Registered Businesses ({users.length})
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Full administrative control: Create, edit, inspect, and manage data for any tenant.
              </p>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                <button
                  className={`admin-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({stats?.totalTenants || users.length})
                </button>
                <button
                  className={`admin-tab-btn ${statusFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  Active ({stats?.activeTenants || 0})
                </button>
                <button
                  className={`admin-tab-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('inactive')}
                >
                  Suspended ({(stats?.totalTenants || 0) - (stats?.activeTenants || 0)})
                </button>
              </div>

              <div style={{ position: 'relative', minWidth: 230 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, business, mobile…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 36, width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BUSINESS & OWNER</th>
                  <th>MOBILE</th>
                  <th>WORKERS</th>
                  <th>BAGS MADE</th>
                  <th>TOTAL VALUE</th>
                  <th>PAID OUT</th>
                  <th>PENDING</th>
                  <th>STATUS</th>
                  <th>REGISTERED</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={10} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      <AlertCircle size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No businesses found</div>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary btn-sm"
                        style={{ marginTop: 14 }}
                      >
                        + Create First Business
                      </button>
                    </td>
                  </tr>
                ) : (
                  users.map((tenant) => (
                    <tr key={tenant.id}>
                      {/* Business & Owner */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.1))',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--indigo-light)',
                            fontWeight: 700,
                            fontSize: 15,
                            flexShrink: 0,
                          }}>
                            {tenant.businessName?.[0]?.toUpperCase() || tenant.name?.[0]?.toUpperCase() || 'B'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-white)', fontSize: 14 }}>
                              {tenant.businessName}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span>Owner: {tenant.name}</span>
                              <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, color: 'var(--text-muted)' }}>
                                {tenant.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontSize: 13 }}>
                          <Phone size={13} color="var(--text-muted)" />
                          <span>{tenant.countryCode} {tenant.mobile}</span>
                        </div>
                      </td>

                      {/* Workers */}
                      <td>
                        <button
                          onClick={() => handleInspectTenant(tenant.id)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            padding: '3px 9px',
                            borderRadius: 6,
                            color: '#c7d2fe',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Users size={12} /> {tenant.workerCount} Workers
                        </button>
                      </td>

                      {/* Bags Made */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                          {fmt(tenant.totalBags)}
                        </div>
                      </td>

                      {/* Total Value */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                          {fmtCur(tenant.totalAmount)}
                        </div>
                      </td>

                      {/* Paid Out */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--emerald-light)' }}>
                          {fmtCur(tenant.totalPaid)}
                        </div>
                      </td>

                      {/* Pending */}
                      <td>
                        <div style={{
                          fontWeight: 700,
                          color: tenant.pendingAmount > 0 ? 'var(--amber-light)' : 'var(--text-muted)',
                        }}>
                          {fmtCur(tenant.pendingAmount)}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {tenant.isActive ? (
                          <span className="status-badge-active">
                            <span className="pulse-dot-green" /> Active
                          </span>
                        ) : (
                          <span className="status-badge-suspended">
                            <span className="pulse-dot-red" /> Suspended
                          </span>
                        )}
                      </td>

                      {/* Registered */}
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {fmtDate(tenant.createdAt)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleInspectTenant(tenant.id)}
                            className="btn-secondary btn-sm"
                            title="Inspect & Manage Tenant Data"
                          >
                            <Eye size={13} />
                            <span>Inspect</span>
                          </button>

                          <button
                            onClick={() => openEditModal(tenant)}
                            className="btn-secondary btn-sm"
                            title="Edit Business Details"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => setConfirmToggleTarget(tenant)}
                            className="btn-sm btn-secondary"
                            style={tenant.isActive ? { color: 'var(--amber-light)' } : { color: 'var(--emerald-light)' }}
                            title={tenant.isActive ? 'Suspend Business' : 'Activate Business'}
                          >
                            <Power size={13} />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(tenant)}
                            className="btn-sm btn-secondary"
                            style={{ color: 'var(--rose-light)' }}
                            title="Delete Business Permanently"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── CREATE BUSINESS MODAL ───────────────────────────────────────── */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={20} color="var(--amber)" />
                  Create New Business Tenant
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="btn-icon">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label className="form-label">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    className="form-input"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Business / Factory Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Patel Gunny Bags Trading Co."
                    value={createForm.businessName}
                    onChange={e => setCreateForm({ ...createForm, businessName: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number * (10 digits)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      +91
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={createForm.mobile}
                      onChange={e => setCreateForm({ ...createForm, mobile: e.target.value.replace(/\D/g, '') })}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                    className="form-select"
                  >
                    <option value="OWNER">OWNER (Full Factory Access)</option>
                    <option value="MANAGER">MANAGER (Operations Access)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    id="create-active"
                    checked={createForm.isActive}
                    onChange={e => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  />
                  <label htmlFor="create-active" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Active immediately (user can log in)
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={creatingUser}>
                    {creatingUser ? 'Creating…' : 'Create Business'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── EDIT BUSINESS MODAL ─────────────────────────────────────────── */}
        {editingTenant && (
          <div className="modal-backdrop" onClick={() => setEditingTenant(null)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit2 size={18} color="var(--indigo-light)" />
                  Edit Business Details
                </h3>
                <button onClick={() => setEditingTenant(null)} className="btn-icon">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser}>
                <div className="form-group">
                  <label className="form-label">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Business / Factory Name</label>
                  <input
                    type="text"
                    value={editForm.businessName}
                    onChange={e => setEditForm({ ...editForm, businessName: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number (10 digits)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editForm.mobile}
                    onChange={e => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '') })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    className="form-select"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={editForm.isActive}
                    onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                  />
                  <label htmlFor="edit-active" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Account is Active
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setEditingTenant(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={updatingUser}>
                    {updatingUser ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── DELETE USER CONFIRM MODAL ───────────────────────────────────── */}
        {deleteTarget && (
          <ConfirmModal
            title={`Delete "${deleteTarget.businessName}"?`}
            message={`Are you sure you want to permanently delete "${deleteTarget.businessName}" (${deleteTarget.name})? All their workers, work entries, and payouts will be permanently wiped.`}
            danger={true}
            onConfirm={handleDeleteUser}
            onCancel={() => setDeleteTarget(null)}
          />
        )}

        {/* ─── STATUS TOGGLE CONFIRM MODAL ─────────────────────────────────── */}
        {confirmToggleTarget && (
          <ConfirmModal
            title={confirmToggleTarget.isActive ? 'Suspend Business Account?' : 'Reactivate Business Account?'}
            message={
              confirmToggleTarget.isActive
                ? `Are you sure you want to suspend "${confirmToggleTarget.businessName}"? Their login sessions will be terminated immediately.`
                : `Are you sure you want to reactivate "${confirmToggleTarget.businessName}"? They will immediately be able to log in.`
            }
            danger={confirmToggleTarget.isActive}
            onConfirm={handleConfirmToggle}
            onCancel={() => setConfirmToggleTarget(null)}
          />
        )}

        {/* ─── TENANT DRILLDOWN & COMPLETE MANAGEMENT MODAL ─────────────────── */}
        {selectedTenantId && (
          <div className="modal-backdrop" onClick={() => setSelectedTenantId(null)}>
            <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 18,
                  }}>
                    <Building2 size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-white)' }}>
                        {tenantDetail?.tenant.businessName || 'Business Details'}
                      </h3>
                      {tenantDetail?.tenant.isActive ? (
                        <span className="status-badge-active" style={{ fontSize: 10, padding: '2px 8px' }}>Active</span>
                      ) : (
                        <span className="status-badge-suspended" style={{ fontSize: 10, padding: '2px 8px' }}>Suspended</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12, marginTop: 3 }}>
                      <span>Owner: <strong>{tenantDetail?.tenant.name}</strong></span>
                      <span>•</span>
                      <span>Mobile: <strong>{tenantDetail?.tenant.countryCode} {tenantDetail?.tenant.mobile}</strong></span>
                      <span>•</span>
                      <span>Joined: <strong>{fmtDate(tenantDetail?.tenant.createdAt)}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTenantId(null)}
                  className="btn-icon"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {loadingDetail ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
                  <div>Loading factory records…</div>
                </div>
              ) : tenantDetail ? (
                <div className="modal-body-scroll">
                  {/* Tenant Specific KPIs */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                    marginBottom: 20,
                  }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>WORKERS</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--indigo-light)', marginTop: 3 }}>
                        {tenantDetail.stats.workerCount}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>BAGS MADE</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--emerald-light)', marginTop: 3 }}>
                        {fmt(tenantDetail.stats.totalBags)}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL EARNED</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-white)', marginTop: 3 }}>
                        {fmtCur(tenantDetail.stats.totalEarned)}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL PAID</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--emerald-light)', marginTop: 3 }}>
                        {fmtCur(tenantDetail.stats.totalPaid)}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>PENDING</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: tenantDetail.stats.pendingAmount > 0 ? 'var(--amber-light)' : 'var(--text-muted)', marginTop: 3 }}>
                        {fmtCur(tenantDetail.stats.pendingAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Sub-tabs & Action Buttons */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className={`admin-tab-btn ${detailTab === 'workers' ? 'active' : ''}`}
                        onClick={() => setDetailTab('workers')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Users size={14} />
                        <span>Workers ({tenantDetail.workers.length})</span>
                      </button>
                      <button
                        className={`admin-tab-btn ${detailTab === 'work' ? 'active' : ''}`}
                        onClick={() => setDetailTab('work')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <ClipboardList size={14} />
                        <span>Work Entries ({tenantDetail.recentWork.length})</span>
                      </button>
                      <button
                        className={`admin-tab-btn ${detailTab === 'payouts' ? 'active' : ''}`}
                        onClick={() => setDetailTab('payouts')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Wallet size={14} />
                        <span>Payouts ({tenantDetail.recentPayouts.length})</span>
                      </button>
                    </div>

                    {/* Master Action for current tab */}
                    <div>
                      {detailTab === 'workers' && (
                        <button
                          onClick={() => setShowAddWorkerModal(true)}
                          className="btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <Plus size={14} />
                          <span>Add Worker</span>
                        </button>
                      )}
                      {detailTab === 'work' && (
                        <button
                          onClick={() => setShowAddWorkModal(true)}
                          className="btn-primary btn-sm"
                          disabled={tenantDetail.workers.length === 0}
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <Plus size={14} />
                          <span>Log Work Entry</span>
                        </button>
                      )}
                      {detailTab === 'payouts' && (
                        <button
                          onClick={() => setShowAddPayoutModal(true)}
                          className="btn-primary btn-sm"
                          disabled={tenantDetail.workers.length === 0}
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <Plus size={14} />
                          <span>Record Payout</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TAB 1: WORKERS */}
                  {detailTab === 'workers' && (
                    <div style={{ overflowX: 'auto' }}>
                      {tenantDetail.workers.length === 0 ? (
                        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No workers added yet for this business.
                          <div style={{ marginTop: 10 }}>
                            <button className="btn-primary btn-sm" onClick={() => setShowAddWorkerModal(true)}>
                              + Add First Worker
                            </button>
                          </div>
                        </div>
                      ) : (
                        <table className="data-table" style={{ fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>WORKER NAME</th>
                              <th>MOBILE</th>
                              <th>RATE/BAG</th>
                              <th>BAGS MADE</th>
                              <th>TOTAL EARNED</th>
                              <th>STATUS</th>
                              <th style={{ textAlign: 'right' }}>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenantDetail.workers.map((w) => (
                              <tr key={w.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{w.name}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{w.mobile || '-'}</td>
                                <td>₹{w.ratePerBag}/bag</td>
                                <td style={{ fontWeight: 600 }}>{fmt(w.totalBags)}</td>
                                <td style={{ fontWeight: 600, color: 'var(--emerald-light)' }}>{fmtCur(w.totalEarned)}</td>
                                <td>
                                  {w.isActive ? (
                                    <span style={{ color: 'var(--emerald-light)', fontSize: 11, fontWeight: 600 }}>Active</span>
                                  ) : (
                                    <span style={{ color: 'var(--rose-light)', fontSize: 11, fontWeight: 600 }}>Inactive</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleDeleteWorker(w.id)}
                                    className="btn-icon danger"
                                    style={{ width: 28, height: 28 }}
                                    title="Delete Worker"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB 2: RECENT WORK */}
                  {detailTab === 'work' && (
                    <div style={{ overflowX: 'auto' }}>
                      {tenantDetail.recentWork.length === 0 ? (
                        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No work production entries logged yet.
                        </div>
                      ) : (
                        <table className="data-table" style={{ fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>DATE</th>
                              <th>WORKER</th>
                              <th>BAGS</th>
                              <th>RATE</th>
                              <th>TOTAL AMOUNT</th>
                              <th>NOTES</th>
                              <th style={{ textAlign: 'right' }}>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenantDetail.recentWork.map((entry) => (
                              <tr key={entry.id}>
                                <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(entry.date)}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{entry.employeeName}</td>
                                <td style={{ fontWeight: 600 }}>{fmt(entry.bagCount)}</td>
                                <td>₹{entry.ratePerBag}</td>
                                <td style={{ fontWeight: 600, color: 'var(--emerald-light)' }}>{fmtCur(entry.totalAmount)}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{entry.notes || '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleDeleteWork(entry.id)}
                                    className="btn-icon danger"
                                    style={{ width: 28, height: 28 }}
                                    title="Delete Entry"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB 3: RECENT PAYOUTS */}
                  {detailTab === 'payouts' && (
                    <div style={{ overflowX: 'auto' }}>
                      {tenantDetail.recentPayouts.length === 0 ? (
                        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No payout records logged yet.
                        </div>
                      ) : (
                        <table className="data-table" style={{ fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>DATE</th>
                              <th>WORKER</th>
                              <th>AMOUNT PAID</th>
                              <th>MODE</th>
                              <th>REFERENCE</th>
                              <th style={{ textAlign: 'right' }}>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenantDetail.recentPayouts.map((p) => (
                              <tr key={p.id}>
                                <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.date)}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{p.employeeName}</td>
                                <td style={{ fontWeight: 700, color: 'var(--emerald-light)' }}>{fmtCur(p.payoutAmount)}</td>
                                <td>
                                  <span style={{
                                    fontSize: 11,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'var(--text-secondary)',
                                  }}>
                                    {p.paymentMode}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.referenceNote || '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleDeletePayout(p.id)}
                                    className="btn-icon danger"
                                    style={{ width: 28, height: 28 }}
                                    title="Delete Payout"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
                marginTop: 16,
              }}>
                <button className="btn-secondary" onClick={() => setSelectedTenantId(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ADD WORKER FOR TENANT MODAL ─────────────────────────────────── */}
        {showAddWorkerModal && (
          <div className="modal-backdrop" onClick={() => setShowAddWorkerModal(false)} style={{ zIndex: 1100 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">+ Add Worker for Business</h3>
              <form onSubmit={handleAddWorker}>
                <div className="form-group">
                  <label className="form-label">Worker Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Worker"
                    value={workerForm.name}
                    onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })}
                    className="form-input"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="Optional 10-digit mobile"
                    value={workerForm.mobile}
                    onChange={e => setWorkerForm({ ...workerForm, mobile: e.target.value.replace(/\D/g, '') })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate Per Bag (₹) *</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={workerForm.ratePerBag}
                    onChange={e => setWorkerForm({ ...workerForm, ratePerBag: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddWorkerModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={savingWorker}>
                    {savingWorker ? 'Saving…' : 'Add Worker'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── ADD WORK ENTRY FOR TENANT MODAL ─────────────────────────────── */}
        {showAddWorkModal && tenantDetail && (
          <div className="modal-backdrop" onClick={() => setShowAddWorkModal(false)} style={{ zIndex: 1100 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">+ Log Work Production Entry</h3>
              <form onSubmit={handleAddWork}>
                <div className="form-group">
                  <label className="form-label">Select Worker *</label>
                  <select
                    required
                    value={workForm.employeeId}
                    onChange={e => setWorkForm({ ...workForm, employeeId: e.target.value })}
                    className="form-select"
                    autoFocus
                  >
                    <option value="">-- Choose Worker --</option>
                    {tenantDetail.workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} (₹{w.ratePerBag}/bag)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Production Date *</label>
                  <input
                    type="date"
                    required
                    value={workForm.date}
                    onChange={e => setWorkForm({ ...workForm, date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bags Completed *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 150"
                    value={workForm.bagCount}
                    onChange={e => setWorkForm({ ...workForm, bagCount: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Shift details, lot number…"
                    value={workForm.notes}
                    onChange={e => setWorkForm({ ...workForm, notes: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddWorkModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={savingWork}>
                    {savingWork ? 'Recording…' : 'Record Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── ADD PAYOUT FOR TENANT MODAL ─────────────────────────────────── */}
        {showAddPayoutModal && tenantDetail && (
          <div className="modal-backdrop" onClick={() => setShowAddPayoutModal(false)} style={{ zIndex: 1100 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">+ Record Worker Payout</h3>
              <form onSubmit={handleAddPayout}>
                <div className="form-group">
                  <label className="form-label">Select Worker *</label>
                  <select
                    required
                    value={payoutForm.employeeId}
                    onChange={e => setPayoutForm({ ...payoutForm, employeeId: e.target.value })}
                    className="form-select"
                    autoFocus
                  >
                    <option value="">-- Choose Worker --</option>
                    {tenantDetail.workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payout Date *</label>
                  <input
                    type="date"
                    required
                    value={payoutForm.date}
                    onChange={e => setPayoutForm({ ...payoutForm, date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payout Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={payoutForm.payoutAmount}
                    onChange={e => setPayoutForm({ ...payoutForm, payoutAmount: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    value={payoutForm.paymentMode}
                    onChange={e => setPayoutForm({ ...payoutForm, paymentMode: e.target.value })}
                    className="form-select"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddPayoutModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={savingPayout}>
                    {savingPayout ? 'Saving…' : 'Record Payout'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}
