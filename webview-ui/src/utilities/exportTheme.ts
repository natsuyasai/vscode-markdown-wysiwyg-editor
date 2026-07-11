import type { ThemeSetting } from "@message/messageTypeToExtention";
import type { ThemeKind } from "@/constants/themeColors";

/**
 * ユーザーのテーマ設定を考慮してエクスポート用テーマを解決する（WebView版）。
 * "auto"の場合は現在のアクティブテーマ、"light"/"dark"の場合はその値を返す。
 *
 * 拡張機能側 `resolveExportTheme`（src/editor/MessageHandler.ts）と同等のロジック。
 * WebViewが送信するMermaid画像のテーマと、拡張機能が生成するHTML全体のテーマを一致させるために使用する。
 */
export function resolveExportTheme(themeSetting: ThemeSetting, activeTheme: ThemeKind): ThemeKind {
  if (themeSetting === "auto") {
    return activeTheme;
  }
  return themeSetting;
}
