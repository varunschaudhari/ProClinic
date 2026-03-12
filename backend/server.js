import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import connectDB from "./config/database.js";
import logger, { logInfo, logError } from "./config/logger.js";
import { requestLogger, errorLogger } from "./middleware/logger.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import visitRoutes from "./routes/visitRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import doctorScheduleRoutes from "./routes/doctorScheduleRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import opdRoutes from "./routes/opdRoutes.js";
import ipdRoutes from "./routes/ipdRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import wardRoutes from "./routes/wardRoutes.js";
import otRoutes from "./routes/otRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import serviceCategoryRoutes from "./routes/serviceCategoryRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to database (this will also ensure default user exists)
connectDB();

const app = express();

// Logging middleware - should be early in the middleware stack
app.use(requestLogger);

// HTTP request logger (Morgan)
app.use(
  morgan("combined", {
    stream: logger.stream,
    skip: (req, res) => {
      // Skip logging for health checks in production
      return (
        process.env.NODE_ENV === "production" && req.url === "/api/health"
      );
    },
  })
);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ProClinic API is running",
    version: "1.0.0",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctor-schedules", doctorScheduleRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/opd", opdRoutes);
app.use("/api/ipd", ipdRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/ot", otRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/service-categories", serviceCategoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error logging middleware
app.use(errorLogger);

// Error handler
app.use((err, req, res, next) => {
  logError("Unhandled error", err, {
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.user?.id || null,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logInfo("Server started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
  });
  
  // Also log to console for immediate visibility
  console.log(`🚀 ProClinic API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Logs directory: ./logs/`);
});
