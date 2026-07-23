# Monster HomePage 部署与运维手册

本文档说明 Monster HomePage 在 Ubuntu 22.04 服务器上的首次部署、后续更新、备份恢复、域名与 HTTPS 配置、部署验证及常见故障处理。

> 当前生产环境参考信息：
>
> - 系统：Ubuntu 22.04
> - 项目目录：`/root/monster-homepage`
> - 域名：`www.hjs123.xin`
> - 容器编排：Docker Compose
> - 入口代理：Caddy
> - 数据库：PostgreSQL
> - 后端：Spring Boot
> - 前端：Next.js
>
> 文档和命令中不得写入数据库密码、管理员密码、SSL 私钥或服务器登录密码。

---

## 1. 部署架构

默认 `docker-compose.yml` 包含以下服务：

| 服务 | 作用 | 持久化/端口 |
| --- | --- | --- |
| `postgres` | PostgreSQL 数据库 | `postgres_data` Docker volume |
| `api` | Spring Boot API | `uploads_data` Docker volume，容器内 8080 |
| `web` | Next.js 前端 | 容器内 3000 |
| `caddy` | HTTPS、反向代理 | 宿主机 80/443，`caddy_data` 保存证书 |

启动依赖顺序由 Compose 健康检查保证：

```text
postgres healthy -> api healthy -> web healthy -> caddy
```

### 必须保护的数据

以下内容不应在普通更新过程中删除：

1. `.env`：生产环境密钥和域名配置；
2. `postgres_data`：数据库数据；
3. `uploads_data`：上传的头像、文章图片等媒体文件；
4. `caddy_data`：Caddy 自动申请的 HTTPS 证书；
5. `backups/`：数据库和媒体备份。

**禁止在生产服务器执行：**

```bash
docker compose down -v
docker volume prune -f
rm -rf /root/monster-homepage
```

`down -v` 会删除 Compose 管理的数据卷，可能导致数据库、上传文件和证书丢失。

---

## 2. 服务器要求

建议最低配置：

- Ubuntu 22.04；
- 2 核 CPU；
- 2 GB 内存，推荐 4 GB；
- 2～4 GB Swap；
- 至少 10 GB 可用磁盘；
- 已安装 Docker Engine 和 Docker Compose Plugin；
- 阿里云安全组放行 TCP 22、80、443，HTTPS/HTTP3 可额外放行 UDP 443。

检查环境：

```bash
docker --version
docker compose version
free -h
df -h /
swapon --show
```

如果服务器只有 1～2 GB 内存，必须使用本文“低内存服务器更新流程”分阶段构建，避免同时构建 API 和 Web。

---

## 3. 首次部署

### 3.1 创建项目目录

```bash
mkdir -p /root/monster-homepage
cd /root/monster-homepage
```

将项目文件上传到该目录。生产包至少应包含：

```text
api/
web/
scripts/
changes/
Caddyfile
docker-compose.yml
compose.prod.yml
.env.example
README.md
DEPLOY.md
AGENT.md
```

不要把本机 `.env`、`.git/`、`.idea/`、`.reasonix/`、`node_modules/`、`.next/`、Maven `target/`、备份文件或旧部署包加入压缩包。

### 3.2 创建生产环境配置

```bash
cd /root/monster-homepage
cp .env.example .env
chmod 600 .env
nano .env
```

生产环境至少确认以下配置：

```dotenv
DOMAIN=www.hjs123.xin
CADDY_SCHEME=
DB_NAME=monster_homepage
DB_USER=monster
DB_PASSWORD=<强随机数据库密码>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<强随机管理员密码>
ANALYTICS_SALT=<随机统计盐值>
SESSION_COOKIE_SECURE=true
API_IMAGE=monster-homepage-api:local
WEB_IMAGE=monster-homepage-web:local
```

生成随机值：

```bash
openssl rand -base64 32
openssl rand -hex 32
```

注意：

