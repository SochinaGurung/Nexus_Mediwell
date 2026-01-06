import express from 'express';
import cors from 'cors'; 
import authRoutes from './routes/auth.route.js';
import appointmentRoutes from './routes/appointment.route.js';
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

// Error handling middleware (must be last)
// Note: Express requires 'next' parameter even if not used
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