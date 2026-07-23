# Monster HomePage

一个面向计算机专业开发者的个人技术内容平台：**个人主页 + 技术博客 + 知识库 + 项目作品集 + 在线实验室 + 私有管理后台**。

## 技术架构

```text
Browser
  └─ HTTPS → Caddy
               ├─ /*      → Next.js 16
               └─ /api/*  → Spring Boot 4.1
                                └─ PostgreSQL 18
```

- **Web：** Next.js 16、React 19、TypeScript、App Router、SSR
- **API：** Java 21、Spring Boot 4.1、Spring Security、Spring Data JPA、Flyway
- **Database：** PostgreSQL 18
- **Deployment：** Docker Compose、Caddy、GitHub Actions、GHCR

前后端通过同一域名提供服务。浏览器访问 `/api/*` 时由 Caddy 转发到 Java API，不需要额外配置跨域 Cookie。

## 已实现功能

### 公共网站

- 响应式首页与亮色/暗色主题
- 博客列表、详情、标签展示、系列信息、Markdown/GFM、代码高亮
- 知识库列表、分类与 Markdown 详情
- 项目作品集与项目详情
- 全站内容搜索
- 联系表单与参数校验
- 关于、简历、装备、友情链接
- RSS、Sitemap、Robots、页面 Metadata
- 404、错误页和加载状态
- 在线实验室：JSON、Base64、URL、正则、时间戳、UUID、Markdown、JWT、Diff、Cron；每个工具均有独立 `/lab/{tool}` 路由并在浏览器本地处理输入
- 页面访问匿名统计；仅保存每日访客哈希，不保存原始 IP

### 管理后台

后台地址：`/admin`

- 单管理员 Session 登录、Spring Security 权限校验，以及 Next.js Proxy 提供的管理页面 HTTP 层 307 跳转保护
- Argon2 密码哈希、CSRF Token 写操作保护
- 仪表盘：文章、笔记、项目、联系消息统计
- 文章创建、编辑、草稿、发布、删除
- 笔记创建、编辑、发布、删除
- 项目创建、编辑、状态管理、删除
- 媒体管理：图片上传、魔数校验、5 MB 限制、预览、复制 URL、引用检查、删除
- 联系消息：全部/未读/已读/归档过滤、状态更新、邮件回复入口、删除
- 访问统计：今日、7 天、30 天、累计访问、30 天访客、趋势与热门页面
- 网站设置：站点信息、个人信息、社交链接、页脚及备案信息
- 标签管理：引用统计、重命名和安全移除
- 系列与分类管理：文章系列、笔记分类、项目技术栈的统计、重命名和移除
- 审计日志：记录管理接口成功执行的新增、修改、发布、删除等写操作，支持分页和刷新

管理后台页面：

```text
/admin/dashboard
/admin/posts
/admin/notes
/admin/projects
/admin/tags
/admin/series
/admin/media
/admin/messages
/admin/analytics
/admin/settings
/admin/audit-logs
```

### API 与数据

- Flyway 在 Hibernate Schema 校验前自动执行数据库迁移
- 统一 API 响应和异常结构
- 公共内容与管理内容分离
- PostgreSQL 持久化文章、笔记、项目、媒体元数据、联系消息、站点配置、访问统计和审计日志
- 媒体文件存储在独立 Docker Volume
- 对外提供 `/api/health`，容器内部使用 `/actuator/health` 进行健康检查

## 项目结构

```text
.
├─ api/                       Spring Boot API
├─ web/                       Next.js Web 与管理后台
├─ scripts/                   集成冒烟测试、数据库/媒体备份与恢复脚本
├─ .github/workflows/         CI 与生产发布
├─ Caddyfile                  HTTPS、安全响应头与同域反向代理
├─ docker-compose.yml         本地/生产基础编排
├─ compose.prod.yml           GHCR 生产镜像覆盖
└─ .env.example               环境变量模板
```

## 本地开发

### 1. 准备环境变量与 PostgreSQL

```bash
cp .env.example .env
# 修改 DB_PASSWORD、ADMIN_PASSWORD 和 ANALYTICS_SALT
docker compose --env-file .env up -d postgres
```

随机盐可使用：

```bash
openssl rand -hex 32
```

如果需要从宿主机连接 Compose 数据库，可临时为 `postgres` 增加 `5432:5432` 端口映射；生产环境不要暴露该端口。

### 2. 启动 Spring Boot

```bash
cd api
mvn spring-boot:run
```

默认 API 地址：`http://localhost:8080`。

开发环境默认管理员（仅当未覆盖环境变量时）：

```text
用户名：admin
密码：ChangeMe123!
```

> 生产环境必须通过 `.env` 设置新的强密码。直接使用 HTTP 调试 API 时，把 `SESSION_COOKIE_SECURE` 临时设为 `false`；通过 Caddy/HTTPS 访问时保持 `true`。

### 3. 启动 Next.js

```bash
cd web
npm ci
npm run dev
```

