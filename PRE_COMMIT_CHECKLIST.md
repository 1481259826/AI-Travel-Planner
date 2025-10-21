# 提交前检查清单

在将项目推送到 GitHub 之前，请确保完成以下所有检查项。

## 🔒 安全检查

- [ ] **环境变量**：`.env.local` 已添加到 `.gitignore`
- [ ] **敏感信息**：代码中没有硬编码的 API 密钥、密码或 token
- [ ] **密钥检查**：运行 `git status` 确认 `.env.local` 不在提交列表中
- [ ] **Supabase 密钥**：Service Role Key 没有暴露在客户端代码中

```bash
# 快速检查敏感信息
grep -r "sk-ant-" . --exclude-dir=node_modules --exclude=.env.local
grep -r "sk-" . --exclude-dir=node_modules --exclude=.env.local
```

## 📝 文档检查

- [ ] **README.md**：内容完整，包含项目介绍、安装步骤、使用说明
- [ ] **API 文档**：环境变量说明清晰
- [ ] **示例配置**：`.env.example` 已更新，包含所有必需的变量
- [ ] **许可证**：LICENSE 文件已创建
- [ ] **贡献指南**：CONTRIBUTING.md 已添加

## 💻 代码质量

- [ ] **编译检查**：`npm run build` 成功无错误
- [ ] **代码规范**：`npm run lint` 通过或只有少量警告
- [ ] **控制台清理**：删除了所有 `console.log`、`console.error`（保留必要的错误处理日志）
- [ ] **TODO 清理**：检查并处理了所有 TODO 注释
- [ ] **类型检查**：TypeScript 没有类型错误

```bash
# 运行这些命令检查
npm run build
npm run lint
```

## 🎨 代码格式

- [ ] **缩进一致**：统一使用 2 空格或 4 空格
- [ ] **行尾符**：已配置 `.gitattributes` 统一行尾符
- [ ] **无尾随空格**：删除了多余的空格和空行
- [ ] **文件结尾**：所有文件以空行结尾

## 📦 依赖和配置

- [ ] **package.json**：版本号正确，依赖列表准确
- [ ] **锁文件**：`package-lock.json` 已提交
- [ ] **配置文件**：Next.js、TypeScript、Tailwind 配置已检查
- [ ] **过时依赖**：运行 `npm audit` 检查安全漏洞

```bash
npm audit
npm outdated
```

## 🗂️ Git 配置

- [ ] **.gitignore**：完整配置，包含 node_modules、.env.local、.next 等
- [ ] **.gitattributes**：已配置文本文件行尾符
- [ ] **分支清理**：删除了无用的本地分支
- [ ] **提交历史**：提交信息清晰有意义

## 🧪 功能测试

- [ ] **本地运行**：`npm run dev` 正常启动
- [ ] **基本功能**：
  - [ ] 用户注册/登录正常
  - [ ] 创建行程功能可用
  - [ ] AI 生成行程成功
  - [ ] 查看行程详情正常
- [ ] **响应式设计**：在不同屏幕尺寸下显示正常
- [ ] **错误处理**：错误信息友好显示

## 📸 截图和演示

- [ ] **项目截图**：准备了至少 3-5 张产品截图
- [ ] **功能演示**：录制了主要功能的演示 GIF（可选）
- [ ] **部署演示**：有可访问的在线 Demo（可选）

## 🌐 GitHub 准备

- [ ] **Issue 模板**：已创建 Bug 报告和功能请求模板
- [ ] **PR 模板**：已创建 Pull Request 模板
- [ ] **GitHub Actions**：CI 配置文件已添加（可选）
- [ ] **安全政策**：SECURITY.md 已创建
- [ ] **Topics/Tags**：准备好仓库标签（如 nextjs, typescript, ai）

## 📋 最终确认

```bash
# 1. 查看将要提交的文件
git status

# 2. 确认没有敏感信息
git diff

# 3. 检查 .gitignore 是否生效
cat .gitignore

# 4. 查看提交历史
git log --oneline -10
```

## ✅ 提交步骤

确认所有检查项后：

```bash
# 1. 添加所有文件
git add .

# 2. 创建提交
git commit -m "chore: initial commit - AI travel planner"

# 3. 创建 GitHub 仓库（参考 GIT_SETUP.md）

# 4. 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/ai-travel-planner.git

# 5. 推送代码
git push -u origin main
```

## 🎯 推送后的任务

- [ ] 在 GitHub 仓库添加描述和标签
- [ ] 设置 GitHub Pages（如果需要）
- [ ] 配置 GitHub Actions secrets
- [ ] 添加仓库徽章到 README
- [ ] 创建第一个 Release（可选）
- [ ] 在社交媒体分享项目（可选）

---

完成这些检查后，你的项目就可以安全地推送到 GitHub 了！🚀
