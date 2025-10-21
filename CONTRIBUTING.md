# 贡献指南

感谢你对 AI 旅行规划师项目的关注！我们欢迎所有形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 bug，请创建一个 Issue，并包含以下信息：

- **Bug 描述**：清晰简洁地描述问题
- **复现步骤**：详细说明如何重现问题
- **期望行为**：描述你期望的正确行为
- **实际行为**：描述实际发生的情况
- **环境信息**：
  - 操作系统
  - 浏览器版本
  - Node.js 版本
  - 项目版本
- **截图**：如果可能，附上截图

### 提出新功能

如果你有新功能的想法：

1. 先检查 Issues 中是否已有类似建议
2. 创建一个新的 Issue，使用 "Feature Request" 标签
3. 详细描述功能和使用场景
4. 说明为什么这个功能对用户有价值

### 提交代码

#### 1. Fork 项目

点击 GitHub 页面右上角的 "Fork" 按钮

#### 2. 克隆仓库

```bash
git clone https://github.com/your-username/ai-travel-planner.git
cd ai-travel-planner
```

#### 3. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

分支命名规范：
- `feature/功能名` - 新功能
- `fix/bug名` - Bug 修复
- `docs/文档名` - 文档更新
- `refactor/重构名` - 代码重构
- `style/样式名` - 样式调整

#### 4. 开发和测试

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 填写你的 API 密钥

# 启动开发服务器
npm run dev

# 运行测试（如果有）
npm test
```

#### 5. 提交代码

提交信息规范（遵循 Conventional Commits）：

```bash
# 格式
git commit -m "type(scope): subject"

# 示例
git commit -m "feat(model): add GPT-4 model support"
git commit -m "fix(auth): resolve login redirect issue"
git commit -m "docs(readme): update installation guide"
```

类型说明：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新

#### 6. 推送到 GitHub

```bash
git push origin feature/your-feature-name
```

#### 7. 创建 Pull Request

1. 访问你的 Fork 仓库
2. 点击 "Pull Request" 按钮
3. 填写 PR 描述：
   - 修改了什么
   - 为什么要这样修改
   - 如何测试
   - 相关 Issue（如果有）

## 代码规范

### TypeScript/JavaScript

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 使用有意义的变量和函数名
- 添加必要的注释
- 避免使用 `any` 类型

### 组件开发

- 使用函数式组件和 Hooks
- 组件应该单一职责
- 提取可复用的逻辑到自定义 Hooks
- 使用 TypeScript 类型定义 Props

### 样式

- 使用 Tailwind CSS 工具类
- 保持样式一致性
- 支持响应式设计

### 提交前检查清单

- [ ] 代码遵循项目规范
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 测试通过
- [ ] 没有 console.log 或调试代码
- [ ] 环境变量使用 .env 而不是硬编码

## 项目结构

```
ai-travel-planner/
├── app/              # Next.js App Router 页面
├── components/       # React 组件
├── lib/             # 工具库和配置
├── types/           # TypeScript 类型定义
├── public/          # 静态资源
└── docs/            # 文档
```

## 开发流程

1. **功能开发**
   - 在 `types/` 中定义类型
   - 在 `lib/` 中实现工具函数
   - 在 `components/` 中创建 UI 组件
   - 在 `app/` 中创建页面

2. **API 开发**
   - 在 `app/api/` 中创建 API 路由
   - 使用 `lib/auth-helpers.ts` 进行认证
   - 使用 TypeScript 定义请求/响应类型

3. **样式开发**
   - 使用 Tailwind CSS
   - 保持组件样式模块化
   - 支持暗色模式（如果需要）

## 需要帮助？

- 查看 [README.md](README.md) 了解项目概述
- 查看 [docs/](docs/) 目录中的详细文档
- 在 Issues 中提问
- 加入讨论区交流

## 行为准则

- 尊重所有贡献者
- 提供建设性的反馈
- 保持友好和专业
- 遵守开源社区规范

## 许可证

提交代码即表示你同意将代码以 MIT 许可证开源。

---

再次感谢你的贡献！每一个 PR 都让这个项目变得更好。🎉