- `.env` 不能提交到 Git，也不能打进更新压缩包；
- `CADDY_SCHEME` 在正式域名环境保持空值，Caddy 会自动申请 HTTPS 证书；
- `.env.example` 只放占位值，不能放真实密钥。

检查配置是否存在，但不要直接打印完整 `.env`：

```bash
test -f .env && echo '.env 存在' || echo '.env 不存在'
stat -c '%a %n' .env
```

### 3.3 首次构建和启动

资源充足的服务器可以执行：

```bash
cd /root/monster-homepage
docker compose build api web
docker compose up -d
```

低内存服务器建议执行：

```bash
cd /root/monster-homepage
docker compose up -d postgres
docker compose --progress=plain build api
docker compose --progress=plain build web
docker compose up -d api web caddy
```

检查状态：

```bash
docker compose ps
```

期望结果：

```text
postgres  Up (healthy)
api       Up (healthy)
web       Up (healthy)
caddy     Up
```

---

## 4. 推荐的更新包制作方式

在本机项目根目录制作白名单压缩包，可避免把密钥、缓存、IDE 文件和压缩包自身打进去。

Windows PowerShell：

```powershell
tar -czf monster-homepage-update.tar.gz `
  api web scripts changes `
  Caddyfile docker-compose.yml compose.prod.yml `
  .env.example README.md DEPLOY.md AGENT.md
```

检查压缩包内容：

```powershell
tar -tzf .\monster-homepage-update.tar.gz | Select-Object -First 40
```

上传到服务器的实际项目目录：

```powershell
scp .\monster-homepage-update.tar.gz root@47.116.45.100:/root/monster-homepage/
```

上传后，压缩包实际路径是：

```text
/root/monster-homepage/monster-homepage-update.tar.gz
```

不是 `/root/monster-homepage-update.tar.gz`，也不是 `/opt/monster_homePage`。

---

## 5. 生产环境完整更新流程

以下命令适用于当前服务器使用默认 `docker-compose.yml`、在服务器本地构建镜像的方式。

### 5.1 进入目录并确认当前状态

```bash
cd /root/monster-homepage
pwd
docker compose ps
test -f .env && echo '.env 存在' || echo '.env 不存在'
ls -lh monster-homepage-update.tar.gz
free -h
df -h /
```

如果 `.env` 不存在、PostgreSQL 不健康或磁盘空间不足，应停止部署并先解决问题。

### 5.2 检查压缩包目录结构

```bash
tar -tzf ./monster-homepage-update.tar.gz | head -40
```

正确结构应直接包含：

```text
api/
web/
docker-compose.yml
Caddyfile
```

如果最外层出现额外的 `monster-homepage/` 目录，直接解压会产生嵌套目录，必须调整解压路径或重新打包。

检查压缩包没有生产 `.env`：

```bash
if tar -tzf ./monster-homepage-update.tar.gz | grep -Eq '^\./?\.env$'; then
  echo '错误：更新包包含 .env，请重新制作更新包'
else
  echo '更新包未包含 .env'
