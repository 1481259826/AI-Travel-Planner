# PWA 应用图标

本文件夹包含 PWA (Progressive Web App) 所需的应用图标。

## 所需图标尺寸

根据 `public/manifest.json` 的配置，需要以下尺寸的图标：

### 标准图标 (purpose: any)
- **72x72** - icon-72x72.png
- **96x96** - icon-96x96.png
- **128x128** - icon-128x128.png
- **144x144** - icon-144x144.png
- **152x152** - icon-152x152.png
- **192x192** - icon-192x192.png
- **384x384** - icon-384x384.png
- **512x512** - icon-512x512.png

### Maskable 图标 (purpose: maskable)
- **192x192** - icon-192x192-maskable.png
- **512x512** - icon-512x512-maskable.png

## 图标设计建议

### 标准图标 (any)
- 使用应用的完整 logo
- 可以包含文字
- 不需要额外的安全区域
- 建议颜色：蓝色主题 (#3b82f6)
- 元素：飞机、地图、旅行相关符号

### Maskable 图标
- 必须在安全区域内（中心 80%）放置重要内容
- 周围 20% 可能被系统裁剪为圆形、方角等形状
- 建议使用纯色背景填充整个画布
- 核心图标元素应该在中心 80% 区域内

## 生成图标的方法

### 方法 1: 使用在线工具
推荐使用 PWA Asset Generator:
1. 访问 https://www.pwabuilder.com/imageGenerator
2. 上传一张 512x512 的基础图标
3. 生成所有需要的尺寸
4. 下载并放入此文件夹

### 方法 2: 使用 Figma
1. 创建 512x512 画布
2. 设计应用图标
3. 对于 maskable 图标，确保重要内容在中心 410x410 区域内
4. 导出所有需要的尺寸

### 方法 3: 使用命令行工具
安装 sharp-cli:
\`\`\`bash
npm install -g sharp-cli
\`\`\`

批量生成图标:
\`\`\`bash
# 从基础图标生成所有尺寸
sharp -i icon-source.png -o icon-72x72.png resize 72 72
sharp -i icon-source.png -o icon-96x96.png resize 96 96
sharp -i icon-source.png -o icon-128x128.png resize 128 128
sharp -i icon-source.png -o icon-144x144.png resize 144 144
sharp -i icon-source.png -o icon-152x152.png resize 152 152
sharp -i icon-source.png -o icon-192x192.png resize 192 192
sharp -i icon-source.png -o icon-384x384.png resize 384 384
sharp -i icon-source.png -o icon-512x512.png resize 512 512
\`\`\`

## 快速开始（临时图标）

如果需要快速测试 PWA 功能，可以使用纯色占位图标：

\`\`\`bash
# 使用 ImageMagick 生成蓝色占位图标
convert -size 192x192 xc:#3b82f6 -gravity center -pointsize 80 -fill white -annotate +0+0 "AI" icon-192x192.png
convert -size 512x512 xc:#3b82f6 -gravity center -pointsize 200 -fill white -annotate +0+0 "AI" icon-512x512.png
\`\`\`

或者手动创建：
1. 创建一个 512x512 的 PNG 图片
2. 填充蓝色背景 (#3b82f6)
3. 在中心添加白色的 "AI" 或飞机图标
4. 保存并复制为所有需要的尺寸

## 验证

生成图标后，可以使用以下工具验证：

1. **Chrome DevTools**
   - 打开开发者工具 > Application > Manifest
   - 检查所有图标是否正确加载

2. **Maskable.app**
   - 访问 https://maskable.app/editor
   - 上传 maskable 图标
   - 预览不同形状的效果

## 注意事项

- 所有图标必须是 PNG 格式
- 文件名必须与 manifest.json 中的配置一致
- 确保图标清晰，避免模糊或像素化
- Maskable 图标必须填充整个画布（无透明边缘）
- 测试不同设备和浏览器的显示效果

## 截图

manifest.json 还配置了应用截图（可选）：
- **dashboard.png** - 1280x720 (宽屏)
- **trip-details.png** - 750x1334 (手机竖屏)

截图可以通过浏览器截取应用界面生成。
