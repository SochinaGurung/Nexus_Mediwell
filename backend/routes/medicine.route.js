import { Router } from 'express';
import { protect, allowRoles } from '../middleware/auth.middleware.js';
import {
  createMedicineSuggestion,
  getDoctorMedicineSuggestions,
  getPatientMedicineSuggestions,
  respondToMedicineSuggestion
} from '../controllers/medicineReminder.controller.js';

const router = Router();

router.use(protect);

router.post('/suggestions/:patientId', allowRoles('doctor'), createMedicineSuggestion);
router.get('/suggestions/doctor', allowRoles('doctor'), getDoctorMedicineSuggestions);
router.get('/suggestions/patient', allowRoles('patient'), getPatientMedicineSuggestions);
router.patch('/suggestions/:suggestionId/respond', allowRoles('patient'), respondToMedicineSuggestion);

export default router;
