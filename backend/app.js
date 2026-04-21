import express from 'express';
import cors from 'cors'; 
import authRoutes from './routes/auth.route.js';
import appointmentRoutes from './routes/appointment.route.js';
import feedbackRoutes from './routes/feedback.route.js';
import departmentRoutes from './routes/department.route.js';
import serviceRoutes from './routes/service.route.js';
import doctorRoutes from './routes/doctor.route.js';
import patientRoutes from './routes/patient.route.js';
import chatRoutes from './routes/chat.route.js';
import medicineRoutes from './routes/medicine.route.js';
import reminderRoutes from './routes/reminder.route.js';
import departmentSuggestionRoutes from './routes/departmentSuggestion.route.js';
import dotenv from 'dotenv';

const app = express();

// Load environment variables (only once, at app level)
dotenv.config();

// Enable CORS with proper config
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Prefix all routes with /api
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/rag', departmentSuggestionRoutes);

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

export default app;