
// import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv';
// dotenv.config();

// export const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_KEY
// );


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// We must use the Service Role Key for server-side administrative tasks
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_KEY is missing in .env. Cannot start service.");
}

export const supabase = createClient(
 process.env.SUPABASE_URL,
 supabaseServiceKey // <-- CRITICAL FIX: Now uses the key that bypasses RLS
);



