# 视频门户网站

一个简洁美观的视频聚合门户，展示来自 YouTube、Bilibili、Instagram 等平台的内容。

## 功能特点

- 🎨 美观的深色主题界面
- 📺 支持多平台内容聚合（YouTube、Bilibili、Instagram）
- 🎲 随机内容推荐
- 📱 响应式设计
- ⚡ 纯前端实现，无需后端

## 使用方法

### 1. 添加内容源

编辑 `data.json` 文件，添加您要关注的内容源：

```json
[
  {
    "id": 1,
    "name": "YouTube 频道名称",
    "type": "youtube",
    "url": "https://rsshub.app/youtube/channel/username",
    "tags": "标签1, 标签2"
  },
  {
    "id": 2,
    "name": "Bilibili UP主名称",
    "type": "bilibili",
    "url": "https://rsshub.app/bilibili/user/video/UID",
    "tags": "标签1, 标签2"
  },
  {
    "id": 3,
    "name": "手动合集",
    "type": "collection",
    "url": "https://www.bilibili.com/video/BV1xxxxx",
    "thumbnail": "https://example.com/thumbnail.jpg",
    "tags": "合集"
  }
]
```

### 2. URL 格式说明

#### YouTube 博主主页
- 直接使用主页链接：`https://www.youtube.com/@username`
- 系统会自动转换为 RSS feed

#### Bilibili 用户主页
- 直接使用主页链接：`https://space.bilibili.com/UID`
- 系统会自动转换为 RSS feed

#### 单个视频/合集
- 类型设置为 `collection`
- URL 直接使用视频链接
- 可以自定义 `thumbnail` 封面图片

### 3. 运行

使用任何 HTTP 服务器运行：

```bash
# 使用 Python
python -m http.server 8000

# 使用 Node.js
npx http-server

# 使用 VS Code Live Server
# 右键 index.html -> Open with Live Server
```

然后在浏览器中打开 `http://localhost:8000`

## 项目结构

```
video_portal_website/
├── index.html      # 主页面
├── main.js         # 核心逻辑
├── style.css       # 样式文件
├── data.json       # 数据源文件（编辑此文件添加内容）
└── README.md       # 说明文档
```

## 数据格式

每个数据项包含以下字段：

- `id`: 唯一标识符（数字）
- `name`: 显示名称
- `type`: 类型（`youtube`, `bilibili`, `instagram`, `collection`, `other`）
- `url`: RSS feed URL 或视频链接
- `tags`: 标签（逗号分隔，可选）
- `thumbnail`: 封面图片 URL（仅 collection 类型需要，可选）

## 注意事项

- 数据文件 `data.json` 必须是有效的 JSON 格式
- 修改 `data.json` 后需要刷新页面才能看到更新
- 确保 RSS feed URL 可访问（可以使用 RSSHub）
- 单个视频使用 `collection` 类型，需要提供 `thumbnail`
