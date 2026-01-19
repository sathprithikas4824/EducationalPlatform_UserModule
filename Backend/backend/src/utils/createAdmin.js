// import dotenv from 'dotenv';
// import { registerUser } from '../controllers/authController.js'; 

// dotenv.config();

// /**
//  * Validates a password against strong security requirements.
//  * This mirrors the logic typically handled by express-validator middleware 
//  * for the security of the admin creation utility.
//  * * Requirements:
//  * - Minimum 10 characters
//  * - At least one uppercase letter (A-Z)
//  * - At least one lowercase letter (a-z)
//  * - At least one number (0-9)
//  * - At least one special character (e.g., !@#$%^&*)
//  */
// const validateStrongPassword = (password) => {
//  const minLength = 10;
//  const hasUpperCase = /[A-Z]/.test(password);
//  const hasLowerCase = /[a-z]/.test(password);
//  const hasNumber = /[0-9]/.test(password);
//  // Common special characters
//  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

//  if (password.length < minLength) {
//  return `Password must be at least ${minLength} characters long.`;
//  }
//  if (!hasUpperCase) {
//  return "Password must contain at least one uppercase letter.";
//  }
//  if (!hasLowerCase) {
//  return "Password must contain at least one lowercase letter.";
//  }
//  if (!hasNumber) {
//  return "Password must contain at least one number.";
//  }
//  if (!hasSpecialChar) {
//  return "Password must contain at least one special character.";
//  }

//  return null; // Password is valid
// };


// const createAdmin = async () => {
//  // --- Define Admin Credentials Here ---
//  const name = 'Security Admin';
//  const email = 'riya@gmail.com'; 
//  const password = 'Test@123456'; // Must meet the strong password requirements
//  const role = 'admin';

//  // 1. Check Password Validation
//  const validationError = validateStrongPassword(password);
//  if (validationError) {
//  console.error(`❌ Error creating admin: Password validation failed: ${validationError}`);
//  process.exit(1);
//  }
 
//  try {
//  // 2. Register User (This handles hashing and DB insertion)
//  const admin = await registerUser(
//  name,
//  email,
//  password,
//  role
//  );
//  console.log('✅ Admin created successfully:', admin);
//  process.exit(0);
//  } catch (err) {
//  console.error('❌ Error creating admin:', err.message);
//  process.exit(1);
//  }
// };

// createAdmin();

import dotenv from 'dotenv';
import { registerUser } from '../controllers/authController.js'; 

dotenv.config();

/**
 * Validates a password against strong security requirements.
 * This mirrors the logic typically handled by express-validator middleware 
 * for the security of the admin creation utility.
 * * Requirements:
 * - Minimum 10 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (e.g., !@#$%^&*)
 */
const validateStrongPassword = (password) => {
 const minLength = 10;
 const hasUpperCase = /[A-Z]/.test(password);
 const hasLowerCase = /[a-z]/.test(password);
 const hasNumber = /[0-9]/.test(password);
 // Common special characters
 const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

 if (password.length < minLength) {
 return `Password must be at least ${minLength} characters long.`;
 }
 if (!hasUpperCase) {
 return "Password must contain at least one uppercase letter.";
 }
 if (!hasLowerCase) {
 return "Password must contain at least one lowercase letter.";
 }
 if (!hasNumber) {
 return "Password must contain at least one number.";
 }
 if (!hasSpecialChar) {
 return "Password must contain at least one special character.";
 }

 return null; // Password is valid
};


const createAdmin = async () => {
 // --- Define Admin Credentials Here ---
 const name = 'Security Admin';
 const email = 'shahs@gmail.com'; 
 const password = 'Test@123456'; // Must meet the strong password requirements
 const role = 'admin';

 // 1. Check Password Validation
 const validationError = validateStrongPassword(password);
 if (validationError) {
 console.error(`❌ Error creating admin: Password validation failed: ${validationError}`);
 process.exit(1);
 }
 
 try {
 // 2. Register User (This handles hashing and DB insertion)
 const admin = await registerUser(
 name,
 email,
 password,
 role
 );
 console.log('✅ Admin created successfully:', admin);
 process.exit(0);
 } catch (err) {
 console.error('❌ Error creating admin:', err.message);
 process.exit(1);
 }
};

createAdmin();