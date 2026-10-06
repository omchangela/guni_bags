const express = require('express');
const router = express.Router();
const { getPayouts, addPayout, deletePayout } = require('../controllers/payoutController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getPayouts);
router.post('/', addPayout);
router.delete('/:id', deletePayout);

module.exports = router;
