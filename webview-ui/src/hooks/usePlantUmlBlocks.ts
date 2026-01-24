import { useMemo } from "react";

export interface PlantUmlBlock {
  id: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Markdownテキストからplantumlコードブロックを検出する
 * @param markdown Markdownテキスト
 * @returns 検出されたPlantUMLブロックの配列
 */
export function usePlantUmlBlocks(markdown: string): PlantUmlBlock[] {
  return useMemo(() => {
    const blocks: PlantUmlBlock[] = [];
    // plantumlコードブロックを検出する正規表現
    const plantUmlRegex = /```plantuml\s*\n([\s\S]*?)```/g;

    let match;
    let blockIndex = 0;

    while ((match = plantUmlRegex.exec(markdown)) !== null) {
      blocks.push({
        id: `plantuml-block-${String(blockIndex)}`,
        code: match[1].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
      blockIndex++;
    }

    return blocks;
  }, [markdown]);
}
