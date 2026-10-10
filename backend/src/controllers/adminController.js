const { pool } = require('../config/database');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');

// Middleware to verify Super Admin access
const requireSuperAdmin = (req, res, next) => {
  const superMobiles = (process.env.SUPER_ADMIN_MOBILES || '9876543210')
    .split(',')
    .map(m => m.trim().replace(/\D/g, ''))
    .filter(Boolean);

  const isSuperRole = req.user.role === 'SUPER_ADMIN';
  const isSuperMobile = superMobiles.includes(req.user.mobile);

  if (!isSuperRole && !isSuperMobile) {
    return errorResponse(res, 'Access denied. Super Administrator privileges required.', 'FORBIDDEN', null, 403);
  }
  next();
};

// GET /api/v1/admin/stats — Global platform KPIs across all tenants
const getPlatformStats = async (req, res) => {
  try {
    const [[tenantRow]] = await pool.execute(`
      SELECT 
        COUNT(*) AS total_tenants,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) AS active_tenants,
        COUNT(CASE WHEN created_at >= CURDATE() THEN 1 END) AS new_today
      FROM users
      WHERE role != 'SUPER_ADMIN'
    `);

    const [[workerRow]] = await pool.execute(`
      SELECT 
        COUNT(*) AS total_workers,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) AS active_workers
      FROM employees
    `);

    const [[workRow]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(bag_count), 0) AS total_bags,
        COALESCE(SUM(total_amount), 0) AS total_work_amount,
        COUNT(*) AS total_entries
      FROM work_entries
    `);

    const [[payoutRow]] = await pool.execute(`
      SELECT COALESCE(SUM(payout_amount), 0) AS total_payouts
      FROM payouts
    `);

    const totalWorkAmount = parseFloat(workRow.total_work_amount);
    const totalPayouts = parseFloat(payoutRow.total_payouts);

    return successResponse(res, {
      totalTenants: parseInt(tenantRow.total_tenants),
      activeTenants: parseInt(tenantRow.active_tenants),
      newTenantsToday: parseInt(tenantRow.new_today),
      totalWorkers: parseInt(workerRow.total_workers),
      activeWorkers: parseInt(workerRow.active_workers),
      totalBagsCompleted: parseInt(workRow.total_bags),
      totalWorkAmount,
      totalPayouts,
      totalPendingPayout: totalWorkAmount - totalPayouts,
      totalEntries: parseInt(workRow.total_entries),
    });
  } catch (err) {
    console.error('getPlatformStats error:', err);
    return errorResponse(res, 'Failed to fetch platform statistics', 'SERVER_ERROR', err.message, 500);
  }
};

// GET /api/v1/admin/users — List all registered businesses / tenants with metrics
const getAllUsers = async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit || 20);

    let whereClause = `WHERE u.role != 'SUPER_ADMIN'`;
    const params = [];

    if (status === 'active') {
      whereClause += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      whereClause += ` AND u.is_active = FALSE`;
    }

    if (search && search.trim()) {
      whereClause += ` AND (u.name LIKE ? OR u.business_name LIKE ? OR u.mobile LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Count total matching tenants
    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
      params
    );
    const total = countRow.total;

    // Fetch tenants with aggregated worker, bag, and payout numbers using clean derived tables
    const sql = `
      SELECT 
        u.id, u.name, u.business_name, u.mobile, u.country_code, u.role, u.is_active, u.created_at,
        COALESCE(e_agg.worker_count, 0) AS worker_count,
        COALESCE(w_agg.total_bags, 0) AS total_bags,
        COALESCE(w_agg.total_amount, 0) AS total_amount,
        COALESCE(p_agg.total_paid, 0) AS total_paid
      FROM users u
      LEFT JOIN (
        SELECT created_by, COUNT(*) AS worker_count
        FROM employees
        GROUP BY created_by
      ) e_agg ON e_agg.created_by = u.id
      LEFT JOIN (
        SELECT created_by, SUM(bag_count) AS total_bags, SUM(total_amount) AS total_amount
        FROM work_entries
        GROUP BY created_by
      ) w_agg ON w_agg.created_by = u.id
      LEFT JOIN (
        SELECT created_by, SUM(payout_amount) AS total_paid
        FROM payouts
        GROUP BY created_by
      ) p_agg ON p_agg.created_by = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(l, offset);
    const [rows] = await pool.execute(sql, params);

    const data = rows.map(r => {
      const totalAmt = parseFloat(r.total_amount);
      const totalPaid = parseFloat(r.total_paid);
      return {
        id: r.id,
        name: r.name,
        businessName: r.business_name || `${r.name}'s Business`,
        mobile: r.mobile,
        countryCode: r.country_code,
        role: r.role,
        isActive: !!r.is_active,
        workerCount: parseInt(r.worker_count),
        totalBags: parseInt(r.total_bags),
        totalAmount: totalAmt,
        totalPaid: totalPaid,
        pendingAmount: totalAmt - totalPaid,
        createdAt: r.created_at,
      };
    });

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
    console.error('getAllUsers error:', err);
    return errorResponse(res, 'Failed to fetch business users', 'SERVER_ERROR', err.message, 500);
  }
};

