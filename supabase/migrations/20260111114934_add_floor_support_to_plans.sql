/*
  # Add Floor Support to Plans

  1. Changes
    - Add `floor_number` column to plans table (defaults to 1)
    - Add `floor_name` column to plans table (optional, e.g., "Ground Floor", "First Floor")
    - Update unique constraint to allow multiple plans of same type on different floors
    
  2. Notes
    - Existing plans will be assigned floor_number = 1
    - This allows projects to have multiple floors with different plans for each
    - Floor 0 can be used for basement, 1 for ground floor, 2 for first floor, etc.
*/

-- Add floor_number column to plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'floor_number'
  ) THEN
    ALTER TABLE plans ADD COLUMN floor_number integer DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- Add floor_name column to plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'floor_name'
  ) THEN
    ALTER TABLE plans ADD COLUMN floor_name text DEFAULT '';
  END IF;
END $$;