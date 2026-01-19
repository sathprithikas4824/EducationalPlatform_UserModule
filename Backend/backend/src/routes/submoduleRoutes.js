import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sanitizeBody } from "../middleware/sanitizeInput.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("submodules").select("*").is("deleted_at", null);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// New route: Get submodules by category (with pagination)
router.get("/category/:categoryId", async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate pagination params
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("type")
      .eq("category_id", categoryId)
      .is("deleted_at", null)
      .single();

    if (categoryError || !category) {
      return res.status(404).json({
        error: "Category not found"
      });
    }

    // Check if category type is Module-based
    if (category.type === "Standalone") {
      return res.status(400).json({
        error: "Standalone categories use modules, not submodules"
      });
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from("submodules")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId)
      .is("deleted_at", null);

    if (countError) throw countError;

    // Get paginated data
    const { data, error } = await supabase
      .from("submodules")
      .select("*")
      .eq("category_id", categoryId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", verifyToken, sanitizeBody(['description']), async (req, res, next) => {
  try {
    const { category_id, name, description } = req.body;

    // Input validation
    if (!category_id || !name || !name.trim()) {
      return res.status(400).json({
        error: "category_id and name are required",
        details: {
          category_id: !category_id ? "category_id is required" : null,
          name: !name || !name.trim() ? "name is required and cannot be empty" : null
        }
      });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({
        error: "Name must be at least 2 characters long"
      });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({
        error: "Name must not exceed 255 characters"
      });
    }

    // Verify category exists and is Module-based
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("type")
      .eq("category_id", category_id)
      .is("deleted_at", null)
      .single();

    if (categoryError || !category) {
      return res.status(404).json({
        error: "Category not found"
      });
    }

    if (category.type === "Standalone") {
      return res.status(400).json({
        error: "Cannot add submodules to Standalone categories. Use modules instead."
      });
    }

    const { data, error } = await supabase
      .from("submodules")
      .insert([{ category_id, name: name.trim(), description: description?.trim() || null }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", verifyToken, sanitizeBody(['description']), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;

    // Input validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "name is required and cannot be empty"
      });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({
        error: "Name must be at least 2 characters long"
      });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({
        error: "Name must not exceed 255 characters"
      });
    }

    // Verify submodule exists
    const { data: existing, error: existingError } = await supabase
      .from("submodules")
      .select("submodule_id")
      .eq("submodule_id", id)
      .is("deleted_at", null)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: "Submodule not found"
      });
    }

    const { data, error } = await supabase
      .from("submodules")
      .update({ name: name.trim(), description: description?.trim() || null, updated_at: new Date() })
      .eq("submodule_id", id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify submodule exists
    const { data: existing, error: existingError } = await supabase
      .from("submodules")
      .select("submodule_id")
      .eq("submodule_id", id)
      .is("deleted_at", null)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: "Submodule not found or already deleted"
      });
    }

    const { error } = await supabase
      .from("submodules")
      .update({ deleted_at: new Date() })
      .eq("submodule_id", id);
    if (error) throw error;
    res.json({ message: "Submodule deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
