import {Router} from 'express';
const router = Router();
import {
    bookAppointment,
    getMyAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    updateAppointment,
    cancelAppointment,
    rescheduleAppointment
} from '../controllers/appointment.controller.js';

// Book appointment - requires patient authentication
router.post('/book', bookAppointment);

// Get patient's appointments - requires patient authentication
router.get('/my-appointments', getMyAppointments);

// Get doctor's appointments - requires doctor authentication
router.get('/doctor-appointments', getDoctorAppointments);

// Update appointment status - requires authentication
router.patch('/:appointmentId/status', updateAppointmentStatus);

// Update appointment (any fields) - requires authentication
router.put('/:appointmentId', updateAppointment);

// Cancel appointment - requires patient or doctor authentication
// Can use either /cancel with appointmentId in body, or /:appointmentId/cancel
router.post('/cancel', cancelAppointment);
router.post('/:appointmentId/cancel', cancelAppointment);

// Reschedule appointment - requires patient or doctor authentication
router.put('/:appointmentId/reschedule', rescheduleAppointment);

export default router;

