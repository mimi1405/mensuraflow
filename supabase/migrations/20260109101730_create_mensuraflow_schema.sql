/*
  # MensuraFlow Database Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text, project name)
      - `description` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `user_id` (uuid, owner reference)
    
    - `plans`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `name` (text, plan name)
      - `type` (text, ground/north/south/east/west/section)
      - `dxf_data` (jsonb, parsed DXF geometry)
      - `dxf_units` (text, mm/cm/m)
      - `unit_scale` (numeric, conversion factor)
      - `viewport` (jsonb, stores current viewport state)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `measurements`
      - `id` (uuid, primary key)
      - `plan_id` (uuid, foreign key)
      - `object_type` (text, area/line/window/door)
      - `label` (text, user label)
      - `category` (text, wall/floor/facade/etc)
      - `geometry` (jsonb, stores coordinates)
      - `is_positive` (boolean, true for positive, false for abzug)
      - `computed_value` (numeric, calculated quantity)
      - `unit` (text, m²/m/etc)
      - `source` (text, dxf/manual/composite)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `measurement_subcomponents`
      - `id` (uuid, primary key)
      - `parent_measurement_id` (uuid, foreign key to measurements)
      - `subcomponent_type` (text, sturz/brüstung/leibung_left/leibung_right/opening)
      - `computed_value` (numeric)
      - `unit` (text)
      - `parameters` (jsonb, stores calculation parameters)
      - `created_at` (timestamptz)
    
    - `section_parameters`
      - `id` (uuid, primary key)
      - `plan_id` (uuid, foreign key to section plans)
      - `parameter_name` (text, wall_height/floor_thickness/leibung_depth)
      - `parameter_value` (numeric)
      - `unit` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('ground', 'north', 'south', 'east', 'west', 'section')),
  dxf_data jsonb DEFAULT '{}',
  dxf_units text DEFAULT 'mm',
  unit_scale numeric DEFAULT 1.0,
  viewport jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view plans of own projects"
  ON plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert plans to own projects"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update plans of own projects"
  ON plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plans.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete plans of own projects"
  ON plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  object_type text NOT NULL CHECK (object_type IN ('area', 'line', 'window', 'door')),
  label text NOT NULL,
  category text DEFAULT '',
  geometry jsonb NOT NULL,
  is_positive boolean DEFAULT true,
  computed_value numeric DEFAULT 0,
  unit text DEFAULT 'm²',
  source text DEFAULT 'manual' CHECK (source IN ('dxf', 'manual', 'composite')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view measurements of own projects"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = measurements.plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert measurements to own projects"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = measurements.plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update measurements of own projects"
  ON measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = measurements.plan_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = measurements.plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete measurements of own projects"
  ON measurements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = measurements.plan_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create measurement_subcomponents table
CREATE TABLE IF NOT EXISTS measurement_subcomponents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_measurement_id uuid NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  subcomponent_type text NOT NULL CHECK (subcomponent_type IN ('opening', 'sturz', 'brüstung', 'leibung_left', 'leibung_right')),
  computed_value numeric DEFAULT 0,
  unit text DEFAULT 'm²',
  parameters jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE measurement_subcomponents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subcomponents of own projects"
  ON measurement_subcomponents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM measurements
      JOIN plans ON plans.id = measurements.plan_id
      JOIN projects ON projects.id = plans.project_id
      WHERE measurements.id = measurement_subcomponents.parent_measurement_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subcomponents to own projects"
  ON measurement_subcomponents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM measurements
      JOIN plans ON plans.id = measurements.plan_id
      JOIN projects ON projects.id = plans.project_id
      WHERE measurements.id = measurement_subcomponents.parent_measurement_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subcomponents of own projects"
  ON measurement_subcomponents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM measurements
      JOIN plans ON plans.id = measurements.plan_id
      JOIN projects ON projects.id = plans.project_id
      WHERE measurements.id = measurement_subcomponents.parent_measurement_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM measurements
      JOIN plans ON plans.id = measurements.plan_id
      JOIN projects ON projects.id = plans.project_id
      WHERE measurements.id = measurement_subcomponents.parent_measurement_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete subcomponents of own projects"
  ON measurement_subcomponents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM measurements
      JOIN plans ON plans.id = measurements.plan_id
      JOIN projects ON projects.id = plans.project_id
      WHERE measurements.id = measurement_subcomponents.parent_measurement_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create section_parameters table
CREATE TABLE IF NOT EXISTS section_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  parameter_name text NOT NULL,
  parameter_value numeric NOT NULL,
  unit text DEFAULT 'm',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE section_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view section parameters of own projects"
  ON section_parameters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = section_parameters.plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert section parameters to own projects"
  ON section_parameters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = section_parameters.plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update section parameters of own projects"
  ON section_parameters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = section_parameters.plan_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = section_parameters.plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete section parameters of own projects"
  ON section_parameters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plans
      JOIN projects ON projects.id = plans.project_id
      WHERE plans.id = section_parameters.plan_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_project_id ON plans(project_id);
CREATE INDEX IF NOT EXISTS idx_measurements_plan_id ON measurements(plan_id);
CREATE INDEX IF NOT EXISTS idx_subcomponents_parent ON measurement_subcomponents(parent_measurement_id);
CREATE INDEX IF NOT EXISTS idx_section_params_plan_id ON section_parameters(plan_id);