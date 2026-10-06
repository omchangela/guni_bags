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

// Public registration is DISABLED — this is a closed admin panel.
// Admin numbers are pre-seeded in the database and controlled via ALLOWED_MOBILES in .env.
const register = async (req, res) => {
  return errorResponse(res, 'Registration is not allowed. This is a closed admin system.', 'REGISTRATION_DISABLED', null, 403);
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

    // ── WHITELIST CHECK ─────────────────────────────────────────────────────
    // Only pre-approved admin numbers (ALLOWED_MOBILES in .env) can access.
    // Example: ALLOWED_MOBILES=9876543210,9999999999
    const allowedMobiles = (process.env.ALLOWED_MOBILES || '')
      .split(',')
      .map(m => m.trim().replace(/\D/g, ''))
      .filter(Boolean);

    if (allowedMobiles.length > 0 && !allowedMobiles.includes(cleanMobile)) {
      console.warn(`[AUTH] Blocked login attempt from non-admin number: ${cleanMobile}`);
      return errorResponse(
        res,
        'Access denied. This system is restricted to authorized administrators only.',
        'ACCESS_DENIED',
        null,
        403
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    // Check if user exists in database (auto-create admin if in whitelist but not in DB)
    let [users] = await pool.execute('SELECT id, is_active, name FROM users WHERE mobile = ?', [cleanMobile]);

    if (users.length === 0) {
      // Auto-create the admin account on first login (no manual registration needed)
      const adminId = `usr_${Date.now()}`;
      await pool.execute(
        'INSERT INTO users (id, mobile, country_code, name, business_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [adminId, cleanMobile, countryCode, 'Admin', 'Gunny Bags Admin', 'OWNER']
      );
      console.log(`[AUTH] Admin account auto-created for: ${cleanMobile}`);
      [users] = await pool.execute('SELECT id, is_active, name FROM users WHERE mobile = ?', [cleanMobile]);
    }

    const user = users[0];
    if (user.is_active === 0 || user.is_active === false) {
      return errorResponse(res, 'Your account is disabled. Please contact admin.', 'ACCOUNT_DISABLED', null, 403);
    }

    // Use MOCK_OTP if specified, otherwise generate 6-digit random code
    const otp = process.env.MOCK_OTP || (process.env.NODE_ENV === 'production' ? String(Math.floor(100000 + Math.random() * 900000)) : '123456');
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
    console.log(`[OTP] Generated for ${cleanMobile}: ${otp}`);

    return successResponse(res, {
      sessionId,
      expiresInSeconds: OTP_EXPIRY,
      resendCooldownSeconds: COOLDOWN,
      isNewUser: false,
    }, `OTP sent successfully to ${countryCode} ${cleanMobile}`);
  } catch (err) {
    console.error('sendOtp error:', err);
    return errorResponse(res, 'Failed to send OTP', 'SERVER_ERROR', err.message, 500);
  }
};

// POST /auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { mobile, countryCode = '+91', otp, sessionId } = req.body;
    if (!mobile || !otp || !sessionId)
      return errorResponse(res, 'mobile, otp and sessionId are required', 'VALIDATION_ERROR');

    const [sessions] = await pool.execute(
      'SELECT * FROM otp_sessions WHERE session_id = ? AND mobile = ? AND is_verified = FALSE',
      [sessionId, mobile]
    );
    if (!sessions.length) return errorResponse(res, 'Invalid session', 'INVALID_SESSION', null, 401);

    const session = sessions[0];
    if (new Date() > new Date(session.expires_at))
      return errorResponse(res, 'OTP expired', 'OTP_EXPIRED', null, 401);

    if (session.attempt_count >= 5) {
      return errorResponse(res, 'Too many failed attempts', 'TOO_MANY_ATTEMPTS', null, 429);
    }

    let isValid = await bcrypt.compare(String(otp), session.otp_hash);
    if (!isValid && process.env.MOCK_OTP && String(otp) === String(process.env.MOCK_OTP)) {
      isValid = true;
    }

    if (!isValid) {
      await pool.execute('UPDATE otp_sessions SET attempt_count = attempt_count + 1 WHERE session_id = ?', [sessionId]);
      return errorResponse(res, 'Invalid OTP', 'INVALID_OTP', 'The OTP entered is incorrect or expired', 401);
    }

    await pool.execute('UPDATE otp_sessions SET is_verified = TRUE WHERE session_id = ?', [sessionId]);

    const cleanMobile = String(mobile).replace(/\D/g, '');
    // Fetch registered user
    let [users] = await pool.execute('SELECT * FROM users WHERE mobile = ?', [cleanMobile]);
    if (!users.length) {
      return errorResponse(res, 'User not registered. Please register first.', 'NOT_REGISTERED', null, 404);
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

    const otp = process.env.MOCK_OTP || (process.env.NODE_ENV === 'production' ? String(Math.floor(100000 + Math.random() * 900000)) : '123456');
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

module.exports = { register, sendOtp, verifyOtp, resendOtp, refreshToken, getMe, logout };
