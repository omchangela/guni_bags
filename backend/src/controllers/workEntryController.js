const { pool } = require('../config/database');
const { successResponse, errorResponse, paginate, formatTimeForDB, formatTimeForDisplay } = require('../utils/helpers');

// GET /work-entries
const getWorkEntries = async (req, res) => {
  try {
    const { date, employeeId, startDate, endDate, page, limit } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);

    let sql = `
      SELECT w.id, w.employee_id, e.name AS employee_name, w.date, 
             w.bag_count, w.rate_per_bag, w.total_amount, w.entry_time, w.notes
      FROM work_entries w
      JOIN employees e ON e.id = w.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (date) { sql += ' AND w.date = ?'; params.push(date); }
    if (employeeId) { sql += ' AND w.employee_id = ?'; params.push(employeeId); }
    if (startDate) { sql += ' AND w.date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND w.date <= ?'; params.push(endDate); }

    // Count query
    const countSql = sql.replace(
      /SELECT w\.id.*FROM work_entries/s,
      'SELECT COUNT(*) AS total FROM work_entries'
    );
    const [[{ total }]] = await pool.execute(countSql, params);

    sql += ' ORDER BY w.date DESC, w.entry_time DESC LIMIT ? OFFSET ?';
    params.push(l, offset);

    const [rows] = await pool.execute(sql, params);
    const data = rows.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      bagCount: r.bag_count,
      ratePerBag: parseFloat(r.rate_per_bag),
      totalAmount: parseFloat(r.total_amount),
      time: formatTimeForDisplay(r.entry_time),
      notes: r.notes || '',
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        currentPage: p,
        totalPages: Math.ceil(total / l),
        totalCount: total,
      },
    });
  } catch (err) {
    console.error('getWorkEntries error:', err);
    return errorResponse(res, 'Failed to fetch work entries', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /work-entries
const addWorkEntry = async (req, res) => {
  try {
    const { employeeId, date, ratePerBag, time, notes = '' } = req.body;
    const bagCount = req.body.bagCount ?? req.body.bagsCompleted ?? req.body.bagsCount;
    if (!employeeId || !date || bagCount === undefined || bagCount === null)
      return errorResponse(res, 'employeeId, date and bagCount are required', 'VALIDATION_ERROR');
    if (bagCount <= 0) return errorResponse(res, 'Bag count must be positive', 'VALIDATION_ERROR');

    const [emp] = await pool.execute('SELECT id, name, rate_per_bag FROM employees WHERE id = ?', [employeeId]);
    if (!emp.length) return errorResponse(res, 'Employee not found', 'NOT_FOUND', null, 404);

    const rate = ratePerBag || parseFloat(emp[0].rate_per_bag);
    const id = `w_${Date.now()}`;
    const entryTime = formatTimeForDB(time);

    await pool.execute(
      'INSERT INTO work_entries (id, employee_id, date, bag_count, rate_per_bag, entry_time, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, employeeId, date, bagCount, rate, entryTime, notes, req.user.id]
    );

    return successResponse(res, {
      id, employeeId, employeeName: emp[0].name, date,
      bagCount: parseInt(bagCount), ratePerBag: rate,
      totalAmount: parseInt(bagCount) * rate,
      time: formatTimeForDisplay(entryTime), notes,
      createdAt: new Date().toISOString(),
    }, 'Work entry added successfully', 201);
  } catch (err) {
    console.error('addWorkEntry error:', err);
    return errorResponse(res, 'Failed to add work entry', 'SERVER_ERROR', err.message, 500);
  }
};

// PUT /work-entries/:id
const updateWorkEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { ratePerBag, date, time, notes } = req.body;
    const bagCount = req.body.bagCount ?? req.body.bagsCompleted ?? req.body.bagsCount;

    const [existing] = await pool.execute('SELECT id FROM work_entries WHERE id = ?', [id]);
    if (!existing.length) return errorResponse(res, 'Work entry not found', 'NOT_FOUND', null, 404);

    const entryTime = formatTimeForDB(time);
    await pool.execute(
      'UPDATE work_entries SET bag_count=?, rate_per_bag=?, date=?, entry_time=?, notes=? WHERE id=?',
      [bagCount, ratePerBag, date, entryTime, notes || '', id]
    );

    const [rows] = await pool.execute(
      'SELECT w.*, e.name AS employee_name FROM work_entries w JOIN employees e ON e.id = w.employee_id WHERE w.id = ?',
      [id]
    );
    const r = rows[0];
    return successResponse(res, {
      id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      bagCount: r.bag_count, ratePerBag: parseFloat(r.rate_per_bag),
      totalAmount: parseFloat(r.total_amount), time: formatTimeForDisplay(r.entry_time),
      notes: r.notes || '',
    }, 'Work entry updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update work entry', 'SERVER_ERROR', err.message, 500);
  }
};

// DELETE /work-entries/:id
const deleteWorkEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT id FROM work_entries WHERE id = ?', [id]);
    if (!existing.length) return errorResponse(res, 'Work entry not found', 'NOT_FOUND', null, 404);
    await pool.execute('DELETE FROM work_entries WHERE id = ?', [id]);
    return successResponse(res, null, 'Work entry deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete work entry', 'SERVER_ERROR', err.message, 500);
  }
};

module.exports = { getWorkEntries, addWorkEntry, updateWorkEntry, deleteWorkEntry };
