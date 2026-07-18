export type ToolId = "json" | "base64" | "url" | "regex" | "timestamp" | "uuid" | "markdown" | "jwt" | "diff" | "cron";

export const labTools: { id: ToolId; name: string; icon: string; description: string }[] = [
  { id: "json", name: "JSON 格式化", icon: "{}", description: "格式化、压缩并校验 JSON 数据" },
  { id: "base64", name: "Base64", icon: "64", description: "UTF-8 文本的 Base64 编解码" },
  { id: "url", name: "URL 编解码", icon: "%", description: "安全编码或还原 URL 组件" },
  { id: "regex", name: "正则测试", icon: ".*", description: "测试 JavaScript 正则表达式" },
  { id: "timestamp", name: "时间戳转换", icon: "T", description: "时间戳与本地时间互相转换" },
  { id: "uuid", name: "UUID 生成", icon: "#", description: "批量生成 UUID v4" },
  { id: "markdown", name: "Markdown 预览", icon: "M↓", description: "实时预览 Markdown 文档" },
  { id: "jwt", name: "JWT 解析", icon: "J", description: "本地解析 JWT Header 与 Payload" },
  { id: "diff", name: "文本 Diff", icon: "±", description: "逐行比较两段文本" },
  { id: "cron", name: "Cron 查看", icon: "◷", description: "解释常见的五段 Cron 表达式" },
];

export function isToolId(value: string): value is ToolId {
  return labTools.some(tool => tool.id === value);
}