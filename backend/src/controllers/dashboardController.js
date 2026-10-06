const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const [[todayWork]] = await pool.execute(
      `SELECT COALESCE(SUM(bag_count), 0) AS bags, COALESCE(SUM(total_amount), 0) AS amount, COUNT(*) AS entries_count
       FROM work_entries WHERE date = ?`,
      [date]
    );

    const [[pendingRow]] = await pool.execute(
      `SELECT 
         COALESCE(SUM(w.total_amount), 0) - COALESCE(SUM(p.payout_amount), 0) AS total_pending
       FROM employees e
       LEFT JOIN work_entries w ON w.employee_id = e.id
       LEFT JOIN payouts p ON p.employee_id = e.id
       WHERE e.is_active = TRUE`
    );

    const [[activeWorkers]] = await pool.execute(
      `SELECT COUNT(DISTINCT employee_id) AS count FROM work_entries WHERE date = ?`,
      [date]
    );

    return successResponse(res, {
      date,
      todaysBagsCompleted: parseInt(todayWork.bags),
      todaysWorkAmount: parseFloat(todayWork.amount),
      totalPendingPayout: parseFloat(pendingRow.total_pending || 0),
      activeWorkersCount: parseInt(activeWorkers.count),
      todaysEntriesCount: parseInt(todayWork.entries_count),
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    return errorResponse(res, 'Failed to fetch dashboard data', 'SERVER_ERROR', err.message, 500);
  }
};

// GET /reports/daily?date=YYYY-MM-DD
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return errorResponse(res, 'date query parameter is required (YYYY-MM-DD)', 'VALIDATION_ERROR');

    const [[totals]] = await pool.execute(
      'SELECT COALESCE(SUM(bag_count), 0) AS bags, COALESCE(SUM(total_amount), 0) AS amount FROM work_entries WHERE date = ?',
      [date]
    );

    const [summary] = await pool.execute(
      `SELECT w.employee_id, e.name AS employee_name,
              SUM(w.bag_count) AS bags, SUM(w.total_amount) AS amount
       FROM work_entries w JOIN employees e ON e.id = w.employee_id
       WHERE w.date = ? GROUP BY w.employee_id, e.name ORDER BY bags DESC`,
      [date]
    );

    const [entries] = await pool.execute(
      `SELECT w.id, w.employee_id, e.name AS employee_name,
              w.bag_count, w.rate_per_bag, w.total_amount, w.entry_time, w.notes
       FROM work_entries w JOIN employees e ON e.id = w.employee_id
       WHERE w.date = ? ORDER BY w.entry_time ASC`,
      [date]
    );

    return successResponse(res, {
      date,
      totalBags: parseInt(totals.bags),
      totalAmount: parseFloat(totals.amount),
      employeeSummary: summary.map(s => ({
        employeeId: s.employee_id,
        employeeName: s.employee_name,
        bags: parseInt(s.bags),
        amount: parseFloat(s.amount),
      })),
      entries: entries.map(e => ({
        id: e.id,
        employeeId: e.employee_id,
        employeeName: e.employee_name,
        bagCount: e.bag_count,
        ratePerBag: parseFloat(e.rate_per_bag),
        totalAmount: parseFloat(e.total_amount),
        time: e.entry_time ? e.entry_time.substring(0, 5) : null,
        notes: e.notes || '',
      })),
    });
  } catch (err) {
    console.error('getDailyReport error:', err);
    return errorResponse(res, 'Failed to fetch daily report', 'SERVER_ERROR', err.message, 500);
  }
};

// GET /reports/employee/:employeeId
const getEmployeeReport = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const [emps] = await pool.execute('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!emps.length) return errorResponse(res, 'Employee not found', 'NOT_FOUND', null, 404);
    const emp = emps[0];

    let workSql = 'SELECT * FROM work_entries WHERE employee_id = ?';
    let payoutSql = 'SELECT * FROM payouts WHERE employee_id = ?';
    const workParams = [employeeId];
    const payoutParams = [employeeId];

    if (startDate) { workSql += ' AND date >= ?'; workParams.push(startDate); payoutSql += ' AND date >= ?'; payoutParams.push(startDate); }
    if (endDate) { workSql += ' AND date <= ?'; workParams.push(endDate); payoutSql += ' AND date <= ?'; payoutParams.push(endDate); }
    workSql += ' ORDER BY date DESC, entry_time DESC';
    payoutSql += ' ORDER BY date DESC';

    const [workHistory] = await pool.execute(workSql, workParams);
    const [payoutHistory] = await pool.execute(payoutSql, payoutParams);

    const totalEarned = workHistory.reduce((s, r) => s + parseFloat(r.total_amount), 0);
    const totalPaid = payoutHistory.reduce((s, r) => s + parseFloat(r.payout_amount), 0);

    return successResponse(res, {
      employee: {
        id: emp.id, name: emp.name, mobile: emp.mobile,
        ratePerBag: parseFloat(emp.rate_per_bag),
      },
      summary: {
        totalBags: workHistory.reduce((s, r) => s + r.bag_count, 0),
        totalEarned,
        totalPaid,
        pendingAmount: totalEarned - totalPaid,
      },
      workHistory: workHistory.map(w => ({
        id: w.id,
        date: w.date instanceof Date ? w.date.toISOString().split('T')[0] : w.date,
        bagCount: w.bag_count, ratePerBag: parseFloat(w.rate_per_bag),
        totalAmount: parseFloat(w.total_amount), time: w.entry_time,
        notes: w.notes || '',
      })),
      payoutHistory: payoutHistory.map(p => ({
        id: p.id,
        date: p.date instanceof Date ? p.date.toISOString().split('T')[0] : p.date,
        payoutAmount: parseFloat(p.payout_amount),
        remainingAmount: parseFloat(p.remaining_amount || 0),
        paymentMode: p.payment_mode, referenceNote: p.reference_note || '',
      })),
    });
  } catch (err) {
    console.error('getEmployeeReport error:', err);
    return errorResponse(res, 'Failed to fetch employee report', 'SERVER_ERROR', err.message, 500);
  }
};

module.exports = { getDashboardSummary, getDailyReport, getEmployeeReport };
