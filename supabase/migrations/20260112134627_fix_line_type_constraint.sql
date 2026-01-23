/*
  # Fix line_type constraint to include perimeterdämmung

  1. Changes
    - Drop the old incomplete constraint 'measurements_line_type_check'
    - Add new constraint that includes all three line types: kantenschutz, dachrandabschluss, perimeterdämmung
  
  2. Notes
    - This fixes the issue where perimeterdämmung measurements were being rejected
*/

-- Drop the old constraint that's missing perimeterdämmung
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'measurements_line_type_check'
  ) THEN
    ALTER TABLE measurements DROP CONSTRAINT measurements_line_type_check;
  END IF;
END $$;

-- Add the correct constraint with all three line types
ALTER TABLE measurements
ADD CONSTRAINT measurements_line_type_check
CHECK (line_type IS NULL OR line_type IN ('kantenschutz', 'dachrandabschluss', 'perimeterdämmung'));