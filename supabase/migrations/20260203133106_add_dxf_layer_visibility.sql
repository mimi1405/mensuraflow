/*
  # Add DXF Layer Visibility Control

  1. Changes
    - Add `dxf_layer_visibility` column to `plans` table
      - Stores per-plan settings for which DXF layers and geometry types should be visible
      - JSONB format with `layers` and `types` objects
      - Defaults to empty objects (all layers/types visible by default)
  
  2. Structure
    ```json
    {
      "layers": {
        "0": true,
        "WALLS": true,
        "DIMENSIONS": false
      },
      "types": {
        "line": true,
        "lwpolyline": true,
        "arc": true,
        "circle": false
      }
    }
    ```
  
  3. Notes
    - Missing keys are treated as visible (true)
    - Non-destructive: hiding layers doesn't affect measurements
    - Backward compatible with existing plans
*/

-- Add dxf_layer_visibility column to plans table
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS dxf_layer_visibility jsonb NOT NULL DEFAULT '{
  "layers": {},
  "types": {}
}'::jsonb;