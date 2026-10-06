const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/helpers');
const { pool } = require('../config/database');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authorization token missing', 'UNAUTHORIZED', null, 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB to confirm they are still active
    const [rows] = await pool.execute(
      'SELECT id, mobile, country_code, name, business_name, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return errorResponse(res, 'User not found or inactive', 'UNAUTHORIZED', null, 401);
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Access token expired', 'TOKEN_EXPIRED', null, 401);
    }
    return errorResponse(res, 'Invalid token', 'INVALID_TOKEN', null, 401);
  }
};

module.exports = { authenticate };
