const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp, refreshToken, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;
