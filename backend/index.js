// Initialization
import http from 'http';
import app from "./app.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';
import { attachSocket } from './socket.js';
import { startReminderScheduler } from './reminderScheduler.js';
import { startAppointmentDayBeforeReminderScheduler } from './appointmentDayBeforeReminderScheduler.js';

dotenv.config();

const port = process.env.PORT || 3000;

// Connecting to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1); // Stop server if DB fails
  }
};

// Create HTTP server and attach Socket.io for real-time chat
const httpServer = http.createServer(app);
attachSocket(httpServer);

// Starting the server after DB is connected
connectDB().then(() => {
  // Start medicine reminder scheduler after MongoDB connection
  startReminderScheduler()
  startAppointmentDayBeforeReminderScheduler()
  httpServer.listen(port, () => {
    console.log(`Server started at PORT: ${port}`);
  });
});

