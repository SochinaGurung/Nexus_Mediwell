import express from 'express';
import cors from 'cors'; 
import authRoutes from './routes/auth.route.js';
//import userRoutes from './routes/user.route.js';
import dotenv from 'dotenv';

const app = express();

dotenv.config(); // Loading environment variables

// Enable CORS with proper config
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Prefix all routes with /api
app.use('/api/auth', authRoutes);
//app.use('/api/user', userRoutes);

export default app;