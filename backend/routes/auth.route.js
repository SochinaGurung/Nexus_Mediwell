import { Router } from 'express';
const router = Router();

import {
    register,
    login,
    logout,
    updateProfile,
    getProfile,
    getAllUsers,
    updateMedicalRecord,
    deleteAccount,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    changePassword
} from '../controllers/auth.controller.js';

import { protect, allowRoles, optionalAuth } from '../middleware/auth.middleware.js';

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout); // Logout requires login

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Password management routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword); // Change password requires login

// Profile routes
router.get('/profile', protect, getProfile); // User must be logged in
router.get('/profile/:userId', protect, allowRoles('admin'), getProfile); // Admin can view any profile
router.put('/profile', protect, updateProfile); // User updates own profile
router.put('/profile/:userId', protect, allowRoles('admin'), updateProfile); // Admin updates any profile

// Medical record routes - patient only
router.put('/medical-record', protect, allowRoles('patient'), updateMedicalRecord); // Only patients

// Account management routes
router.delete('/account', protect, deleteAccount); // Delete own account
router.delete('/account/:userId', protect, allowRoles('admin'), deleteAccount); // Admin can delete any account

// Admin routes
router.get('/users', protect, allowRoles('admin'), getAllUsers); // Admin only

export default router;
