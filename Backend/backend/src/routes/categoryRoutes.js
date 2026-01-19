


// import express from "express";
// import { body, param } from "express-validator";
// import { verifyToken } from "../middleware/authMiddleware.js";
// import * as categoriesController from "../controllers/categoriesController.js";
// import { validate } from "../middleware/validationMiddleware.js";

// const router = express.Router();

// // Allowed category types
// const ALLOWED_TYPES = ["Standalone", "Module-based"];

// /* ------------------------- 🧩 VALIDATION SCHEMAS ------------------------- */
// const categoryCreateValidation = [
//  body("name")
//  .trim()
//  .isLength({ min: 3, max: 100 })
//  .withMessage("Category name must be between 3 and 100 characters.")
//  .escape(),

//  body("description")
//  .trim()
//  .isLength({ min: 1, max: 500 })
//  .withMessage(
//   "Category description is required and must be within 500 characters."
//  )
//  .escape(),

//  body("type")
//  .isIn(ALLOWED_TYPES)
//  .withMessage(`Type must be one of: ${ALLOWED_TYPES.join(", ")}.`),
// ];

// const categoryUpdateValidation = [
//  param("id")
//  .isInt({ min: 1 })
//  .withMessage("Invalid Category ID format. Must be a positive integer."),

//  body("name")
//  .optional()
//  .trim()
//  .isLength({ min: 3, max: 100 })
//  .withMessage("Category name must be between 3 and 100 characters.")
//  .escape(),

//  body("description")
//  .optional()
//  .trim()
//  .isLength({ max: 500 })
//  .withMessage("Category description cannot exceed 500 characters.")
//  .escape(),

//  body("type")
//  .optional()
//  .isIn(ALLOWED_TYPES)
//  .withMessage(`Type must be one of: ${ALLOWED_TYPES.join(", ")}.`),
// ];

// const categoryIdValidation = [
//  param("id")
//  .isInt({ min: 1 })
//  .withMessage("Invalid Category ID format. Must be a positive integer."),
// ];

// /* ----------------------------- 🟢 PUBLIC ROUTES ---------------------------- */
// // Middleware to apply caching headers
// const cacheControl = (maxAge) => (req, res, next) => {
//  // Cache for 5 minutes (300 seconds) for public consumption.
//  // If the data is user-specific, use 'private'.
//  res.set('Cache-Control', `public, max-age=${maxAge}`);
//  next();
// };

// router.get("/", cacheControl(300), async (req, res) => { // <-- Cache applied
//  try {
//  const categories = await categoriesController.getCategories();
//  res.json(categories);
//  } catch (err) {
//  res.status(500).json({ error: err.message });
//  }
// });

// router.get("/by-type", cacheControl(300), async (req, res) => { // <-- Cache applied
//  try {
//  const categories = await categoriesController.getCategoriesByType();
//  res.json(categories);
//  } catch (err) {
//  res.status(500).json({ error: err.message });
//  }
// });

// /* ----------------------------- 🔒 PROTECTED ROUTES ---------------------------- */
// // Token-based access
// router.post(
//  "/",
//  verifyToken,
//  categoryCreateValidation,
//  validate,
//  async (req, res) => {
//  try {
//   const newCategory = await categoriesController.createCategory(req.body);
//   res.status(201).json(newCategory);
//  } catch (err) {
//   res.status(400).json({ error: err.message });
//  }
//  }
// );

// router.put(
//  "/:id",
//  verifyToken,
//  categoryUpdateValidation,
//  validate,
//  async (req, res) => {
//  try {
//   const updatedCategory = await categoriesController.updateCategory(
//   req.params.id,
//   req.body
//   );
//   res.json(updatedCategory);
//  } catch (err) {
//   res.status(400).json({ error: err.message });
//  }
//  }
// );

// router.delete(
//  "/:id",
//  verifyToken,
//  categoryIdValidation,
//  validate,
//  async (req, res) => {
//  try {
//   const deletedCategory = await categoriesController.deleteCategory(
//   req.params.id
//   );
//   res.json({
//   message: "Category soft deleted successfully",
//   category: deletedCategory,
//   });
//  } catch (err) {
//   res.status(400).json({ error: err.message });
//  }
//  }
// );

// export default router;


import express from "express";
import { body, param } from "express-validator";
import { verifyToken } from "../middleware/authMiddleware.js";
import * as categoriesController from "../controllers/categoriesController.js";
import { validate } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { sanitizeBody } from "../middleware/sanitizeInput.js";

const router = express.Router();

// Allowed category types
const ALLOWED_TYPES = ["Standalone", "Module-based"];

