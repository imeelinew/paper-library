Paper 项目拆成 `backend`（Node + Express + Sequelize）和 `frontend`（Vue 3 + Vite + Element Plus），后端提供 `/api/health`、`/api/books`，前端用 axios 调它们；下面逐层拆解文件与作用。

**High Level**
- Monorepo 结构：`Paper/backend` 负责 API，`Paper/frontend` 管界面，两个目录各自 `npm install` 后独立启动，互不影响部署。
- 数据流：前端在 `frontend/src/pages/Home.vue:22` 里把 axios 指到 `http://localhost:3000/api`，对应后端在 `backend/app.js:10` 挂载的 `/api` 路由。
- 环境约定：数据库、端口和 JWT 密钥都收敛在 `backend/.env:1`，本地或上线只需改这里即可。
- 依赖管理：`backend/package.json:1` 与 `frontend/package.json:1` 定义了脚本（`npm run dev`/`npm run build`）和第三方库，运行或打包都靠它们。

**Backend Files**
- `backend/app.js:1` 是入口，初始化 Express、CORS、JSON 解析，连上数据库后跑 `sequelize.sync()`，首跑时自动塞 Demo 分类和两本书，最后监听 `PORT`。
- `backend/src/config/database.js:1` 用 `.env` 中的主机/账号配置 Sequelize，并关闭 SQL 日志，所有模型都会复用同一个连接。
- `backend/src/models/index.js:1` 定义了用户、图书、分类、借阅记录、日志的字段和关联（书属于分类、借阅记录连着用户+书等），对外导出统一的模型对象。
- `backend/src/middleware/auth.js:1` 解析 `Authorization: Bearer <token>`，用 `JWT_SECRET` 校验并把用户信息挂在 `req.user`，也能限制需特定角色的接口。
- `backend/src/routes/index.js:1` 负责实际 API：`/health` 回服务状态，`/books` 查前 20 条书，再由 `app.js` 把整组路由挂到 `/api`。
- 空文件夹 `backend/src/controllers`、`backend/src/utils` 预留给后续的业务分层与工具函数，避免所有逻辑都堆在路由里。

**Frontend Files**
- `frontend/src/main.js:1` 创建 Vue 应用，注入 Pinia、Vue Router、Element Plus，然后挂载 `App`。
- `frontend/src/App.vue:1` 只渲染 `<router-view>`，让每个路由组件完全掌控屏幕。
- `frontend/src/router/index.js:1` 配出了主页路由 `/`，后续新增页面只要在这里继续追加配置。
- `frontend/src/pages/Home.vue:1` 用 Element Plus 卡片+表格包住页面：挂载时自动请求 `/health`，按钮触发 `/books`，把 `data.data` 填进表格。
- `frontend/src/components/HelloWorld.vue:1` 延续 Vite 官方示例，可作为写新组件的参考，目前并未被路由引用。
- `frontend/src/style.css:1` 仍是 Vite 默认全局样式，统一了字体、背景和按钮；`frontend/vite.config.js:1` 维持默认插件配置，后续可在这里追加代理或构建优化。

**How Things Work**
- 启动步骤：在 `backend` 执行 `npm install && npm run dev`，看到 "Backend running ..." 后，再去 `frontend` 做同样的安装并 `npm run dev`，浏览器即可访问前端开发服务器。
- 首次运行后端时 `bootstrap`（`backend/app.js:14`）会 `sequelize.sync()` 建表，并在数据库为空时写入 Demo 分类与两本书，保证接口立即能返回数据。
- 前端的 axios 实例（`frontend/src/pages/Home.vue:22`）统一设置 `baseURL` 和超时，所有请求都走同一个配置。
- Element Plus 表格直接使用 `books` 数组（`frontend/src/pages/Home.vue:7`），不用手写 DOM，点击按钮时 axios 结果会自动映射到表格行。
- 如果要加鉴权，只需在路由中引入 `auth` 中间件并传入角色限制（`backend/src/middleware/auth.js:4`），再让前端请求时附带 token；配置变化（端口、数据库、密钥）统一改 `.env` 即可。

下一步可以考虑：
1. 在 `backend/src/controllers` 里编写实际的新增/修改书籍、借阅逻辑，再让 `routes` 仅负责路由与参数校验。
2. 给前端新增“创建/编辑图书”页面，提交表单到后端，从而真正维护数据库内容而不是只读 Demo 数据。
3. 加入基础的接口测试或前端组件测试，保证后续重构时核心流程不会被破坏。
