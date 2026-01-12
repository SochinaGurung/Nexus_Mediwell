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

// Book appointment 
router.post('/book', bookAppointment);

// Get patient's appointments 
router.get('/my-appointments', getMyAppointments);

// Get doctor's appointments 
router.get('/doctor-appointments', getDoctorAppointments);

// Update appointment status 
router.patch('/:appointmentId/status', updateAppointmentStatus);

// Update appointment 
router.put('/:appointmentId', updateAppointment);

// Cancel appointment -
router.post('/cancel', cancelAppointment);
router.post('/:appointmentId/cancel', cancelAppointment);

// Reschedule appointment
router.put('/:appointmentId/reschedule', rescheduleAppointment);

export default router;