fi
```

### 5.3 备份数据库和上传文件

优先使用项目脚本，它会同时备份数据库和上传文件：

```bash
cd /root/monster-homepage
chmod +x scripts/*.sh
./scripts/backup.sh
ls -lh backups | tail
```

也可以手动生成 SQL 备份：

```bash
mkdir -p backups
docker compose exec -T postgres \
  sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > backups/monster_homepage_$(date +%Y%m%d_%H%M%S).sql
```

备份文件必须非空：

```bash
find backups -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TH:%TM %10s %f\n' | sort | tail
```

### 5.4 为当前镜像添加回滚标签

在覆盖镜像前保存当前可运行版本：

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
docker image tag monster-homepage-api:local "monster-homepage-api:rollback-$STAMP"
docker image tag monster-homepage-web:local "monster-homepage-web:rollback-$STAMP"
echo "回滚标签时间戳：$STAMP"
```

记录输出的时间戳，出现问题时用于回滚。

### 5.5 解压更新文件

```bash
cd /root/monster-homepage
tar -xzf ./monster-homepage-update.tar.gz -C .
```

确认关键文件和最新数据库迁移：

```bash
ls -ld api web
ls -l api/src/main/resources/db/migration | tail
```

Flyway 迁移文件只允许新增新的版本号，不应修改已在生产执行过的迁移文件。

### 5.6 低内存服务器分阶段构建

当前服务器内存较小，推荐先构建 API，再临时停止入口服务释放内存，最后构建 Web。

先构建 API：

```bash
cd /root/monster-homepage
docker compose --progress=plain build api
```

然后停止 Caddy、Web、API，但保持 PostgreSQL 运行：

```bash
docker compose stop caddy web api
docker compose ps
free -h
```

此时 `docker compose ps` 应只看到健康的 `postgres`。

单独构建 Web：

```bash
docker compose --progress=plain build web
```

Next.js 在下面这一步可能几十秒到数分钟没有新日志：

```text
Creating an optimized production build ...
```

不要仅因为暂时没有输出就重启服务器。可以在另一个 SSH 会话监控：

```bash
watch -n 3 'free -h; echo; ps -eo pid,pcpu,pmem,cmd --sort=-pcpu | head -12'
```

只要 `node`/`next build` 仍持续占用 CPU，就说明构建仍在进行。

> `--progress` 是 `docker compose` 的全局参数，推荐写法是：
>
> ```bash
> docker compose --progress=plain build web
> ```

### 5.7 启动新版本

两个镜像构建成功后执行：

```bash
docker compose up -d api web caddy
```

不要使用 `down -v`。普通 `up -d` 会保留数据库和上传文件卷，并在镜像变化后重建对应容器。

### 5.8 检查容器和 Flyway 迁移

```bash
docker compose ps
docker compose logs --tail=200 api
docker compose logs api | grep -Ei 'flyway|migration|error|exception' || true
```

API 启动时会自动执行尚未应用的 Flyway 迁移。出现 SQL、校验和、版本冲突或数据库连接错误时，不要反复重启，应先保存日志并排查迁移。

### 5.9 验证接口和页面

服务器本机验证：

```bash
docker compose exec -T api \
  curl --fail --silent --show-error http://127.0.0.1:8080/actuator/health
curl -I https://www.hjs123.xin/api/health
curl -I https://www.hjs123.xin/api/notes/tree
curl -I https://www.hjs123.xin/api/notes/item-2
curl -I https://www.hjs123.xin
```

健康接口应返回 HTTP 200。管理统计接口未登录返回 HTTP 401 属于正常安全行为。

浏览器重点验证：

```text
https://www.hjs123.xin
https://www.hjs123.xin/notes/item-2
https://www.hjs123.xin/admin/analytics
```

检查项目：

- 首页和静态资源正常；
- 大型知识库笔记能快速打开；
- 文章和笔记切换时滚动位置正常；
- 后台登录正常；
- PV、UV、UIP、地域、浏览器、设备、网络统计正常；
- 图片和上传文件正常显示；
- HTTPS 证书正常。

浏览器仍显示旧页面时，先执行：

```bash
docker compose restart web caddy
```

再在浏览器使用 `Ctrl + F5` 强制刷新。

---

## 6. 服务器重启后的处理

服务器重启不会删除 Docker volume。服务配置了 `restart: unless-stopped`，通常会自动恢复。

登录后执行：

```bash
cd /root/monster-homepage
docker compose ps
```

如果服务没有全部启动：

```bash
docker compose up -d
docker compose ps
```

如果重启发生在镜像构建过程中：

1. 之前的构建已被中止；
2. 正在运行的容器通常仍使用旧镜像；
3. 已成功构建完成的单个镜像可能仍然存在；
4. 不需要重新解压或恢复数据库，先检查状态，再从失败的服务继续构建。

检查镜像时间：

```bash
docker compose images
docker image ls 'monster-homepage-*'
```

---

## 7. 使用预构建镜像部署（可选）

如果服务器内存太小，不适合执行 Next.js/Maven 构建，可以在 CI 或本机 Docker Desktop 构建 Linux AMD64 镜像并推送到镜像仓库。

`compose.prod.yml` 是覆盖文件，不能单独使用。必须和主文件一起执行：

```bash
docker compose \
  -f docker-compose.yml \
  -f compose.prod.yml \
  pull api web
docker compose \
  -f docker-compose.yml \
  -f compose.prod.yml \
  up -d api web caddy
```

`.env` 中设置实际镜像地址，例如：

```dotenv
API_IMAGE=registry.example.com/monster-homepage-api:<版本号>
WEB_IMAGE=registry.example.com/monster-homepage-web:<版本号>
```

应使用固定版本号或 Git commit SHA，不建议生产环境长期使用可变的 `latest` 标签。

---

## 8. 域名和 HTTPS

### 8.1 DNS

将域名 A 记录指向服务器公网 IP：

```text
www.hjs123.xin -> 47.116.45.100
```

验证 DNS：

```bash
nslookup www.hjs123.xin
```

### 8.2 Caddy 自动 HTTPS

生产 `.env`：

```dotenv
DOMAIN=www.hjs123.xin
CADDY_SCHEME=
```

重新启动 Caddy：

```bash
cd /root/monster-homepage
docker compose up -d caddy
docker compose logs --tail=150 caddy
```

Caddy 默认会自动申请和续期证书，一般不需要手动上传 SSL 私钥。必须保证：

- DNS 已解析到本服务器；
- 阿里云安全组和系统防火墙允许 80/443；
- 没有其他进程占用 80/443；
- `caddy_data` volume 没有被删除。

验证：

```bash
curl -I https://www.hjs123.xin
```

---

## 9. 回滚流程

### 9.1 仅回滚应用镜像

如果新版本启动失败，但数据库迁移兼容旧版本，可使用第 5.4 节创建的标签回滚。

假设回滚时间戳为 `20260721-120000`：

```bash
docker image tag monster-homepage-api:rollback-20260721-120000 monster-homepage-api:local
docker image tag monster-homepage-web:rollback-20260721-120000 monster-homepage-web:local
docker compose up -d --force-recreate api web caddy
docker compose ps
```

### 9.2 恢复数据库

数据库恢复会替换当前数据库内容，必须确认备份文件和时间点：

```bash
cd /root/monster-homepage
./scripts/restore-db.sh backups/db-YYYYmmdd-HHMMSS.dump
```

脚本要求输入 `RESTORE` 确认，并会停止 Web/API、重建 `public` schema、恢复数据库后重新启动服务。

手动 SQL 备份的恢复方式与自带 `.dump` 脚本不同，不要把 SQL 文件传给 `restore-db.sh`。

### 9.3 恢复上传文件

```bash
cd /root/monster-homepage
./scripts/restore-uploads.sh backups/uploads-YYYYmmdd-HHMMSS.tar.gz
```

该操作会替换当前全部媒体文件，执行前应额外备份现有上传文件。

---

## 10. 常见问题与解决办法

### 10.1 `tar: Cannot open: No such file or directory`

原因通常是压缩包路径错误。当前压缩包实际位于：

```text
/root/monster-homepage/monster-homepage-update.tar.gz
```

解决：

```bash
cd /root/monster-homepage
pwd
ls -lh ./monster-homepage-update.tar.gz
tar -xzf ./monster-homepage-update.tar.gz -C .
```

不要凭记忆使用 `/opt/monster_homePage` 等不存在的路径，先通过 `pwd` 和 `ls` 确认。

### 10.2 Next.js 构建长时间停在 optimized production build

现象：

```text
[builder 5/5] RUN npm run build
Creating an optimized production build ...
```

常见原因：服务器只有约 1.6 GB 内存，同时运行 API、Web、Caddy 后可用内存不足，构建进程发生严重内存和 Swap 竞争。

处理：

```bash
# 在构建窗口按 Ctrl+C，停止本次构建；不要重启服务器
cd /root/monster-homepage

# PostgreSQL 保持运行，释放其他服务占用的内存
docker compose stop caddy web api
free -h

# 单独构建前端
docker compose --progress=plain build web

# 成功后恢复服务
docker compose up -d api web caddy
```

监控构建：

```bash
watch -n 3 'free -h; echo; ps -eo pid,pcpu,pmem,cmd --sort=-pcpu | head -12'
```

检查是否发生 OOM：

```bash
dmesg -T | grep -Ei 'out of memory|oom|killed process' || true
```

若停止其他容器后仍无法构建，改用预构建镜像部署，不要反复重启服务器。

### 10.3 构建命令提示 `--progress is a global compose flag`

推荐使用：

```bash
docker compose --progress=plain build web
```

而不是：

```bash
docker compose build --progress=plain web
```

### 10.4 重启服务器后不知道构建是否成功

执行：

```bash
cd /root/monster-homepage
docker compose ps
docker compose images
docker image ls 'monster-homepage-*'
```

容器 `CREATED` 时间不等于镜像构建时间。只有执行 `docker compose up -d` 后，新镜像才会替换旧容器。

### 10.5 `.env` 不存在

停止部署，不要直接复制包含默认弱密码的配置上线：

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

服务器此前已经上线时，应优先从安全备份恢复原 `.env`，避免随意修改数据库密码造成 API 无法连接。

### 10.6 API 或 Web 显示 `unhealthy`

```bash
docker compose ps
docker compose logs --tail=200 api
docker compose logs --tail=200 web
docker inspect --format '{{json .State.Health}}' monster-homepage-api-1
```

常见原因包括数据库未就绪、Flyway 失败、环境变量错误、前端启动失败或内存不足。

### 10.7 Flyway 数据库迁移失败

```bash
docker compose logs api | grep -Ei 'flyway|migration|checksum|sql|exception'
```

处理原则：

- 不要修改已在生产执行过的 `V1`～`Vn` 文件；
- 修复应新增更高版本迁移，例如 `V6__description.sql`；
- 不要随意执行 `flyway repair`；
- 先保留日志和数据库备份，再决定修复或回滚。

### 10.8 HTTPS 失败或证书无法申请

```bash
docker compose logs --tail=200 caddy
ss -lntup | grep -E ':80|:443'
nslookup www.hjs123.xin
```

检查 DNS、安全组、防火墙、80/443 端口占用及 `.env` 中的 `DOMAIN`。

### 10.9 终端输出出现 `鈻?`、`鉁?` 等乱码

这通常是本机 SSH/PowerShell 的字符编码显示问题，不一定代表项目文件或网页乱码。构建成功与否应看英文关键字、退出码和容器状态，例如：

```text
Compiled successfully
Image ... Built
Up (healthy)
```

Windows PowerShell 可先执行：

```powershell
chcp 65001
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

如果网页本身乱码，再检查源码文件是否以 UTF-8 保存、HTTP `Content-Type` 是否包含 `charset=utf-8`。

### 10.10 浏览器显示旧版本

```bash
docker compose images
docker compose up -d --force-recreate api web
docker compose restart caddy
```

然后浏览器使用 `Ctrl + F5`。如果镜像创建时间仍是旧时间，说明新镜像并未构建成功。

### 10.11 磁盘空间不足

```bash
df -h
docker system df
```

确认新版本运行和备份有效后，可清理悬空镜像：

```bash
docker image prune -f
```

不要执行 `docker volume prune`。

### 10.12 后台接口返回 HTTP 401

未登录访问 `/api/admin/**` 返回 401 是预期行为。应先通过后台登录页面建立会话，再验证管理接口。

---

## 11. 备份计划

手动备份：

```bash
cd /root/monster-homepage
./scripts/backup.sh
```

建议使用 Cron 每天备份一次：

```bash
crontab -e
```

示例：每天凌晨 03:20 执行，日志写入项目备份目录：

```cron
20 3 * * * cd /root/monster-homepage && /bin/sh ./scripts/backup.sh >> ./backups/backup.log 2>&1
```

备份文件还应定期复制到另一台服务器或对象存储。只保存在同一块系统盘上的备份无法防范磁盘损坏或服务器误删。

---

## 12. 常用运维命令

```bash
cd /root/monster-homepage

# 查看状态
docker compose ps

# 查看所有服务最近日志
docker compose logs --tail=100

# 实时查看 API 日志
docker compose logs -f --tail=100 api

# 重启单个服务
docker compose restart api

# 启动或更新服务
docker compose up -d api web caddy

# 查看镜像
docker compose images

# 查看资源
docker stats --no-stream
free -h
df -h /

# 健康检查
docker compose exec -T api \
  curl --fail --silent --show-error http://127.0.0.1:8080/actuator/health
curl -I https://www.hjs123.xin/api/health
curl -I https://www.hjs123.xin

# 备份
./scripts/backup.sh
```

---

## 13. 每次上线检查清单

### 上线前

- [ ] 本地后端测试通过；
- [ ] 本地前端 lint/build 通过；
- [ ] 本地 Docker Compose 验证通过；
- [ ] 本次改动已经记录到 `changes/`；
- [ ] 更新包不包含 `.env`、缓存、IDE 目录或备份；
- [ ] 服务器 `.env` 存在；
- [ ] PostgreSQL 健康；
- [ ] 数据库和上传文件备份成功且非空；
- [ ] 当前 API/Web 镜像已添加回滚标签；
- [ ] 磁盘和内存足够。

### 上线后

- [ ] API、Web、PostgreSQL 状态为 healthy；
- [ ] Caddy 正常运行；
- [ ] Flyway 没有迁移错误；
- [ ] 首页、文章、知识库和后台登录正常；
- [ ] 上传图片可访问；
- [ ] 后台访问统计正常；
- [ ] HTTPS 证书正常；
- [ ] 记录上线版本、时间和回滚标签。
---

## 14. 2026-07-21 实际部署记录

本次更新在一台约 1.6 GiB 内存、2 GiB Swap 的 Ubuntu 22.04 服务器上完成。

### 部署中遇到的问题

1. 最初使用了错误的压缩包和目标目录：`/root/monster-homepage-update.tar.gz`、`/opt/monster_homePage`；实际压缩包及项目都位于 `/root/monster-homepage/`。
2. 同时执行 `docker compose build api web` 时，Web 长时间停在 Next.js 的 `Creating an optimized production build ...`。
3. 重启服务器只会中止构建，不会解决构建时可用内存不足的问题；旧容器在重启后仍可自动恢复。

### 最终成功步骤

```bash
cd /root/monster-homepage

# API 单独构建成功
docker compose --progress=plain build api

# 停止入口和应用容器，只保留 PostgreSQL
docker compose stop caddy web api

# Web 单独构建成功
docker compose --progress=plain build web

# 启动新版本
docker compose up -d api web caddy
```

停止 API、Web、Caddy 后，可用内存从约 483 MiB 增加到约 1.1 GiB；随后 Next.js 生产构建约 41 秒完成。

### 最终验证结果

- `postgres`、`api`、`web` 均为 `healthy`；
- `caddy` 正常监听 80/443；
- `https://www.hjs123.xin` 返回 HTTP/2 200；
- Flyway 成功校验 5 个迁移，并将数据库更新到 V5；
- Spring Boot 正常启动并监听容器内 8080 端口。

本次结论：低内存服务器应始终分阶段构建，并在构建 Web 前临时停止 Caddy、Web 和 API；不要通过反复重启服务器处理编译阶段无输出的问题。
