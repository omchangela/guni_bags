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
      SELECT w.id, w.employee_id, e.name AS employee_name, w.date, w.bag_count, w.rate_per_bag, w.total_amount, w.notes
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

module.exports = {
  requireSuperAdmin,
  getPlatformStats,
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
};
