# 阿里云 ECS 部署记录

> 部署时间：2026-07-19  
> 目标服务器：阿里云 ECS / Ubuntu 24.04 LTS  
> 公网 IP：47.116.45.100

---

## 1. 项目结构

```
monster_homePage/
├── api/                          # Spring Boot 4.1.0 / Java 21
│   ├── Dockerfile                # 多阶段构建：maven:3.9.11 → eclipse-temurin:21-jre
│   ├── pom.xml
│   └── src/
├── web/                          # Next.js 16.2.10 (Turbopack)
│   ├── Dockerfile                # 多阶段构建：node:22-alpine → standalone 输出
│   ├── package.json
│   ├── next.config.ts
│   └── src/ → app/ + components/ + lib/
├── Caddyfile                     # Caddy 2.10 反向代理配置
├── docker-compose.yml            # 4 个服务：postgres, api, web, caddy
├── compose.prod.yml              # 生产环境覆盖配置（可选）
├── .env                          # 环境变量（敏感信息不入库）
├── .env.example                  # .env 模板
└── scripts/
    ├── backup.sh                 # 数据库备份脚本
    ├── restore-db.sh             # 数据库恢复脚本
    └── restore-uploads.sh        # 上传文件恢复脚本
```

### Docker Compose 服务架构

```
Internet → :80/:443 → Caddy → /api/* /uploads/* → API (Java, :8080)
                            → /*              → Web (Next.js, :3000)
                  API    → PostgreSQL (:5432)
```

---

## 2. 前置准备：配置 .env

部署前将 `.env` 中的值从测试占位改为生产配置：

| 变量 | 修改前 | 修改后 | 说明 |
|------|--------|--------|------|
| `DOMAIN` | `localhost` | `47.116.45.100` | 无域名时使用公网 IP |
| `CADDY_SCHEME` | `http://` | `http://` | 无域名时强制 HTTP，无法启用 HTTPS |
| `DB_PASSWORD` | `test-db-password` | `openssl rand -hex 32` 生成 | 强随机密码 |
| `ADMIN_PASSWORD` | `test-admin-password` | 替换为实际密码 | 后台登录密码 |
| `ANALYTICS_SALT` | 测试值 | `openssl rand -hex 32` 生成 | 访问统计哈希盐 |
| `SESSION_COOKIE_SECURE` | `true` | `false` | 无 HTTPS 时必须关闭 |

> 生成强随机值的命令：`openssl rand -hex 32`

---

## 3. SSH 连接准备

### 3.1 本地环境

- 操作系统：Windows 11 + Git Bash
- Python 3.13.5
- 安装 paramiko：`pip install paramiko`

### 3.2 连接信息

```
公网 IP: 47.116.45.100
用户名:  root
端口:    22
认证:    密码认证
```

### 3.3 遇到的问题

1. **sshpass 不可用** — Windows Git Bash 无此命令，改用 Python paramiko 库实现自动化 SSH
2. **认证失败** — 初始密码不正确，确认正确密码后连接成功
3. **主机指纹** — 首次连接需手动 `ssh root@47.116.45.100` 接受 `ED25519` 指纹

### 3.4 Python SSH 连接示例

```python
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    '47.116.45.100',
    username='root',
    password='your-password',
    look_for_keys=False,
    allow_agent=False,
)

stdin, stdout, stderr = client.exec_command('whoami')
print(stdout.read().decode())
client.close()
```

---

## 4. 安装 Docker 环境

服务器初始状态为干净的 Ubuntu 24.04 LTS，需安装完整 Docker 环境。

### 4.1 安装步骤

