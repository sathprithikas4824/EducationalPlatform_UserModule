

// import { supabase } from '../config/supabaseClient.js';

// // Define expected types for controller-level application checks
// const VALID_CATEGORY_TYPES = ['Standalone', 'Module-based'];

// // ----------------------------------------------------
// // CREATE CATEGORY
// // ----------------------------------------------------
// export const createCategory = async (category) => {
//     // FIX: Trust validated input, no redundant checks
//     const { name, description, type } = category;

//     // Defensive check (only application logic)
//     if (!VALID_CATEGORY_TYPES.includes(type)) {
//         throw new Error(`Invalid category type provided.`);
//     }

//     const { data, error } = await supabase
//         .from('categories')
//         .insert([{ name, description, type }]) 
//         .select();

//     if (error) throw new Error(error.message);
//     return data[0];
// };

// // ----------------------------------------------------
// // GET ALL CATEGORIES
// // ----------------------------------------------------
// export const getCategories = async () => {
//     const { data, error } = await supabase
//         .from('categories')
//         .select('*')
//         //  FIX: Filter out soft-deleted categories (resolves 500 error)
//         .is('deleted_at', null) 
//         .order('created_at', { ascending: true });

//     if (error) throw new Error(error.message);
//     return data;
// };

// // ----------------------------------------------------
// // GET CATEGORIES BY TYPE
// // ----------------------------------------------------
// export const getCategoriesByType = async () => {
//  // FIX: Use Promise.all to fetch both lists concurrently and apply
//  // filters directly in the database query (Supabase .eq()) for efficiency.

//  const fetchCategories = async (type) => {
//   const { data, error } = await supabase
//    .from('categories')
//    .select('category_id, name, description, type, created_at')
//    .eq('type', type) // <-- DB-side filtering
//    .is('deleted_at', null)
//    .order('created_at', { ascending: true });

//   if (error) throw new Error(error.message);
//   return data;
//  };

//  try {
//   const [standaloneData, moduleBasedData] = await Promise.all([
//    fetchCategories('Standalone'),
//    fetchCategories('Module-based')
//   ]);

//   return {
//    Standalone: standaloneData,
//    'Module-based': moduleBasedData
//   };
//  } catch (error) {
//   throw error; // Re-throw any errors from fetchCategories
//  }
// };

// // ----------------------------------------------------
// // UPDATE CATEGORY
// // ----------------------------------------------------
// export const updateCategory = async (categoryId, updates) => {
//     // Input is TRUSTED to be validated and sanitized by the route middleware.
//     if (!categoryId) { 
//         throw new Error('Category ID is required for update.');
//     }

//     const sanitizedUpdates = { updated_at: new Date() };

//     // Copy valid fields from the request body (which is already sanitized)
//     if (updates.name) {
//         sanitizedUpdates.name = updates.name;
//     }
//     if (updates.description) {
//         sanitizedUpdates.description = updates.description;
//     }
//     if (updates.type) {
//         if (!VALID_CATEGORY_TYPES.includes(updates.type)) {
//             throw new Error(`Invalid category type.`);
//         }
//         sanitizedUpdates.type = updates.type;
//     }
    
//     if (Object.keys(sanitizedUpdates).length <= 1) {
//         throw new Error('No valid update fields provided.');
//     }

//     const { data, error } = await supabase
//         .from('categories')
//         .update(sanitizedUpdates)
//         .eq('category_id', categoryId)
//         .select();

//     if (error) throw new Error(error.message);
//     return data[0];
// };

// // ----------------------------------------------------
// // DELETE CATEGORY (Soft Delete)
// // ----------------------------------------------------
// export const deleteCategory = async (categoryId) => {
//     if (!categoryId) { 
//         throw new Error('Category ID is required for deletion.');
//     }
    
//     const { data, error } = await supabase
//         .from('categories')
//         .update({ deleted_at: new Date() })
//         .eq('category_id', categoryId)
//         .select();

//     if (error) throw new Error(error.message);
//     return data[0];
// };
import { supabase } from '../config/supabaseClient.js';
// IMPORT LOGGER: Assume logger is defined and imported
import logger from '../config/logger.js';

// Define expected types for controller-level application checks
const VALID_CATEGORY_TYPES = ['Standalone', 'Module-based'];
const VALID_STATUS_TYPES = ['active', 'inactive', 'draft'];

// ----------------------------------------------------
// CREATE CATEGORY
// ----------------------------------------------------
export const createCategory = async (category) => {
const { name, description, type, status = 'draft', main_category_id, image_url } = category;

if (!VALID_CATEGORY_TYPES.includes(type)) {
throw new Error(`Invalid category type provided.`);
}

if (!VALID_STATUS_TYPES.includes(status)) {
throw new Error(`Invalid status provided. Must be: ${VALID_STATUS_TYPES.join(', ')}`);
}

const insertData = { name, description, type, status };
if (main_category_id) {
  insertData.main_category_id = main_category_id;
}
if (image_url) {
  insertData.image_url = image_url;
}

const { data, error } = await supabase
.from('categories')
.insert([insertData])
.select();

if (error) {
  logger.error(`Error creating category: ${error.message}`, { category: name });
  throw new Error(error.message);
 }
return data[0];
};

