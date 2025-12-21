// Initialization
import app from "./app.js";
import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config();
import dotenv from 'dotenv';
dotenv.config();

console.log(process.env.JWT_SECRET); // just to check

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

// Starting the server after DB is connected
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server started at PORT: ${port}`);
  });
});

// Routes
app.get("/", (_req, res) => {
  res.send("This is homepage.");
});
