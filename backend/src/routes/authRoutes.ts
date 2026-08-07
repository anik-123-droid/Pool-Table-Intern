import express from 'express';
import { registerUser, loginUser, logoutUser, getUserProfile, updateUserProfile, createAdmin, verifyLoginMfa, setupMfa, verifyMfaSetup } from '../controllers/authController';
import { protect, superadmin, admin } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiters';
import { verifyCaptcha } from '../utils/captcha';

const router = express.Router();

router.post('/register', authLimiter, verifyCaptcha, registerUser);
router.post('/login', authLimiter, verifyCaptcha, loginUser);
router.post('/logout', logoutUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

// MFA Routes
router.post('/mfa/verify-login', authLimiter, verifyCaptcha, verifyLoginMfa);
router.post('/mfa/setup', protect, admin, setupMfa);
router.post('/mfa/verify-setup', protect, admin, verifyMfaSetup);

// Superadmin only route to create admins
router.post('/create-admin', protect, superadmin, createAdmin);

export default router;
