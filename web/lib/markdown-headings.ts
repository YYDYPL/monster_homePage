export type MarkdownHeading = {
  id: string;
  text: string;
  level: number;
};

export function cleanMarkdownHeading(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, "$1")
    .trim();
}

export function slugifyHeading(value: string): string {
  const slug = cleanMarkdownHeading(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

export function createHeadingIdGenerator() {
  const counts = new Map<string, number>();
  return (text: string) => {
    const base = slugifyHeading(text);
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}

export function extractHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const nextId = createHeadingIdGenerator();
  let fence: { marker: string; size: number } | null = null;

  for (const line of content.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      const size = fenceMatch[1].length;
      if (!fence) fence = { marker, size };
      else if (fence.marker === marker && size >= fence.size) fence = null;
      continue;
    }
    if (fence) continue;

    const match = line.match(/^\s{0,3}(#{2,4})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = cleanMarkdownHeading(match[2]);
    if (!text) continue;
    headings.push({ id: nextId(text), text, level: match[1].length });
  }

  return headings;
}
