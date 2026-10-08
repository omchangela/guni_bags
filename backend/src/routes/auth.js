const express = require('express');
const router = express.Router();
const { register, sendOtp, verifyOtp, resendOtp, refreshToken, getMe, updateProfile, logout, adminLogin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/refresh-token', refreshToken);
router.post('/admin-login', adminLogin);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/logout', authenticate, logout);

module.exports = router;

