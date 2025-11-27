-- ============================================
-- LangGraph Checkpointer 表结构
-- ============================================
-- 说明：
-- 此脚本创建 LangGraph 检查点持久化所需的表
-- 用于保存工作流执行状态，支持中断恢复
-- ============================================

-- 检查点表：存储工作流状态快照
CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

-- 写入表：存储待处理的写入操作
CREATE TABLE IF NOT EXISTS langgraph_writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  type TEXT,
  value JSONB,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON langgraph_checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON langgraph_checkpoints(created_at);
CREATE INDEX IF NOT EXISTS idx_writes_thread_id ON langgraph_writes(thread_id);

-- RLS 策略（可选，如果需要按用户隔离检查点）
-- 注意：默认不启用 RLS，因为检查点通常由服务端管理
-- 如需启用，取消注释以下内容：

-- ALTER TABLE langgraph_checkpoints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE langgraph_writes ENABLE ROW LEVEL SECURITY;

-- 服务端访问策略（使用 service role key）
-- CREATE POLICY "Service role full access on checkpoints" ON langgraph_checkpoints
--   FOR ALL USING (true);
-- CREATE POLICY "Service role full access on writes" ON langgraph_writes
--   FOR ALL USING (true);

-- 清理旧检查点的函数（可选，定期调用以清理过期数据）
CREATE OR REPLACE FUNCTION cleanup_old_checkpoints(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 删除超过指定天数的检查点
  DELETE FROM langgraph_writes
  WHERE (thread_id, checkpoint_ns, checkpoint_id) IN (
    SELECT thread_id, checkpoint_ns, checkpoint_id
    FROM langgraph_checkpoints
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
  );

  DELETE FROM langgraph_checkpoints
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 使用示例：
-- SELECT cleanup_old_checkpoints(7); -- 清理 7 天前的检查点

COMMENT ON TABLE langgraph_checkpoints IS 'LangGraph 工作流检查点存储，用于状态持久化和中断恢复';
COMMENT ON TABLE langgraph_writes IS 'LangGraph 工作流写入队列，存储待处理的状态更新';
COMMENT ON FUNCTION cleanup_old_checkpoints IS '清理过期的 LangGraph 检查点数据';