```bash
# 更新包索引
apt-get update -qq

# 安装前置依赖
apt-get install -y -qq ca-certificates curl

# 添加 Docker 官方 GPG 密钥
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# 添加 Docker APT 仓库
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker 全家桶
apt-get update -qq
apt-get install -y -qq \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

### 4.2 验证安装

```bash
docker --version          # Docker version 29.6.2
docker compose version    # Docker Compose version v5.3.1
```

---

## 5. 配置 Docker 镜像加速器

国内服务器直接访问 Docker Hub 会超时（`dial tcp 162.125.32.9:443: i/o timeout`），必须配置镜像加速。

### 5.1 配置 daemon.json

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
    "registry-mirrors": [
        "https://docker.1ms.run",
        "https://hub.rat.dev"
    ],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
EOF

systemctl daemon-reload
systemctl restart docker
```

### 5.2 验证镜像加速器

```bash
docker info 2>&1 | grep -A5 'Registry Mirrors'
```

**注意**：国内 Docker 镜像源不稳定，以上两个源在部署时可用，如后续失效需替换为其他可用源。

---

## 6. 传输项目文件

### 6.1 打包（本地执行）

由于项目包含 `node_modules`、`.next`、`target` 等大型目录，打包时需排除：

```
排除目录：node_modules, .next, target, .git
排除文件：.env（服务器上单独创建）, deploy.py（含密码）
保留：scripts/*.sh（备份恢复脚本）
```

打包命令（Python 实现）：

```python
import tarfile
from pathlib import Path

exclude_patterns = {"node_modules", ".next", "target"}

def exclude_filter(tarinfo):
    parts = Path(tarinfo.name).parts
    if any(p in exclude_patterns for p in parts):
        return None
    return tarinfo

with tarfile.open(tarball_path, "w:gz") as tar:
    for item in project_dir.iterdir():
        if item.name in exclude_top:
            continue
        tar.add(item, arcname=item.name, filter=exclude_filter)
```

最终 tarball 大小：约 **0.7 MB**（不含 node_modules/.next 约 500MB+）。

### 6.2 上传（Python SFTP）

```python
sftp = client.open_sftp()
sftp.put(str(local_tarball), "/root/monster-homepage/deploy.tar.gz")
sftp.close()
```

### 6.3 解压

```bash
mkdir -p /root/monster-homepage
cd /root/monster-homepage
tar xzf deploy.tar.gz
rm deploy.tar.gz
```

### 6.4 写入 .env

服务器上的 `.env` 使用 SFTP 直接写入（内容来自本地已修改好的生产配置）。

---

## 7. 构建与启动

### 7.1 拉取基础镜像

构建前先单独拉取基础镜像，验证加速器可用并预热缓存：

```bash
docker pull node:22-alpine                          # ~45 MB
docker pull eclipse-temurin:21-jre                  # ~42 MB (JDK runtime)
docker pull maven:3.9.11-eclipse-temurin-21         # ~160 MB (JDK + Maven)
docker pull postgres:18-alpine                      # ~115 MB
docker pull caddy:2.10-alpine                       # ~16 MB
```

**耗时**：通过镜像加速器下载约 10-15 分钟（速度较慢但稳定）。

### 7.2 构建项目镜像

```bash
cd /root/monster-homepage
docker compose build
```

构建流程：

```
Web 镜像 (monster-homepage-web:local):
  deps    → npm ci                  (~32s)
  builder → npm run build           (~22s, Next.js Turbopack)
  runner  → copy standalone output

API 镜像 (monster-homepage-api:local):
  build   → mvn dependency:go-offline  (下载 Maven 依赖)
          → mvn package                (编译打包)
  stage-1 → copy JAR, 创建 app 用户
```

### 7.3 启动所有服务

```bash
cd /root/monster-homepage
docker compose up -d
```

启动顺序（由 `depends_on` + `healthcheck` 保证）：

1. `postgres` 启动 → 健康检查 `pg_isready` 通过
2. `api` 启动 → 健康检查 `/actuator/health` 通过
3. `web` 启动 → 健康检查 `fetch http://localhost:3000` 通过
4. `caddy` 启动 → 监听 80/443 端口