// GET /api/v1/admin/users/:userId — Detailed drill-down for a specific tenant
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const [userRows] = await pool.execute(
      'SELECT id, name, business_name, mobile, country_code, role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (!userRows.length) return errorResponse(res, 'Business user not found', 'NOT_FOUND', null, 404);
    const tenant = userRows[0];

    // Fetch this tenant's workers with bag and earning sums
    const [workers] = await pool.execute(`
      SELECT 
        e.id, e.name, e.mobile, e.rate_per_bag, e.is_active, e.address, e.created_at,
        COALESCE(w_agg.total_bags, 0) AS total_bags,
        COALESCE(w_agg.total_earned, 0) AS total_earned
      FROM employees e
      LEFT JOIN (
        SELECT employee_id, SUM(bag_count) AS total_bags, SUM(total_amount) AS total_earned
        FROM work_entries
        WHERE created_by = ?
        GROUP BY employee_id
      ) w_agg ON w_agg.employee_id = e.id
      WHERE e.created_by = ?
      ORDER BY e.created_at DESC
    `, [userId, userId]);

    // Fetch recent 10 work entries
    const [recentWork] = await pool.execute(`
      SELECT w.id, w.employee_id, e.name AS employee_name, w.date, w.bag_count, w.rate_per_bag, w.additional_charges, w.total_amount, w.notes
      FROM work_entries w
      JOIN employees e ON e.id = w.employee_id
      WHERE w.created_by = ?
      ORDER BY w.date DESC, w.created_at DESC
      LIMIT 10
    `, [userId]);

    // Fetch recent 10 payouts
    const [recentPayouts] = await pool.execute(`
      SELECT p.id, p.employee_id, e.name AS employee_name, p.date, p.payout_amount, p.payment_mode, p.reference_note
      FROM payouts p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.created_by = ?
      ORDER BY p.date DESC, p.created_at DESC
      LIMIT 10
    `, [userId]);

    // Summary totals
    const [[workTotals]] = await pool.execute(
      'SELECT COALESCE(SUM(bag_count), 0) AS total_bags, COALESCE(SUM(total_amount), 0) AS total_earned FROM work_entries WHERE created_by = ?',
      [userId]
    );
    const [[payoutTotals]] = await pool.execute(
      'SELECT COALESCE(SUM(payout_amount), 0) AS total_paid FROM payouts WHERE created_by = ?',
      [userId]
    );

    const totalEarned = parseFloat(workTotals.total_earned);
    const totalPaid = parseFloat(payoutTotals.total_paid);

    return successResponse(res, {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        businessName: tenant.business_name || `${tenant.name}'s Business`,
        mobile: tenant.mobile,
        countryCode: tenant.country_code,
        role: tenant.role,
        isActive: !!tenant.is_active,
        createdAt: tenant.created_at,
      },
      stats: {
        workerCount: workers.length,
        totalBags: parseInt(workTotals.total_bags),
        totalEarned,
        totalPaid,
        pendingAmount: totalEarned - totalPaid,
      },
      workers: workers.map(w => ({
        id: w.id,
        name: w.name,
        mobile: w.mobile,
        ratePerBag: parseFloat(w.rate_per_bag),
        isActive: !!w.is_active,
        address: w.address || '',
        totalBags: parseInt(w.total_bags),
        totalEarned: parseFloat(w.total_earned),
        createdAt: w.created_at,
      })),
      recentWork: recentWork.map(w => ({
        id: w.id,
        employeeName: w.employee_name,
        date: w.date instanceof Date ? w.date.toISOString().split('T')[0] : w.date,
        bagCount: w.bag_count,
        ratePerBag: parseFloat(w.rate_per_bag),
        totalAmount: parseFloat(w.total_amount),
        notes: w.notes || '',
      })),
      recentPayouts: recentPayouts.map(p => ({
        id: p.id,
        employeeName: p.employee_name,
        date: p.date instanceof Date ? p.date.toISOString().split('T')[0] : p.date,
        payoutAmount: parseFloat(p.payout_amount),
        paymentMode: p.payment_mode,
        referenceNote: p.reference_note || '',
      })),
    });
  } catch (err) {
    console.error('getUserDetails error:', err);
    return errorResponse(res, 'Failed to fetch business details', 'SERVER_ERROR', err.message, 500);
  }
};

