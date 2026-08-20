/*
  # Add Missing Fields to Task Templates
  
  1. Changes
    - Add new fields to task_templates table to match all fields from FrequencyData
    - Fields include: visits, numberOfMen, consumables, OHP percentages, lab testing, etc.
    
  2. New Fields Added
    - no_of_men: Number of workers (default: 1)
    - no_of_visits: Number of visits (default: 1)
    - consumables: Consumables cost (default: 0)
    - ohp_consumables: OHP percentage on consumables (default: 0)
    - materials_plant_hire: Materials/plant hire cost (default: 0)
    - ohp_materials_plant_hire: OHP percentage on materials (default: 0)
    - ohp_subcontractor: OHP percentage on subcontractor (default: 0)
    - laboratory_testing: Laboratory testing cost (default: 0)
    - ohp_laboratory_testing: OHP percentage on lab testing (default: 0)
    - admin_markup: Admin markup percentage (default: 0)
    - ot_premium: Overtime premium percentage (default: 0)
    
  3. Notes
    - All new fields are nullable to maintain compatibility with existing data
    - Default values set to 0 for numeric fields
*/

-- Add new columns to task_templates table
DO $$
BEGIN
  -- Number of men
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'no_of_men'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN no_of_men INTEGER DEFAULT 1;
  END IF;

  -- Number of visits
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'no_of_visits'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN no_of_visits INTEGER DEFAULT 1;
  END IF;

  -- Consumables
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'consumables'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN consumables NUMERIC DEFAULT 0;
  END IF;

  -- OHP on consumables
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'ohp_consumables'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN ohp_consumables NUMERIC DEFAULT 0;
  END IF;

  -- Materials/Plant Hire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'materials_plant_hire'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN materials_plant_hire NUMERIC DEFAULT 0;
  END IF;

  -- OHP on materials/plant hire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'ohp_materials_plant_hire'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN ohp_materials_plant_hire NUMERIC DEFAULT 0;
  END IF;

  -- OHP on subcontractor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'ohp_subcontractor'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN ohp_subcontractor NUMERIC DEFAULT 0;
  END IF;

  -- Laboratory testing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'laboratory_testing'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN laboratory_testing NUMERIC DEFAULT 0;
  END IF;

  -- OHP on laboratory testing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'ohp_laboratory_testing'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN ohp_laboratory_testing NUMERIC DEFAULT 0;
  END IF;

  -- Admin markup
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'admin_markup'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN admin_markup NUMERIC DEFAULT 0;
  END IF;

  -- OT Premium
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_templates' AND column_name = 'ot_premium'
  ) THEN
    ALTER TABLE task_templates ADD COLUMN ot_premium NUMERIC DEFAULT 0;
  END IF;
END $$;