import { useMemo } from "react";

export interface MermaidBlock {
  id: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Markdownテキストからmermaidコードブロックを検出する
 * @param markdown Markdownテキスト
 * @returns 検出されたMermaidブロックの配列
 */
export function useMermaidBlocks(markdown: string): MermaidBlock[] {
  return useMemo(() => {
    const blocks: MermaidBlock[] = [];
    // mermaidコードブロックを検出する正規表現
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;

    let match;
    let blockIndex = 0;

    while ((match = mermaidRegex.exec(markdown)) !== null) {
      blocks.push({
        id: `mermaid-block-${String(blockIndex)}`,
        code: match[1].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
      blockIndex++;
    }

    return blocks;
  }, [markdown]);
}
