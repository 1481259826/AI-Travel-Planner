# Docker 部署指南

本文档说明如何使用 Docker 部署 AI 旅行规划师项目，以及如何配置 GitHub Actions 自动构建并推送到阿里云容器镜像服务。

## 📋 目录

- [本地 Docker 构建](#本地-docker-构建)
- [阿里云镜像仓库配置](#阿里云镜像仓库配置)
- [GitHub Secrets 配置](#github-secrets-配置)
- [GitHub Actions 自动部署](#github-actions-自动部署)
- [部署运行](#部署运行)

## 🏗️ 本地 Docker 构建

### 1. 构建镜像

```bash
docker build -t ai-travel-planner:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=你的_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_SUPABASE_KEY \
  .
```

### 2. 运行容器

```bash
docker run -d \
  -p 3008:3008 \
  --name ai-travel-planner \
  ai-travel-planner:latest
```

### 3. 访问应用

打开浏览器访问: `http://localhost:3008`

## ☁️ 阿里云镜像仓库配置

### 1. 登录阿里云容器镜像服务

访问 [阿里云容器镜像服务控制台](https://cr.console.aliyun.com/)

### 2. 创建命名空间

1. 在左侧菜单选择 "默认实例" -> "命名空间"
2. 点击 "创建命名空间"
3. 输入命名空间名称（例如：`your-namespace`）
4. 选择 "公开" 或 "私有"
5. 点击确定

### 3. 创建镜像仓库

1. 在左侧菜单选择 "默认实例" -> "镜像仓库"
2. 点击 "创建镜像仓库"
3. 填写仓库信息：
   - 仓库名称：`ai-travel-planner`
   - 命名空间：选择上一步创建的命名空间
   - 仓库类型：公开或私有
   - 摘要：AI 旅行规划师应用
4. 点击下一步，选择 "本地仓库"
5. 完成创建

### 4. 获取访问凭证

1. 点击右上角的用户头像
2. 选择 "访问凭证"
3. 设置或获取访问凭证（用户名和密码）
4. 记录以下信息：
   - 用户名（通常是阿里云账号）
   - 密码（固定密码）
   - 仓库地址（例如：`registry.cn-hangzhou.aliyuncs.com`）

## 🔐 GitHub Secrets 配置

在 GitHub 仓库中配置以下 Secrets：

### 访问路径

仓库页面 -> Settings -> Secrets and variables -> Actions -> New repository secret

### 需要配置的 Secrets

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `ALIYUN_USERNAME` | 阿里云容器镜像服务用户名 | `whyxingren` |
| `ALIYUN_PASSWORD` | 阿里云容器镜像服务密码 | `your-password` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIs...` |

**注意**：本项目使用阿里云个人版容器镜像服务，仓库地址已在 workflow 中配置为 `crpi-iow4r6khsrrml7t4.cn-shanghai.personal.cr.aliyuncs.com`，无需配置 `ALIYUN_NAMESPACE`。

### 配置步骤

1. 进入 GitHub 仓库
2. 点击 `Settings` 标签
3. 在左侧菜单中选择 `Secrets and variables` -> `Actions`
4. 点击 `New repository secret`
5. 输入 Secret 名称和值
6. 点击 `Add secret`
7. 重复步骤 4-6，添加所有必需的 Secrets

## 🚀 GitHub Actions 自动部署

### 触发条件

GitHub Actions 会在以下情况下自动执行：

1. **推送到 main 分支**
   ```bash
   git push origin main
   ```

2. **创建 tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **手动触发**
   - 进入 GitHub 仓库
   - 点击 `Actions` 标签
   - 选择 `Build and Push Docker Image to Aliyun` workflow
   - 点击 `Run workflow` 按钮

### 镜像标签规则

构建的镜像会自动打上以下标签：

- **main 分支推送**:
  - `latest`
  - `main`
  - `main-<git-sha>`

- **tag 推送**:
  - `v1.0.0` (tag 名称)
  - `<git-sha>`

### 查看构建状态

1. 进入 GitHub 仓库的 `Actions` 标签
2. 查看最新的 workflow 运行状态
3. 点击具体的运行记录查看详细日志

## 📦 部署运行

### 从阿里云拉取镜像

```bash
# 登录阿里云镜像仓库（个人版）
docker login --username=whyxingren crpi-iow4r6khsrrml7t4.cn-shanghai.personal.cr.aliyuncs.com

# 拉取最新镜像
docker pull crpi-iow4r6khsrrml7t4.cn-shanghai.personal.cr.aliyuncs.com/ai-travel-planner:latest
```

### 运行容器

#### 方式 1: 直接运行

```bash
docker run -d \
  -p 3008:3008 \
  --name ai-travel-planner \
  --restart unless-stopped \
  crpi-iow4r6khsrrml7t4.cn-shanghai.personal.cr.aliyuncs.com/ai-travel-planner:latest
```

#### 方式 2: 使用 Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  ai-travel-planner:
    image: crpi-iow4r6khsrrml7t4.cn-shanghai.personal.cr.aliyuncs.com/ai-travel-planner:latest
    container_name: ai-travel-planner
    ports:
      - "3008:3008"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

运行:

```bash
docker-compose up -d
```

### 更新部署

```bash
# 拉取最新镜像
docker pull crpi-iow4r6khsrrml7t4.cn-shanghai.personal.cr.aliyuncs.com/ai-travel-planner:latest

# 停止并删除旧容器
docker stop ai-travel-planner
docker rm ai-travel-planner

# 运行新容器
docker run -d \
  -p 3008:3008 \
  --name ai-travel-planner \
  --restart unless-stopped \
  crpi-iow4r6khsrrml7t4.cn-shanghai.personal.cr.aliyuncs.com/ai-travel-planner:latest
```

或使用 Docker Compose:

```bash
docker-compose pull
docker-compose up -d
```

## 🔍 故障排查

### 查看容器日志

```bash
docker logs ai-travel-planner
```

### 查看容器状态

```bash
docker ps -a | grep ai-travel-planner
```

### 进入容器调试

```bash
docker exec -it ai-travel-planner sh
```

### 常见问题

1. **镜像构建失败**
   - 检查 GitHub Secrets 是否正确配置
   - 查看 Actions 日志中的详细错误信息
   - 确认 Supabase 凭证是否有效

2. **推送到阿里云失败**
   - 确认阿里云账号凭证是否正确
   - 检查命名空间和仓库是否已创建
   - 确认网络连接是否正常

3. **容器运行异常**
   - 检查端口 3008 是否被占用
   - 查看容器日志排查错误
   - 确认环境变量是否正确传递

## 📝 注意事项

1. **安全性**
   - 不要在代码中硬编码任何敏感信息
   - 使用 GitHub Secrets 管理所有凭证
   - 定期更新阿里云访问密码

2. **性能优化**
   - Docker 镜像使用多阶段构建，优化镜像大小
   - 启用了 BuildKit 缓存，加速构建过程
   - 支持 amd64 和 arm64 多架构

3. **版本管理**
   - 建议使用语义化版本标签 (v1.0.0, v1.1.0 等)
   - 生产环境建议使用具体版本号而非 latest
   - 保留历史版本以便回滚

## 📚 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [阿里云容器镜像服务文档](https://help.aliyun.com/product/60716.html)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Next.js Docker 部署](https://nextjs.org/docs/deployment#docker-image)
