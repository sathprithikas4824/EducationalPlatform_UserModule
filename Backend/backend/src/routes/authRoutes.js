
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
// List All Users (Admin only)
// Fetches from profiles table (all Supabase Auth learners)
// -----------------------------
router.get(
  "/users",
  verifyToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const { supabase } = await import("../config/supabaseClient.js");

    // Fetch all learner profiles (Supabase Auth users)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, auth_providers, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) throw new AppError(profilesError.message, 500);

    // Fetch last_sign_in_at from auth.users via admin API
    let lastSignInMap = {};
    try {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (authData?.users) {
        authData.users.forEach((u) => {
          lastSignInMap[u.id] = u.last_sign_in_at;
        });
      }
    } catch (_) {
      // non-critical, continue without it
    }

    const users = (profiles || []).map((p) => ({
      user_id: p.id,
      name: p.full_name || null,
      email: p.email,
      avatar_url: p.avatar_url || null,
      auth_providers: p.auth_providers || [],
      role: "learner",
      status: "active",
      created_at: p.created_at,
      last_sign_in_at: lastSignInMap[p.id] || null,
    }));

    res.json({ users });
  })
);

// -----------------------------
// Get Single User Full Details (Admin only)
// Returns profile + survey + highlights + progress
// -----------------------------
router.get(
  "/users/:id",
  verifyToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { id } = req.params;
    const { supabase } = await import("../config/supabaseClient.js");

    const [profileRes, surveyRes, highlightsRes, progressRes, authUserRes, bookmarksRes, downloadsRes] =
      await Promise.allSettled([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("user_surveys").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("highlights").select("id, page_id, text, color, created_at").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("user_topic_progress").select("id, topic_id, module_id, completed, completed_at, created_at").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.auth.admin.getUserById(id),
        supabase.from("user_bookmarks").select("id, type, module_id, module_name, module_image_url, topic_id, topic_name, bookmarked_at").eq("user_id", id).order("bookmarked_at", { ascending: false }),
        supabase.from("user_downloads").select("id, topic_id, topic_name, module_name, file_name, file_type, downloaded_at").eq("user_id", id).order("downloaded_at", { ascending: false }),
      ]);

    const profile    = profileRes.status    === "fulfilled" ? profileRes.value.data    : null;
    const survey     = surveyRes.status     === "fulfilled" ? surveyRes.value.data      : null;
    const highlights = highlightsRes.status === "fulfilled" ? (highlightsRes.value.data ?? []) : [];
    const progress   = progressRes.status   === "fulfilled" ? (progressRes.value.data  ?? []) : [];
    const authUser   = authUserRes.status   === "fulfilled" ? authUserRes.value.data?.user : null;
    const bookmarks  = bookmarksRes.status  === "fulfilled" ? (bookmarksRes.value.data  ?? []) : [];
    const downloads  = downloadsRes.status  === "fulfilled" ? (downloadsRes.value.data  ?? []) : [];

    if (!profile && !authUser) return res.status(404).json({ error: "User not found" });

    res.json({
      profile: {
        user_id: id,
        name: profile?.full_name || null,
        email: profile?.email || authUser?.email || null,
        avatar_url: profile?.avatar_url || null,
        auth_providers: profile?.auth_providers || [],
        survey_completed: profile?.survey_completed || false,
        role: profile?.role || "user",
        created_at: profile?.created_at || authUser?.created_at || null,
        updated_at: profile?.updated_at || null,
        last_sign_in_at: authUser?.last_sign_in_at || null,
      },
      survey,
      highlights,
      progress,
      bookmarks,
      downloads,
    });
  })
);

// -----------------------------
// Delete User (Admin only)
// -----------------------------
router.delete(
  "/users/:id",
  verifyToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { id } = req.params;
    const { supabase } = await import("../config/supabaseClient.js");
    // Delete all dependent tables first (handles tables without ON DELETE CASCADE)
    await Promise.allSettled([
      supabase.from("highlights").delete().eq("user_id", id),
      supabase.from("user_bookmarks").delete().eq("user_id", id),
      supabase.from("user_downloads").delete().eq("user_id", id),
      supabase.from("user_topic_progress").delete().eq("user_id", id),
      supabase.from("user_surveys").delete().eq("user_id", id),
    ]);
    await supabase.from("profiles").delete().eq("id", id);
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: "User deleted successfully" });
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
