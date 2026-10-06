const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /payouts
const getPayouts = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    let sql = `
      SELECT p.id, p.employee_id, e.name AS employee_name, p.date,
             p.payout_amount, p.payment_mode, p.reference_note,
             p.pending_before_payout, p.remaining_amount, p.created_at
      FROM payouts p
      JOIN employees e ON e.id = p.employee_id
      WHERE 1=1
    `;
    const params = [];
    if (employeeId) { sql += ' AND p.employee_id = ?'; params.push(employeeId); }
    if (startDate) { sql += ' AND p.date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND p.date <= ?'; params.push(endDate); }
    sql += ' ORDER BY p.date DESC, p.created_at DESC';

    const [rows] = await pool.execute(sql, params);
    return successResponse(res, rows.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      payoutAmount: parseFloat(r.payout_amount),
      pendingBeforePayout: parseFloat(r.pending_before_payout || 0),
      remainingAmount: parseFloat(r.remaining_amount || 0),
      paymentMode: r.payment_mode,
      referenceNote: r.reference_note || '',
      createdAt: r.created_at,
    })));
  } catch (err) {
    console.error('getPayouts error:', err);
    return errorResponse(res, 'Failed to fetch payouts', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /payouts
const addPayout = async (req, res) => {
  try {
    const { employeeId, date, paymentMode = 'CASH', referenceNote = '' } = req.body;
    const payoutAmount = req.body.payoutAmount ?? req.body.amount;
    if (!employeeId || !date || payoutAmount === undefined || payoutAmount === null)
      return errorResponse(res, 'employeeId, date and payoutAmount are required', 'VALIDATION_ERROR');
    if (payoutAmount <= 0) return errorResponse(res, 'Payout amount must be positive', 'VALIDATION_ERROR');

    const [emp] = await pool.execute('SELECT id, name FROM employees WHERE id = ?', [employeeId]);
    if (!emp.length) return errorResponse(res, 'Employee not found', 'NOT_FOUND', null, 404);

    // Calculate current pending balance
    const [[earningsRow]] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) AS total FROM work_entries WHERE employee_id = ?',
      [employeeId]
    );
    const [[paidRow]] = await pool.execute(
      'SELECT COALESCE(SUM(payout_amount), 0) AS total FROM payouts WHERE employee_id = ?',
      [employeeId]
    );
    const pendingBefore = parseFloat(earningsRow.total) - parseFloat(paidRow.total);
    const remaining = pendingBefore - parseFloat(payoutAmount);

    const id = `p_${Date.now()}`;
    await pool.execute(
      'INSERT INTO payouts (id, employee_id, date, payout_amount, payment_mode, reference_note, pending_before_payout, remaining_amount, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, employeeId, date, payoutAmount, paymentMode, referenceNote, pendingBefore, remaining, req.user.id]
    );

    return successResponse(res, {
      id, employeeId, employeeName: emp[0].name, date,
      payoutAmount: parseFloat(payoutAmount),
      remainingAmount: remaining,
      paymentMode, referenceNote,
      createdAt: new Date().toISOString(),
    }, 'Payout recorded successfully', 201);
  } catch (err) {
    console.error('addPayout error:', err);
    return errorResponse(res, 'Failed to record payout', 'SERVER_ERROR', err.message, 500);
  }
};

// DELETE /payouts/:id
const deletePayout = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT id FROM payouts WHERE id = ?', [id]);
    if (!existing.length) return errorResponse(res, 'Payout record not found', 'NOT_FOUND', null, 404);
    await pool.execute('DELETE FROM payouts WHERE id = ?', [id]);
    return successResponse(res, null, 'Payout record removed successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete payout', 'SERVER_ERROR', err.message, 500);
  }
};

module.exports = { getPayouts, addPayout, deletePayout };
