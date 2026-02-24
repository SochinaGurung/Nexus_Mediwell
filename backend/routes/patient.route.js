import { Router } from 'express';
const router = Router();
import {
    addMedicalRecord,
    updatePatientAllergies,
    searchPatients,
    getPatientWithRecords
} from '../controllers/patient.controller.js';
import { protect, allowRoles } from '../middleware/auth.middleware.js';

// All routes require doctor authentication
router.get('/search', protect, allowRoles('doctor'), searchPatients);
router.get('/:patientId', protect, allowRoles('doctor'), getPatientWithRecords);
router.post('/:patientId/medical-record', protect, allowRoles('doctor'), addMedicalRecord);
router.put('/:patientId/allergies', protect, allowRoles('doctor'), updatePatientAllergies);

export default router;
