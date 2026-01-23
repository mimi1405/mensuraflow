/*
  # Add line_type column to measurements table

  ## Changes Made
  - Adds `line_type` column to measurements table
    - Type: text (nullable)
    - Allowed values: 'kantenschutz', 'dachrandabschluss', 'perimeterdämmung'
    - Only applies to measurements where object_type = 'line'
  
  ## Notes
  - Uses IF NOT EXISTS pattern to safely add column
  - Includes CHECK constraint to ensure data integrity
  - Existing line measurements will have NULL line_type initially
*/

-- Add line_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'line_type'
  ) THEN
    ALTER TABLE measurements 
    ADD COLUMN line_type text;
    
    -- Add check constraint for valid line types
    ALTER TABLE measurements
    ADD CONSTRAINT valid_line_type 
    CHECK (line_type IS NULL OR line_type IN ('kantenschutz', 'dachrandabschluss', 'perimeterdämmung'));
  END IF;
END $$;