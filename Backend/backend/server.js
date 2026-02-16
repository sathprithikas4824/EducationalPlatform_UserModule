// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import helmet from "helmet";
// import csrf from "csurf";
// import rateLimit from "express-rate-limit";
// import dotenv from "dotenv";
// import compression from "compression";
// import authRoutes from "./src/routes/authRoutes.js";
// import categoryRoutes from "./src/routes/categoryRoutes.js";
// import logger from "./src/config/logger.js";
// import { errorHandler } from "./src/middleware/errorHandler.js"; // ✅ New centralized error handler

// dotenv.config();
// const app = express();
// const PORT = process.env.PORT || 3000;

// // Security headers
// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//     xPoweredBy: false,
//     noSniff: true,
//     frameguard: { action: "deny" },
//     referrerPolicy: { policy: "strict-origin-when-cross-origin" },
//   })
// );

// // CORS
// app.use(
//   cors({
//     origin: ["http://localhost:5173"],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization", "CSRF-Token"],
//   })
// );

// // Parsers
// app.use(express.json({ limit: "50kb" }));
// app.use(cookieParser());
// app.use(compression());

// // CSRF setup
// const csrfProtection = csrf({
//   cookie: {
//     httpOnly: true,
//     sameSite: "Strict",
//     secure: process.env.NODE_ENV === "production",
//   },
// });

// // Apply CSRF protection conditionally (exclude token refresh)
// app.use((req, res, next) => {
//   // Skip CSRF for refresh token endpoint
//   if (req.path === '/auth/refresh') {
//     return next();
//   }
//   csrfProtection(req, res, next);
// });

// app.get("/csrf-token", (req, res) => {
//   res.json({ csrfToken: req.csrfToken() });
// });

// // Rate limiter
// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests. Try again later.",
// });
// app.use(generalLimiter);

// // Routes
// app.use("/auth", authRoutes);
// app.use("/categories", categoryRoutes);

// // Global error handler (last middleware)
// app.use(errorHandler);

// app.listen(PORT, () => {
//   logger.info(`✅ Server running at http://localhost:${PORT}`);
// });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { doubleCsrf } from "csrf-csrf";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import compression from "compression";
import authRoutes from "./src/routes/authRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import mainCategoryRoutes from "./src/routes/mainCategoryRoutes.js";
import logger from "./src/config/logger.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import modulesRoutes from "./src/routes/modulesRoutes.js";
import submoduleRoutes from "./src/routes/submoduleRoutes.js";
import topicsRoutes from "./src/routes/topicsRoutes.js";
import seoAeoRoutes from "./src/routes/seoAeoRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    xPoweredBy: false,
    noSniff: true,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3001",
        "http://localhost:3000",
      ];

      // Allow exact match
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow all *.vercel.app subdomains (production + preview deployments)
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

// Parsers
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());
app.use(compression());

// CSRF setup using csrf-csrf (modern, maintained alternative)
const {
  generateCsrfToken, // Generates a CSRF token (CORRECTED)
  doubleCsrfProtection, // Middleware to protect routes
  invalidCsrfTokenError, // Error instance for validation failures
} = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET, // Use existing strong secret
  getSessionIdentifier: (req) => {
    // Return unique identifier per user/session (REQUIRED)
    // Use JWT user_id if available, otherwise fall back to IP or anonymous
    return req.user?.user_id || req.ip || "anonymous";
  },
  cookieName: "x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

// CSRF token endpoint (MUST come before selective middleware)
app.get("/csrf-token", (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// Apply CSRF protection selectively for all other routes
app.use((req, res, next) => {
  // Skip CSRF for GET/HEAD/OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip CSRF for refresh token endpoint (it's a POST but uses cookie auth)
  if (req.path === "/auth/refresh") {
    return next();
  }

  // Skip CSRF for file upload endpoint (multipart/form-data has issues with CSRF validation)
  // This is acceptable since upload requires authentication
  if (req.path === "/api/upload/image") {
    return next();
  }

  // Apply CSRF to all other POST/PUT/DELETE requests
  doubleCsrfProtection(req, res, next);
});

// Request logging middleware (logs all incoming requests)
app.use((req, res, next) => {
  // Skip logging for GET requests to reduce noise (optional)
  if (req.method !== "GET") {
    console.log("\n========== INCOMING REQUEST ==========");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Method:", req.method);
    console.log("Path:", req.originalUrl);
    console.log(
      "Body:",
      req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(req.body, null, 2)
        : "(empty or multipart)",
    );
    console.log(
      "Params:",
      req.params && Object.keys(req.params).length > 0
        ? JSON.stringify(req.params)
        : "(none)",
    );
    console.log(
      "Query:",
      req.query && Object.keys(req.query).length > 0
        ? JSON.stringify(req.query)
        : "(none)",
    );
    console.log("======================================\n");
  }
  next();
});

// Rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Try again later.",
});
app.use(generalLimiter);

// Routes
app.use("/auth", authRoutes);
app.use("/main-categories", mainCategoryRoutes);
app.use("/categories", categoryRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/submodules", submoduleRoutes);
app.use("/api/topics", topicsRoutes);
app.use("/api/seo-aeo", seoAeoRoutes);
app.use("/api/upload", uploadRoutes);

// Global error handler (last middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`✅ Server running at http://localhost:${PORT}`);
});
