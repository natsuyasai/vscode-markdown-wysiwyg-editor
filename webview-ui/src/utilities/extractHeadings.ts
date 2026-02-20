// webview-ui/src/utilities/extractHeadings.ts
export type HeadingItem = {
  level: number;
  text: string;
  id: string;
};

export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u3000-\u9fff\u4e00-\u9faf\uac00-\ud7af-]/g, "")
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
    let id = generateHeadingId(text);

    const count = idCounts.get(id) ?? 0;
    if (count > 0) {
      id = `${id}-${count}`;
    }
    idCounts.set(generateHeadingId(text), count + 1);

    headings.push({ level, text, id });
  }

  return headings;
}
