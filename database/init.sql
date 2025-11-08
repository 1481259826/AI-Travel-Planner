-- ============================================
-- AI 旅行规划师 - Supabase 数据库完整初始化脚本
-- ============================================
-- 版本：v3.0
-- 说明：在 Supabase SQL Editor 中运行此脚本来初始化所有表和策略
-- 包含：基础表结构 + 分享功能 + 费用追踪 + 用户设置 + API Keys 管理
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Profiles 表（用户配置 + 设置）
-- ============================================

-- 创建 profiles 表（扩展 auth.users）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  default_model TEXT,
  default_budget DECIMAL(10, 2),
  default_origin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在，添加缺失的列（向后兼容）
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

-- 启用行级安全策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 创建策略
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 为现有的认证用户创建 profiles 记录
INSERT INTO public.profiles (id, email, name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Trips 表（旅行行程 + 分享功能）
-- ============================================

-- 创建 trips 表
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  origin TEXT,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  budget DECIMAL(10, 2) NOT NULL,
  travelers INTEGER NOT NULL DEFAULT 1,
  adult_count INTEGER NOT NULL DEFAULT 1,
  child_count INTEGER NOT NULL DEFAULT 0,
  preferences TEXT[] DEFAULT '{}',
  itinerary JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'ongoing', 'completed')),
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在，添加缺失的列（向后兼容）
DO $$
BEGIN
  -- 添加 origin 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'origin'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN origin TEXT;
    RAISE NOTICE '✅ 添加 origin 字段';
  END IF;

  -- 添加 start_time 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN start_time TIME;
    RAISE NOTICE '✅ 添加 start_time 字段';
  END IF;

  -- 添加 end_time 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN end_time TIME;
    RAISE NOTICE '✅ 添加 end_time 字段';
  END IF;

  -- 添加 share_token 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'share_token'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN share_token TEXT UNIQUE;
    RAISE NOTICE '✅ 添加 share_token 字段';
  END IF;

  -- 添加 is_public 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL;
    RAISE NOTICE '✅ 添加 is_public 字段';
  END IF;
END $$;

-- 启用行级安全策略
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can view public trips" ON public.trips;

-- 创建策略：用户可以查看自己的行程
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

-- 创建策略：任何人都可以查看公开的行程（通过 share_token）
CREATE POLICY "Anyone can view public trips"
  ON public.trips FOR SELECT
  USING (is_public = TRUE AND share_token IS NOT NULL);

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Expenses 表（开支记录）
-- ============================================

-- 创建 expenses 表
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('accommodation', 'transportation', 'food', 'attractions', 'shopping', 'other')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用行级安全策略
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "Users can view expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their trips" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can view expenses for public trips" ON public.expenses;

-- 创建策略：用户可以查看自己行程的费用
CREATE POLICY "Users can view expenses for their trips"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- 创建策略：任何人都可以查看公开行程的费用
CREATE POLICY "Anyone can view expenses for public trips"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = expenses.trip_id
      AND trips.is_public = TRUE
      AND trips.share_token IS NOT NULL
    )
  );

CREATE POLICY "Users can create expenses for their trips"
  ON public.expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses for their trips"
  ON public.expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses for their trips"
  ON public.expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. API Keys 表（API密钥管理）
-- ============================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('anthropic', 'deepseek', 'map', 'voice', 'unsplash')),
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
-- 5. 创建索引（优化查询性能）
-- ============================================

-- Profiles 表索引
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trips 表索引
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON public.trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON public.trips(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_is_public ON public.trips(is_public) WHERE is_public = TRUE;

-- Expenses 表索引
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- API Keys 表索引
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON public.api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active) WHERE is_active = TRUE;

-- ============================================
-- 6. 创建函数和触发器
-- ============================================

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 生成唯一的分享 token 函数
CREATE OR REPLACE FUNCTION generate_unique_share_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- 生成 UUID 作为 token
    new_token := replace(uuid_generate_v4()::text, '-', '');

    -- 检查 token 是否已存在
    SELECT EXISTS(
      SELECT 1 FROM public.trips WHERE share_token = new_token
    ) INTO token_exists;

    -- 如果不存在，返回新 token
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 为 profiles 表添加触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 trips 表添加触发器
DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 expenses 表添加触发器
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 api_keys 表添加触发器
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始化完成验证
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  share_token_exists BOOLEAN;
  is_public_exists BOOLEAN;
  theme_exists BOOLEAN;
  api_keys_table_exists BOOLEAN;
BEGIN
  -- 验证表创建
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'trips', 'expenses', 'api_keys');

  -- 验证分享功能字段
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'share_token'
  ) INTO share_token_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_public'
  ) INTO is_public_exists;

  -- 验证设置功能字段
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) INTO theme_exists;

  -- 验证 API Keys 表
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_keys'
  ) INTO api_keys_table_exists;

  -- 显示结果
  IF table_count = 4 AND share_token_exists AND is_public_exists
     AND theme_exists AND api_keys_table_exists THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 数据库初始化成功！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已创建的表:';
    RAISE NOTICE '  - profiles (用户配置 + 设置)';
    RAISE NOTICE '  - trips (旅行行程 + 分享功能)';
    RAISE NOTICE '  - expenses (费用追踪)';
    RAISE NOTICE '  - api_keys (API密钥管理)';
    RAISE NOTICE '';
    RAISE NOTICE '已启用的功能:';
    RAISE NOTICE '  ✓ 行级安全策略 (RLS)';
    RAISE NOTICE '  ✓ 自动更新时间戳';
    RAISE NOTICE '  ✓ 行程分享功能';
    RAISE NOTICE '  ✓ 用户设置 (主题/默认值)';
    RAISE NOTICE '  ✓ API Keys 管理';
    RAISE NOTICE '  ✓ 性能优化索引';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '⚠️ 部分功能初始化失败，请检查错误信息';
  END IF;
END $$;

-- 显示表结构摘要
SELECT
  table_name AS "表名",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "字段数"
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'trips', 'expenses', 'api_keys')
ORDER BY table_name;
