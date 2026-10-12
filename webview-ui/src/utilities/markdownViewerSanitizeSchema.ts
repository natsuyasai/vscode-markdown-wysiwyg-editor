import { defaultSchema, type Options } from "rehype-sanitize";
import { LOCAL_FILE_SCHEME } from "./imagePathConverter";

const VSCODE_WEBVIEW_SCHEME = "vscode-webview";

/**
 * Readonly表示でMarkdown内の生HTMLを無害化するスキーマ
 *
 * 基本はGitHubと同じ許可リスト（rehype-sanitizeの既定）。このアプリの表示に必要な分だけ広げる。
 * - class / style: 生HTMLの見た目（既存の表示を維持する）
 * - id: 見出しIDをアウトラインのリンク先と一致させるため、接頭辞は付けない
 * - href / src: 拡張機能が使うスキームを許可する
 */
export const markdownViewerSanitizeSchema: Options = {
  ...defaultSchema,
  clobber: [],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), LOCAL_FILE_SCHEME, VSCODE_WEBVIEW_SCHEME],
    src: [...(defaultSchema.protocols?.src ?? []), LOCAL_FILE_SCHEME, VSCODE_WEBVIEW_SCHEME],
  },
};
