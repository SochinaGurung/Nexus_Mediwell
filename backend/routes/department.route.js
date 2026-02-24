import { Router } from 'express';
const router = Router();
import {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentStats,
    getDoctorsByDepartment
} from '../controllers/department.controller.js';
import { protect, allowRoles } from '../middleware/auth.middleware.js';

// Public routes (anyone can view departments)
router.get('/', getAllDepartments);
router.get('/:id/stats', protect, allowRoles('admin'), getDepartmentStats); // Admin only
router.get('/:id/doctors', getDoctorsByDepartment); // Public - get doctors in department
router.get('/:id', getDepartmentById);

// Admin routes(only admin can)
router.post('/', protect, allowRoles('admin'), createDepartment);
router.put('/:id', protect, allowRoles('admin'), updateDepartment);
router.delete('/:id', protect, allowRoles('admin'), deleteDepartment);

export default router;
