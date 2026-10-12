import mermaid from "mermaid";
import { getMermaidThemeColors, MERMAID_THEME, type ThemeKind } from "../constants/themeColors";

/**
 * Mermaidをテーマに応じた設定で初期化する
 *
 * WebView環境でテキストが正しく表示されるよう、
 * htmlLabelsをfalseに設定し、SVGテキスト要素を使用する。
 * securityLevelはstrictに固定し、図の定義からのスクリプト実行・クリックコールバックを許さない
 */
export function initializeMermaid(theme: ThemeKind): void {
  const mermaidTheme = MERMAID_THEME[theme];
  const themeColors = getMermaidThemeColors(theme);

  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
    securityLevel: "strict",
    htmlLabels: false,
    flowchart: {
      htmlLabels: false,
    },
    sequence: {
      actorFontFamily: "inherit",
      messageFontFamily: "inherit",
      noteFontFamily: "inherit",
    },
    themeVariables: themeColors,
  });
}
