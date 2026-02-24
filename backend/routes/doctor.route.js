import { Router } from 'express';
const router = Router();
import {
    getAllDoctors,
    getDoctorById,
    updateDoctorProfile,
    updateAvailability,
    setDoctorStatus
} from '../controllers/doctor.controller.js';
import { protect, allowRoles } from '../middleware/auth.middleware.js';

// Public routes (anyone can view doctors)
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);

// Protected routes
router.put('/:id/profile', protect, updateDoctorProfile); // Doctor can update own profile, admin can update any
router.put('/:id/availability', protect, updateAvailability); // Doctor can update own availability, admin can update any

// Admin only routes
router.put('/:id/status', protect, allowRoles('admin'), setDoctorStatus); // Admin only

export default router;
