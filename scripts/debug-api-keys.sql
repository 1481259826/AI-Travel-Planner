-- 诊断 API Keys 查询问题

-- 1. 检查是否有 DeepSeek 的 API Key 记录
SELECT
  id,
  user_id,
  service,
  key_name,
  key_prefix,
  is_active,
  base_url,
  created_at
FROM api_keys
WHERE service = 'deepseek'
ORDER BY created_at DESC;

-- 2. 检查特定用户的所有 API Keys
SELECT
  id,
  user_id,
  service,
  key_name,
  key_prefix,
  is_active,
  base_url,
  created_at
FROM api_keys
WHERE user_id = '8ace4229-c490-4039-a45c-5adb58fbecd0'
ORDER BY created_at DESC;

-- 3. 检查是否有 base_url 和 extra_config 列（验证迁移是否执行）
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
AND column_name IN ('base_url', 'extra_config')
ORDER BY ordinal_position;

-- 4. 检查当前登录用户的 ID（用于验证）
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
