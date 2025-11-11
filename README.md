# 📚 Paper Library

Paper Library 是一个前后端分离的图书管理系统。后端基于 **Node.js + Express + Sequelize + MySQL**，前端采用 **Vue 3 + Vite + Element Plus**，主要用于：

- 后台管理员登录、查看健康状态；
- 图书、分类的增删改查；
- 借阅/归还操作与库存联动；
- 操作日志与借阅记录追踪；
- 未来可扩展读者端、自助借阅等功能。

---

## ✨ 功能亮点

- **分类化图书管理**：支持关键字搜索、分类筛选、分页展示；
- **借阅流程**：借出/归还自动更新库存，记录借阅人和联系方式，超期自动标记；
- **操作日志**：对图书、分类、借阅的增删改留痕，可追踪“谁在什么时候做了什么”；
- **学生自助门户**：读者可注册/登录、浏览馆藏、在线发起借阅并查看“我的借阅”；
- **自动种子数据**：首次启动时自动创建分类和精选书单，开箱即用；
- **统一鉴权**：通过 JWT 控制管理员权限，敏感操作需要登录；
- **前端管理面板**：Element Plus 提供的可视化表格/对话框，操作直观。

---

## 🗂 项目结构

```
Paper/
├── backend/                # Node.js + Express 后端
│   ├── app.js              # 入口，初始化与自定义种子逻辑
│   ├── .env                # 数据库、端口、JWT 等配置
│   └── src/
│       ├── models/         # Sequelize 模型（User/Book/Category/BorrowRecord/Log）
│       ├── controllers/    # 业务控制器（books/categories/borrows/logs/auth）
│       ├── routes/         # API 路由聚合
│       ├── middleware/     # 鉴权中间件
│       └── utils/          # 日志写入等工具
└── frontend/               # Vue 3 + Vite 前端
    ├── src/
    │   ├── pages/Home.vue  # 管理端单页
    │   ├── services/api.js # Axios 实例，统一注入 token
    │   └── ...             # 其他组件、样式、入口
    └── vite.config.js      # Vite 配置
```

---

## 🚀 快速开始

### 1. Backend
```bash
cd backend
npm install
npm run dev       # 开发模式（nodemon）
# 或 npm start    # 生产模式
```

环境变量 (`backend/.env`) 示例：
```
PORT=3000
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=paper_library
DB_USER=paper_user
DB_PASS=paper_pass
JWT_SECRET=super_secret_key_change_me
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

> 首次运行会自动同步数据表，并创建默认管理员与 20 本示例图书。

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

默认在 `http://localhost:5173` 打开。前端请求后端的 `http://localhost:3000/api`，可在 `src/services/api.js` 或 `VITE_API_BASE` 环境变量中调整。

---

## 🔐 账户与权限

- 默认管理员：`admin / admin123`（首次启动自动创建）；
- 登录成功后浏览器 LocalStorage 会保存 token，用于后续 API 调用；
- 只有管理员才能新增/编辑/删除图书、分类，执行借出/归还、查看日志等操作；
- 未登录状态只能看到健康检查，无法操作数据（读者端可在此基础上扩展）。

---

## 📡 主要接口（节选）

| Method | Endpoint                         | 描述                       |
|--------|----------------------------------|----------------------------|
| POST   | `/api/auth/login`                | 登录，返回 JWT             |
| POST   | `/api/auth/register`             | 学生注册并自动登录         |
| GET    | `/api/books`                     | 列出书籍，支持分页/搜索   |
| POST   | `/api/books`                     | 新增书籍（需管理员）       |
| PUT    | `/api/books/:id`                 | 更新书籍（需管理员）       |
| DELETE | `/api/books/:id`                 | 删除书籍（需管理员）       |
| GET    | `/api/categories`                | 获取分类列表               |
| GET    | `/api/borrow-records`            | 借阅记录 + 逾期状态        |
| POST   | `/api/books/:bookId/borrow`      | 借出（记录借阅人/联系方式）|
| POST   | `/api/borrow-records/:id/return` | 归还并回库存               |
| GET    | `/api/me/borrow-records`         | 当前登录用户的借阅记录     |
| GET    | `/api/logs`                      | 操作日志（管理员可见）     |

---

## 🧱 技术栈

- **后端**：Node.js, Express, Sequelize, MySQL, JWT, bcrypt, cors
- **前端**：Vue 3, Vite, Pinia（可拓展）, Vue Router, Element Plus, Axios
- **工具**：nodemon、dotenv、ESM/CJS 混合兼容

---

## 📦 部署建议

1. MySQL 部署到安全的实例并替换 `.env` 中的账号与密码；
2. 设置 `JWT_SECRET` 为高强度随机值；
3. 后端使用 `pm2` / `systemd` 等守护进程，前端可 `npm run build` 后部署到静态服务器或 CDN；
4. 若需要 HTTPS，使用反向代理（Nginx/Caddy）分别转发前后端流量；
5. 考虑添加 Sequelize migration，以便线上生产环境平滑升级表结构。

---

## 🛠 下一步可扩展方向

- 读者端页面（浏览、搜索、个人借阅历史、预约等）；
- 图书封面/PDF 上传与预览；
- 借阅规则（限额、逾期罚金、提醒通知）；
- 更完善的日志、统计报表与导出功能；
- 引入 OpenAPI/Swagger + 自动化测试，提升可维护性。

---

## 📄 License

可根据实际用途选择 MIT / Apache-2.0 等协议，或保持私有仓库。若需开放，请在本文件底部添加许可证说明。
