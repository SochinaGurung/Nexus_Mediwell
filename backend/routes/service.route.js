import { Router } from 'express';
const router = Router();
import {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getServicesByCategory,
    getServicesByDepartment
} from '../controllers/service.controller.js';
import { protect, allowRoles } from '../middleware/auth.middleware.js';

// Public routes - anyone can view services
router.get('/', getAllServices);
router.get('/category/:category', getServicesByCategory);
router.get('/department/:departmentId', getServicesByDepartment);
router.get('/:id', getServiceById);

// Admin routes - require admin authentication
router.post('/', protect, allowRoles('admin'), createService);
router.put('/:id', protect, allowRoles('admin'), updateService);
router.delete('/:id', protect, allowRoles('admin'), deleteService);

export default router;
