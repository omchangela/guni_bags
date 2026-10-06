import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Toast, useToast, SkeletonRow } from '@/components/ui';
import { getEmployees, getEmployeeReport, getDailyReport } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { FileText, TrendingUp, Wallet, Package2 } from 'lucide-react';

const fmtCur = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(n)}`;
const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const today = () => new Date().toISOString().split('T')[0];
const sevenDaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 6);
  return d.toISOString().split('T')[0];
};

interface Employee { id: string; name: string; }
interface EmpReport {
  employee: { id: string; name: string; mobile: string; ratePerBag: number; };
  summary: { totalBags: number; totalEarned: number; totalPaid: number; pendingAmount: number; };
  workHistory: Array<{ id: string; date: string; bagCount: number; ratePerBag: number; totalAmount: number; time?: string; notes?: string; }>;
  payoutHistory: Array<{ id: string; date: string; payoutAmount: number; remainingAmount: number; paymentMode: string; referenceNote?: string; }>;
}

export default function ReportsPage() {
  const router = useRouter();
  const { toast, show, hide } = useToast();
  const [tab, setTab] = useState<'daily' | 'employee'>('daily');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState(sevenDaysAgo());
  const [endDate, setEndDate] = useState(today());
  const [dailyDate, setDailyDate] = useState(today());
  const [empReport, setEmpReport] = useState<EmpReport | null>(null);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getEmployees().then(r => {
      setEmployees(r.data.data);
      const { employeeId } = router.query;
      if (employeeId) { setSelectedEmployee(employeeId as string); setTab('employee'); }
    }).catch(() => {});
  }, []);

  const loadEmployeeReport = useCallback(async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getEmployeeReport(selectedEmployee, params);
      setEmpReport(res.data.data);
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to load report', 'error');
    } finally { setLoading(false); }
  }, [selectedEmployee, startDate, endDate]);

  const loadDailyReport = useCallback(async () => {
    if (!dailyDate) return;
    setLoading(true);
    try {
      const res = await getDailyReport(dailyDate);
      setDailyReport(res.data.data);
    } catch (err: any) {
      show(err.response?.data?.message || 'Failed to load daily report', 'error');
    } finally { setLoading(false); }
  }, [dailyDate]);

  useEffect(() => {
    if (tab === 'employee' && selectedEmployee) loadEmployeeReport();
    if (tab === 'daily') loadDailyReport();
  }, [tab, selectedEmployee, loadEmployeeReport, loadDailyReport]);

  // Build chart data from work history
  const workChartData = empReport?.workHistory.slice().reverse().reduce((acc: any[], entry) => {
    const ex = acc.find(a => a.date === entry.date);
    if (ex) { ex.bags += entry.bagCount; ex.amount += entry.totalAmount; }
    else acc.push({ date: entry.date.slice(5), bags: entry.bagCount, amount: entry.totalAmount });
    return acc;
  }, []) || [];

  return (
    <>
      <Head>
        <title>Reports — Gunny Bags Manager</title>
        <meta name="description" content="Daily and employee-wise production reports and ledger" />
      </Head>
      <Layout>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {['daily', 'employee'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: tab === t ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}>
              {t === 'daily' ? '📅 Daily Report' : '👤 Employee Ledger'}
            </button>
          ))}
        </div>

        {/* DAILY REPORT */}
        {tab === 'daily' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="form-input" style={{ width: 'auto' }} />
              <button className="btn-primary" onClick={loadDailyReport}>Load Report</button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="glass-card p-5"><div className="skeleton" style={{ height: 200, borderRadius: 10 }} /></div>)}
              </div>
            ) : dailyReport ? (
              <>
                {/* Summary cards */}
                <div className="stats-overview-grid mb-6">
                  {[
                    { label: 'Total Bags Produced', value: fmt(dailyReport.totalBags), color: '#a5b4fc' },
                    { label: 'Total Wages Payable', value: fmtCur(dailyReport.totalAmount), color: '#34d399' },
                    { label: 'Active Workers', value: dailyReport.employeeSummary.length, color: '#fbbf24' },
                    { label: 'Total Entries Logged', value: dailyReport.entries.length, color: '#f87171' },
                  ].map(c => (
                    <div key={c.label} className="stat-card">
                      <div className="stat-card-label">{c.label}</div>
                      <div className="stat-card-main-val" style={{ fontSize: 26, color: c.color }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Employee summary */}
                <div className="table-card mb-6">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text-primary)' }}>
                    Employee Summary
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Employee</th><th>Bags</th><th>Amount</th></tr></thead>
                    <tbody>
                      {dailyReport.employeeSummary.map((e: any) => (
                        <tr key={e.employeeId}>
                          <td style={{ fontWeight: 600 }}>{e.employeeName}</td>
                          <td><span className="badge badge-indigo">{fmt(e.bags)}</span></td>
                          <td style={{ fontWeight: 700, color: '#34d399' }}>{fmtCur(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bar chart */}
                <div className="glass-card p-5 mb-6">
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>Production by Employee</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyReport.employeeSummary.map((e: any) => ({ name: e.employeeName, bags: e.bags }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1e2940', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
                      <Bar dataKey="bags" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Entries table */}
                <div className="glass-card overflow-hidden">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text-primary)' }}>
                    All Entries
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Employee</th><th>Time</th><th>Bags</th><th>Rate</th><th>Amount</th><th>Notes</th></tr></thead>
                      <tbody>
                        {dailyReport.entries.map((e: any) => (
                          <tr key={e.id}>
                            <td style={{ fontWeight: 600 }}>{e.employeeName}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{e.time || '—'}</td>
                            <td><span className="badge badge-indigo">{e.bagCount}</span></td>
                            <td style={{ color: 'var(--text-secondary)' }}>₹{e.ratePerBag}</td>
                            <td style={{ fontWeight: 700, color: '#34d399' }}>{fmtCur(e.totalAmount)}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{e.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* EMPLOYEE LEDGER */}
        {tab === 'employee' && (
          <div>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <select className="form-input" style={{ width: 'auto' }} value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" style={{ width: 'auto' }} />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" style={{ width: 'auto' }} />
              <button className="btn-primary" onClick={loadEmployeeReport} disabled={!selectedEmployee}>Load Ledger</button>
            </div>

            {!selectedEmployee && (
              <div className="glass-card p-10" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Select an employee to view their ledger</p>
              </div>
            )}

            {loading && selectedEmployee && (
              <div className="glass-card p-5"><div className="skeleton" style={{ height: 200, borderRadius: 10 }} /></div>
            )}

            {!loading && empReport && (
              <>
                {/* Profile + Summary */}
                <div className="glass-card p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(245,158,11,0.06))' }}>
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>{empReport.employee.name}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>{empReport.employee.mobile || 'No mobile'}</div>
                      <div style={{ marginTop: 6 }}><span className="badge badge-indigo">₹{empReport.employee.ratePerBag}/bag</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Bags', value: fmt(empReport.summary.totalBags), icon: Package2, color: '#a5b4fc' },
                        { label: 'Total Earned', value: fmtCur(empReport.summary.totalEarned), icon: TrendingUp, color: '#34d399' },
                        { label: 'Total Paid', value: fmtCur(empReport.summary.totalPaid), icon: Wallet, color: '#fbbf24' },
                        { label: 'Pending', value: fmtCur(empReport.summary.pendingAmount), icon: FileText, color: empReport.summary.pendingAmount > 0 ? '#f87171' : '#34d399' },
                      ].map(c => (
                        <div key={c.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{c.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: c.color }}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Work trend chart */}
                {workChartData.length > 1 && (
                  <div className="glass-card p-5 mb-6">
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>Daily Production Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={workChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e2940', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
                        <Legend />
                        <Line type="monotone" dataKey="bags" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} name="Bags" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Work history */}
                <div className="glass-card overflow-hidden mb-4">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Work History
                    <span className="badge badge-indigo">{empReport.workHistory.length} entries</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Bags</th><th>Rate</th><th>Amount</th><th>Time</th><th>Notes</th></tr></thead>
                      <tbody>
                        {empReport.workHistory.length ? empReport.workHistory.map(w => (
                          <tr key={w.id}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{w.date}</td>
                            <td style={{ fontWeight: 700 }}>{fmt(w.bagCount)}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>₹{w.ratePerBag}</td>
                            <td style={{ fontWeight: 700, color: '#34d399' }}>{fmtCur(w.totalAmount)}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{w.time || '—'}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{w.notes || '—'}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No work entries</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payout history */}
                <div className="glass-card overflow-hidden">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Payout History
                    <span className="badge badge-success">{empReport.payoutHistory.length} payments</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Amount Paid</th><th>Remaining After</th><th>Mode</th><th>Reference</th></tr></thead>
                      <tbody>
                        {empReport.payoutHistory.length ? empReport.payoutHistory.map(p => (
                          <tr key={p.id}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.date}</td>
                            <td style={{ fontWeight: 700, color: '#34d399' }}>{fmtCur(p.payoutAmount)}</td>
                            <td style={{ fontWeight: 600, color: p.remainingAmount > 0 ? '#fbbf24' : '#34d399' }}>{fmtCur(p.remainingAmount)}</td>
                            <td><span className="badge badge-indigo">{p.paymentMode.replace('_', ' ')}</span></td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.referenceNote || '—'}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No payouts recorded</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </Layout>
    </>
  );
}
