import express from "express";
import { body, param } from "express-validator";
import { verifyToken } from "../middleware/authMiddleware.js";
import * as mainCategoriesController from "../controllers/mainCategoriesController.js";
import { validate } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { sanitizeBody } from "../middleware/sanitizeInput.js";

const router = express.Router();

/* ------------------------- 🧩 VALIDATION SCHEMAS ------------------------- */
const mainCategoryCreateValidation = [
  body("name")
    .trim()
    .stripLow()
    .isLength({ min: 3, max: 50 })
    .withMessage("Main category name must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z0-9\s.,\-_@$:;]+$/)
    .withMessage("Main category name can only contain letters, numbers, spaces, and special characters: . , - _ @ $ : ;")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("description")
    .trim()
    .stripLow()
    .isLength({ min: 1, max: 500 })
    .withMessage("Main category description is required and must be within 500 characters.")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("status")
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage("Status must be one of: active, inactive, draft"),
];

const mainCategoryUpdateValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid Main Category ID format. Must be a positive integer."),

  body("name")
    .optional()
    .trim()
    .stripLow()
    .isLength({ min: 3, max: 50 })
    .withMessage("Main category name must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z0-9\s.,\-_@$:;]+$/)
    .withMessage("Main category name can only contain letters, numbers, spaces, and special characters: . , - _ @ $ : ;")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("description")
    .optional()
    .trim()
    .stripLow()
    .isLength({ max: 500 })
    .withMessage("Main category description cannot exceed 500 characters.")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("status")
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage("Status must be one of: active, inactive, draft"),
];

const mainCategoryIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid Main Category ID format. Must be a positive integer."),
];

/* ----------------------------- 🟢 PUBLIC ROUTES ---------------------------- */
// In-memory cache with versioning
let mainCategoryCache = {
  all: null,
  withCount: null,
  version: Date.now(),
};

const invalidateMainCategoryCache = () => {
  mainCategoryCache.all = null;
  mainCategoryCache.withCount = null;
  mainCategoryCache.version = Date.now();
};

const cacheControl = (maxAge) => (_req, res, next) => {
  res.set("Cache-Control", `public, max-age=${maxAge}`);
  res.set("ETag", `"${mainCategoryCache.version}"`);
  next();
};

// Get all main categories (with pagination support)
router.get(
  "/",
  cacheControl(300),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

      const result = await mainCategoriesController.getMainCategoriesPaginated(pageNum, limitNum);
      return res.json(result);
    }

    if (mainCategoryCache.all) {
      return res.json(mainCategoryCache.all);
    }

    const mainCategories = await mainCategoriesController.getMainCategories();
    if (!mainCategories) throw new AppError("No main categories found", 404);

    mainCategoryCache.all = mainCategories;
    res.json(mainCategories);
  })
);

// Get main categories with category count
router.get(
  "/with-count",
  cacheControl(300),
  asyncHandler(async (req, res) => {
    if (mainCategoryCache.withCount) {
      return res.json(mainCategoryCache.withCount);
    }

    const mainCategories = await mainCategoriesController.getMainCategoriesWithCount();
    if (!mainCategories) throw new AppError("No main categories found", 404);

    mainCategoryCache.withCount = mainCategories;
    res.json(mainCategories);
  })
);

// Get main category by ID
router.get(
  "/:id",
  mainCategoryIdValidation,
  validate,
  asyncHandler(async (req, res) => {
    const mainCategory = await mainCategoriesController.getMainCategoryById(req.params.id);
    if (!mainCategory) throw new AppError("Main category not found", 404);
    res.json(mainCategory);
  })
);

/* ----------------------------- 🔒 PROTECTED ROUTES ---------------------------- */
router.post(
  "/",
  verifyToken,
  sanitizeBody(['description']),
  mainCategoryCreateValidation,
  validate,
  asyncHandler(async (req, res) => {
    const newMainCategory = await mainCategoriesController.createMainCategory(req.body);
    if (!newMainCategory) throw new AppError("Failed to create main category", 400);

    invalidateMainCategoryCache();

    res.status(201).json(newMainCategory);
  })
);

router.put(
  "/:id",
  verifyToken,
  sanitizeBody(['description']),
  mainCategoryUpdateValidation,
  validate,
  asyncHandler(async (req, res) => {
    const updatedMainCategory = await mainCategoriesController.updateMainCategory(req.params.id, req.body);
    if (!updatedMainCategory) throw new AppError("Main category not found", 404);

    invalidateMainCategoryCache();

    res.json(updatedMainCategory);
  })
);

router.delete(
  "/:id",
  verifyToken,
  mainCategoryIdValidation,
  validate,
  asyncHandler(async (req, res) => {
    const deletedMainCategory = await mainCategoriesController.deleteMainCategory(req.params.id);
    if (!deletedMainCategory) throw new AppError("Main category not found or already deleted", 404);

    invalidateMainCategoryCache();

    res.json({
      message: "Main category soft deleted successfully",
      mainCategory: deletedMainCategory,
    });
  })
);

export default router;
