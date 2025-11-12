-- Update api_keys service constraint
-- Migration: 20251112_update_api_keys_service_constraint
-- Remove 'anthropic' and ensure 'voice', 'deepseek', 'modelscope', 'map' are allowed

-- Drop the existing constraint
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_service_check;

-- Add updated constraint without 'anthropic'
ALTER TABLE api_keys ADD CONSTRAINT api_keys_service_check
  CHECK (service IN ('deepseek', 'modelscope', 'map', 'voice'));

-- Add comment
COMMENT ON CONSTRAINT api_keys_service_check ON api_keys IS 'Allowed API key services: deepseek, modelscope, map, voice';
