# 知识目录折叠与 AI 内容辅助

- 日期：2026-07-23
- 类型：功能、后台管理、Docker 与文档

## 改动内容

1. 前台知识目录的父节点改为独立 Chevron 按钮控制展开和收起，标题链接继续负责打开笔记；知识库首页默认收起，详情页默认展开当前路径。
2. 增加 OpenAI 兼容的 AI 配置、连接测试、摘要生成和博客正文生成管理员接口。
3. 文章、笔记和项目编辑器支持根据正文生成摘要；博客文章支持根据提示词生成 Markdown，预览后替换或追加正文。
4. 网站设置新增 Base URL、Model、API Key、连接测试和清除 Key 控件，后台响应不会回显 Key。
5. Caddy 宿主机端口改为环境变量，本机 Docker 使用 `http://localhost:8088`，Web 内部 3000 不映射到宿主机。
6. README、部署手册和环境变量模板补充 AI 配置、端口和安全说明。

## 接口

- `GET /api/admin/ai/settings`
- `PATCH /api/admin/ai/settings`
- `POST /api/admin/ai/test`
- `POST /api/admin/ai/summary`
- `POST /api/admin/ai/post-body`

接口均沿用管理员 Session 和 CSRF 保护。Base URL 仅接受 HTTP/HTTPS，未包含 `/chat/completions` 时由后端自动追加。

## 安全说明

按本次产品选择，AI API Key 明文保存到 `site_settings`。API 响应、前端状态回读和审计日志不会包含 Key，但数据库和数据库备份会包含该值，需要严格限制访问并定期轮换。

## 验证

- `mvn test -q`
- `npm run lint`
- `npm run build`
- `docker compose config --quiet`
- Docker Desktop 构建并启动完整服务
- `http://localhost:8088/api/health` 返回 HTTP 200
- 未登录访问 AI 管理接口返回 HTTP 401
