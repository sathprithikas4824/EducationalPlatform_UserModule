
// [src/routes/authRoutes.js] - Corrected to fix Middleware Structure issue

import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import jwt from "jsonwebtoken";
import { loginUser, registerUser } from "../controllers/authController.js";
import { validate } from "../middleware/validationMiddleware.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js"; // ✅ New async error wrapper
import AppError from "../utils/AppError.js"; // ✅ Custom error class

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refreshsecretkey";

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts from this IP, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const registrationValidation = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email").isEmail().withMessage("Must be a valid email address.").normalizeEmail(),
  body("password")
    .isLength({ min: 10 })
    .withMessage("Password must be at least 10 characters long.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\~-]).*$/)
    .withMessage("Password must contain uppercase, lowercase, number, and special character."),
  body("role").optional().isIn(["user", "learner", "admin"]).withMessage("Invalid role specified."),
];

const loginValidation = [
  body("email").isEmail().withMessage("Must be a valid email address."),
  body("password").notEmpty().withMessage("Password is required."),
];

// -----------------------------
// Login Route
// -----------------------------
router.post(
  "/login",
  loginLimiter,
  loginValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await loginUser(email, password);

    const accessToken = jwt.sign(
      { user_id: user.user_id, email: user.email || email, role: user.role, name: user.name },
      SECRET_KEY,
      { expiresIn: "2h" }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id, email: user.email },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Login successful", user });
  })
);

// -----------------------------
// Refresh Token
// -----------------------------
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new AppError("No refresh token provided", 401);

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    // Fetch user from database to get current role and name
    const { supabase } = await import("../config/supabaseClient.js");
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, email, role, name")
      .eq("user_id", decoded.user_id)
      .single();

    if (error || !user) throw new AppError("User not found", 404);

    const newAccessToken = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
      SECRET_KEY,
      { expiresIn: "2h" }
    );

    res.cookie("jwt", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({ message: "Token refreshed successfully" });
  })
);

// -----------------------------
// Register
// -----------------------------
router.post(
  "/register",
  registrationValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const newUser = await registerUser(name, email, password, role);
    res.json({ message: "User registered successfully", newUser });
  })
);

// -----------------------------
// Logout
// -----------------------------
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    res.clearCookie("jwt");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  })
);

// -----------------------------
// Current User
// -----------------------------
router.get(
  "/me",
  verifyToken,
  asyncHandler(async (req, res) => {
    let { user_id, email, role, name } = req.user;

    // If role or name is missing from JWT, fetch from database
    if (!role || !name) {
      const { supabase } = await import("../config/supabaseClient.js");
      const { data: user, error } = await supabase
        .from("users")
        .select("user_id, email, role, name")
        .eq("user_id", user_id)
        .single();

      if (!error && user) {
        role = user.role;
        name = user.name;
        email = user.email;
      }
    }

    res.json({ user: { user_id, email, role, name } });
  })
);

// -----------------------------
// Check Auth Status
// -----------------------------
router.get(
  "/check",
  asyncHandler(async (req, res) => {
    const token = req.cookies.jwt;

    if (!token) {
      return res.json({ authenticated: false });
    }

    try {
      const decoded = jwt.verify(token, SECRET_KEY);

      // Verify user still exists in database
      const { supabase } = await import("../config/supabaseClient.js");
      const { data: user, error } = await supabase
        .from("users")
        .select("user_id, email, role, name")
        .eq("user_id", decoded.user_id)
        .single();

      if (error || !user) {
        return res.json({ authenticated: false });
      }

      res.json({
        authenticated: true,
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      });
    } catch (err) {
      res.json({ authenticated: false });
    }
  })
);

export default router;
