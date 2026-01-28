/**
 * Mermaidダイアグラムのテーマカラー定義
 * diagramPreview.ts から抽出した定数
 */

export type ThemeKind = "light" | "dark";

/** Mermaidのテーマ名 */
export const MERMAID_THEME = {
  light: "default",
  dark: "dark",
} as const;

/** ダークテーマ用のMermaidカラー設定 */
export const MERMAID_DARK_COLORS = {
  // 基本色
  primaryTextColor: "#e0e0e0",
  textColor: "#e0e0e0",
  primaryColor: "#3d3d3d",
  primaryBorderColor: "#6a6a6a",
  lineColor: "#a0a0a0",
  secondaryColor: "#4a4a4a",
  tertiaryColor: "#2d2d2d",
  background: "#1e1e1e",
  mainBkg: "#3d3d3d",
  nodeBorder: "#6a6a6a",
  clusterBkg: "#2d2d2d",
  titleColor: "#e0e0e0",
  // シーケンス図用
  actorBkg: "#3d3d3d",
  actorBorder: "#6a6a6a",
  actorTextColor: "#e0e0e0",
  actorLineColor: "#a0a0a0",
  signalColor: "#a0a0a0",
  signalTextColor: "#e0e0e0",
  labelTextColor: "#e0e0e0",
  labelBoxBkgColor: "#3d3d3d",
  labelBoxBorderColor: "#6a6a6a",
  loopTextColor: "#e0e0e0",
  noteBkgColor: "#4a4a4a",
  noteTextColor: "#e0e0e0",
  noteBorderColor: "#6a6a6a",
  activationBkgColor: "#4a4a4a",
  activationBorderColor: "#6a6a6a",
  sequenceNumberColor: "#e0e0e0",
} as const;

/** ライトテーマ用のMermaidカラー設定 */
export const MERMAID_LIGHT_COLORS = {
  primaryTextColor: "#333333",
  textColor: "#333333",
  primaryColor: "#ECECFF",
  primaryBorderColor: "#9370DB",
  lineColor: "#333333",
} as const;

/**
 * テーマに応じたMermaidカラー設定を取得する
 */
export function getMermaidThemeColors(theme: ThemeKind) {
  return theme === "dark" ? MERMAID_DARK_COLORS : MERMAID_LIGHT_COLORS;
}

/** SVG内で置換するカラーマッピング（ダークテーマ用） */
export const SVG_COLOR_REPLACEMENTS = [
  { from: /fill="#eaeaea"/g, to: 'fill="#3d3d3d"' },
  { from: /fill="#EAEAEA"/g, to: 'fill="#3d3d3d"' },
  { from: /stroke="#666"/g, to: 'stroke="#6a6a6a"' },
] as const;