**启动耗时**：约 55 秒（含数据库初始化和 Flyway 迁移）。

### 7.4 遇到并解决的问题

| 问题 | 原因 | 解决 |
|------|------|------|
| Docker Hub 超时 | 国内无法直连 | 配置镜像加速器 `daemon.json` |
| Python 脚本崩溃 | `✓` 字符无法用 GBK 编码 | 使用 `python -X utf8` + `errors='replace'` |
| 构建卡在拉取 Maven 镜像 | 镜像较大（~160MB）且加速器限速 | 耐心等待，单独 `docker pull` 后再 build |
| tarball 创建失败 | Windows 路径含反斜杠、`.next` 内有锁文件 | 改用 `tempfile` 目录、添加递归排除 filter |

---

## 8. 验证部署

### 8.1 检查容器状态

```bash
cd /root/monster-homepage
docker compose ps
```

期望输出：

```
NAME                          STATUS
monster-homepage-postgres-1   Up (healthy)
monster-homepage-api-1        Up (healthy)
monster-homepage-web-1        Up (healthy)
monster-homepage-caddy-1      Up
```

### 8.2 HTTP 验证

```bash
# 首页
curl -s -o /dev/null -w "%{http_code}" http://47.116.45.100
# 期望：200

# 管理后台
curl -s -o /dev/null -w "%{http_code}" http://47.116.45.100/admin
# 期望：200
```

### 8.3 访问地址

| 地址 | 说明 |
|------|------|
| http://47.116.45.100 | 网站首页 |
| http://47.116.45.100/admin | 管理后台登录 |
| http://47.116.45.100/about | 关于页面 |
| http://47.116.45.100/blog | 博客列表 |
| http://47.116.45.100/projects | 项目列表 |
| http://47.116.45.100/resume | 简历 |
| http://47.116.45.100/uses | 工具 |
| http://47.116.45.100/links | 链接 |

---

## 9. 常用运维命令

### 服务管理

```bash
cd /root/monster-homepage

# 重启所有服务
docker compose down && docker compose up -d

# 仅重启 API
docker compose restart api

# 查看实时日志
docker compose logs -f --tail=100

# 查看特定服务日志
docker compose logs api --tail=50

# 进入容器调试
docker compose exec api bash
docker compose exec postgres psql -U monster -d monster_homepage
```

### 重新部署（代码更新后）

```bash
cd /root/monster-homepage

# 1. 拉取最新代码 / 上传新 tarball
# 2. 重新构建
docker compose build --no-cache
# 3. 滚动重启
docker compose up -d
# 4. 清理旧镜像
docker image prune -f
```

### 数据库备份

```bash
# 使用项目自带的备份脚本
bash /root/monster-homepage/scripts/backup.sh

# 或手动导出
docker compose exec -T postgres pg_dump -U monster monster_homepage \
  > /root/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 阿里云安全组配置

确保在阿里云控制台开放以下端口：

| 端口 | 协议 | 用途 |
|------|------|------|
| 22 | TCP | SSH 管理 |
| 80 | TCP | HTTP 网站 |
| 443 | TCP/UDP | HTTPS（配置域名后启用） |

---

## 10. 后续待办

- [ ] **修改服务器 root 密码** — 部署过程中密码在日志中出现过
- [ ] 绑定域名 → 修改 `.env` 中 `DOMAIN`，去掉 `CADDY_SCHEME=http://`，Caddy 自动申请 Let's Encrypt 证书
- [ ] 配置阿里云防火墙/安全组，关闭不必要的端口
- [ ] 设置 `cron` 定时任务执行 `scripts/backup.sh` 自动备份数据库
- [ ] 考虑将 `.env` 中的 `ADMIN_PASSWORD` 改为更强随机密码
- [ ] **删除本地 `scripts/deploy.py`**，其中包含服务器明文密码
- [ ] 将 `scripts/deploy.py` 加入 `.gitignore`，避免误提交
