const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { successResponse, errorResponse, generateSessionId } = require('../utils/helpers');
require('dotenv').config();

const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS) || 300;
const COOLDOWN = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
const MOCK_OTP = process.env.MOCK_OTP || '123456';

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 86400,
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 604800,
  });
  return { accessToken, refreshToken };
};

// POST /auth/register
// SaaS Business Onboarding: New business owner registers with Name, Business Name, Mobile
const register = async (req, res) => {
  try {
    const { name, mobile, businessName = '', countryCode = '+91' } = req.body;
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

    // Check if user already exists
    let [existingUsers] = await pool.execute('SELECT id, is_active FROM users WHERE mobile = ?', [cleanMobile]);
    if (existingUsers.length > 0) {
      if (!existingUsers[0].is_active) {
        return errorResponse(res, 'Your account is disabled. Please contact support.', 'ACCOUNT_DISABLED', null, 403);
      }
      return errorResponse(res, 'An account with this mobile number already exists. Please sign in.', 'ALREADY_EXISTS', null, 409);
    }

    // Create the new tenant / business account
    const userId = `usr_${Date.now()}`;
    const cleanBusinessName = (businessName && businessName.trim()) || `${name.trim()}'s Gunny Bags`;
    await pool.execute(
      'INSERT INTO users (id, mobile, country_code, name, business_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
      [userId, cleanMobile, countryCode, name.trim(), cleanBusinessName, 'OWNER']
    );

    // Generate OTP for initial verification
    const masterOtp = (process.env.MOCK_OTP || '123456').trim();
    const otp = (process.env.ENABLE_REAL_SMS === 'true')
      ? String(Math.floor(100000 + Math.random() * 900000))
      : masterOtp;
    const otpHash = await bcrypt.hash(otp, 8);
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY * 1000);

    // Invalidate old sessions for this mobile
    await pool.execute('DELETE FROM otp_sessions WHERE mobile = ?', [cleanMobile]);
    await pool.execute(
      'INSERT INTO otp_sessions (id, session_id, mobile, country_code, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), sessionId, cleanMobile, countryCode, otpHash, expiresAt]
    );

    console.log(`[AUTH] Registered new SaaS tenant: ${name.trim()} (${cleanMobile}) - OTP: ${otp}`);

    return successResponse(res, {
      sessionId,
      expiresInSeconds: OTP_EXPIRY,
      resendCooldownSeconds: COOLDOWN,
      isNewUser: true,
      user: {
        id: userId,
        name: name.trim(),
        businessName: cleanBusinessName,
        mobile: cleanMobile,
      }
    }, `Account registered! OTP sent to ${countryCode} ${cleanMobile}`);
  } catch (err) {
    console.error('register error:', err);
    return errorResponse(res, 'Failed to register', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { mobile, countryCode = '+91' } = req.body;
    if (!mobile) return errorResponse(res, 'Mobile number is required', 'VALIDATION_ERROR');

    const cleanMobile = String(mobile).replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return errorResponse(res, 'Enter a valid 10-digit mobile number', 'VALIDATION_ERROR');
    }

    // ── INACTIVE EMPLOYEE CHECK ─────────────────────────────────────────────
    // If this mobile belongs to an employee who is marked inactive, block login immediately
    const [inactiveEmployees] = await pool.execute(
      'SELECT id, name, is_active FROM employees WHERE mobile = ? AND is_active = FALSE',
      [cleanMobile]
    );
    if (inactiveEmployees.length > 0) {
      console.warn(`[AUTH] Blocked login attempt from inactive employee: ${cleanMobile} (${inactiveEmployees[0].name})`);
      return errorResponse(
        res,
        'This account is currently deactivated. Please contact the administrator.',
        'ACCOUNT_DISABLED',
        null,
        403
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    // Check if user exists in database
    let [users] = await pool.execute('SELECT id, is_active, name FROM users WHERE mobile = ?', [cleanMobile]);
    const isNewUser = users.length === 0;

    if (!isNewUser) {
      const user = users[0];
      if (user.is_active === 0 || user.is_active === false) {
        return errorResponse(res, 'Your account is disabled. Please contact admin.', 'ACCOUNT_DISABLED', null, 403);
      }
    }

    // Master / Mock OTP is 123456 by default.
    // If real SMS is not explicitly enabled, OTP is ALWAYS 123456.
    const masterOtp = (process.env.MOCK_OTP || '123456').trim();
    const otp = (process.env.ENABLE_REAL_SMS === 'true')
      ? String(Math.floor(100000 + Math.random() * 900000))
      : masterOtp;
    const otpHash = await bcrypt.hash(otp, 8);
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY * 1000);

    // Invalidate old sessions for this mobile
    await pool.execute('DELETE FROM otp_sessions WHERE mobile = ?', [cleanMobile]);

    await pool.execute(
      'INSERT INTO otp_sessions (id, session_id, mobile, country_code, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), sessionId, cleanMobile, countryCode, otpHash, expiresAt]
    );

    // Log OTP so it can always be checked in server/docker logs
    console.log(`[OTP] Generated for ${cleanMobile}: ${otp} (Master OTP: ${masterOtp})`);

    return successResponse(res, {
      sessionId,
      expiresInSeconds: OTP_EXPIRY,
      resendCooldownSeconds: COOLDOWN,
      isNewUser,
    }, `OTP sent successfully to ${countryCode} ${cleanMobile}`);
  } catch (err) {
    console.error('sendOtp error:', err);
    return errorResponse(res, 'Failed to send OTP', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { mobile, countryCode = '+91', otp, sessionId, name, businessName } = req.body;
    if (!mobile || !otp || !sessionId)
      return errorResponse(res, 'mobile, otp and sessionId are required', 'VALIDATION_ERROR');

    const cleanMobile = String(mobile).replace(/\D/g, '');
    const cleanOtp = String(otp).trim();

    const [sessions] = await pool.execute(
      'SELECT * FROM otp_sessions WHERE session_id = ? AND (mobile = ? OR mobile = ?) AND is_verified = FALSE',
      [sessionId, cleanMobile, mobile]
    );
    if (!sessions.length) return errorResponse(res, 'Invalid session', 'INVALID_SESSION', null, 401);

    const session = sessions[0];
    if (new Date() > new Date(session.expires_at))
      return errorResponse(res, 'OTP expired', 'OTP_EXPIRED', null, 401);

    if (session.attempt_count >= 5) {
      return errorResponse(res, 'Too many failed attempts', 'TOO_MANY_ATTEMPTS', null, 429);
    }

    // ── MASTER OTP CHECK ───────────────────────────────────────────────────
    // '123456' is ALWAYS accepted as master OTP.
    const masterOtp = (process.env.MOCK_OTP || '123456').trim();
    let isValid = cleanOtp === '123456' || cleanOtp === masterOtp;

    if (!isValid && session.otp_hash) {
      isValid = await bcrypt.compare(cleanOtp, session.otp_hash);
    }

    if (!isValid) {
      await pool.execute('UPDATE otp_sessions SET attempt_count = attempt_count + 1 WHERE session_id = ?', [sessionId]);
      return errorResponse(res, 'Invalid OTP', 'INVALID_OTP', 'The OTP entered is incorrect. Default OTP is 123456', 401);
    }

    await pool.execute('UPDATE otp_sessions SET is_verified = TRUE WHERE session_id = ?', [sessionId]);

    // Check if this mobile belongs to an employee who is marked inactive
    const [inactiveEmployees] = await pool.execute(
      'SELECT id, name, is_active FROM employees WHERE mobile = ? AND is_active = FALSE',
      [cleanMobile]
    );
    if (inactiveEmployees.length > 0) {
      return errorResponse(res, 'This account is currently deactivated. Please contact the administrator.', 'ACCOUNT_DISABLED', null, 403);
    }

    // Fetch registered user or auto-create if new tenant
    let [users] = await pool.execute('SELECT * FROM users WHERE mobile = ?', [cleanMobile]);
    if (!users.length) {
      const adminId = `usr_${Date.now()}`;
      const defaultName = (name && name.trim()) || 'Business Owner';
      const defaultBusiness = (businessName && businessName.trim()) || `${defaultName}'s Gunny Bags`;
      await pool.execute(
        'INSERT INTO users (id, mobile, country_code, name, business_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [adminId, cleanMobile, countryCode, defaultName, defaultBusiness, 'OWNER']
      );
      [users] = await pool.execute('SELECT * FROM users WHERE mobile = ?', [cleanMobile]);
    }
    const user = users[0];
    if (user.is_active === 0 || user.is_active === false) {
      return errorResponse(res, 'Account is disabled. Please contact admin.', 'ACCOUNT_DISABLED', null, 403);
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshToken, refreshExpires]
    );

    return successResponse(res, {
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 86400,
      },
      user: {
        id: user.id,
        mobile: user.mobile,
        countryCode: user.country_code,
        name: user.name,
        businessName: user.business_name,
        role: user.role,
        isActive: !!user.is_active,
        createdAt: user.created_at,
      },
    }, 'Login successful');
  } catch (err) {
    console.error('verifyOtp error:', err);
    return errorResponse(res, 'Verification failed', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { mobile, countryCode = '+91', sessionId } = req.body;
    if (!mobile || !sessionId)
      return errorResponse(res, 'mobile and sessionId are required', 'VALIDATION_ERROR');

    const cleanMobile = String(mobile).replace(/\D/g, '');
    const [users] = await pool.execute('SELECT id, is_active FROM users WHERE mobile = ?', [cleanMobile]);
    if (!users.length) {
      return errorResponse(res, 'User not registered. Please register first.', 'NOT_REGISTERED', null, 404);
    }

    const [sessions] = await pool.execute(
      'SELECT * FROM otp_sessions WHERE session_id = ? AND mobile = ?',
      [sessionId, cleanMobile]
    );
    if (!sessions.length) return errorResponse(res, 'Invalid session', 'INVALID_SESSION', null, 401);

    const session = sessions[0];
    const cooldownEnd = new Date(new Date(session.last_sent_at).getTime() + COOLDOWN * 1000);
    if (new Date() < cooldownEnd) {
      const secondsLeft = Math.ceil((cooldownEnd - new Date()) / 1000);
      return errorResponse(res, `Please wait ${secondsLeft} seconds before resending`, 'COOLDOWN_ACTIVE', null, 429);
    }

    const masterOtp = (process.env.MOCK_OTP || '123456').trim();
    const otp = (process.env.ENABLE_REAL_SMS === 'true')
      ? String(Math.floor(100000 + Math.random() * 900000))
      : masterOtp;
    const otpHash = await bcrypt.hash(otp, 8);
    const newSessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY * 1000);

    await pool.execute('DELETE FROM otp_sessions WHERE session_id = ?', [sessionId]);
    await pool.execute(
      'INSERT INTO otp_sessions (id, session_id, mobile, country_code, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), newSessionId, cleanMobile, countryCode, otpHash, expiresAt]
    );

    console.log(`[OTP] Resend generated for ${cleanMobile}: ${otp}`);

    return successResponse(res, {
      sessionId: newSessionId,
      expiresInSeconds: OTP_EXPIRY,
      resendCooldownSeconds: COOLDOWN,
    }, 'New OTP sent successfully');
  } catch (err) {
    console.error('resendOtp error:', err);
    return errorResponse(res, 'Failed to resend OTP', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return errorResponse(res, 'Refresh token required', 'VALIDATION_ERROR');

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const [tokens] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE token = ? AND is_revoked = FALSE',
      [token]
    );
    if (!tokens.length || new Date() > new Date(tokens[0].expires_at))
      return errorResponse(res, 'Refresh token expired or invalid', 'INVALID_REFRESH_TOKEN', null, 401);

    const newAccessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, {
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 86400,
    });

    return successResponse(res, {
      accessToken: newAccessToken,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 86400,
    });
  } catch (err) {
    return errorResponse(res, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN', null, 401);
  }
};

