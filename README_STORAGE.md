# 数据存储说明

## 数据存储位置

### 1. `data.json` - 原始静态数据
- **位置**: 项目根目录的 `data.json` 文件
- **内容**: 原始的分类、子分类、子类和视频项目数据
- **特点**: 
  - 静态文件，浏览器无法直接修改
  - 只能通过手动编辑或服务器端脚本修改
  - 这是"只读"的基础数据

### 2. `localStorage` - 用户自定义数据
- **位置**: 浏览器的 localStorage（在浏览器中）
- **内容**: 
  - 用户添加的新按钮 (`video_portal_user_added_items`)
  - 用户编辑的按钮（覆盖原始数据）
  - 删除的按钮 ID (`video_portal_deleted_items`)
  - 收藏的按钮 ID (`video_portal_favorites`)
  - 置顶的按钮 ID (`video_portal_pins`)
  - 分类排序 (`video_portal_category_order`)
  - 子分类排序 (`video_portal_subcategory_order_*`)
  - 筛选设置 (`video_portal_daily_random_filter`)
  - 侧边栏状态 (`sidebar_collapsed`)
- **特点**:
  - 只在当前浏览器中有效
  - 清除浏览器数据会丢失
  - 可以通过导入/导出功能备份

## 如何查看 localStorage 数据

### 方法 1: 浏览器开发者工具
1. 按 F12 打开开发者工具
2. 切换到 "Application" 标签（Chrome）或 "Storage" 标签（Firefox）
3. 展开 "Local Storage"
4. 点击你的网站域名
5. 查看以 `video_portal_` 开头的键

### 方法 2: 使用导出功能
1. 点击侧边栏底部的 "📥 导出" 按钮
2. 下载的 JSON 文件包含所有用户自定义数据

### 方法 3: 浏览器控制台
在浏览器控制台（F12 → Console）中运行：
```javascript
// 查看用户添加的项目
console.log(JSON.parse(localStorage.getItem('video_portal_user_added_items')));

// 查看所有相关的 localStorage 数据
Object.keys(localStorage).filter(key => key.startsWith('video_portal_')).forEach(key => {
    console.log(key + ':', localStorage.getItem(key));
});
```

## 数据合并逻辑

当显示按钮时，系统会：
1. 从 `data.json` 加载原始数据
2. 从 `localStorage` 加载用户自定义数据
3. 合并两者：
   - 用户添加的新按钮会添加到相应位置
   - 用户编辑的按钮（相同 ID）会替换原始按钮
   - 删除的按钮会被过滤掉
   - 应用排序、收藏、置顶等设置

## 如果需要永久保存到 data.json

### 选项 1: 手动编辑（推荐用于少量更改）
1. 导出所有数据
2. 查看导出的 JSON 文件中的 `userAddedItems`
3. 手动将更改合并到 `data.json`
4. 上传更新后的 `data.json`

### 选项 2: 使用导出功能（推荐用于备份）
- 定期导出数据作为备份
- 如果需要迁移到其他浏览器或设备，导入备份文件

### 选项 3: 创建合并脚本（未来功能）
可以创建一个脚本来：
1. 读取 `data.json`
2. 读取导出的备份文件
3. 合并所有更改
4. 生成新的 `data.json` 文件

## 注意事项

- **数据持久性**: localStorage 数据只在当前浏览器中有效
- **清除数据**: 清除浏览器数据会丢失所有自定义设置
- **多设备同步**: 需要在每个设备上单独导入/导出数据
- **备份**: 建议定期使用导出功能备份数据

## 未来改进建议

1. 添加"合并到 data.json"功能（生成包含所有更改的完整 data.json）
2. 添加云端同步功能（需要后端服务器）
3. 添加自动备份功能