/* ------------------------- 🧩 VALIDATION SCHEMAS ------------------------- */
const categoryCreateValidation = [
  body("name")
    .trim()
    .stripLow()
    .isLength({ min: 3, max: 50 })
    .withMessage("Category name must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z0-9\s.,\-_@$:;]+$/)
    .withMessage("Category name can only contain letters, numbers, spaces, and special characters: . , - _ @ $ : ;")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("description")
    .trim()
    .stripLow()
    .isLength({ min: 1, max: 500 })
    .withMessage("Category description is required and must be within 500 characters.")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("type")
    .trim()
    .isIn(ALLOWED_TYPES)
    .withMessage(`Type must be one of: ${ALLOWED_TYPES.join(", ")}.`)
    .escape(),

  body("status")
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage("Status must be one of: active, inactive, draft"),

  body("image_url")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === '' || typeof value === 'string') {
        return true;
      }
      throw new Error('Image URL must be a string or null');
    }),

  body("main_category_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Main category ID must be a positive integer"),
];

const categoryUpdateValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid Category ID format. Must be a positive integer."),

  body("name")
    .optional()
    .trim()
    .stripLow()
    .isLength({ min: 3, max: 50 })
    .withMessage("Category name must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z0-9\s.,\-_@$:;]+$/)
    .withMessage("Category name can only contain letters, numbers, spaces, and special characters: . , - _ @ $ : ;")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("description")
    .optional()
    .trim()
    .stripLow()
    .isLength({ max: 500 })
    .withMessage("Category description cannot exceed 500 characters.")
    .escape()
    .customSanitizer(value => value.replace(/\s+/g, ' ')),

  body("type")
    .optional()
    .trim()
    .isIn(ALLOWED_TYPES)
    .withMessage(`Type must be one of: ${ALLOWED_TYPES.join(", ")}.`)
    .escape(),

  body("status")
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage("Status must be one of: active, inactive, draft"),

  body("image_url")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === '' || typeof value === 'string') {
        return true;
      }
      throw new Error('Image URL must be a string or null');
    }),

  body("main_category_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Main category ID must be a positive integer"),
];

const categoryIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid Category ID format. Must be a positive integer."),
];

/* ----------------------------- 🟢 PUBLIC ROUTES ---------------------------- */
// ✅ In-memory cache with versioning for cache invalidation
let categoryCache = {
  all: null,
  byType: null,
  version: Date.now(), // Cache version - incremented on any modification
};

// Helper function to invalidate cache (call this on create/update/delete)
const invalidateCategoryCache = () => {
  categoryCache.all = null;
  categoryCache.byType = null;
  categoryCache.version = Date.now();
};

// Middleware to apply caching headers with ETag support
const cacheControl = (maxAge) => (_req, res, next) => {
  res.set("Cache-Control", `public, max-age=${maxAge}`);
  res.set("ETag", `"${categoryCache.version}"`); // Version-based ETag for validation
  next();
};

// ✅ Get all categories (with pagination support)
router.get(
  "/",
  cacheControl(300),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;

    // If pagination params provided, skip cache and fetch paginated data
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

      const result = await categoriesController.getCategoriesPaginated(pageNum, limitNum);
      return res.json(result);
    }

    // Return cached data if available (for non-paginated requests)
    if (categoryCache.all) {
      return res.json(categoryCache.all);
    }

    // Fetch from database and cache
    const categories = await categoriesController.getCategories();
    if (!categories) throw new AppError("No categories found", 404);

    categoryCache.all = categories; // Store in cache
    res.json(categories);
  })
);

// ✅ Get categories by type (cached with in-memory storage + invalidation)
router.get(
  "/by-type",
  cacheControl(300),
  asyncHandler(async (req, res) => {
    // Return cached data if available
    if (categoryCache.byType) {
      return res.json(categoryCache.byType);
    }

    // Fetch from database and cache
    const categories = await categoriesController.getCategoriesByType();
    if (!categories) throw new AppError("No categories found for this type", 404);

    categoryCache.byType = categories; // Store in cache
    res.json(categories);
  })
);

/* ----------------------------- 🔒 PROTECTED ROUTES ---------------------------- */
router.post(
  "/",
  verifyToken,
  sanitizeBody(['description']), // ✅ Sanitize HTML in description
  categoryCreateValidation,
  validate,
  asyncHandler(async (req, res) => {
    const newCategory = await categoriesController.createCategory(req.body);
    if (!newCategory) throw new AppError("Failed to create category", 400);

    // ✅ Invalidate cache after creating a category
    invalidateCategoryCache();

    res.status(201).json(newCategory);
  })
);

router.put(
  "/:id",
  verifyToken,
  sanitizeBody(['description']), // ✅ Sanitize HTML in description
  categoryUpdateValidation,
  validate,
  asyncHandler(async (req, res) => {
    const updatedCategory = await categoriesController.updateCategory(req.params.id, req.body);
    if (!updatedCategory) throw new AppError("Category not found", 404);

    // ✅ Invalidate cache after updating a category
    invalidateCategoryCache();

    res.json(updatedCategory);
  })
);

router.delete(
  "/:id",
  verifyToken,
  categoryIdValidation,
  validate,
  asyncHandler(async (req, res) => {
    const deletedCategory = await categoriesController.deleteCategory(req.params.id);
    if (!deletedCategory) throw new AppError("Category not found or already deleted", 404);

    // ✅ Invalidate cache after deleting a category
    invalidateCategoryCache();

    res.json({
      message: "Category soft deleted successfully",
      category: deletedCategory,
    });
  })
);

export default router;
