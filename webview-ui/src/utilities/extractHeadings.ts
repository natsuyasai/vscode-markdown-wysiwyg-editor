export type HeadingItem = {
  level: number;
  text: string;
  id: string;
};

export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u3041-\u3096\u30a0-\u30ff\u4e00-\u9faf\uac00-\ud7af-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+$/, "");
}

export function extractHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const idCounts = new Map<string, number>();

  // コードブロックを除去してから見出しを抽出
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = regex.exec(withoutCodeBlocks)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const baseId = generateHeadingId(text);
    const count = idCounts.get(baseId) ?? 0;
    const id = count > 0 ? `${baseId}-${count}` : baseId;
    idCounts.set(baseId, count + 1);

    headings.push({ level, text, id });
  }

  return headings;
}
