-- Migration: Add Module level for Standalone categories
-- Purpose: Allow standalone categories (like "Java") to have modules (like "DSA", "OOPS")
-- New Structure:
--   - Standalone Categories -> Modules -> Topics
--   - Module-based Categories -> Submodules -> Topics (unchanged)

-- Step 1: Create modules table for standalone categories
CREATE TABLE IF NOT EXISTS public.modules (
    module_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT modules_category_id_fkey
        FOREIGN KEY (category_id)
        REFERENCES public.categories(category_id)
        ON DELETE CASCADE
);

-- Step 2: Add module_id column to topics table (for standalone category topics)
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS module_id INT;

-- Step 3: Add foreign key constraint from topics to modules
ALTER TABLE public.topics
ADD CONSTRAINT topics_module_id_fkey
FOREIGN KEY (module_id) REFERENCES public.modules(module_id) ON DELETE CASCADE;

-- Step 4: Make submodule_id nullable (since standalone topics will use module_id instead)
ALTER TABLE public.topics ALTER COLUMN submodule_id DROP NOT NULL;

-- Step 5: Add check constraint to ensure either module_id or submodule_id is set (not both)
ALTER TABLE public.topics
ADD CONSTRAINT topics_parent_check
CHECK (
    (module_id IS NOT NULL AND submodule_id IS NULL) OR
    (module_id IS NULL AND submodule_id IS NOT NULL)
);

-- Step 6: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_modules_category_id ON public.modules(category_id);
CREATE INDEX IF NOT EXISTS idx_topics_module_id ON public.topics(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_deleted_at ON public.modules(deleted_at);

-- Step 7: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER modules_updated_at_trigger
BEFORE UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION update_modules_updated_at();

-- Note:
-- - For Standalone categories: Category -> Modules -> Topics
-- - For Module-based categories: Category -> Submodules -> Topics (existing structure)
-- - Topics now belong to either a module (standalone) or submodule (module-based)
