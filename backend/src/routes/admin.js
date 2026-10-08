const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  requireSuperAdmin,
  getPlatformStats,
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
} = require('../controllers/adminController');

// All admin routes require valid JWT auth + Super Admin privileges
router.use(authenticate);
router.use(requireSuperAdmin);

// Platform stats & KPIs
router.get('/stats', getPlatformStats);

// List tenants / business accounts
router.get('/users', getAllUsers);

// Drill-down details for a specific tenant
router.get('/users/:userId', getUserDetails);

// Activate / Suspend a tenant account
router.patch('/users/:userId/status', toggleUserStatus);

module.exports = router;