默认网站地址：`http://localhost:3000`。开发模式会把 `/api/*` 代理到 `http://localhost:8080`。

### 4. 使用 Docker Desktop 在 8088 端口运行

如果宿主机的 3000 端口已被其他项目占用，可以通过 Caddy 从 8088 访问完整容器栈。Web 容器内部仍监听 3000，但该端口不会发布到宿主机。

在本机 `.env` 中设置：

```dotenv
DOMAIN=localhost
CADDY_SCHEME=http://
SESSION_COOKIE_SECURE=false
HTTP_PORT=8088
HTTPS_PORT=8443
HTTPS_UDP_PORT=8443
```

然后启动：

```bash
docker compose up -d --build --wait
```

访问 `http://localhost:8088`，健康接口为 `http://localhost:8088/api/health`。

### 5. 配置 AI 内容辅助

登录后台后进入“网站设置”的“AI 接入”区域，填写 OpenAI 兼容接口的 Base URL、Model 和 API Key。Base URL 可以是 API 根路径，例如 `https://api.openai.com/v1`，也可以直接填写完整的 `/chat/completions` 地址。

配置完成后可以：

- 在文章、笔记和项目编辑器中根据正文生成摘要；
- 在博客文章编辑器中根据提示词生成 Markdown 正文，预览后选择替换或追加；
- 使用“测试连接”验证当前配置。

当前实现按产品选择将 API Key 明文保存到 `site_settings`。后台不会回显 Key，但数据库和数据库备份会包含该值，必须限制其访问权限并定期轮换 Key。

## 测试与构建

```bash
# 后端测试和打包
cd api
mvn verify

# 前端检查、安全审计和构建
cd ../web
npm audit --omit=dev --registry=https://registry.npmjs.org
npm run lint
npm run build

# 校验 Compose
cd ..
docker compose --env-file .env config --quiet
docker compose --env-file .env -f docker-compose.yml -f compose.prod.yml config
```

### 集成冒烟测试（本地 HTTP 模式）

`scripts/integration-smoke.py` 只使用 Python 标准库，会验证公共页面、10 个实验室路由、后台 307 跳转、Session/CSRF、内容发布与草稿隔离、搜索、媒体、联系消息、访问统计、设置、分类体系、审计日志和权限回收。脚本会清理它创建的主要测试数据，但访问记录和审计日志按设计保留。

Linux/macOS：

```bash
export DB_PASSWORD=test-db-password
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=test-admin-password
export ANALYTICS_SALT=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
export DOMAIN=127.0.0.1
export CADDY_SCHEME=http://
export SESSION_COOKIE_SECURE=false
export HTTP_PORT=8088
export HTTPS_PORT=8443
export HTTPS_UDP_PORT=8443

docker compose up -d --build --wait --wait-timeout 240
SMOKE_BASE_URL=http://127.0.0.1:8088 python3 scripts/integration-smoke.py
docker compose ps
```

PowerShell：

```powershell
$env:DB_PASSWORD='test-db-password'
$env:ADMIN_USERNAME='admin'
$env:ADMIN_PASSWORD='test-admin-password'
$env:ANALYTICS_SALT='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
$env:DOMAIN='127.0.0.1'
$env:CADDY_SCHEME='http://'
$env:SESSION_COOKIE_SECURE='false'
$env:HTTP_PORT='8088'
$env:HTTPS_PORT='8443'
$env:HTTPS_UDP_PORT='8443'
$env:SMOKE_BASE_URL='http://127.0.0.1:8088'

docker compose up -d --build --wait --wait-timeout 240
python scripts/integration-smoke.py
docker compose ps
```

### 生产式 HTTPS 验证

生产环境必须让 `CADDY_SCHEME` 保持为空，并使用 `SESSION_COOKIE_SECURE=true`。本地 `DOMAIN=localhost` 时 Caddy 使用本地证书，因此命令行验证需要 `curl -k`：

```bash
CADDY_SCHEME= DOMAIN=localhost SESSION_COOKIE_SECURE=true \
  docker compose --env-file .env up -d --build --wait
curl -kfsS https://localhost/api/health
curl -kI https://localhost/admin
curl -kI https://localhost/actuator/health
```

预期结果分别为健康接口 `200`、未登录后台 `307`、公网 Actuator `404`。真实域名上线后不要使用 `curl -k`。

### CI 验证

`.github/workflows/ci.yml` 包含三个 Job：

1. `backend`：执行 `mvn verify`；
2. `frontend`：执行 `npm ci`、Lint 和生产构建；
3. `integration`：构建完整 Compose 栈，在本地 HTTP 模式运行 `scripts/integration-smoke.py`，失败时输出全部容器状态与日志。

## 生产部署

### 服务器要求

- Linux 服务器，建议至少 2C4G
- Docker Engine 与 Docker Compose Plugin
- 域名 A/AAAA 记录已指向服务器
- 安全组只开放 `22`、`80`、`443`
- 不向公网开放 `3000`、`8080`、`5432`
- 中国大陆服务器需根据接入商要求完成备案

### 首次部署

