const express = require('express');
const router = express.Router();
const { getWorkEntries, addWorkEntry, updateWorkEntry, deleteWorkEntry } = require('../controllers/workEntryController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getWorkEntries);
router.post('/', addWorkEntry);
router.put('/:id', updateWorkEntry);
router.delete('/:id', deleteWorkEntry);

module.exports = router;
