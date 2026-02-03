/*
  # Add DXF Render Settings

  1. Changes
    - Add `dxf_render_settings` column to `plans` table
      - Stores per-plan rendering configuration
      - Includes render mode (simplified/raw), layer visibility, type visibility, and space visibility
      - JSONB format for flexibility
      - Defaults to empty object (will be populated on first use)
  
  2. Structure
    ```json
    {
      "renderMode": "simplified",
      "layers": {
        "0": true,
        "WALLS": true
      },
      "types": {
        "LINE": true,
        "LWPOLYLINE": true,
        "TEXT": true
      },
      "spaces": {
        "model": true,
        "paper": false
      }
    }
    ```
  
  3. Notes
    - Missing keys treated as visible (backward compatible)
    - Supports both simplified (normalized) and raw DXF rendering
    - Layer and type toggles affect rendering immediately
    - Space toggles control model/paper space visibility
*/

-- Add dxf_render_settings column to plans table
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS dxf_render_settings jsonb NOT NULL DEFAULT '{}'::jsonb;