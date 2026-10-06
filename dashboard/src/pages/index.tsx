import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { StatCard, useToast, SkeletonRow, Toast } from '@/components/ui';
import { getDashboardSummary, getDailyReport } from '@/lib/api';
import { Package2, IndianRupee, Users, TrendingUp, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const fmtCur = (n: number) => `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0 }).format(n)}`;
const today = () => new Date().toISOString().split('T')[0];

interface DashboardData {
  date: string;
  todaysBagsCompleted: number;
  todaysWorkAmount: number;
  totalPendingPayout: number;
  activeWorkersCount: number;
  todaysEntriesCount: number;
}
interface DailyEntry {
  id: string;
  employeeName: string;
  bagCount: number;
  ratePerBag: number;
  totalAmount: number;
  time: string;
  notes: string;
}
interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  bags: number;
  amount: number;
}

const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];

export default function DashboardPage() {
  const { toast, show, hide } = useToast();
  const [summary, setSummary] = useState<DashboardData | null>(null);
  const [daily, setDaily] = useState<{ entries: DailyEntry[]; employeeSummary: EmployeeSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today());

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [sumRes, dailyRes] = await Promise.all([
        getDashboardSummary(selectedDate),
        getDailyReport(selectedDate),
      ]);
      setSummary(sumRes.data.data);
      setDaily(dailyRes.data.data);
      if (isManual) show('Dashboard updated', 'success');
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load();
  }, [selectedDate]);

  const chartData = daily?.employeeSummary.map(e => ({
    name: e.employeeName,
    bags: e.bags,
    amount: e.amount
  })) || [];

  return (
    <>
      <Head>
        <title>Dashboard — Gunny Bags Manager</title>
        <meta name="description" content="Real-time dashboard for gunny bags production and payouts" />
      </Head>

      <Layout>
        {/* Date Filter & Action Bar */}
        <div className="filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#94a3b8" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="form-input"
              style={{ width: 'auto', fontWeight: 600 }}
            />
          </div>

          <button
            className="btn-primary btn-sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          <button
            className={`btn-secondary btn-sm ${selectedDate === today() ? 'active' : ''}`}
            onClick={() => setSelectedDate(today())}
          >
            Today
          </button>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="stats-overview-grid">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="stat-card">
                <div className="skeleton-line" style={{ height: 14, width: '50%', marginBottom: 18 }} />
                <div className="skeleton-line" style={{ height: 36, width: '70%', marginBottom: 10 }} />
                <div className="skeleton-line" style={{ height: 12, width: '40%' }} />
              </div>
            ))
          ) : summary ? (
            <>
              <StatCard
                label="Today's Production"
                value={`${fmt(summary.todaysBagsCompleted)} bags`}
                icon={<Package2 size={20} />}
                colorTheme="indigo"
                change={`${summary.todaysEntriesCount} entries recorded`}
              />
              <StatCard
                label="Today's Wages"
                value={fmtCur(summary.todaysWorkAmount)}
                icon={<TrendingUp size={20} />}
                colorTheme="emerald"
                change="Earned by active workers"
              />
              <StatCard
                label="Pending Payouts"
                value={fmtCur(summary.totalPendingPayout)}
                icon={<AlertCircle size={20} />}
                colorTheme="amber"
                change="Outstanding balance to pay"
              />
              <StatCard
                label="Active Workers"
                value={`${summary.activeWorkersCount} workers`}
                icon={<Users size={20} />}
                colorTheme="rose"
                change="Contributed today"
              />
            </>
          ) : null}
        </div>

        {/* Analytics Section: Chart + Worker Breakdown */}
        <div className="analytics-split-grid">
          {/* Production Chart */}
          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <TrendingUp size={18} color="#6366f1" />
                <span>Production by Worker</span>
              </h2>
              <span className="badge-pill pill-indigo">
                {chartData.length} workers logged
              </span>
            </div>

            {loading ? (
              <div className="skeleton-line" style={{ height: 240, borderRadius: 12 }} />
            ) : chartData.length > 0 ? (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={36} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{
                        background: '#131929',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12,
                        padding: '10px 14px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: 4 }}
                      formatter={(v, name) => [
                        (name as string) === 'bags' ? `${v} bags` : fmtCur(Number(v)),
                        (name as string) === 'bags' ? 'Production' : 'Earned'
                      ]}
                    />
                    <Bar dataKey="bags" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{
                height: 240,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: 8,
              }}>
                <Package2 size={32} opacity={0.4} />
                <span>No work entries logged for this date</span>
              </div>
            )}
          </div>

          {/* Worker Ranking / Leaderboard */}
          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <Users size={18} color="#10b981" />
                <span>Top Workers Today</span>
              </h2>
            </div>

            {loading ? (
              <div className="leaderboard-list">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-line" style={{ height: 48, borderRadius: 12 }} />
                ))}
              </div>
            ) : daily?.employeeSummary && daily.employeeSummary.length > 0 ? (
              <div className="leaderboard-list">
                {daily.employeeSummary.map((e, idx) => (
                  <div key={e.employeeId} className="leaderboard-item">
                    <div className="worker-identity">
                      <div className="worker-rank-badge">
                        #{idx + 1}
                      </div>
                      <span className="worker-name">{e.employeeName}</span>
                    </div>
                    <div className="worker-stats-col">
                      <div className="worker-bags-val">{fmt(e.bags)} bags</div>
                      <div className="worker-amt-val">{fmtCur(e.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                height: 180,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}>
                No worker production recorded today
              </div>
            )}
          </div>
        </div>

        {/* Today's Entries Table */}
        <div className="table-card">
          <div className="table-card-header">
            <h2 className="panel-title">
              <Package2 size={18} color="#f59e0b" />
              <span>Today's Work Entries</span>
            </h2>
            <span className="badge-pill pill-indigo">
              {daily?.entries.length || 0} entries
            </span>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Entry Time</th>
                  <th>Bags Made</th>
                  <th>Rate / Bag</th>
                  <th>Total Amount</th>
                  <th>Remarks / Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map(i => <SkeletonRow key={i} cols={6} />)
                ) : daily?.entries && daily.entries.length > 0 ? (
                  daily.entries.map(entry => (
                    <tr key={entry.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span className="worker-avatar">
                          {entry.employeeName.charAt(0).toUpperCase()}
                        </span>
                        {entry.employeeName}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {entry.time || '—'}
                      </td>
                      <td>
                        <span className="badge-pill pill-indigo">
                          {entry.bagCount} bags
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        ₹{entry.ratePerBag}
                      </td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>
                        {fmtCur(entry.totalAmount)}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {entry.notes || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>
                      No work entries found for {selectedDate}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </Layout>
    </>
  );
}
