const { v4: uuidv4 } = require('uuid');

/**
 * Standard success response
 */
const successResponse = (res, data, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standard error response
 */
const errorResponse = (res, message, errorCode, details = null, statusCode = 400) => {
  const body = {
    success: false,
    message,
    error: { code: errorCode },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
};

/**
 * Generate a session ID
 */
const generateSessionId = () => `sess_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

/**
 * Format employee ID prefix
 */
const formatId = (prefix) => `${prefix}_${Date.now()}`;

/**
 * Paginate query helper
 */
const paginate = (page = 1, limit = 50) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
};

/**
 * Format time string to TIME (HH:MM:SS) for MySQL
 */
const formatTimeForDB = (timeStr) => {
  if (!timeStr) return null;
  // Handle "09:15 AM" or "HH:MM" formats
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3];
  if (period) {
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
};

/**
 * Format TIME from DB to "HH:MM AM/PM"
 */
const formatTimeForDisplay = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  const hours = parseInt(h);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${m} ${period}`;
};

module.exports = {
  successResponse,
  errorResponse,
  generateSessionId,
  formatId,
  paginate,
  formatTimeForDB,
  formatTimeForDisplay,
};
