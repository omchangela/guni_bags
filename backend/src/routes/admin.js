const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
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
} = require('../controllers/adminController');

// All admin routes require valid JWT auth + Super Admin privileges
router.use(authenticate);
router.use(requireSuperAdmin);

// Platform stats & KPIs
router.get('/stats', getPlatformStats);

// Tenant CRUD
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.patch('/users/:userId/status', toggleUserStatus);

// Tenant Worker Management
router.post('/users/:userId/workers', addWorkerForTenant);
router.delete('/users/:userId/workers/:workerId', deleteWorkerForTenant);

// Tenant Work Entries
router.post('/users/:userId/work-entries', addWorkEntryForTenant);
router.delete('/users/:userId/work-entries/:entryId', deleteWorkEntryForTenant);

// Tenant Payouts
router.post('/users/:userId/payouts', addPayoutForTenant);
router.delete('/users/:userId/payouts/:payoutId', deletePayoutForTenant);

module.exports = router;
