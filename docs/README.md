# 项目文档

欢迎查阅 AI 旅行规划师的详细文档！本目录包含了项目的完整技术文档和使用指南。

## 📚 文档导航

### 功能文档

#### 🤖 AI 模型配置
- **[MODEL_SELECTION.md](MODEL_SELECTION.md)** - AI 模型选择功能
  - 支持的模型列表（Claude、DeepSeek）
  - 模型配置方法
  - 使用指南和最佳实践
  - 技术实现细节

#### 🗺️ 地图集成
- **[MAP_INTEGRATION.md](MAP_INTEGRATION.md)** - 高德地图集成
  - 地图显示和交互
  - 景点标注功能
  - 路线规划实现
  - API 配置指南
  - 故障排除

#### 💰 费用管理

- **[BUDGET_VISUALIZATION.md](BUDGET_VISUALIZATION.md)** - 费用数据可视化
  - 预算使用情况仪表板
  - 费用类别分布（饼图）
  - 每日开销趋势（柱状图）
  - 数据导出（CSV/PDF）
  - 日期筛选功能
  - 响应式设计说明

#### 🔗 分享功能

- **[SHARE_FEATURE.md](SHARE_FEATURE.md)** - 行程分享功能
  - 分享链接生成
  - 公开访问控制
  - 安全性设计
  - 使用示例

#### 📖 使用指南

- **[EXAMPLES.md](EXAMPLES.md)** - 使用示例和最佳实践
  - 实际场景演示
  - 步骤详解
  - 常见问题解答
  - 最佳实践建议

### 技术文档

#### 🗄️ 数据库
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - 数据库设置完整指南
  - Supabase 项目配置
  - 数据库表结构
  - RLS 策略说明
  - 索引优化
  - 迁移脚本使用

### 主要文档

项目的主要文档位于根目录：

- **[README.md](../README.md)** - 项目主文档
  - 项目介绍
  - 功能特性
  - 快速开始
  - 环境配置
  - 部署说明

- **[CHANGELOG.md](../CHANGELOG.md)** - 更新日志
  - 版本历史
  - 功能更新记录
  - Bug 修复记录
  - 依赖包变更

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 部署指南
  - Vercel 部署
  - Docker 部署
  - 环境变量配置
  - 性能优化
  - 监控和日志

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - 贡献指南
  - 如何贡献代码
  - 代码规范
  - Git 工作流程
  - 提交前检查清单
  - Pull Request 流程

## 📖 文档使用指南

### 新手入门

如果你是第一次使用这个项目，建议按以下顺序阅读文档：

1. 📘 [README.md](../README.md) - 了解项目概况
2. 🚀 快速开始 - 按 README 中的步骤配置环境
3. 🗄️ [DATABASE_SETUP.md](DATABASE_SETUP.md) - 设置数据库
4. 🤖 [MODEL_SELECTION.md](MODEL_SELECTION.md) - 配置 AI 模型
5. 📊 [EXAMPLES.md](EXAMPLES.md) - 查看使用示例

### 功能开发

如果你想开发新功能或修改现有功能：

1. 📖 [CONTRIBUTING.md](../CONTRIBUTING.md) - 了解贡献流程
2. 🗂️ 相关功能文档 - 查看具体功能的实现细节
3. 📝 [CHANGELOG.md](../CHANGELOG.md) - 查看最新变更

### 部署上线

如果你想将项目部署到生产环境：

1. 🚀 [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署指南
2. 🔧 环境变量配置 - 确保所有必需的变量已配置
3. 🗄️ [DATABASE_SETUP.md](DATABASE_SETUP.md) - 设置生产数据库

## 📦 归档文档

以下文档已归档到 `docs/archive/` 目录，作为历史参考：

- **[Create_Prompt.md](archive/Create_Prompt.md)** - 原始项目需求文档
- **[ORIGIN_FIELD_UPDATE.md](archive/ORIGIN_FIELD_UPDATE.md)** - 出发地功能更新说明
- **[BUGFIX_EXPENSE_FIELDS.md](archive/BUGFIX_EXPENSE_FIELDS.md)** - 费用字段 Bug 修复记录
- **[DOCUMENTATION_CLEANUP_SUMMARY.md](archive/DOCUMENTATION_CLEANUP_SUMMARY.md)** - 文档整理总结
- **[INITIAL_SETUP_SUMMARY.txt](archive/INITIAL_SETUP_SUMMARY.txt)** - 初始项目设置总结

这些文档包含了项目早期的需求和开发过程，对了解项目演进有帮助。

## 🔗 相关资源

### 官方文档
- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Anthropic Claude 文档](https://docs.anthropic.com)
- [高德地图 Web API](https://lbs.amap.com/api/javascript-api/summary)

### 依赖库文档
- [Recharts](https://recharts.org/en-US/) - 图表库
- [Tailwind CSS](https://tailwindcss.com/docs) - CSS 框架
- [TypeScript](https://www.typescriptlang.org/docs/) - 类型系统

## 💡 如何贡献文档

文档和代码一样重要！如果你发现文档有误或需要补充：

1. 在 GitHub 提交 Issue 说明问题
2. 或者直接提交 Pull Request 修改文档
3. 遵循 Markdown 格式规范
4. 确保示例代码可以正常运行

## ❓ 需要帮助？

- 📧 在 GitHub Issues 中提问
- 💬 参与项目讨论
- 📖 查看 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解更多

---

**文档最后更新**: 2025-10-23

感谢你对项目文档的关注！ 📖✨
