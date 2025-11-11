-- 检查 api_keys 表结构
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;

-- 检查你的 API Keys
SELECT
  id,
  service,
  key_name,
  key_prefix,
  base_url,
  extra_config,
  is_active,
  created_at
FROM api_keys
ORDER BY created_at DESC;
