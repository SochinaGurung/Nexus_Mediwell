import { Router } from 'express';
import { protect, allowRoles } from '../middleware/auth.middleware.js';
import {
  createReminder,
  getMyReminders,
  updateReminder,
  deleteReminder,
  getMyReminderNotifications,
  markReminderNotificationRead
} from '../controllers/medicineReminder.controller.js';

const router = Router();

router.use(protect);
router.use(allowRoles('patient'));

router.post('/', createReminder);
router.get('/my', getMyReminders);
router.patch('/:reminderId', updateReminder);
router.delete('/:reminderId', deleteReminder);

router.get('/notifications/my', getMyReminderNotifications);
router.patch('/notifications/:notificationId/read', markReminderNotificationRead);

export default router;
