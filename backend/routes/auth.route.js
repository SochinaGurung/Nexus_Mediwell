import {Router} from 'express';
const router =Router();
import {register} from '../controllers/auth.controller.js';
import {login} from '../controllers/auth.controller.js';
import {logout} from '../controllers/auth.controller.js';
import {updateProfile, getProfile, getAllUsers, updateMedicalRecord, deleteAccount} from '../controllers/auth.controller.js';
import {verifyEmail, resendVerificationEmail} from '../controllers/auth.controller.js';
import {forgotPassword, resetPassword, changePassword} from '../controllers/auth.controller.js';

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Password management routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);

// Profile routes - require authentication
router.get('/profile', getProfile);
router.get('/profile/:userId', getProfile); // Admin can view any profile
router.put('/profile', updateProfile);
router.put('/profile/:userId', updateProfile); // Admin can update any profile

// Medical record routes - patient only
router.put('/medical-record', updateMedicalRecord); // Update medical record (patient only)

// Account management routes
router.delete('/account', deleteAccount); // Delete own account
router.delete('/account/:userId', deleteAccount); // Admin can delete any account

// Admin routes - require admin authentication
router.get('/users', getAllUsers); // Get all users (admin only)

export default router;