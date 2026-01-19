
// //argon 2


// import { supabase } from '../config/supabaseClient.js';

// import * as argon2 from 'argon2'; 
// import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';

// dotenv.config();

// const SECRET_KEY = process.env.JWT_SECRET;
// // 
// if (!SECRET_KEY) {
// throw new Error("FATAL ERROR: JWT_SECRET is not defined in the .env file.");
// }

// // Register user
// export const registerUser = async (name, email, password, role = 'learner') => {
// // Basic server-side controller validation
// if (!name || !email || !password) {
// throw new Error('All registration fields are required.');
// }
// // ... inside registerUser
// if (error) {
//   logger.error(`Supabase registration error: ${error.message}`, { email }); // Log with context
//   throw new Error(error.message);
// }
// // ...

// //  Hashing now uses Argon2
// const hash = await argon2.hash(password);

// const { data, error } = await supabase
//  .from('users')
//  .insert([{ name, email, password_hash: hash, role }])
//  .select();

// if (error) throw new Error(error.message);
// return data[0];
// };


// export const loginUser = async (email, password) => {
// // Basic validation before DB query
// if (!email || !password) {
// throw new Error('Invalid email or password');
// }

// const { data, error } = await supabase
// .from('users')
// .select('*')
// .eq('email', email)
// .single();

// if (error || !data) throw new Error('Invalid email or password');

// // ✅ Verification now uses Argon2
// const valid = await argon2.verify(data.password_hash || '', password);
// if (!valid) throw new Error('Invalid email or password');

// // \ Removed the admin-only authorization check. 
// // All authenticated users can now log in and receive a token.
// /*
// if (data.role !== 'admin') {
// const authError = new Error('Access denied. Only administrators can use this panel.');
// authError.status = 403;
// throw authError;
// }
// */

// const token = jwt.sign(
// { user_id: data.user_id, role: data.role, email: data.email, name: data.name },
// SECRET_KEY,
// { expiresIn: '2h' }
// );

// return { token, role: data.role, name: data.name, user_id: data.user_id };
// };

// // Middleware to verify token and role (Correct - only used for admin-restricted routes)
// export const verifyAdmin = (req, res, next) => {
// const authHeader = req.headers.authorization;
// if (!authHeader) return res.status(401).json({ error: 'No token provided' });

// const token = authHeader.split(' ')[1];
// try {
// const decoded = jwt.verify(token, SECRET_KEY);
// if (decoded.role !== 'admin')
// return res.status(403).json({ error: 'Access denied: Admins only' });

// req.user = decoded;
// next();
// } catch (err) {
// res.status(401).json({ error: 'Invalid or expired token' });
// }
// };



//argon 2

import logger from '../config/logger.js';
import { supabase } from '../config/supabaseClient.js';

import * as argon2 from 'argon2'; 
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;
// 
if (!SECRET_KEY) {
throw new Error("FATAL ERROR: JWT_SECRET is not defined in the .env file.");
}

// Register user
export const registerUser = async (name, email, password, role = 'learner') => {
// Basic server-side controller validation
if (!name || !email || !password) {
throw new Error('All registration fields are required.');
}


//  Hashing now uses Argon2
const hash = await argon2.hash(password);

const { data, error } = await supabase
 .from('users')
 .insert([{ name, email, password_hash: hash, role }])
 .select();

if (error) {
  logger.error(`Supabase registration error: ${error.message}`, { email });
  throw new Error(error.message);
}

return data[0];
};


export const loginUser = async (email, password) => {
// Basic validation before DB query
if (!email || !password) {
throw new Error('Invalid email or password');
}

const { data, error } = await supabase
.from('users')
.select('*')
.eq('email', email)
.single();

if (error || !data) throw new Error('Invalid email or password');

// ✅ Verification now uses Argon2
const valid = await argon2.verify(data.password_hash || '', password);
if (!valid) throw new Error('Invalid email or password');

// \ Removed the admin-only authorization check. 
// All authenticated users can now log in and receive a token.
/*
if (data.role !== 'admin') {
const authError = new Error('Access denied. Only administrators can use this panel.');
authError.status = 403;
throw authError;
}
*/

const token = jwt.sign(
{ user_id: data.user_id, role: data.role, email: data.email, name: data.name },
SECRET_KEY,
{ expiresIn: '2h' }
);

return { token, role: data.role, name: data.name, user_id: data.user_id };
};

// Middleware to verify token and role (Correct - only used for admin-restricted routes)
export const verifyAdmin = (req, res, next) => {
const authHeader = req.headers.authorization;
if (!authHeader) return res.status(401).json({ error: 'No token provided' });

const token = authHeader.split(' ')[1];
try {
const decoded = jwt.verify(token, SECRET_KEY);
if (decoded.role !== 'admin')
return res.status(403).json({ error: 'Access denied: Admins only' });

req.user = decoded;
next();
} catch (err) {
res.status(401).json({ error: 'Invalid or expired token' });
}
};

