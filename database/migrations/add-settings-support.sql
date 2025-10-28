-- ============================================
-- 设置功能支持 - 数据库迁移脚本
-- ============================================
-- 版本：v1.0
-- 说明：添加主题、默认偏好、API Keys 管理功能
-- ============================================

-- ============================================
-- 1. 扩展 Profiles 表 - 添加设置相关字段
-- ============================================

DO $$
BEGIN
  -- 添加 theme 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));
    RAISE NOTICE '✅ 添加 theme 字段';
  END IF;

  -- 添加 default_model 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'default_model'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_model TEXT;
    RAISE NOTICE '✅ 添加 default_model 字段';
  END IF;

  -- 添加 default_budget 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'default_budget'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_budget DECIMAL(10, 2);
    RAISE NOTICE '✅ 添加 default_budget 字段';
  END IF;

  -- 添加 default_origin 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'default_origin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_origin TEXT;
    RAISE NOTICE '✅ 添加 default_origin 字段';
  END IF;
END $$;

-- ============================================
-- 2. 创建 API Keys 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('anthropic', 'deepseek', 'map')),
  key_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用行级安全策略
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;

-- 创建 RLS 策略：用户只能操作自己的 API keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. 创建索引（优化查询性能）
-- ============================================

-- API Keys 表索引
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON public.api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active) WHERE is_active = TRUE;

-- ============================================
-- 4. 创建触发器
-- ============================================

-- 为 api_keys 表添加自动更新时间戳触发器
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 验证迁移完成
-- ============================================

DO $$
DECLARE
  theme_exists BOOLEAN;
  default_model_exists BOOLEAN;
  default_budget_exists BOOLEAN;
  default_origin_exists BOOLEAN;
  api_keys_table_exists BOOLEAN;
BEGIN
  -- 验证 profiles 表字段
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) INTO theme_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'default_model'
  ) INTO default_model_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'default_budget'
  ) INTO default_budget_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'default_origin'
  ) INTO default_origin_exists;

  -- 验证 api_keys 表
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_keys'
  ) INTO api_keys_table_exists;

  -- 显示结果
  IF theme_exists AND default_model_exists AND default_budget_exists
     AND default_origin_exists AND api_keys_table_exists THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 设置功能迁移成功！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已添加的功能:';
    RAISE NOTICE '  ✓ 主题设置 (theme)';
    RAISE NOTICE '  ✓ 默认 AI 模型 (default_model)';
    RAISE NOTICE '  ✓ 默认预算 (default_budget)';
    RAISE NOTICE '  ✓ 默认出发地 (default_origin)';
    RAISE NOTICE '  ✓ API Keys 管理表';
    RAISE NOTICE '  ✓ RLS 安全策略';
    RAISE NOTICE '  ✓ 性能优化索引';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '⚠️ 部分功能迁移失败，请检查错误信息';
  END IF;
END $$;

-- 显示新增表结构
SELECT
  column_name AS "字段名",
  data_type AS "数据类型",
  is_nullable AS "可为空",
  column_default AS "默认值"
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;