```bash
mkdir -p /opt/monster-homepage
cd /opt/monster-homepage
# 上传 docker-compose.yml、compose.prod.yml、Caddyfile、scripts/ 和 .env.example
cp .env.example .env
chmod 600 .env
vim .env
chmod +x scripts/*.sh
```

`.env` 至少要修改：

```dotenv
DOMAIN=your-domain.com
CADDY_SCHEME=
DB_PASSWORD=数据库强随机密码
ADMIN_PASSWORD=管理员强随机密码
ANALYTICS_SALT=通过 openssl rand -hex 32 生成的随机值
SESSION_COOKIE_SECURE=true
```

从源码在服务器直接构建并启动：

```bash
docker compose --env-file .env up -d --build --wait
docker compose --env-file .env ps
docker compose --env-file .env logs -f caddy web api
```

健康检查：

```bash
curl -fsS https://your-domain.com/api/health
```

### GitHub Actions 自动发布

`.github/workflows/deploy.yml` 会：

1. CI 先执行 Java 测试、前端依赖安装、Lint、Next.js 构建和完整 Compose 集成冒烟测试；
2. 构建 Web/API 镜像并以 commit SHA 推送到 GHCR；
3. 上传 Compose、Caddy 和备份/恢复脚本；
4. 在已有服务上执行数据库与媒体备份；
5. 拉取指定镜像并使用 `--no-build` 重建服务；
6. 等待 API 健康检查；
7. 健康检查失败时恢复上一组镜像。

在 GitHub `production` Environment 或仓库 Secrets 中配置：

| Secret | 说明 |
|---|---|
| `DEPLOY_HOST` | 服务器 IP 或主机名 |
| `DEPLOY_USER` | SSH 用户 |
| `DEPLOY_SSH_PRIVATE_KEY` | SSH 私钥 |
| `DEPLOY_PATH` | 例如 `/opt/monster-homepage` |
| `DEPLOY_GHCR_TOKEN` | 具备 `read:packages` 的 Token |
| `SITE_URL` | 例如 `https://your-domain.com` |

服务器部署目录必须提前创建 `.env`，工作流不会上传或覆盖生产秘密。工作流会维护：

```text
.deploy-images.env             当前尝试运行的镜像
.deploy-images.good.env        最近一次通过健康检查的生产镜像
.deploy-images.failed.env      最近一次失败镜像（发生回滚时）
```

## 备份与恢复

### 创建备份

```bash
chmod +x scripts/*.sh
./scripts/backup.sh
```

默认输出到 `./backups`：

```text
backups/db-YYYYmmdd-HHMMSS.dump
backups/uploads-YYYYmmdd-HHMMSS.tar.gz
```

脚本默认保留 30 天，并使用临时文件避免把未完成的备份误认为成功备份。建议再使用 `rclone`、对象存储客户端或云厂商备份服务，把备份同步到 VPS 之外。

### 恢复数据库

```bash
./scripts/restore-db.sh backups/db-20260718-120000.dump
```

脚本会要求输入 `RESTORE`，停止 Web/API，重建 `public` schema，恢复数据库，再重新启动服务。恢复失败时 Web/API 保持停止，避免应用继续访问不完整的数据。

### 恢复媒体文件

```bash
./scripts/restore-uploads.sh backups/uploads-20260718-120000.tar.gz
```

脚本会校验压缩包路径、要求二次确认、停止 API、替换 uploads volume，然后重新启动 API。

> 生产环境恢复前建议先再做一次当前备份，并定期在临时环境执行恢复演练。

## 认证与 CSRF

- 登录：`POST /api/auth/login`，请求类型为 `application/x-www-form-urlencoded`
- 会话 Cookie：`MONSTER_SESSION`
- 当前用户：`GET /api/auth/me`
- CSRF：先请求 `GET /api/auth/csrf`，再使用返回的 `headerName` 和 `token` 发起管理写请求
- 管理接口：统一位于 `/api/admin/*`，必须具备 `ROLE_ADMIN`
- 公开接口：联系表单和页面访问上报不依赖登录 Session

## 上线前清单

- [ ] 替换首页、关于页、简历中的个人资料与联系方式
- [ ] 在后台设置站点名称、描述、邮箱、社交链接与备案信息
- [ ] 设置强数据库密码、管理员密码和随机统计盐
- [ ] 确认 `CADDY_SCHEME` 为空且 `SESSION_COOKIE_SECURE=true`
- [ ] 域名解析与 HTTPS 正常
- [ ] 防火墙未暴露 `3000`、`8080`、`5432`
- [ ] 完成数据库和媒体异地备份
- [ ] 验证管理员登录、内容发布、图片上传、联系表单和设置保存
- [ ] 在中国大陆部署时完成所需备案并展示备案号

## 后续扩展

可继续增加：内容修订恢复、定时发布调度、PostgreSQL 全文搜索增强、SMTP 通知、更精细的分布式限流、图片压缩与缩略图、Passkey/2FA、中英文双语和 Meilisearch。
