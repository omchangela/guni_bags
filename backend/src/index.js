const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { swaggerUi, swaggerDocument, swaggerUiOptions } = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const workEntryRoutes = require('./routes/workEntries');
const payoutRoutes = require('./routes/payouts');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allows Swagger UI inline scripts and assets
}));
app.use(cors({
  origin: (origin, callback) => {
    // Permissive CORS to allow frontend from any domain, local dev, or VPS IP
    callback(null, true);
  },
  credentials: true,
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: isDev ? 50000 : 5000,
  message: { success: false, message: 'Too many requests', error: { code: 'RATE_LIMIT_EXCEEDED' } },
});
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: isDev ? 60 : 30,
  message: { success: false, message: 'Too many OTP requests', error: { code: 'OTP_RATE_LIMIT' } },
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
const healthHandler = (req, res) => {
  res.json({
    success: true,
    message: 'Gunny Bags Manager API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// ─── Swagger Documentation ───────────────────────────────────────────────────
app.get(['/docs.json', '/api-docs/json', '/swagger.json', '/api/v1/docs.json', '/api/v1/swagger.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerDocument);
});
app.use(['/docs', '/api-docs', '/api/v1/docs'], swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));

// ─── API Routes ───────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth/send-otp`, otpLimiter);
app.use(`${API_PREFIX}/auth/resend-otp`, otpLimiter);

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/employees`, employeeRoutes);
app.use(`${API_PREFIX}/work-entries`, workEntryRoutes);
app.use(`${API_PREFIX}/payouts`, payoutRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}`, dashboardRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found`, error: { code: 'NOT_FOUND' } });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: { code: 'SERVER_ERROR' } });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const HOST = '0.0.0.0';
app.listen(PORT, HOST, async () => {
  console.log(`🚀 Gunny Bags Manager API running on http://${HOST}:${PORT}`);
  console.log(`📖 API Base: http://${HOST}:${PORT}/api/v1`);
  console.log(`📚 Swagger Docs: http://${HOST}:${PORT}/docs or http://${HOST}:${PORT}/api-docs`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  await testConnection();
});

module.exports = app;
