import Appointment from "../models/appointment.model.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { 
    sendAppointmentConfirmationEmail, 
    sendAppointmentCancellationEmail,
    sendAppointmentRescheduledEmail 
} from "../utils/emailService.js";

// Helper function to verify JWT token and get user
const verifyToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        return null;
    }
};

// BOOK APPOINTMENT - Requires patient authentication
export async function bookAppointment(req, res) {
    try {
        // Verify patient is logged in
        const decoded = verifyToken(req.headers.authorization);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ 
                message: "Authentication required. Please login to book an appointment." 
            });
        }

        const { doctorId, appointmentDate, appointmentTime, reason, notes } = req.body;

        // Validate required fields
        if (!doctorId || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ 
                message: "Doctor ID, appointment date, and appointment time are required" 
            });
        }

        // Verify doctor exists and is actually a doctor
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }
        if (doctor.role !== "doctor") {
            return res.status(400).json({ message: "The selected user is not a doctor" });
        }

        // Get patient info
        const patient = await User.findById(decoded.userId);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }
        if (patient.role !== "patient") {
            return res.status(403).json({ message: "Only patients can book appointments" });
        }

        // Check if appointment date/time is in the future or not 
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
        if (appointmentDateTime <= new Date()) {
            return res.status(400).json({ 
                message: "Appointment date and time must be in the future" 
            });
        }

        // Check for conflicting appointments (same doctor, same date/time)
        const conflictingAppointment = await Appointment.findOne({
            doctor: doctorId,
            appointmentDate: new Date(appointmentDate),
            appointmentTime: appointmentTime,
            status: { $in: ["pending", "confirmed"] }
        });

        if (conflictingAppointment) {
            return res.status(400).json({ 
                message: "This time slot is already booked. Please choose another time." 
            });
        }

        // Create appointment
        const appointment = new Appointment({
            patient: decoded.userId,
            doctor: doctorId,
            appointmentDate: new Date(appointmentDate),
            appointmentTime: appointmentTime,
            reason: reason || "",
            notes: notes || "",
            status: "pending"
        });

        await appointment.save();

        // Populate doctor and patient details for response
        await appointment.populate('doctor', 'username email firstName lastName specialization department');
        await appointment.populate('patient', 'username email firstName lastName');

        // Send confirmation email to patient
        if (patient.email) {
            const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.username;
            const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.username;
            
            const emailResult = await sendAppointmentConfirmationEmail(patient.email, {
                patientName,
                doctorName,
                appointmentDate: appointmentDate,
                appointmentTime: appointmentTime,
                reason: reason || ""
            });
            
            if (!emailResult.success) {
                console.error("Failed to send appointment confirmation email:", emailResult.error);
            }
        }

        res.status(201).json({
            message: "Appointment booked successfully",
            appointment: {
                id: appointment._id,
                patient: {
                    id: appointment.patient._id,
                    username: appointment.patient.username,
                    email: appointment.patient.email,
                    name: `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim()
                },
                doctor: {
                    id: appointment.doctor._id,
                    username: appointment.doctor.username,
                    email: appointment.doctor.email,
                    name: `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim(),
                    specialization: appointment.doctor.specialization,
                    department: appointment.doctor.department
                },
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                reason: appointment.reason,
                status: appointment.status,
                createdAt: appointment.createdAt
            }
        });

    } catch (err) {
        console.log("Book appointment error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// GET PATIENT'S APPOINTMENTS 
export async function getMyAppointments(req, res) {
    try {
        // Verify patient is logged in
        const decoded = verifyToken(req.headers.authorization);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ 
                message: "Authentication required. Please login to view appointments." 
            });
        }

        const appointments = await Appointment.find({ patient: decoded.userId })
            .populate('doctor', 'username email firstName lastName specialization department')
            .sort({ appointmentDate: 1, appointmentTime: 1 });

        res.status(200).json({
            message: "Appointments retrieved successfully",
            appointments: appointments.map(apt => ({
                id: apt._id,
                doctor: {
                    id: apt.doctor._id,
                    username: apt.doctor.username,
                    email: apt.doctor.email,
                    name: `${apt.doctor.firstName || ''} ${apt.doctor.lastName || ''}`.trim(),
                    specialization: apt.doctor.specialization,
                    department: apt.doctor.department
                },
                appointmentDate: apt.appointmentDate,
                appointmentTime: apt.appointmentTime,
                reason: apt.reason,
                status: apt.status,
                notes: apt.notes,
                createdAt: apt.createdAt
            }))
        });

    } catch (err) {
        console.log("Get appointments error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// GET DOCTOR'S APPOINTMENTS - Enhanced with filtering, pagination, and search
export async function getDoctorAppointments(req, res) {
    try {
        // Verify doctor is logged in
        const decoded = verifyToken(req.headers.authorization);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ 
                message: "Authentication required." 
            });
        }

        const doctor = await User.findById(decoded.userId);
        if (!doctor || doctor.role !== "doctor") {
            return res.status(403).json({ message: "Only doctors can view their appointments" });
        }

        // Get query parameters
        const {
            status,
            fromDate,
            toDate,
            search,
            page = '1',
            limit = '10',
            sortBy = 'appointmentDate',
            sortOrder = 'asc'
        } = req.query;

        // Build filter object
        const filter = { doctor: decoded.userId };

        // Filter by status
        if (status) {
            const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
            if (validStatuses.includes(status)) {
                filter.status = status;
            }
        }

        // Filter by date range
        if (fromDate || toDate) {
            filter.appointmentDate = {};
            if (fromDate) {
                const from = new Date(fromDate);
                if (!isNaN(from.getTime())) {
                    filter.appointmentDate.$gte = from;
                }
            }
            if (toDate) {
                const to = new Date(toDate);
                if (!isNaN(to.getTime())) {
                    // Set to end of day
                    to.setHours(23, 59, 59, 999);
                    filter.appointmentDate.$lte = to;
                }
            }
        }

        // Search filter (patient name, email, username)
        if (search) {
            // We'll need to search in populated patient fields
            // First, find matching patients
            const matchingPatients = await User.find({
                role: "patient",
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            const patientIds = matchingPatients.map(p => p._id);
            if (patientIds.length > 0) {
                filter.patient = { $in: patientIds };
            } else {
                // No matching patients, return empty result
                filter.patient = { $in: [] };
            }
        }

        // Calculate pagination
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        // Build sort object
        const sort = {};
        const validSortFields = ['appointmentDate', 'appointmentTime', 'status', 'createdAt', 'updatedAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'appointmentDate';
        sort[sortField] = sortOrder === 'desc' ? -1 : 1;
        
        // Secondary sort by time if sorting by date
        if (sortField === 'appointmentDate') {
            sort.appointmentTime = sortOrder === 'desc' ? -1 : 1;
        }

        // Get total count for pagination
        const totalAppointments = await Appointment.countDocuments(filter);

        // Fetch appointments with pagination
        const appointments = await Appointment.find(filter)
            .populate('patient', 'username email firstName lastName phoneNumber')
            .sort(sort)
            .skip(skip)
            .limit(limitNumber);

        // Calculate pagination info
        const totalPages = Math.ceil(totalAppointments / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        // Format appointment data
        const formattedAppointments = appointments.map(apt => ({
            id: apt._id,
            patient: {
                id: apt.patient._id,
                username: apt.patient.username,
                email: apt.patient.email,
                name: `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim() || apt.patient.username,
                phoneNumber: apt.patient.phoneNumber
            },
            appointmentDate: apt.appointmentDate,
            appointmentTime: apt.appointmentTime,
            reason: apt.reason,
            status: apt.status,
            notes: apt.notes,
            createdAt: apt.createdAt,
            updatedAt: apt.updatedAt
        }));

        res.status(200).json({
            message: "Appointments retrieved successfully",
            appointments: formattedAppointments,
            pagination: {
                currentPage: pageNumber,
                totalPages: totalPages,
                totalAppointments: totalAppointments,
                appointmentsPerPage: limitNumber,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage
            },
            filters: {
                status: status || null,
                fromDate: fromDate || null,
                toDate: toDate || null,
                search: search || null,
                sortBy: sortField,
                sortOrder: sortOrder
            }
        });

    } catch (err) {
        console.log("Get doctor appointments error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// UPDATE APPOINTMENT STATUS 
export async function updateAppointmentStatus(req, res) {
    try {
        const decoded = verifyToken(req.headers.authorization);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        const { appointmentId } = req.params;
        const { status } = req.body;

        if (!status || !["pending", "confirmed", "cancelled", "completed"].includes(status)) {
            return res.status(400).json({ 
                message: "Valid status is required (pending, confirmed, cancelled, completed)" 
            });
        }

        const appointment = await Appointment.findById(appointmentId)
            .populate('patient', 'username email firstName lastName')
            .populate('doctor', 'username email firstName lastName');

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        const user = await User.findById(decoded.userId);
        
        // Check if user is the patient or doctor for this appointment, or is admin
        if (appointment.patient._id.toString() !== decoded.userId && 
            appointment.doctor._id.toString() !== decoded.userId &&
            user.role !== "admin") {
            return res.status(403).json({ 
                message: "You can only update your own appointments" 
            });
        }

        // Only doctors or admins can confirm or complete appointments
        if ((status === "confirmed" || status === "completed") && user.role !== "doctor" && user.role !== "admin") {
            return res.status(403).json({ 
                message: "Only doctors can confirm or complete appointments" 
            });
        }

        // Prevent updating cancelled or completed appointments
        if (appointment.status === "cancelled" && status !== "cancelled") {
            return res.status(400).json({ 
                message: "Cannot update a cancelled appointment" 
            });
        }

        if (appointment.status === "completed" && status !== "completed") {
            return res.status(400).json({ 
                message: "Cannot update a completed appointment" 
            });
        }

        const oldStatus = appointment.status;
        appointment.status = status;
        await appointment.save();

        // Send email notification if status changed to confirmed or cancelled
        if (status === "confirmed" && oldStatus !== "confirmed" && appointment.patient.email) {
            const patientName = `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username;
            const doctorName = `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;
            
            const emailResult = await sendAppointmentConfirmationEmail(appointment.patient.email, {
                patientName,
                doctorName,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                reason: appointment.reason || ""
            });
            
            if (!emailResult.success) {
                console.error("Failed to send confirmation email:", emailResult.error);
            }
        }

        res.status(200).json({
            message: "Appointment status updated successfully",
            appointment: {
                id: appointment._id,
                status: appointment.status,
                previousStatus: oldStatus
            }
        });

    } catch (err) {
        console.log("Update appointment status error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// UPDATE APPOINTMENT - Update any appointment fields (date, time, reason, notes, status)
export async function updateAppointment(req, res) {
    try {
        const decoded = verifyToken(req.headers.authorization);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        const { appointmentId } = req.params;
        const { appointmentDate, appointmentTime, reason, notes, status } = req.body;

        const appointment = await Appointment.findById(appointmentId)
            .populate('patient', 'username email firstName lastName')
            .populate('doctor', 'username email firstName lastName');

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        const user = await User.findById(decoded.userId);
        
        // Check if user is the patient or doctor for this appointment, or is admin
        if (appointment.patient._id.toString() !== decoded.userId && 
            appointment.doctor._id.toString() !== decoded.userId &&
            user.role !== "admin") {
            return res.status(403).json({ 
                message: "You can only update your own appointments" 
            });
        }

        // Prevent updating cancelled or completed appointments
        if (appointment.status === "cancelled") {
            return res.status(400).json({ 
                message: "Cannot update a cancelled appointment" 
            });
        }

        if (appointment.status === "completed") {
            return res.status(400).json({ 
                message: "Cannot update a completed appointment" 
            });
        }

        // Validate status if provided
        if (status && !["pending", "confirmed", "cancelled", "completed"].includes(status)) {
            return res.status(400).json({ 
                message: "Valid status is required (pending, confirmed, cancelled, completed)" 
            });
        }

        // Only doctors or admins can confirm or complete appointments
        if (status && (status === "confirmed" || status === "completed") && user.role !== "doctor" && user.role !== "admin") {
            return res.status(403).json({ 
                message: "Only doctors can confirm or complete appointments" 
            });
        }

        // Store old values for email notifications
        const oldDate = appointment.appointmentDate;
        const oldTime = appointment.appointmentTime;
        const oldStatus = appointment.status;
        let dateTimeChanged = false;

        // Update appointment date
        if (appointmentDate !== undefined) {
            const newDate = new Date(appointmentDate);
            if (isNaN(newDate.getTime())) {
                return res.status(400).json({ message: "Invalid appointment date format" });
            }
            appointment.appointmentDate = newDate;
            dateTimeChanged = true;
        }

        // Update appointment time
        if (appointmentTime !== undefined) {
            if (typeof appointmentTime !== 'string' || appointmentTime.trim() === '') {
                return res.status(400).json({ message: "Invalid appointment time" });
            }
            appointment.appointmentTime = appointmentTime.trim();
            dateTimeChanged = true;
        }

        // Validate new date/time is in the future if date or time changed
        if (dateTimeChanged) {
            const newAppointmentDateTime = new Date(`${appointment.appointmentDate.toISOString().split('T')[0]}T${appointment.appointmentTime}`);
            if (newAppointmentDateTime <= new Date()) {
                return res.status(400).json({ 
                    message: "Appointment date and time must be in the future" 
                });
            }

            // Check for conflicting appointments (same doctor, same date/time, excluding current appointment)
            const conflictingAppointment = await Appointment.findOne({
                doctor: appointment.doctor._id,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                status: { $in: ["pending", "confirmed"] },
                _id: { $ne: appointmentId }
            });

            if (conflictingAppointment) {
                return res.status(400).json({ 
                    message: "This time slot is already booked. Please choose another time." 
                });
            }
        }

        // Update reason
        if (reason !== undefined) {
            appointment.reason = reason;
        }

        // Update notes
        if (notes !== undefined) {
            appointment.notes = notes;
        }

        // Update status
        if (status !== undefined) {
            appointment.status = status;
        }

        // Reset status to pending if date/time changed and it was confirmed
        if (dateTimeChanged && appointment.status === "confirmed") {
            appointment.status = "pending";
        }

        await appointment.save();

        // Send email notifications
        if (dateTimeChanged && appointment.patient.email) {
            const patientName = `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username;
            const doctorName = `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;
            
            const emailResult = await sendAppointmentRescheduledEmail(appointment.patient.email, {
                patientName,
                doctorName,
                oldDate: oldDate,
                oldTime: oldTime,
                newDate: appointment.appointmentDate.toISOString().split('T')[0],
                newTime: appointment.appointmentTime,
                rescheduledBy: user.role === "patient" ? patientName : doctorName
            });
            
            if (!emailResult.success) {
                console.error("Failed to send rescheduled email:", emailResult.error);
            }
        }

        if (status === "confirmed" && oldStatus !== "confirmed" && appointment.patient.email) {
            const patientName = `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username;
            const doctorName = `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;
            
            const emailResult = await sendAppointmentConfirmationEmail(appointment.patient.email, {
                patientName,
                doctorName,
                appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
                appointmentTime: appointment.appointmentTime,
                reason: appointment.reason || ""
            });
            
            if (!emailResult.success) {
                console.error("Failed to send confirmation email:", emailResult.error);
            }
        }

        // Populate for response
        await appointment.populate('doctor', 'username email firstName lastName specialization department');
        await appointment.populate('patient', 'username email firstName lastName');

        res.status(200).json({
            message: "Appointment updated successfully",
            appointment: {
                id: appointment._id,
                patient: {
                    id: appointment.patient._id,
                    username: appointment.patient.username,
                    email: appointment.patient.email,
                    name: `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim()
                },
                doctor: {
                    id: appointment.doctor._id,
                    username: appointment.doctor.username,
                    email: appointment.doctor.email,
                    name: `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim(),
                    specialization: appointment.doctor.specialization,
                    department: appointment.doctor.department
                },
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                reason: appointment.reason,
                notes: appointment.notes,
                status: appointment.status,
                updatedAt: appointment.updatedAt
            }
        });

    } catch (err) {
        console.log("Update appointment error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// CANCEL APPOINTMENT 
export async function cancelAppointment(req, res) {
    try {
        const decoded = verifyToken(req.headers.authorization);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        // Get appointmentId from params (URL) or body
        const appointmentId = req.params.appointmentId || req.body.appointmentId;
        
        if (!appointmentId) {
            return res.status(400).json({ 
                message: "Appointment ID is required. Provide it in the URL (/api/appointments/:appointmentId/cancel) or in the request body ({\"appointmentId\": \"...\"})." 
            });
        }

        const appointment = await Appointment.findById(appointmentId)
            .populate('patient', 'username email firstName lastName')
            .populate('doctor', 'username email firstName lastName');

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        const user = await User.findById(decoded.userId);
        
        // Check if user is the patient or doctor for this appointment
        if (appointment.patient._id.toString() !== decoded.userId && 
            appointment.doctor._id.toString() !== decoded.userId) {
            return res.status(403).json({ 
                message: "You can only cancel your own appointments" 
            });
        }

        // Check if appointment is already cancelled or completed
        if (appointment.status === "cancelled") {
            return res.status(400).json({ 
                message: "Appointment is already cancelled" 
            });
        }

        if (appointment.status === "completed") {
            return res.status(400).json({ 
                message: "Cannot cancel a completed appointment" 
            });
        }

        // Determine who cancelled
        const cancelledBy = user.role === "patient" 
            ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username
            : `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;

        // Update appointment status
        appointment.status = "cancelled";
        await appointment.save();

        // Send cancellation email to patient
        if (appointment.patient.email) {
            const patientName = `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username;
            const doctorName = `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;
            
            const emailResult = await sendAppointmentCancellationEmail(appointment.patient.email, {
                patientName,
                doctorName,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                cancelledBy: cancelledBy
            });
            
            if (!emailResult.success) {
                console.error("Failed to send cancellation email:", emailResult.error);
                // Don't fail the request if email fails
            }
        }

        // Also send email to doctor if patient cancelled
        if (user.role === "patient" && appointment.doctor.email) {
            const doctorName = `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;
            const patientName = `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username;
            
            const emailResult = await sendAppointmentCancellationEmail(appointment.doctor.email, {
                patientName: doctorName, // For doctor email, show patient name
                doctorName: patientName,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                cancelledBy: cancelledBy
            });
            
            if (!emailResult.success) {
                console.error("Failed to send cancellation email to doctor:", emailResult.error);
            }
        }

        console.log(`Appointment ${appointmentId} cancelled by ${user.role}: ${user.username}`);

        res.status(200).json({
            message: "Appointment cancelled successfully",
            appointment: {
                id: appointment._id,
                status: appointment.status,
                cancelledBy: cancelledBy
            }
        });

    } catch (err) {
        console.log("Cancel appointment error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// RESCHEDULE APPOINTMENT - Requires patient or doctor authentication
export async function rescheduleAppointment(req, res) {
    try {
        const decoded = verifyToken(req.headers.authorization);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        const { appointmentId } = req.params;
        const { appointmentDate, appointmentTime, reason } = req.body;

        // Validate required fields
        if (!appointmentDate || !appointmentTime) {
            return res.status(400).json({ 
                message: "Appointment date and time are required" 
            });
        }

        const appointment = await Appointment.findById(appointmentId)
            .populate('patient', 'username email firstName lastName')
            .populate('doctor', 'username email firstName lastName');

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        const user = await User.findById(decoded.userId);
        
        // Check if user is the patient or doctor for this appointment
        if (appointment.patient._id.toString() !== decoded.userId && 
            appointment.doctor._id.toString() !== decoded.userId) {
            return res.status(403).json({ 
                message: "You can only reschedule your own appointments" 
            });
        }

        // Check if appointment is already cancelled or completed
        if (appointment.status === "cancelled") {
            return res.status(400).json({ 
                message: "Cannot reschedule a cancelled appointment" 
            });
        }

        if (appointment.status === "completed") {
            return res.status(400).json({ 
                message: "Cannot reschedule a completed appointment" 
            });
        }

        // Check if new appointment date/time is in the future
        const newAppointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
        if (newAppointmentDateTime <= new Date()) {
            return res.status(400).json({ 
                message: "New appointment date and time must be in the future" 
            });
        }

        // Check for conflicting appointments (same doctor, same date/time, excluding current appointment)
        const conflictingAppointment = await Appointment.findOne({
            doctor: appointment.doctor._id,
            appointmentDate: new Date(appointmentDate),
            appointmentTime: appointmentTime,
            status: { $in: ["pending", "confirmed"] },
            _id: { $ne: appointmentId } // Exclude current appointment
        });

        if (conflictingAppointment) {
            return res.status(400).json({ 
                message: "This time slot is already booked. Please choose another time." 
            });
        }

        // Store old values for email
        const oldDate = appointment.appointmentDate;
        const oldTime = appointment.appointmentTime;

        // Update appointment
        appointment.appointmentDate = new Date(appointmentDate);
        appointment.appointmentTime = appointmentTime;
        if (reason) {
            appointment.reason = reason;
        }
        // Reset status to pending if it was confirmed
        if (appointment.status === "confirmed") {
            appointment.status = "pending";
        }
        await appointment.save();

        // Determine who rescheduled
        const rescheduledBy = user.role === "patient" 
            ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username
            : `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;

        // Send rescheduled email to patient
        if (appointment.patient.email) {
            const patientName = `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username;
            const doctorName = `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;
            
            const emailResult = await sendAppointmentRescheduledEmail(appointment.patient.email, {
                patientName,
                doctorName,
                oldDate: oldDate,
                oldTime: oldTime,
                newDate: appointmentDate,
                newTime: appointmentTime,
                rescheduledBy: rescheduledBy
            });
            
            if (!emailResult.success) {
                console.error("Failed to send rescheduled email:", emailResult.error);
                // Don't fail the request if email fails
            }
        }

        // Also send email to doctor if patient rescheduled
        if (user.role === "patient" && appointment.doctor.email) {
            const doctorName = `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim() || appointment.doctor.username;
            const patientName = `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || appointment.patient.username;
            
            const emailResult = await sendAppointmentRescheduledEmail(appointment.doctor.email, {
                patientName: doctorName, // For doctor email, show patient name
                doctorName: patientName,
                oldDate: oldDate,
                oldTime: oldTime,
                newDate: appointmentDate,
                newTime: appointmentTime,
                rescheduledBy: rescheduledBy
            });
            
            if (!emailResult.success) {
                console.error("Failed to send rescheduled email to doctor:", emailResult.error);
            }
        }

        console.log(`Appointment ${appointmentId} rescheduled by ${user.role}: ${user.username}`);

        // Populate for response
        await appointment.populate('doctor', 'username email firstName lastName specialization department');
        await appointment.populate('patient', 'username email firstName lastName');

        res.status(200).json({
            message: "Appointment rescheduled successfully",
            appointment: {
                id: appointment._id,
                patient: {
                    id: appointment.patient._id,
                    username: appointment.patient.username,
                    email: appointment.patient.email,
                    name: `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim()
                },
                doctor: {
                    id: appointment.doctor._id,
                    username: appointment.doctor.username,
                    email: appointment.doctor.email,
                    name: `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim(),
                    specialization: appointment.doctor.specialization,
                    department: appointment.doctor.department
                },
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                reason: appointment.reason,
                status: appointment.status,
                rescheduledBy: rescheduledBy
            }
        });

    } catch (err) {
        console.log("Reschedule appointment error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

