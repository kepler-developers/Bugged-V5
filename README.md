# BugDex 论坛 - 动态版本

## 🚀 项目概述

BugDex 是一个现代化的论坛应用，采用前后端分离架构，支持用户注册、登录、发帖、评论、点赞等完整功能。

## 🏗️ 技术架构

### 前端
- **HTML5** + **CSS3** + **JavaScript ES6+**
- **Bootstrap 5.3.3** - UI框架
- **响应式设计** - 支持移动端和桌面端

### 后端
- **EdgeOne Pages** - 云端边缘函数
- **EdgeOne KV** - 数据存储
- **JWT** - 用户认证
- **SendGrid** - 邮件服务（可选）

## 📁 项目结构

```
bugdex-edgeonenew/
├── index.html              # 主页面
├── script.js               # 前端逻辑
├── style.css               # 样式文件
├── package.json            # 项目配置
├── edgeone.json            # EdgeOne配置
├── api/                    # 后端API
│   ├── auth.js             # 认证相关API
│   ├── posts.js            # 帖子相关API
│   ├── users.js            # 用户相关API
│   └── test.js             # 测试API
└── README.md               # 项目说明
```

## 🚀 快速开始

### 1. 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev


### 2. 云端部署

```bash
# 安装EdgeOne CLI
npm install -g edgeone

# 本地测试EdgeOne函数
npm run edgeone:dev

# 部署到EdgeOne Pages
npm run edgeone:deploy
```

## 🔧 功能特性

### ✅ 已实现功能
- [x] **用户认证系统**
  - 用户注册（邮箱验证码）
  - 用户登录（JWT认证）
  - 用户登出
  - 会话管理

- [x] **帖子系统**
  - 发布新帖子
  - 查看帖子列表
  - 帖子详情页
  - 帖子点赞
  - 帖子评论

- [x] **用户中心**
  - 个人信息编辑
  - 我的帖子管理
  - 主题/语言设置
  - 通知/隐私设置

- [x] **排行榜系统**
  - 每周发帖排行榜
  - 实时数据更新

- [x] **搜索功能**
  - 帖子搜索
  - 用户搜索

- [x] **管理后台**
  - 帖子管理
  - 用户管理（隐藏入口）

### 🎨 UI/UX特性
- **现代化设计** - 深色主题，渐变色彩
- **响应式布局** - 完美适配各种设备
- **流畅动画** - 页面切换和交互动画
- **Bootstrap组件** - 统一的UI组件库
- **多语言支持** - 中英文切换

## 🧪 测试账号

为了方便测试，系统预设了以下测试账号：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| test | test123 | 测试用户 |
| user | user123 | 普通用户 |

## 📡 API接口

### 认证相关
- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册
- `POST /api/send_email_code` - 发送邮箱验证码

### 帖子相关
- `GET /api/posts` - 获取帖子列表
- `POST /api/posts` - 发布新帖子
- `GET /api/posts/:id` - 获取帖子详情
- `POST /api/posts/:id/like` - 点赞帖子
- `POST /api/posts/:id/comments` - 发表评论

### 用户相关
- `GET /api/user/profile` - 获取用户信息
- `PUT /api/user/profile` - 更新用户信息
- `GET /api/weekly` - 获取排行榜

### 搜索相关
- `GET /api/search/posts` - 搜索帖子
- `GET /api/search/users` - 搜索用户

## 🔐 安全特性

- **JWT认证** - 安全的用户会话管理
- **CORS支持** - 跨域请求处理
- **输入验证** - 前后端双重验证
- **文件上传限制** - 类型和大小限制
- **SQL注入防护** - 参数化查询

## 🌐 部署说明

### EdgeOne Pages部署

1. **准备环境**
   ```bash
   # 申请EdgeOne KV存储
   # 配置环境变量
   JWT_SECRET=your_jwt_secret
   SENDGRID_API_KEY=your_sendgrid_key
   SENDGRID_FROM_EMAIL=your_email
   ```

2. **部署步骤**
   ```bash
   # 推送代码到Git仓库
   git add .
   git commit -m "Deploy to EdgeOne"
   git push

   # 在EdgeOne控制台创建项目
   # 导入Git仓库
   # 配置环境变量和KV绑定
   # 触发部署
   ```

3. **域名配置**
   - 支持自定义域名
   - 自动HTTPS证书
   - 全球CDN加速

## 🛠️ 开发指南

### 添加新功能

1. **后端API**
   ```javascript
   // 在 api/ 目录下创建新的 .js 文件
   export async function onRequest({ request, env }) {
     // 实现API逻辑
   }
   ```

2. **前端调用**
   ```javascript
   // 在 script.js 中添加API调用
   const response = await fetch('/api/your-endpoint', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data)
   });
   ```

### 数据库操作

```javascript
// 写入数据
await env.bugdex_kv.put('key', JSON.stringify(data));

// 读取数据
const data = await env.bugdex_kv.get('key', { type: 'json' });

// 列表查询
const result = await env.bugdex_kv.list({ prefix: 'prefix:' });
```

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

### 🧪 测试方法

本地API服务器运行在 http://localhost:3001
主页面: http://localhost:3001
API测试页面: http://localhost:3001/test-api.html

