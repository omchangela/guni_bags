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
} from '@/lib/api';
import {
  Building2,
  Users,
  Package,
  IndianRupee,
  Search,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Power,
  RefreshCw,
  Calendar,
  Phone,
  Wallet,
  ClipboardList,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  AlertCircle,
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

  // Drill-down Modal State
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'workers' | 'work' | 'payouts'>('workers');

  // Status Toggle Modal State
  const [confirmTarget, setConfirmTarget] = useState<TenantUser | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Super Admin validation
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role !== 'SUPER_ADMIN' && u.mobile !== '9876543210') {
          show('Access Denied: Super Admin role required', 'error');
          router.replace('/');
        }
      } catch {
        router.replace('/login');
      }
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

  // Toggle Account Status (Suspend / Activate)
  const handleConfirmToggle = async () => {
    if (!confirmTarget) return;
    setToggleLoading(true);
    try {
      const newStatus = !confirmTarget.isActive;
      await toggleTenantStatus(confirmTarget.id, newStatus);
      show(`Business ${newStatus ? 'activated' : 'suspended'} successfully`);
      setConfirmTarget(null);
      fetchUsers();
      fetchStats();
      if (selectedTenantId === confirmTarget.id && tenantDetail) {
        setTenantDetail({
          ...tenantDetail,
          tenant: { ...tenantDetail.tenant, isActive: newStatus },
        });
      }
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to update account status', 'error');
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Main Admin Panel — Gunny Bags SaaS</title>
        <meta name="description" content="Super Admin Control Panel: Manage all business tenants, workers, bags produced, and financial flows." />
      </Head>

      <Layout>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}

        {/* ─── HERO HEADER ─────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(19, 25, 41, 0.8) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 18,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
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
                background: 'rgba(245, 158, 11, 0.18)',
                color: 'var(--amber-light)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                letterSpacing: '0.05em',
              }}>
                <ShieldCheck size={14} /> SUPER ADMIN CONTROL PANEL
              </span>
              <span style={{
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                • Multi-Tenant SaaS
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text-white)',
              letterSpacing: '-0.02em',
            }}>
              Platform Overview & Business Tenants
            </h2>
            <p style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 4,
              maxWidth: 680,
              lineHeight: 1.5,
            }}>
              Master administration center. Monitor all registered businesses, view collective factory output, inspect tenant-specific work records, and manage access privileges.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => { fetchStats(); fetchUsers(); }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCw size={15} className={loadingStats || loadingUsers ? 'spin' : ''} />
              <span>Refresh Platform</span>
            </button>
          </div>
        </div>

        {/* ─── PLATFORM KPI CARDS ──────────────────────────────────────────── */}
        <div className="stats-overview-grid" style={{ marginBottom: 28 }}>
          {/* Card 1: Businesses */}
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

          {/* Card 2: Workers */}
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
              {stats?.activeWorkers || 0} active workers in factories
            </div>
          </div>

          {/* Card 3: Bags */}
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
              Across {fmt(stats?.totalEntries)} logged production entries
            </div>
          </div>

          {/* Card 4: Financial Volume */}
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
              Total earned by workers platform-wide
            </div>
          </div>

          {/* Card 5: Paid Out */}
          <div className="stat-card theme-emerald">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL PAID TO WORKERS</span>
              <div className="stat-card-icon-badge badge-emerald">
                <Wallet size={18} />
              </div>
            </div>
            <div className="stat-card-main-val">
              {loadingStats ? '-' : fmtCur(stats?.totalPayouts)}
            </div>
            <div className="stat-card-caption" style={{ color: 'var(--emerald-light)' }}>
              Disbursed through cash / UPI
            </div>
          </div>

          {/* Card 6: Pending Balance */}
          <div className="stat-card theme-rose">
            <div className="stat-card-top">
              <span className="stat-card-label">TOTAL PENDING PAYOUTS</span>
              <div className="stat-card-icon-badge badge-rose">
                <IndianRupee size={18} />
              </div>
            </div>
            <div className="stat-card-main-val" style={{ color: 'var(--rose-light)' }}>
              {loadingStats ? '-' : fmtCur(stats?.totalPendingPayout)}
            </div>
            <div className="stat-card-caption" style={{ color: 'var(--rose-light)' }}>
              Outstanding worker wages across businesses
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
                Registered Businesses & Tenants ({users.length})
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Click &quot;Inspect Data&quot; to audit worker records, daily logs, and payouts for any tenant.
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

              <div style={{ position: 'relative', minWidth: 240 }}>
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
                  <th>CONTACT</th>
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
                      <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search or status filter.</div>
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
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#c7d2fe',
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          <Users size={12} /> {tenant.workerCount} Workers
                        </span>
                      </td>

                      {/* Bags Made */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                          {fmt(tenant.totalBags)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>bags</div>
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => handleInspectTenant(tenant.id)}
                            className="btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            title="Inspect Tenant Data"
                          >
                            <Eye size={13} />
                            <span>Inspect</span>
                          </button>

                          <button
                            onClick={() => setConfirmTarget(tenant)}
                            className={`btn-sm ${tenant.isActive ? 'btn-secondary' : 'btn-primary'}`}
                            style={tenant.isActive ? { color: 'var(--rose-light)', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}
                            title={tenant.isActive ? 'Suspend Business Account' : 'Reactivate Business Account'}
                          >
                            <Power size={13} />
                            <span>{tenant.isActive ? 'Suspend' : 'Activate'}</span>
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

        {/* ─── TENANT DRILLDOWN MODAL ─────────────────────────────────────── */}
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 12,
                    marginBottom: 20,
                  }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>WORKERS FLEET</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--indigo-light)', marginTop: 4 }}>
                        {tenantDetail.stats.workerCount}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>BAGS COMPLETED</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--emerald-light)', marginTop: 4 }}>
                        {fmt(tenantDetail.stats.totalBags)}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL EARNED</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-white)', marginTop: 4 }}>
                        {fmtCur(tenantDetail.stats.totalEarned)}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL PAID</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--emerald-light)', marginTop: 4 }}>
                        {fmtCur(tenantDetail.stats.totalPaid)}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PENDING BALANCE</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: tenantDetail.stats.pendingAmount > 0 ? 'var(--amber-light)' : 'var(--text-muted)', marginTop: 4 }}>
                        {fmtCur(tenantDetail.stats.pendingAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
                    <button
                      className={`admin-tab-btn ${detailTab === 'workers' ? 'active' : ''}`}
                      onClick={() => setDetailTab('workers')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Users size={14} />
                      <span>Workers Fleet ({tenantDetail.workers.length})</span>
                    </button>
                    <button
                      className={`admin-tab-btn ${detailTab === 'work' ? 'active' : ''}`}
                      onClick={() => setDetailTab('work')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <ClipboardList size={14} />
                      <span>Recent Work Logs ({tenantDetail.recentWork.length})</span>
                    </button>
                    <button
                      className={`admin-tab-btn ${detailTab === 'payouts' ? 'active' : ''}`}
                      onClick={() => setDetailTab('payouts')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Wallet size={14} />
                      <span>Recent Payouts ({tenantDetail.recentPayouts.length})</span>
                    </button>
                  </div>

                  {/* TAB 1: WORKERS */}
                  {detailTab === 'workers' && (
                    <div style={{ overflowX: 'auto' }}>
                      {tenantDetail.workers.length === 0 ? (
                        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          This business has not added any workers yet.
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

        {/* ─── STATUS TOGGLE CONFIRM MODAL ─────────────────────────────────── */}
        {confirmTarget && (
          <ConfirmModal
            title={confirmTarget.isActive ? 'Suspend Business Account?' : 'Reactivate Business Account?'}
            message={
              confirmTarget.isActive
                ? `Are you sure you want to suspend "${confirmTarget.businessName}" (${confirmTarget.name})? Their active sessions and login tokens will be immediately revoked, and they will not be able to log in until reactivated.`
                : `Are you sure you want to reactivate "${confirmTarget.businessName}" (${confirmTarget.name})? The user will immediately be able to log in and manage their factory.`
            }
            danger={confirmTarget.isActive}
            onConfirm={handleConfirmToggle}
            onCancel={() => setConfirmTarget(null)}
          />
        )}
      </Layout>
    </>
  );
}
