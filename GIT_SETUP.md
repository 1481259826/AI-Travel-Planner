# Git 仓库设置指南

本指南帮助你将项目提交到 GitHub。

## 📋 准备工作检查清单

在提交到 GitHub 之前，请确保：

- [x] `.env.local` 已被添加到 `.gitignore`
- [x] 所有敏感信息（API 密钥等）已从代码中移除
- [x] README.md 已更新完整
- [x] 项目可以正常运行

## 🚀 步骤 1: 初始化 Git 仓库

如果还没有初始化 Git：

```bash
# 初始化 Git 仓库
git init

# 设置默认分支为 main
git branch -M main
```

## 📝 步骤 2: 添加文件到暂存区

```bash
# 添加所有文件
git add .

# 查看将要提交的文件
git status
```

**重要检查**：确保 `.env.local` **没有**出现在列表中！

## ✅ 步骤 3: 创建第一次提交

```bash
git commit -m "chore: initial commit - AI travel planner project"
```

## 🌐 步骤 4: 在 GitHub 创建仓库

### 方法 A: 通过 GitHub 网站

1. 访问 https://github.com
2. 点击右上角 "+" → "New repository"
3. 填写信息：
   - **Repository name**: `ai-travel-planner`
   - **Description**: AI 智能旅行规划助手 - 支持多模型选择、语音输入、智能行程生成
   - **Public/Private**: 根据需要选择
   - **不要**勾选 "Initialize this repository with"（因为本地已有代码）
4. 点击 "Create repository"

### 方法 B: 使用 GitHub CLI（如果已安装）

```bash
gh repo create ai-travel-planner --public --source=. --remote=origin
```

## 🔗 步骤 5: 关联远程仓库

复制 GitHub 仓库的 URL，然后：

```bash
# 添加远程仓库（替换为你的用户名）
git remote add origin https://github.com/YOUR_USERNAME/ai-travel-planner.git

# 验证远程仓库
git remote -v
```

## ⬆️ 步骤 6: 推送代码

```bash
# 首次推送
git push -u origin main
```

## 🎉 完成！

现在你的项目已经在 GitHub 上了！

访问：`https://github.com/YOUR_USERNAME/ai-travel-planner`

## 📦 后续提交工作流

### 日常开发流程

```bash
# 1. 查看修改
git status

# 2. 添加修改的文件
git add .

# 3. 提交（使用有意义的提交信息）
git commit -m "feat: add new feature"

# 4. 推送到 GitHub
git push
```

### 提交信息规范

遵循 Conventional Commits 格式：

```
<type>(<scope>): <subject>

[可选的详细描述]

[可选的 footer]
```

**类型（type）：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新

**示例：**

```bash
git commit -m "feat(model): add DeepSeek Chat model support"
git commit -m "fix(auth): resolve session timeout issue"
git commit -m "docs(readme): update installation guide"
```

## 🌿 分支管理建议

### 推荐的分支策略

```bash
# 主分支
main          # 生产环境代码
develop       # 开发分支

# 功能分支
feature/xxx   # 新功能开发
fix/xxx       # Bug 修复
hotfix/xxx    # 紧急修复
```

### 创建功能分支

```bash
# 从 main 创建新分支
git checkout -b feature/map-integration

# 开发完成后合并回 main
git checkout main
git merge feature/map-integration
git push
```

## 🔒 安全检查

在推送前，务必检查：

```bash
# 查看将要提交的文件
git status

# 查看文件差异
git diff

# 确保没有敏感信息
grep -r "API_KEY" .
grep -r "SECRET" .
```

## 🛠️ 有用的 Git 命令

```bash
# 查看提交历史
git log --oneline

# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 撤销暂存的文件
git reset HEAD <file>

# 查看远程仓库信息
git remote -v

# 拉取最新代码
git pull origin main

# 查看分支
git branch -a
```

## ⚙️ 配置 GitHub Secrets

对于 GitHub Actions，需要配置环境变量：

1. 访问仓库 Settings
2. 左侧菜单选择 "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. 添加需要的密钥：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📚 更多资源

- [GitHub 官方文档](https://docs.github.com)
- [Git 教程](https://git-scm.com/book/zh/v2)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

如有问题，请参考 [CONTRIBUTING.md](CONTRIBUTING.md) 或在 Issues 中提问。
