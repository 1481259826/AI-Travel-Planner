-- ============================================
-- 旅行模板表 - 数据库迁移脚本
-- ============================================
-- 版本：v1.0
-- 创建日期：2025-12-11
-- 说明：创建 templates 表，用于存储用户的旅行配置模板
-- ============================================

-- ============================================
-- 1. 创建 templates 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- 模板元数据
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('business', 'leisure', 'family', 'adventure', 'culture', 'custom')),
  tags TEXT[] DEFAULT '{}',

  -- 可复用的表单数据（不含具体日期）
  destination VARCHAR(200) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 3,
  budget DECIMAL(10, 2) NOT NULL,
  travelers INTEGER NOT NULL DEFAULT 2,
  origin VARCHAR(200),
  preferences TEXT[] DEFAULT '{}',
  accommodation_preference VARCHAR(20) CHECK (accommodation_preference IN ('budget', 'mid', 'luxury')),
  transport_preference VARCHAR(20) CHECK (transport_preference IN ('public', 'driving', 'mixed')),
  special_requirements TEXT,

  -- 使用统计
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- 来源行程（可选，从行程保存时记录）
  source_trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. 创建索引
-- ============================================

-- 用户索引（查询用户的模板）
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);

-- 分类索引（按分类筛选）
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);

-- 使用次数索引（热门排序）
CREATE INDEX IF NOT EXISTS idx_templates_use_count ON public.templates(use_count DESC);

-- 目的地索引（模糊搜索）
CREATE INDEX IF NOT EXISTS idx_templates_destination ON public.templates(destination);

-- 创建时间索引（时间排序）
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON public.templates(created_at DESC);

-- ============================================
-- 3. 启用行级安全策略 (RLS)
-- ============================================

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "Users can view own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.templates;

-- 用户只能查看自己的模板
CREATE POLICY "Users can view own templates"
  ON public.templates FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能创建自己的模板
CREATE POLICY "Users can insert own templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的模板
CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = user_id);

-- 用户只能删除自己的模板
CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. 创建更新时间触发器
-- ============================================

-- 复用现有的 update_updated_at_column 函数
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 创建使用次数递增函数
-- ============================================

CREATE OR REPLACE FUNCTION increment_template_use_count(
  template_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.templates
  SET
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = template_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 完成
-- ============================================
-- 运行此脚本后，templates 表将被创建
-- 用户可以通过 API 或对话来管理自己的旅行模板
