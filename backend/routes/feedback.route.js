import { Router } from 'express';
const router = Router();
import {
    submitFeedback,
    getAllFeedback,
    getFeedbackById,
    updateFeedbackStatus,
    deleteFeedback
} from '../controllers/feedback.controller.js';
import { protect, allowRoles } from '../middleware/auth.middleware.js';
//For users
router.post('/submit', submitFeedback);

// For admin only
router.get('/', protect, allowRoles('admin'), getAllFeedback);
router.get('/:id', protect, allowRoles('admin'), getFeedbackById);
router.put('/:id/status', protect, allowRoles('admin'), updateFeedbackStatus);
router.delete('/:id', protect, allowRoles('admin'), deleteFeedback);

export default router;
