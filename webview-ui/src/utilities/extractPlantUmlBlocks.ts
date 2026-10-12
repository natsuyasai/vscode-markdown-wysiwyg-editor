import { extractFencedBlocks } from "./extractMermaidBlocks";

/** Markdown文字列からPlantUMLブロックの中身を出現順に抽出する */
export function extractPlantUmlBlocks(markdown: string): string[] {
  return extractFencedBlocks(markdown, "plantuml");
}