// PATCH /api/v1/admin/users/:userId/status — Suspend or Activate tenant account
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return errorResponse(res, 'isActive (boolean) is required', 'VALIDATION_ERROR');
    }

    const [rows] = await pool.execute('SELECT id, name, mobile, role FROM users WHERE id = ?', [userId]);
    if (!rows.length) return errorResponse(res, 'User not found', 'NOT_FOUND', null, 404);

    const targetUser = rows[0];
    if (targetUser.role === 'SUPER_ADMIN') {
      return errorResponse(res, 'Cannot deactivate Super Admin account', 'FORBIDDEN', null, 403);
    }

    await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);

    // If deactivated, revoke all refresh tokens and sessions
    if (!isActive) {
      await pool.execute('UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = ?', [userId]);
      await pool.execute('DELETE FROM otp_sessions WHERE mobile = ?', [targetUser.mobile]);
    }

    return successResponse(res, {
      userId,
      isActive: !!isActive,
    }, `Business account ${isActive ? 'activated' : 'suspended'} successfully`);
  } catch (err) {
    console.error('toggleUserStatus error:', err);
    return errorResponse(res, 'Failed to update account status', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /api/v1/admin/users — Create a new business tenant directly from admin panel
const createUser = async (req, res) => {
  try {
    const { name, businessName, mobile, countryCode = '+91', role = 'OWNER', isActive = true } = req.body;
    if (!name || !name.trim()) {
      return errorResponse(res, 'Full name is required', 'VALIDATION_ERROR');
    }
    if (!mobile) {
      return errorResponse(res, 'Mobile number is required', 'VALIDATION_ERROR');
    }

    const cleanMobile = String(mobile).replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return errorResponse(res, 'Enter a valid 10-digit mobile number', 'VALIDATION_ERROR');
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE mobile = ?', [cleanMobile]);
    if (existing.length > 0) {
      return errorResponse(res, 'A business with this mobile number already exists', 'ALREADY_EXISTS', null, 409);
    }

    const userId = `usr_${Date.now()}`;
    const cleanBusiness = (businessName && businessName.trim()) || `${name.trim()}'s Gunny Bags`;

    await pool.execute(
      'INSERT INTO users (id, mobile, country_code, name, business_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, cleanMobile, countryCode, name.trim(), cleanBusiness, role, isActive ? 1 : 0]
    );

    return successResponse(res, {
      id: userId,
      name: name.trim(),
      businessName: cleanBusiness,
      mobile: cleanMobile,
      countryCode,
      role,
      isActive: !!isActive,
      workerCount: 0,
      totalBags: 0,
      totalAmount: 0,
      totalPaid: 0,
      pendingAmount: 0,
      createdAt: new Date().toISOString(),
    }, 'Business tenant created successfully', 201);
  } catch (err) {
    console.error('createUser error:', err);
    return errorResponse(res, 'Failed to create business tenant', 'SERVER_ERROR', err.message, 500);
  }
};

// PUT /api/v1/admin/users/:userId — Update tenant details
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, businessName, mobile, role, isActive } = req.body;

    const [existing] = await pool.execute('SELECT id, role, mobile, name, business_name, is_active FROM users WHERE id = ?', [userId]);
    if (!existing.length) return errorResponse(res, 'User not found', 'NOT_FOUND', null, 404);

    if (existing[0].role === 'SUPER_ADMIN') {
      return errorResponse(res, 'Cannot modify Super Admin account through tenant editor', 'FORBIDDEN', null, 403);
    }

    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : undefined;
    if (cleanMobile && cleanMobile.length !== 10) {
      return errorResponse(res, 'Enter a valid 10-digit mobile number', 'VALIDATION_ERROR');
    }

    if (cleanMobile) {
      const [conflicts] = await pool.execute('SELECT id FROM users WHERE mobile = ? AND id != ?', [cleanMobile, userId]);
      if (conflicts.length > 0) {
        return errorResponse(res, 'Mobile number already used by another account', 'ALREADY_EXISTS', null, 409);
      }
    }

    const newName = name !== undefined ? name.trim() : existing[0].name;
    const newBiz = businessName !== undefined ? businessName.trim() : existing[0].business_name;
    const newMob = cleanMobile !== undefined ? cleanMobile : existing[0].mobile;
    const newRole = role !== undefined ? role : existing[0].role;
    const newActive = isActive !== undefined ? (isActive ? 1 : 0) : existing[0].is_active;

    await pool.execute(
      'UPDATE users SET name = ?, business_name = ?, mobile = ?, role = ?, is_active = ? WHERE id = ?',
      [newName, newBiz, newMob, newRole, newActive, userId]
    );

    return successResponse(res, {
      id: userId,
      name: newName,
      businessName: newBiz,
      mobile: newMob,
      role: newRole,
      isActive: !!newActive,
    }, 'Business details updated successfully');
  } catch (err) {
    console.error('updateUser error:', err);
    return errorResponse(res, 'Failed to update business tenant', 'SERVER_ERROR', err.message, 500);
  }
};

