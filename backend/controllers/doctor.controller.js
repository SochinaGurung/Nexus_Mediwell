import doctorService from "../services/doctor.service.js";
import { protect, allowRoles } from "../middleware/auth.middleware.js";

/**
 * GET ALL DOCTORS - Public (anyone can view)
 */
export async function getAllDoctors(req, res) {
    try {
        const filters = {
            department: req.query.department,
            specialization: req.query.specialization,
            search: req.query.search
        };
        
        const result = await doctorService.getAllDoctors(filters);
        
        res.status(200).json({
            message: 'Doctors retrieved successfully',
            ...result
        });
    } catch (err) {
        console.error('Get all doctors error:', err);
        res.status(500).json({
            message: 'Failed to fetch doctors',
            error: err.message
        });
    }
}

/**
 * GET DOCTOR BY ID - Public
 */
export async function getDoctorById(req, res) {
    try {
        const { id } = req.params;
        const doctor = await doctorService.getDoctorById(id);
        
        res.status(200).json({
            message: 'Doctor retrieved successfully',
            doctor: doctor
        });
    } catch (err) {
        console.error('Get doctor by ID error:', err);
        const statusCode = err.message === 'Doctor not found' ? 404 : 500;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}

/**
 * UPDATE DOCTOR PROFILE - Doctor only (can update own profile) or Admin
 */
export async function updateDoctorProfile(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        // Check if user is updating their own profile or is admin
        if (id !== userId && userRole !== 'admin') {
            return res.status(403).json({
                message: 'You can only update your own profile'
            });
        }

        const doctor = await doctorService.updateDoctorProfile(id, req.body);
        
        res.status(200).json({
            message: "Doctor profile updated successfully",
            doctor: doctor
        });
    } catch (err) {
        console.error('Update doctor profile error:', err);
        const statusCode = err.message === 'Doctor not found' ? 404 : 400;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}

/**
 * UPDATE DOCTOR AVAILABILITY - Doctor only
 */
export async function updateAvailability(req, res) {
    try {
        const { id } = req.params;
        const { day, ...availabilityData } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        // Check if user is updating their own availability or is admin
        if (id !== userId && userRole !== 'admin') {
            return res.status(403).json({
                message: 'You can only update your own availability'
            });
        }

        if (!day) {
            return res.status(400).json({
                message: 'Day is required'
            });
        }

        const result = await doctorService.updateAvailability(id, day, availabilityData);
        
        res.status(200).json({
            message: "Availability updated successfully",
            availability: result.availability
        });
    } catch (err) {
        console.error('Update availability error:', err);
        const statusCode = err.message === 'Doctor not found' ? 404 : 400;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}

/**
 * SET DOCTOR STATUS - Admin only
 */
export async function setDoctorStatus(req, res) {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                message: 'isActive must be a boolean value'
            });
        }

        const result = await doctorService.setDoctorStatus(id, isActive);
        
        res.status(200).json({
            message: "Doctor status updated successfully",
            doctor: result
        });
    } catch (err) {
        console.error('Set doctor status error:', err);
        const statusCode = err.message === 'Doctor not found' ? 404 : 400;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}
