import { supabase } from '../config/supabaseClient.js';
import logger from '../config/logger.js';

const VALID_STATUS_TYPES = ['active', 'inactive', 'draft'];

// ----------------------------------------------------
// CREATE MAIN CATEGORY
// ----------------------------------------------------
export const createMainCategory = async (mainCategory) => {
  const { name, description, status = 'draft', image_url } = mainCategory;

  if (!VALID_STATUS_TYPES.includes(status)) {
    throw new Error(`Invalid status provided. Must be: ${VALID_STATUS_TYPES.join(', ')}`);
  }

  const insertData = { name, description, status };
  if (image_url) {
    insertData.image_url = image_url;
  }

  const { data, error } = await supabase
    .from('main_categories')
    .insert([insertData])
    .select();

  if (error) {
    logger.error(`Error creating main category: ${error.message}`, { mainCategory: name });
    throw new Error(error.message);
  }
  return data[0];
};

// ----------------------------------------------------
// GET ALL MAIN CATEGORIES
// ----------------------------------------------------
export const getMainCategories = async () => {
  const { data, error } = await supabase
    .from('main_categories')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error(`Error fetching all main categories: ${error.message}`);
    throw new Error(error.message);
  }
  return data;
};

// ----------------------------------------------------
// GET MAIN CATEGORIES WITH PAGINATION
// ----------------------------------------------------
export const getMainCategoriesPaginated = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await supabase
    .from('main_categories')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (countError) {
    logger.error(`Error counting main categories: ${countError.message}`);
    throw new Error(countError.message);
  }

  // Get paginated data
  const { data, error } = await supabase
    .from('main_categories')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error(`Error fetching paginated main categories: ${error.message}`);
    throw new Error(error.message);
  }

  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };
};

// ----------------------------------------------------
// GET MAIN CATEGORY BY ID
// ----------------------------------------------------
export const getMainCategoryById = async (mainCategoryId) => {
  if (!mainCategoryId) {
    throw new Error('Main Category ID is required.');
  }

  const { data, error } = await supabase
    .from('main_categories')
    .select('*')
    .eq('main_category_id', mainCategoryId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error(`Error fetching main category ID ${mainCategoryId}: ${error.message}`);
    throw new Error(error.message);
  }
  return data;
};

// ----------------------------------------------------
// GET MAIN CATEGORY WITH CATEGORIES COUNT
// ----------------------------------------------------
export const getMainCategoriesWithCount = async () => {
  const { data, error } = await supabase
    .from('main_categories')
    .select(`
      *,
      categories!main_category_id(count)
    `)
    .is('deleted_at', null)
    .is('categories.deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error(`Error fetching main categories with count: ${error.message}`);
    throw new Error(error.message);
  }
  return data;
};

// ----------------------------------------------------
// UPDATE MAIN CATEGORY
// ----------------------------------------------------
export const updateMainCategory = async (mainCategoryId, updates) => {
  if (!mainCategoryId) {
    throw new Error('Main Category ID is required for update.');
  }

  const sanitizedUpdates = { updated_at: new Date() };

  if (updates.name) {
    sanitizedUpdates.name = updates.name;
  }
  if (updates.description !== undefined) {
    sanitizedUpdates.description = updates.description;
  }
  if (updates.status) {
    if (!VALID_STATUS_TYPES.includes(updates.status)) {
      throw new Error(`Invalid status. Must be: ${VALID_STATUS_TYPES.join(', ')}`);
    }
    sanitizedUpdates.status = updates.status;
  }
  if (updates.image_url !== undefined) {
    sanitizedUpdates.image_url = updates.image_url;
  }

  if (Object.keys(sanitizedUpdates).length <= 1) {
    throw new Error('No valid update fields provided.');
  }

  const { data, error } = await supabase
    .from('main_categories')
    .update(sanitizedUpdates)
    .eq('main_category_id', mainCategoryId)
    .select();

  if (error) {
    logger.error(`Error updating main category ID ${mainCategoryId}: ${error.message}`);
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Main Category not found or no changes made.');
  }
  return data[0];
};

// ----------------------------------------------------
// DELETE MAIN CATEGORY (Soft Delete)
// ----------------------------------------------------
export const deleteMainCategory = async (mainCategoryId) => {
  if (!mainCategoryId) {
    throw new Error('Main Category ID is required for deletion.');
  }

  const { data, error } = await supabase
    .from('main_categories')
    .update({ deleted_at: new Date() })
    .eq('main_category_id', mainCategoryId)
    .is('deleted_at', null)
    .select();

  if (error) {
    logger.error(`Error soft-deleting main category ID ${mainCategoryId}: ${error.message}`);
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Main Category not found or already deleted.');
  }
  return data[0];
};
