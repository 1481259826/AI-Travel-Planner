-- Migration: 添加工作流中断状态表
-- Date: 2025-12-06
-- Purpose: 支持 Human-in-the-Loop 工作流中断机制

-- 确保 uuid_generate_v4 函数可用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 工作流中断状态表
CREATE TABLE IF NOT EXISTS public.workflow_interrupts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  workflow_type TEXT NOT NULL DEFAULT 'trip_planning',
  interrupt_type TEXT NOT NULL CHECK (interrupt_type IN (
    'itinerary_review',
    'budget_decision',
    'final_confirm'
  )),
  state_snapshot JSONB NOT NULL,
  options JSONB,
  user_decision JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'resumed',
    'cancelled',
    'expired'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resumed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE public.workflow_interrupts IS 'Human-in-the-Loop 工作流中断状态存储';
COMMENT ON COLUMN public.workflow_interrupts.thread_id IS 'LangGraph 工作流线程 ID';
COMMENT ON COLUMN public.workflow_interrupts.interrupt_type IS '中断类型: itinerary_review-行程审核, budget_decision-预算决策, final_confirm-最终确认';
COMMENT ON COLUMN public.workflow_interrupts.state_snapshot IS '中断时的工作流状态快照';
COMMENT ON COLUMN public.workflow_interrupts.options IS '提供给用户的选项';
COMMENT ON COLUMN public.workflow_interrupts.user_decision IS '用户的决策';
COMMENT ON COLUMN public.workflow_interrupts.expires_at IS '中断过期时间，默认24小时';

-- 启用 RLS
ALTER TABLE public.workflow_interrupts ENABLE ROW LEVEL SECURITY;

-- RLS 策略: 用户只能查看自己的中断
CREATE POLICY "Users can view their own interrupts"
  ON public.workflow_interrupts FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 策略: 用户只能插入自己的中断
CREATE POLICY "Users can insert their own interrupts"
  ON public.workflow_interrupts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略: 用户只能更新自己的中断
CREATE POLICY "Users can update their own interrupts"
  ON public.workflow_interrupts FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS 策略: 用户只能删除自己的中断
CREATE POLICY "Users can delete their own interrupts"
  ON public.workflow_interrupts FOR DELETE
  USING (auth.uid() = user_id);

-- 索引: 按 thread_id 查询
CREATE INDEX idx_workflow_interrupts_thread
  ON public.workflow_interrupts(thread_id);

-- 索引: 按用户和状态查询待处理中断
CREATE INDEX idx_workflow_interrupts_user_status
  ON public.workflow_interrupts(user_id, status);

-- 索引: 按过期时间查询（用于清理过期中断）
CREATE INDEX idx_workflow_interrupts_expires
  ON public.workflow_interrupts(expires_at)
  WHERE status = 'pending';

-- 自动更新 updated_at 的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自动更新 updated_at
CREATE TRIGGER update_workflow_interrupts_updated_at
  BEFORE UPDATE ON public.workflow_interrupts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 清理过期中断的函数
CREATE OR REPLACE FUNCTION cleanup_expired_interrupts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE public.workflow_interrupts
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_interrupts() IS '清理过期的工作流中断，将状态改为 expired';
