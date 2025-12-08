-- ============================================
-- 对话式行程历史记录功能 - 数据库迁移脚本
-- ============================================
-- 版本: v1.0
-- 创建日期: 2025-12-08
-- 说明: 在 Supabase SQL Editor 中运行此脚本
-- ============================================

-- ============================================
-- 1. 创建 trip_generation_history 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.trip_generation_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,

  -- 生成参数（表单数据快照）
  form_data JSONB NOT NULL,

  -- 生成结果
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  result_summary JSONB,       -- 生成结果摘要
  error_message TEXT,         -- 失败时的错误信息

  -- 时间信息
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- 元数据
  generation_duration_ms INTEGER,   -- 生成耗时（毫秒）
  workflow_version TEXT DEFAULT 'v2',  -- 工作流版本

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE public.trip_generation_history IS '行程生成历史记录表，记录每次通过对话生成行程的参数和结果';
COMMENT ON COLUMN public.trip_generation_history.form_data IS '生成时使用的表单参数快照';
COMMENT ON COLUMN public.trip_generation_history.status IS '生成状态：pending-准备中, generating-生成中, completed-已完成, failed-失败';
COMMENT ON COLUMN public.trip_generation_history.result_summary IS '生成结果摘要：目的地、天数、预算等';
COMMENT ON COLUMN public.trip_generation_history.generation_duration_ms IS '生成耗时（毫秒）';

-- ============================================
-- 2. 启用行级安全策略 (RLS)
-- ============================================

ALTER TABLE public.trip_generation_history ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "Users can view their own history" ON public.trip_generation_history;
DROP POLICY IF EXISTS "Users can create their own history" ON public.trip_generation_history;
DROP POLICY IF EXISTS "Users can update their own history" ON public.trip_generation_history;
DROP POLICY IF EXISTS "Users can delete their own history" ON public.trip_generation_history;

-- 创建 RLS 策略
CREATE POLICY "Users can view their own history"
  ON public.trip_generation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own history"
  ON public.trip_generation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history"
  ON public.trip_generation_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history"
  ON public.trip_generation_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trip_history_user_id
  ON public.trip_generation_history(user_id);

CREATE INDEX IF NOT EXISTS idx_trip_history_status
  ON public.trip_generation_history(status);

CREATE INDEX IF NOT EXISTS idx_trip_history_created_at
  ON public.trip_generation_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trip_history_session_id
  ON public.trip_generation_history(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_history_trip_id
  ON public.trip_generation_history(trip_id)
  WHERE trip_id IS NOT NULL;

-- 目的地搜索索引（JSONB 字段）
CREATE INDEX IF NOT EXISTS idx_trip_history_destination
  ON public.trip_generation_history((form_data->>'destination'));

-- ============================================
-- 4. 创建更新时间触发器
-- ============================================

-- 使用已存在的 update_updated_at_column 函数
DROP TRIGGER IF EXISTS update_trip_history_updated_at ON public.trip_generation_history;

CREATE TRIGGER update_trip_history_updated_at
  BEFORE UPDATE ON public.trip_generation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 验证迁移结果
-- ============================================

DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- 检查表是否创建成功
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trip_generation_history'
  ) INTO table_exists;

  -- 检查 RLS 策略数量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'trip_generation_history';

  -- 检查索引数量
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'trip_generation_history';

  IF table_exists AND policy_count >= 4 AND index_count >= 5 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ trip_generation_history 表迁移成功！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  - RLS 策略: % 个', policy_count;
    RAISE NOTICE '  - 索引: % 个', index_count;
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '⚠️ 迁移可能不完整，请检查';
    RAISE NOTICE 'table_exists: %, policy_count: %, index_count: %', table_exists, policy_count, index_count;
  END IF;
END $$;

-- 显示表结构
SELECT
  column_name AS "列名",
  data_type AS "数据类型",
  is_nullable AS "可空",
  column_default AS "默认值"
FROM information_schema.columns
WHERE table_name = 'trip_generation_history'
ORDER BY ordinal_position;
