/*
  # Add Floor Measurement System (Bodenbemessung)

  ## Overview
  This migration adds support for detailed floor measurements with ceiling, room floor, and finish layers.
  It includes a catalog system for finish types (Deckbeläge) and extended measurement tracking.

  ## 1. New Tables
    
  ### `finish_catalog`
  User-level catalog of floor finishes (Deckbeläge) that can be reused across projects.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `name` (text) - Display name of the finish
  - `code` (text, optional) - Optional code/SKU for the finish
  - `color` (text, optional) - Hex color for visualization
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Extended Measurements Table
  
  Adds new columns to support floor categorization:
  - `floor_category` (text) - Type of floor measurement: 'ceiling', 'roomFloor', 'finish'
  - `floor_kind` (text, optional) - For roomFloor only: 'unterlagsboden' or 'ueberzugsboden'
  - `finish_catalog_id` (uuid, optional) - FK to finish_catalog for finish areas
  - `parent_measurement_id` (uuid, optional) - FK to measurements for finish->roomFloor relationship
  - `area_m2` (numeric) - Computed area in square meters
  - `perimeter_m` (numeric) - Computed perimeter in meters
  - `width_m` (numeric, optional) - Width for rectangular areas
  - `length_m` (numeric, optional) - Length for rectangular areas

  ## 3. Security
  - Enable RLS on finish_catalog table
  - Add policies for authenticated users to manage their own catalog items
  - Add policies for measurements to reference finish catalog items

  ## 4. Important Notes
  - Finish catalog items are user-specific and reusable across all projects
  - Room floor measurements must specify floor_kind (unterlagsboden/ueberzugsboden)
  - Finish areas are linked to room floor areas via parent_measurement_id
  - All computed geometric values are stored for efficient querying
*/

-- Create finish_catalog table
CREATE TABLE IF NOT EXISTS finish_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  color text DEFAULT '#94a3b8',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add floor measurement columns to measurements table
DO $$
BEGIN
  -- floor_category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'floor_category'
  ) THEN
    ALTER TABLE measurements ADD COLUMN floor_category text;
  END IF;

  -- floor_kind column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'floor_kind'
  ) THEN
    ALTER TABLE measurements ADD COLUMN floor_kind text;
  END IF;

  -- finish_catalog_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'finish_catalog_id'
  ) THEN
    ALTER TABLE measurements ADD COLUMN finish_catalog_id uuid REFERENCES finish_catalog(id) ON DELETE SET NULL;
  END IF;

  -- parent_measurement_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'parent_measurement_id'
  ) THEN
    ALTER TABLE measurements ADD COLUMN parent_measurement_id uuid REFERENCES measurements(id) ON DELETE CASCADE;
  END IF;

  -- area_m2 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'area_m2'
  ) THEN
    ALTER TABLE measurements ADD COLUMN area_m2 numeric;
  END IF;

  -- perimeter_m column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'perimeter_m'
  ) THEN
    ALTER TABLE measurements ADD COLUMN perimeter_m numeric;
  END IF;

  -- width_m column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'width_m'
  ) THEN
    ALTER TABLE measurements ADD COLUMN width_m numeric;
  END IF;

  -- length_m column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'length_m'
  ) THEN
    ALTER TABLE measurements ADD COLUMN length_m numeric;
  END IF;
END $$;

-- Add constraints for floor_category values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'measurements_floor_category_check'
  ) THEN
    ALTER TABLE measurements
    ADD CONSTRAINT measurements_floor_category_check
    CHECK (floor_category IS NULL OR floor_category IN ('ceiling', 'roomFloor', 'finish'));
  END IF;
END $$;

-- Add constraints for floor_kind values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'measurements_floor_kind_check'
  ) THEN
    ALTER TABLE measurements
    ADD CONSTRAINT measurements_floor_kind_check
    CHECK (floor_kind IS NULL OR floor_kind IN ('unterlagsboden', 'ueberzugsboden'));
  END IF;
END $$;

-- Create index on finish_catalog for user queries
CREATE INDEX IF NOT EXISTS idx_finish_catalog_user_id ON finish_catalog(user_id);

-- Create index on measurements for floor queries
CREATE INDEX IF NOT EXISTS idx_measurements_floor_category ON measurements(floor_category);
CREATE INDEX IF NOT EXISTS idx_measurements_parent_id ON measurements(parent_measurement_id);
CREATE INDEX IF NOT EXISTS idx_measurements_finish_catalog_id ON measurements(finish_catalog_id);

-- Enable RLS on finish_catalog
ALTER TABLE finish_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finish_catalog

-- Users can view their own catalog items
CREATE POLICY "Users can view own finish catalog"
  ON finish_catalog
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own catalog items
CREATE POLICY "Users can insert own finish catalog"
  ON finish_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own catalog items
CREATE POLICY "Users can update own finish catalog"
  ON finish_catalog
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own catalog items
CREATE POLICY "Users can delete own finish catalog"
  ON finish_catalog
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
