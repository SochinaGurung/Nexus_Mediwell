import {Router} from 'express';
const router =Router();
import {register, login, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail, testEmailConfig} from '../controllers/auth.controller.js';
import { protect, allowRoles } from "../middleware/auth.middleware.js";


router.post('/register', register);
router.post('/login', login);
router.post("/admin-register", protect, allowRoles("admin"), register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/test-email', testEmailConfig); // Test endpoint for email configuration

export default router;