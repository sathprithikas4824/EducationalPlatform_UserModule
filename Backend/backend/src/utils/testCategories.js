



import dotenv from 'dotenv';
dotenv.config();

// Assuming the test file is located at src/utils/ and the controllers are in src/controllers/
import {
  createCategory,
  getCategoriesByType,
  updateCategory,
  deleteCategory
} from '../controllers/categoriesController.js'; 
import { loginUser } from '../controllers/authController.js';

const runTests = async () => {
  try {
    console.log('--- Starting Integration Tests ---');

    // 1. Admin Login 
    console.log('\n--- 1. Admin Login ---');
    // NOTE: This user MUST have a valid bcrypt-hashed password in the database.
    const adminEmail = 'shahss@gmail.com'; 
    const adminPassword = 'Test@123456'; 
    
    // Attempt login
    const adminLogin = await loginUser(adminEmail, adminPassword);
    console.log(`✅ Logged in as: ${adminLogin.name} (${adminLogin.role})`);
    console.log(`JWT Token: ${adminLogin.token.substring(0, 15)}...`);

    const userId = adminLogin.user_id;

    // 2. Create a new category
    console.log('\n--- 2. Create Category Test ---');
    const categoryData = { 
        // Using Date.now() ensures a unique name every time, avoiding duplicate key errors
        name: `Test-Standalone-${Date.now()}`, 
        description: 'Testing standalone category for security and functionality.', 
        type: 'Standalone' 
    };
    // Controller signature: createCategory(categoryData)
    const newCat = await createCategory(categoryData);
    console.log('✅ Created Category (ID: ' + newCat.category_id + '):', newCat);

    // 3. Get all categories
    console.log('\n--- 3. Get Categories Test ---');
    // Using getCategoriesByType to fetch all data and check structure
    const categories = await getCategoriesByType();
    console.log(`✅ Fetched Categories. Found ${categories.Standalone.length + categories['Module-based'].length} total active categories.`);

    // 4. Update the created category
    console.log('\n--- 4. Update Category Test ---');
    const updateData = { description: 'Updated description by integration test run.' };
    // Controller signature: updateCategory(categoryId, updates)
    const updatedCat = await updateCategory(
        newCat.category_id,
        updateData
    );
    console.log('✅ Updated Category:', updatedCat);

    // 5. Soft delete the category
    console.log('\n--- 5. Delete Category Test ---');
    // Controller signature: deleteCategory(categoryId)
    const deletedCat = await deleteCategory(newCat.category_id);
    console.log('✅ Soft Deleted Category (deleted_at is set):', deletedCat);

    console.log('\n✅ All tests completed successfully.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
};

runTests();
