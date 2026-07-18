import type { Metadata } from "next";
import Link from "next/link";
import { labTools } from "@/lib/lab-tools";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "在线实验室",
  description: "JSON、Base64、正则、时间戳、JWT、Diff 等只在浏览器本地运行的开发工具。",
};

export default function LabPage() {
  return <>
    <PageHero
      eyebrow="Browser lab"
      title="在线实验室"
      description="一组轻量、无上传、开箱即用的开发者工具。所有输入默认只在你的浏览器中处理。"
    />
    <section className="list-section">
      <div className="container">
        <div className="content-grid three">
          {labTools.map((tool, index) => <Link className="simple-card link-card lab-tool-card" href={`/lab/${tool.id}`} key={tool.id}>
            <span className="number">{String(index + 1).padStart(2, "0")}</span>
            <div className="lab-tool-icon">{tool.icon}</div>
            <h2>{tool.name}</h2>
            <p>{tool.description}</p>
            <strong>打开工具 →</strong>
          </Link>)}
        </div>
      </div>
    </section>
  </>;
}