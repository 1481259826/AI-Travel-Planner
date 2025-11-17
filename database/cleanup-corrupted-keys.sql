-- 清理损坏的 API Keys
-- 当加密密钥改变后，旧的加密数据将无法解密
-- 运行此脚本可以删除所有损坏的 API Keys，用户需要重新配置

-- 查看当前用户的 API Keys（可选）
-- SELECT id, user_id, service, created_at, updated_at
-- FROM api_keys
-- WHERE user_id = '8ace4229-c490-4039-a45c-5adb58fbecd0';

-- 删除特定用户的所有 API Keys（需要重新配置）
-- 替换 'YOUR_USER_ID' 为实际的用户 ID
DELETE FROM api_keys
WHERE user_id = '8ace4229-c490-4039-a45c-5adb58fbecd0';

-- 或者只删除特定服务的 API Key
-- DELETE FROM api_keys
-- WHERE user_id = '8ace4229-c490-4039-a45c-5adb58fbecd0'
-- AND service = 'voice';

-- 查看是否删除成功
SELECT COUNT(*) as remaining_keys
FROM api_keys
WHERE user_id = '8ace4229-c490-4039-a45c-5adb58fbecd0';