// DELETE /api/v1/admin/users/:userId — Delete tenant and all associated records
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [existing] = await pool.execute('SELECT id, role, mobile FROM users WHERE id = ?', [userId]);
    if (!existing.length) return errorResponse(res, 'User not found', 'NOT_FOUND', null, 404);

    if (existing[0].role === 'SUPER_ADMIN') {
      return errorResponse(res, 'Cannot delete Super Admin account', 'FORBIDDEN', null, 403);
    }

    await pool.execute('DELETE FROM payouts WHERE created_by = ?', [userId]);
    await pool.execute('DELETE FROM work_entries WHERE created_by = ?', [userId]);
    await pool.execute('DELETE FROM employees WHERE created_by = ?', [userId]);
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    await pool.execute('DELETE FROM otp_sessions WHERE mobile = ?', [existing[0].mobile]);
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    return successResponse(res, { userId }, 'Business tenant and all records deleted permanently');
  } catch (err) {
    console.error('deleteUser error:', err);
    return errorResponse(res, 'Failed to delete business user', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /api/v1/admin/users/:userId/workers — Add a worker on behalf of a tenant
const addWorkerForTenant = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, mobile = '', ratePerBag = 5.0, address = '', notes = '', isActive = true } = req.body;

    if (!name || !name.trim()) return errorResponse(res, 'Worker name is required', 'VALIDATION_ERROR');

    const workerId = `emp_${Date.now()}`;
    await pool.execute(
      'INSERT INTO employees (id, name, mobile, rate_per_bag, is_active, address, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [workerId, name.trim(), mobile || null, parseFloat(ratePerBag) || 5.0, isActive ? 1 : 0, address, notes, userId]
    );

    return successResponse(res, {
      id: workerId,
      name: name.trim(),
      mobile,
      ratePerBag: parseFloat(ratePerBag) || 5.0,
      isActive: !!isActive,
      address,
      notes,
      totalBags: 0,
      totalEarned: 0,
    }, 'Worker added successfully', 201);
  } catch (err) {
    console.error('addWorkerForTenant error:', err);
    return errorResponse(res, 'Failed to add worker for business', 'SERVER_ERROR', err.message, 500);
  }
};

