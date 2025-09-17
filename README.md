# Web Inbox - 类 Heynote 应用

一个基于 Web 的笔记/剪贴板应用，支持文本和图片粘贴，所有内容实时同步到 Appwrite 后端。

## 功能特性

- 🔐 用户认证（基于 Appwrite 的邮件/密码登录）
- 📝 文本笔记支持
- 🖼️ 图片粘贴和上传
- ⌨️ 键盘快捷键支持
- 🔄 实时数据同步
- 📱 响应式设计

## 技术栈

- **前端**: React + Vite
- **样式**: Tailwind CSS
- **后端**: Appwrite (BaaS)
- **路由**: React Router

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Appwrite

1. 在 [Appwrite Console](https://cloud.appwrite.io) 创建新项目
2. 配置数据库和存储桶（参考下面的详细配置）
3. 创建 `.env.local` 文件并配置环境变量：

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_DATABASE_ID=primary_db
VITE_COLLECTION_ID=blocks
VITE_BUCKET_ID=images
```

### 3. 启动开发服务器

```bash
npm run dev
```

## Appwrite 后端配置

### 1. 创建数据库

- 数据库名称: `Primary Database`
- 数据库 ID: `primary_db`

### 2. 创建集合

- 集合名称: `Blocks`
- 集合 ID: `blocks`

#### 集合属性配置

| 属性名  | 类型   | 大小  | 必需 | 默认值 | 说明                                    |
| ------- | ------ | ----- | ---- | ------ | --------------------------------------- |
| content | string | 10000 | 否   | -      | 文本内容                                |
| type    | enum   | -     | 是   | text   | elements 填写 text 回车后继续输入 image |
| userId  | string | 255   | 是   | -      | 用户 ID                                 |
| fileId  | string | 255   | 否   | -      | 图片文件 ID                             |

#### 集合权限配置

- 角色: `role:member`
- 权限: Create, Read, Update, Delete

### 3. 创建存储桶

- 存储桶名称: `Images`
- 存储桶 ID: `images`

#### 存储桶权限配置

- 角色: `role:member`
- 权限: Create, Read, Update, Delete

### 4. 配置认证

- 启用 Email/Password 登录方式

## 使用说明

### 键盘快捷键

- **Enter**: 在当前块下方创建新的文本块
- **Shift + Enter**: 在当前文本块内换行
- **粘贴**: 直接粘贴文本或图片到页面

### 功能操作

1. **创建文本块**: 点击空白区域或按 Enter
2. **编辑文本**: 点击文本块进行编辑
3. **删除块**: 悬停在块上，点击删除按钮
4. **粘贴图片**: 直接粘贴剪贴板中的图片
5. **自动保存**: 文本编辑会自动保存

## 项目结构

```
src/
├── api/
│   └── appwrite.js          # Appwrite API 封装
├── components/
│   ├── AuthForm.jsx         # 登录/注册表单
│   ├── Block.jsx            # 单个块组件
│   ├── Inbox.jsx            # 主界面容器
│   └── Loader.jsx           # 加载指示器
├── context/
│   └── AuthContext.jsx      # 认证上下文
├── hooks/
│   └── useDebounce.js       # 防抖 Hook
├── pages/
│   ├── AuthPage.jsx         # 认证页面
│   └── InboxPage.jsx        # 主页面
├── App.jsx                  # 路由配置
└── main.jsx                 # 应用入口
```

## 开发说明

### 环境变量

所有 Appwrite 相关配置都通过环境变量管理，确保在生产环境中正确配置。

### 错误处理

应用包含完整的错误处理机制，包括：

- 网络请求错误
- 认证失败
- 文件上传失败
- 数据同步错误

### 性能优化

- 使用防抖技术减少 API 调用
- 图片懒加载
- 组件按需渲染

## 部署

1. 构建生产版本：

```bash
npm run build
```

2. 部署到静态文件服务器（如 Vercel, Netlify 等）

3. 确保环境变量在生产环境中正确配置

## 许可证

MIT License
