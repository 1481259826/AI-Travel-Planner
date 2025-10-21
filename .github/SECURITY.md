# 安全政策

## 支持的版本

当前支持安全更新的版本：

| 版本 | 支持状态 |
| ------- | ------------------ |
| main分支   | :white_check_mark: |
| 其他版本   | :x:                |

## 报告漏洞

我们非常重视项目的安全性。如果你发现了安全漏洞，请**不要**公开提 Issue。

### 报告流程

1. **私密报告**：请通过 GitHub Security Advisory 私密报告
2. **邮件联系**：或发送邮件到项目维护者（如果提供了联系方式）
3. **详细描述**：
   - 漏洞类型
   - 影响范围
   - 复现步骤
   - 可能的修复方案

### 我们的承诺

- 在 48 小时内确认收到报告
- 在 7 天内提供初步评估
- 修复后会在 CHANGELOG 中致谢（除非你选择匿名）

### 不在范围内的问题

以下问题不属于安全漏洞：

- 第三方依赖的已知问题（请直接向上游报告）
- 需要物理访问的攻击
- 社会工程学攻击
- 拒绝服务攻击（DoS）

## 安全最佳实践

使用本项目时，请遵循以下安全建议：

### 环境变量

- ✅ 使用 `.env.local` 存储敏感信息
- ✅ 不要将 `.env.local` 提交到版本控制
- ✅ 定期轮换 API 密钥
- ✅ 使用不同的密钥用于开发和生产环境

### API 密钥安全

- 不要在客户端代码中暴露服务端 API 密钥
- 使用 `NEXT_PUBLIC_` 前缀的变量会暴露到客户端
- 敏感操作应该通过服务端 API 路由处理

### Supabase 安全

- 启用 Row Level Security (RLS)
- 定期审查 RLS 策略
- 使用 Service Role Key 时要特别小心
- 不要在客户端使用 Service Role Key

### 部署安全

- 使用 HTTPS
- 配置 CORS 策略
- 启用 Content Security Policy (CSP)
- 定期更新依赖包

## 依赖安全

我们使用以下工具监控依赖安全：

- GitHub Dependabot
- npm audit

建议定期运行：

```bash
npm audit
npm audit fix
```

## 更新日志

安全相关的更新会在 [CHANGELOG.md](../CHANGELOG.md) 中标注 `[SECURITY]` 标签。