// DELETE /api/v1/admin/users/:userId/workers/:workerId
const deleteWorkerForTenant = async (req, res) => {
  try {
    const { userId, workerId } = req.params;
    await pool.execute('DELETE FROM payouts WHERE employee_id = ? AND created_by = ?', [workerId, userId]);
    await pool.execute('DELETE FROM work_entries WHERE employee_id = ? AND created_by = ?', [workerId, userId]);
    const [result] = await pool.execute('DELETE FROM employees WHERE id = ? AND created_by = ?', [workerId, userId]);
    if (!result.affectedRows) return errorResponse(res, 'Worker not found', 'NOT_FOUND', null, 404);
    return successResponse(res, { workerId }, 'Worker deleted successfully');
  } catch (err) {
    console.error('deleteWorkerForTenant error:', err);
    return errorResponse(res, 'Failed to delete worker', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /api/v1/admin/users/:userId/work-entries
const addWorkEntryForTenant = async (req, res) => {
  try {
    const { userId } = req.params;
    const { employeeId, date, ratePerBag, time, notes = '' } = req.body;
    const bagCount = req.body.bagCount ?? req.body.bagsCompleted ?? req.body.bagsCount;

    if (!employeeId || !date || bagCount === undefined || bagCount === null) {
      return errorResponse(res, 'employeeId, date and bagCount are required', 'VALIDATION_ERROR');
    }

    const [emp] = await pool.execute('SELECT id, name, rate_per_bag FROM employees WHERE id = ? AND created_by = ?', [employeeId, userId]);
    if (!emp.length) return errorResponse(res, 'Worker does not belong to this business', 'NOT_FOUND', null, 404);

    const rate = ratePerBag !== undefined ? parseFloat(ratePerBag) : parseFloat(emp[0].rate_per_bag);
    const additionalCharges = parseFloat(req.body.additionalCharges ?? req.body.additional_charges ?? 0) || 0;
    const entryId = `work_${Date.now()}`;

    await pool.execute(
      'INSERT INTO work_entries (id, employee_id, date, bag_count, rate_per_bag, additional_charges, entry_time, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [entryId, employeeId, date, parseInt(bagCount), rate, additionalCharges, time || null, notes, userId]
    );

    return successResponse(res, {
      id: entryId,
      employeeId,
      employeeName: emp[0].name,
      date,
      bagCount: parseInt(bagCount),
      ratePerBag: rate,
      additionalCharges,
      totalAmount: (parseInt(bagCount) * rate) + additionalCharges,
      notes,
    }, 'Work entry recorded successfully', 201);
  } catch (err) {
    console.error('addWorkEntryForTenant error:', err);
    return errorResponse(res, 'Failed to add work entry', 'SERVER_ERROR', err.message, 500);
  }
};

// DELETE /api/v1/admin/users/:userId/work-entries/:entryId
const deleteWorkEntryForTenant = async (req, res) => {
  try {
    const { userId, entryId } = req.params;
    const [result] = await pool.execute('DELETE FROM work_entries WHERE id = ? AND created_by = ?', [entryId, userId]);
    if (!result.affectedRows) return errorResponse(res, 'Work entry not found', 'NOT_FOUND', null, 404);
    return successResponse(res, { entryId }, 'Work entry deleted successfully');
  } catch (err) {
    console.error('deleteWorkEntryForTenant error:', err);
    return errorResponse(res, 'Failed to delete work entry', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /api/v1/admin/users/:userId/payouts
const addPayoutForTenant = async (req, res) => {
  try {
    const { userId } = req.params;
    const { employeeId, date, paymentMode = 'CASH', referenceNote = '' } = req.body;
    const payoutAmount = req.body.payoutAmount ?? req.body.amount;

    if (!employeeId || !date || payoutAmount === undefined || payoutAmount === null) {
      return errorResponse(res, 'employeeId, date and payoutAmount are required', 'VALIDATION_ERROR');
    }

    const [emp] = await pool.execute('SELECT id, name FROM employees WHERE id = ? AND created_by = ?', [employeeId, userId]);
    if (!emp.length) return errorResponse(res, 'Worker does not belong to this business', 'NOT_FOUND', null, 404);

    const [[earnedRow]] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) AS total_earned FROM work_entries WHERE employee_id = ? AND created_by = ?',
      [employeeId, userId]
    );
    const [[paidRow]] = await pool.execute(
      'SELECT COALESCE(SUM(payout_amount), 0) AS total_paid FROM payouts WHERE employee_id = ? AND created_by = ?',
      [employeeId, userId]
    );
    const pendingBefore = parseFloat(earnedRow.total_earned) - parseFloat(paidRow.total_paid);
    const remaining = pendingBefore - parseFloat(payoutAmount);

    const payoutId = `pay_${Date.now()}`;
    await pool.execute(
      'INSERT INTO payouts (id, employee_id, date, payout_amount, pending_before_payout, remaining_amount, payment_mode, reference_note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [payoutId, employeeId, date, parseFloat(payoutAmount), pendingBefore, remaining, paymentMode, referenceNote, userId]
    );

    return successResponse(res, {
      id: payoutId,
      employeeId,
      employeeName: emp[0].name,
      date,
      payoutAmount: parseFloat(payoutAmount),
      paymentMode,
      referenceNote,
    }, 'Payout recorded successfully', 201);
  } catch (err) {
    console.error('addPayoutForTenant error:', err);
    return errorResponse(res, 'Failed to record payout', 'SERVER_ERROR', err.message, 500);
  }
};

// DELETE /api/v1/admin/users/:userId/payouts/:payoutId
const deletePayoutForTenant = async (req, res) => {
  try {
    const { userId, payoutId } = req.params;
    const [result] = await pool.execute('DELETE FROM payouts WHERE id = ? AND created_by = ?', [payoutId, userId]);
    if (!result.affectedRows) return errorResponse(res, 'Payout record not found', 'NOT_FOUND', null, 404);
    return successResponse(res, { payoutId }, 'Payout deleted successfully');
  } catch (err) {
    console.error('deletePayoutForTenant error:', err);
    return errorResponse(res, 'Failed to delete payout', 'SERVER_ERROR', err.message, 500);
  }
};

module.exports = {
  requireSuperAdmin,
  getPlatformStats,
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
  createUser,
  updateUser,
  deleteUser,
  addWorkerForTenant,
  deleteWorkerForTenant,
  addWorkEntryForTenant,
  deleteWorkEntryForTenant,
  addPayoutForTenant,
  deletePayoutForTenant,
};