// GET /auth/me
const getMe = async (req, res) => {
  const u = req.user;
  return successResponse(res, {
    id: u.id,
    mobile: u.mobile,
    name: u.name,
    businessName: u.business_name,
    role: u.role,
  });
};

// PUT /auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, businessName } = req.body;
    const userId = req.user.id;
    if (!name || !name.trim()) {
      return errorResponse(res, 'Name is required', 'VALIDATION_ERROR');
    }
    const cleanBusiness = (businessName && businessName.trim()) || req.user.business_name;
    await pool.execute(
      'UPDATE users SET name = ?, business_name = ? WHERE id = ?',
      [name.trim(), cleanBusiness, userId]
    );
    const [rows] = await pool.execute('SELECT id, mobile, name, business_name, role FROM users WHERE id = ?', [userId]);
    return successResponse(res, rows[0], 'Profile updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update profile', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /auth/admin-login
// Restrict login to Master Super Admin with admin@admin.com & password
const adminLogin = async (req, res) => {
  try {
    const email = req.body.email || req.body.identifier;
    const { password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 'VALIDATION_ERROR');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, mobile, country_code, name, business_name, role, is_active FROM users WHERE LOWER(email) = ?',
      [cleanEmail]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Invalid admin email or password', 'UNAUTHORIZED', null, 401);
    }

    const adminUser = rows[0];

    // Only SUPER_ADMIN allowed
    if (adminUser.role !== 'SUPER_ADMIN') {
      return errorResponse(res, 'Access restricted to Platform Super Admin only', 'FORBIDDEN', null, 403);
    }

    if (!adminUser.is_active) {
      return errorResponse(res, 'Admin account has been suspended', 'FORBIDDEN', null, 403);
    }

    // Verify password
    let passwordValid = false;
    if (adminUser.password_hash) {
      passwordValid = await bcrypt.compare(password, adminUser.password_hash);
    }
    // Fallback check for default password '123456'
    if (!passwordValid && password === '123456' && cleanEmail === 'admin@admin.com') {
      passwordValid = true;
    }

    if (!passwordValid) {
      return errorResponse(res, 'Invalid admin email or password', 'UNAUTHORIZED', null, 401);
    }

    const tokens = generateTokens(adminUser.id);

    // Save refresh token
    const tokenId = `tok_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, adminUser.id, tokens.refreshToken, expiresAt]
    );

    return successResponse(res, {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 86400,
      },
      user: {
        id: adminUser.id,
        email: adminUser.email,
        mobile: adminUser.mobile,
        countryCode: adminUser.country_code,
        name: adminUser.name,
        businessName: adminUser.business_name,
        role: adminUser.role,
        isActive: !!adminUser.is_active,
      },
    }, 'Master Admin authenticated successfully');
  } catch (err) {
    console.error('adminLogin error:', err);
    return errorResponse(res, 'Admin authentication failed', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      await pool.execute('UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = ?', [token]);
    }
    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    return errorResponse(res, 'Logout failed', 'SERVER_ERROR', err.message, 500);
  }
};

module.exports = { register, sendOtp, verifyOtp, resendOtp, refreshToken, getMe, updateProfile, logout, adminLogin };


