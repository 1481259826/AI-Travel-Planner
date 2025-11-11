-- Add base_url and extra_config columns to api_keys table
-- Migration: 20250111_add_api_key_extra_fields

-- Add base_url column (for custom API endpoints)
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS base_url TEXT;

-- Add extra_config column (for additional service-specific configuration as JSON)
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS extra_config TEXT;

-- Add comments for documentation
COMMENT ON COLUMN api_keys.base_url IS 'Custom API base URL for services that support it (e.g., DeepSeek, ModelScope)';
COMMENT ON COLUMN api_keys.extra_config IS 'Additional service-specific configuration stored as JSON string (e.g., app_id for voice service, web_key for map service)';
