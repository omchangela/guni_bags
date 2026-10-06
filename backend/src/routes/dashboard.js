const express = require('express');
const router = express.Router();
const { getDashboardSummary, getDailyReport, getEmployeeReport } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard/summary', getDashboardSummary);
router.get('/reports/daily', getDailyReport);
router.get('/reports/employee/:employeeId', getEmployeeReport);

module.exports = router;