// ----------------------------------------------------
// GET ALL CATEGORIES
// ----------------------------------------------------
export const getCategories = async () => {
const { data, error } = await supabase
.from('categories')
.select('*')
.is('deleted_at', null)
.order('created_at', { ascending: true });

if (error) {
  logger.error(`Error fetching all categories: ${error.message}`);
  throw new Error(error.message);
 }
return data;
};

// ----------------------------------------------------
// GET CATEGORIES WITH PAGINATION
// ----------------------------------------------------
export const getCategoriesPaginated = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (countError) {
    logger.error(`Error counting categories: ${countError.message}`);
    throw new Error(countError.message);
  }

  // Get paginated data
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error(`Error fetching paginated categories: ${error.message}`);
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
//  NEW: GET CATEGORY BY ID
// ----------------------------------------------------
export const getCategoryById = async (categoryId) => {
 if (!categoryId) {
  throw new Error('Category ID is required.');
 }
 
 const { data, error } = await supabase
  .from('categories')
  .select('*')
  .eq('category_id', categoryId)
  .is('deleted_at', null)
  .single(); // Ensure only one row is returned

 if (error) {
  // Suppress 'No rows found' error, treat as not found
  if (error.code === 'PGRST116') {
   return null; // Return null if not found
  }
  logger.error(`Error fetching category ID ${categoryId}: ${error.message}`);
  throw new Error(error.message);
 }
 return data;
};

// ----------------------------------------------------
// GET CATEGORIES BY TYPE (Optimized Single-Query)
// ----------------------------------------------------
export const getCategoriesByType = async () => {
    // ✅ 1. SINGLE DATABASE QUERY: Use .in() to fetch both types at once (one trip).
    const { data, error } = await supabase
       .from('categories')
       .select('*')
       .in('type', VALID_CATEGORY_TYPES) // Fetch all valid types in one go
       .is('deleted_at', null)
       .order('created_at', { ascending: true }); // Keep ordering

    if (error) {
        logger.error(`Error fetching categories by type: ${error.message}`);
        throw new Error(error.message);
    }

    // ✅ 2. EFFICIENT IN-MEMORY GROUPING (REDUCE):
    const groupedData = data.reduce((acc, category) => {
        const type = category.type;
        // Initialize the array if the type hasn't been seen yet
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(category);
        return acc;
    }, {});

    // Ensure both required keys exist in the final output, even if empty
    return {
        Standalone: groupedData.Standalone || [],
        'Module-based': groupedData['Module-based'] || [],
    };
};

// ----------------------------------------------------
// UPDATE CATEGORY
// ----------------------------------------------------
export const updateCategory = async (categoryId, updates) => {
if (!categoryId) {
throw new Error('Category ID is required for update.');
}

const sanitizedUpdates = { updated_at: new Date() };

if (updates.name) {
sanitizedUpdates.name = updates.name;
}
if (updates.description !== undefined) {
sanitizedUpdates.description = updates.description;
}
if (updates.type) {
if (!VALID_CATEGORY_TYPES.includes(updates.type)) {
throw new Error(`Invalid category type.`);
}
sanitizedUpdates.type = updates.type;
}
if (updates.status) {
if (!VALID_STATUS_TYPES.includes(updates.status)) {
throw new Error(`Invalid status. Must be: ${VALID_STATUS_TYPES.join(', ')}`);
}
sanitizedUpdates.status = updates.status;
}
if (updates.main_category_id !== undefined) {
sanitizedUpdates.main_category_id = updates.main_category_id;
}
if (updates.image_url !== undefined) {
sanitizedUpdates.image_url = updates.image_url;
}

if (Object.keys(sanitizedUpdates).length <= 1) {
throw new Error('No valid update fields provided.');
}

const { data, error } = await supabase
.from('categories')
.update(sanitizedUpdates)
.eq('category_id', categoryId)
.select();

if (error) {
  logger.error(`Error updating category ID ${categoryId}: ${error.message}`);
  throw new Error(error.message);
 }
 if (!data || data.length === 0) {
  throw new Error('Category not found or no changes made.');
 }
return data[0];
};

// ----------------------------------------------------
// DELETE CATEGORY (Soft Delete)
// ----------------------------------------------------
export const deleteCategory = async (categoryId) => {
if (!categoryId) { 
throw new Error('Category ID is required for deletion.');
}

const { data, error } = await supabase
.from('categories')
.update({ deleted_at: new Date() })
.eq('category_id', categoryId)
.is('deleted_at', null) // Only soft-delete non-deleted items
.select();

if (error) {
  logger.error(`Error soft-deleting category ID ${categoryId}: ${error.message}`);
  throw new Error(error.message);
 }
 // Check if a row was actually deleted
 if (!data || data.length === 0) {
  throw new Error('Category not found or already deleted.');
 }
return data[0];
};