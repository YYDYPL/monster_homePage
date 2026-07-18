import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabWorkbench } from "@/components/lab-workbench";
import { isToolId, labTools } from "@/lib/lab-tools";
import { PageHero } from "@/components/ui";

export function generateStaticParams() {
  return labTools.map(tool => ({ tool: tool.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const current = labTools.find(item => item.id === tool);
  return current ? {
    title: current.name,
    description: `${current.description}。所有数据只在浏览器本地处理。`,
  } : { title: "工具不存在" };
}

export default async function LabToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!isToolId(tool)) notFound();
  const current = labTools.find(item => item.id === tool)!;
  return <>
    <PageHero eyebrow="Browser lab" title={current.name} description={`${current.description}。输入不会上传到服务器。`} />
    <section className="list-section">
      <div className="container"><LabWorkbench initialTool={tool} /></div>
    </section>
  </>;
}