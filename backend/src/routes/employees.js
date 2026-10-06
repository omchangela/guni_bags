const express = require('express');
const router = express.Router();
const { getEmployees, addEmployee, getEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getEmployees);
router.post('/', addEmployee);
router.get('/:id', getEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
