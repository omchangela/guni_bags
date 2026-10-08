const { pool } = require('../config/database');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');

// GET /employees — List all workers for the authenticated tenant / business
const getEmployees = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isActive, search } = req.query;

    let sql = `
      SELECT 
        e.id, e.name, e.mobile, e.rate_per_bag, e.is_active, e.address, e.notes, e.created_at,
        COALESCE(SUM(w.bag_count), 0) AS total_bags,
        COALESCE(SUM(w.total_amount), 0) AS total_earned,
        COALESCE(SUM(p.payout_amount), 0) AS total_paid
      FROM employees e
      LEFT JOIN work_entries w ON w.employee_id = e.id AND w.created_by = ?
      LEFT JOIN payouts p ON p.employee_id = e.id AND p.created_by = ?
      WHERE e.created_by = ?
    `;
    const params = [userId, userId, userId];

    if (isActive !== undefined) {
      sql += ' AND e.is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }
    if (search) {
      sql += ' AND (e.name LIKE ? OR e.mobile LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';

    const [rows] = await pool.execute(sql, params);
    const data = rows.map(r => ({
      id: r.id,
      name: r.name,
      mobile: r.mobile,
      ratePerBag: parseFloat(r.rate_per_bag),
      isActive: !!r.is_active,
      address: r.address || '',
      notes: r.notes || '',
      totalBags: parseInt(r.total_bags),
      totalEarned: parseFloat(r.total_earned),
      totalPaid: parseFloat(r.total_paid),
      pendingAmount: parseFloat(r.total_earned) - parseFloat(r.total_paid),
      createdAt: r.created_at,
    }));

    return successResponse(res, data);
  } catch (err) {
    console.error('getEmployees error:', err);
    return errorResponse(res, 'Failed to fetch employees', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /employees — Add a new worker under this tenant / business
const addEmployee = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, mobile, ratePerBag = 5.0, isActive = true, address = '', notes = '' } = req.body;
    if (!name) return errorResponse(res, 'Employee name is required', 'VALIDATION_ERROR');

    const id = `emp_${Date.now()}`;
    await pool.execute(
      'INSERT INTO employees (id, name, mobile, rate_per_bag, is_active, address, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, mobile || null, ratePerBag, isActive ? 1 : 0, address, notes, userId]
    );

    const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ? AND created_by = ?', [id, userId]);
    const e = rows[0];
    return successResponse(res, {
      id: e.id, name: e.name, mobile: e.mobile, ratePerBag: parseFloat(e.rate_per_bag),
      isActive: !!e.is_active, address: e.address, notes: e.notes, createdAt: e.created_at,
    }, 'Employee created successfully', 201);
  } catch (err) {
    console.error('addEmployee error:', err);
    if (err.code === 'ER_DUP_ENTRY') return errorResponse(res, 'Mobile number already registered', 'DUPLICATE_MOBILE');
    return errorResponse(res, 'Failed to create employee', 'SERVER_ERROR', err.message, 500);
  }
};

// GET /employees/:id — Fetch a single worker (strictly scoped to this tenant)
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ? AND created_by = ?', [id, userId]);
    if (!rows.length) return errorResponse(res, 'Employee not found', 'NOT_FOUND', null, 404);

    const e = rows[0];
    const [[stats]] = await pool.execute(
      `SELECT 
        COALESCE(SUM(w.bag_count), 0) AS total_bags,
        COALESCE(SUM(w.total_amount), 0) AS total_earned,
        COALESCE(SUM(p.payout_amount), 0) AS total_paid
       FROM employees emp
       LEFT JOIN work_entries w ON w.employee_id = emp.id AND w.created_by = ?
       LEFT JOIN payouts p ON p.employee_id = emp.id AND p.created_by = ?
       WHERE emp.id = ? AND emp.created_by = ?`,
      [userId, userId, id, userId]
    );

    return successResponse(res, {
      id: e.id, name: e.name, mobile: e.mobile, ratePerBag: parseFloat(e.rate_per_bag),
      isActive: !!e.is_active, address: e.address || '', notes: e.notes || '',
      stats: {
        totalBags: parseInt(stats.total_bags),
        totalEarned: parseFloat(stats.total_earned),
        totalPaid: parseFloat(stats.total_paid),
        pendingAmount: parseFloat(stats.total_earned) - parseFloat(stats.total_paid),
      },
    });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch employee', 'SERVER_ERROR', err.message, 500);
  }
};

// PUT /employees/:id — Update worker details
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, mobile, ratePerBag, isActive, address, notes } = req.body;

    const [existing] = await pool.execute('SELECT id, mobile FROM employees WHERE id = ? AND created_by = ?', [id, userId]);
    if (!existing.length) return errorResponse(res, 'Employee not found in your business', 'NOT_FOUND', null, 404);

    await pool.execute(
      'UPDATE employees SET name=?, mobile=?, rate_per_bag=?, is_active=?, address=?, notes=? WHERE id=? AND created_by=?',
      [name, mobile || null, ratePerBag, isActive ? 1 : 0, address || '', notes || '', id, userId]
    );

    // If deactivated, sync user table and delete active sessions for this mobile
    const targetMobile = mobile || existing[0].mobile;
    if (targetMobile) {
      const cleanMobile = String(targetMobile).replace(/\D/g, '');
      if (isActive === false || isActive === 0) {
        await pool.execute('UPDATE users SET is_active = FALSE WHERE mobile = ?', [cleanMobile]);
        await pool.execute('DELETE FROM otp_sessions WHERE mobile = ?', [cleanMobile]);
      } else if (isActive === true || isActive === 1) {
        await pool.execute('UPDATE users SET is_active = TRUE WHERE mobile = ?', [cleanMobile]);
      }
    }

    const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ? AND created_by = ?', [id, userId]);
    const e = rows[0];
    return successResponse(res, {
      id: e.id, name: e.name, mobile: e.mobile, ratePerBag: parseFloat(e.rate_per_bag),
      isActive: !!e.is_active, address: e.address, notes: e.notes,
    }, 'Employee updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update employee', 'SERVER_ERROR', err.message, 500);
  }
};

// DELETE /employees/:id — Soft-delete / deactivate worker
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [existing] = await pool.execute('SELECT id, mobile FROM employees WHERE id = ? AND created_by = ?', [id, userId]);
    if (!existing.length) return errorResponse(res, 'Employee not found in your business', 'NOT_FOUND', null, 404);

    // Soft delete: set is_active = false
    await pool.execute('UPDATE employees SET is_active = FALSE WHERE id = ? AND created_by = ?', [id, userId]);

    if (existing[0].mobile) {
      const cleanMobile = String(existing[0].mobile).replace(/\D/g, '');
      await pool.execute('UPDATE users SET is_active = FALSE WHERE mobile = ?', [cleanMobile]);
      await pool.execute('DELETE FROM otp_sessions WHERE mobile = ?', [cleanMobile]);
    }

    return successResponse(res, null, 'Employee deactivated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to delete employee', 'SERVER_ERROR', err.message, 500);
  }
};

module.exports = { getEmployees, addEmployee, getEmployee, updateEmployee, deleteEmployee };
