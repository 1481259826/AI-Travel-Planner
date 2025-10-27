# PWA 卸载指南

## Windows 系统

### 方法 1: 通过浏览器卸载（推荐）

#### Chrome 浏览器
1. 打开 Chrome 浏览器
2. 访问 `chrome://apps/`
3. 找到"AI 旅行规划"或"AI Travel Planner"
4. 右键点击图标 → 选择"从 Chrome 中移除"或"卸载"
5. 确认卸载

#### Edge 浏览器
1. 打开 Edge 浏览器
2. 访问 `edge://apps/`
3. 找到"AI 旅行规划"应用
4. 右键点击 → 选择"卸载"
5. 确认卸载

### 方法 2: 通过 Windows 设置卸载

1. 打开"设置" (Windows + I)
2. 进入"应用" → "应用和功能"或"已安装的应用"
3. 在搜索框输入"AI 旅行"
4. 找到应用后点击右侧的"..."或三个点
5. 选择"卸载"
6. 确认卸载

### 方法 3: 通过开始菜单卸载

1. 打开"开始菜单"
2. 找到"AI 旅行规划"应用
3. 右键点击应用图标
4. 选择"卸载"
5. 确认卸载

### 方法 4: 通过应用本身卸载

1. 启动已安装的 PWA 应用
2. 点击右上角的"..."菜单（三个点）
3. 选择"卸载 AI 旅行规划"
4. 确认卸载

---

## macOS 系统

### Chrome 浏览器
1. 打开 Chrome
2. 访问 `chrome://apps/`
3. 右键点击应用 → 选择"从 Chrome 中移除"

### Edge 浏览器
1. 打开 Edge
2. 访问 `edge://apps/`
3. 右键点击应用 → 选择"卸载"

### 从应用文件夹删除
1. 打开 Finder
2. 进入"应用程序"文件夹
3. 找到"AI Travel Planner"或"AI 旅行规划"
4. 拖到废纸篓或右键选择"移到废纸篓"

---

## 清除浏览器缓存（彻底清理）

卸载后，如果想彻底清理，可以清除浏览器缓存：

### Chrome/Edge
1. 访问应用网站 `http://localhost:3008`
2. 打开开发者工具 (F12)
3. 进入 **Application** 标签
4. 左侧选择 **Storage**
5. 点击 **Clear site data** 清除所有数据
6. 或者分别清除：
   - Service Workers → 注销
   - Cache Storage → 删除所有缓存
   - IndexedDB → 删除数据库
   - Local Storage → 清除
   - Cookies → 清除

### 手动清除浏览器数据
**Chrome:**
1. 设置 → 隐私和安全 → 清除浏览数据
2. 选择"时间范围：全部时间"
3. 勾选：缓存的图像和文件、Cookie 和其他网站数据
4. 点击"清除数据"

**Edge:**
1. 设置 → 隐私、搜索和服务 → 清除浏览数据
2. 选择"时间范围：始终"
3. 勾选：缓存的图像和文件、Cookie 和其他站点数据
4. 点击"立即清除"

---

## 重新安装 PWA

卸载并清除缓存后：

1. 完全关闭并重新打开浏览器
2. 访问 `http://localhost:3008`
3. 登录应用
4. 等待 2-3 秒，页面顶部应该会出现蓝色安装横幅
5. 点击"安装"按钮
6. 完成安装

### 如果安装横幅没有出现

1. **检查 localStorage：**
   - 打开开发者工具 (F12)
   - Console 标签输入并执行：
   ```javascript
   localStorage.removeItem('pwa-install-dismissed')
   ```
   - 刷新页面

2. **强制刷新：**
   - Windows: Ctrl + Shift + R
   - macOS: Cmd + Shift + R

3. **使用浏览器菜单安装：**
   - Chrome: 地址栏右侧的"安装"图标 (⊕)
   - Edge: 地址栏右侧的"应用可用"图标
   - 或者：浏览器菜单 → "安装 AI 旅行规划"

---

## 验证新图标

安装后验证新图标是否生效：

1. **查看快捷方式图标**
   - Windows: 开始菜单、桌面、任务栏
   - macOS: 应用程序文件夹、Dock

2. **查看应用窗口图标**
   - 启动应用后查看窗口标题栏图标

3. **查看 Manifest（开发者）**
   - F12 → Application → Manifest
   - 查看图标列表是否为新图标

---

## 常见问题

### Q: 卸载后图标/快捷方式还在？
A: 可能需要：
- 刷新桌面（F5）
- 重新启动资源管理器
- 重启电脑

### Q: 重新安装后还是旧图标？
A: 浏览器可能缓存了旧图标：
1. 彻底清除浏览器缓存（见上文）
2. 清除 Service Worker 缓存
3. 关闭浏览器后重新打开
4. 硬刷新 (Ctrl+Shift+R)
5. 重新安装

### Q: 找不到卸载选项？
A: 可能应用未正确安装为 PWA：
- 直接清除浏览器缓存即可
- 不需要卸载

### Q: 多个浏览器都安装了怎么办？
A: 需要在每个浏览器中分别卸载：
- Chrome 中卸载只会卸载 Chrome 安装的版本
- Edge 中卸载只会卸载 Edge 安装的版本

---

## 技术细节

PWA 安装位置（仅供参考）：

**Windows:**
- Chrome: `%LocalAppData%\Google\Chrome\User Data\Default\Web Applications`
- Edge: `%LocalAppData%\Microsoft\Edge\User Data\Default\Web Applications`

**macOS:**
- Chrome: `~/Library/Application Support/Google/Chrome/Default/Web Applications`
- Edge: `~/Library/Application Support/Microsoft Edge/Default/Web Applications`

**注意：** 不建议手动删除这些文件，请使用上述正规卸载方法。
