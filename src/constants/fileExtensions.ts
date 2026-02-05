/**
 * ファイル拡張子とMIMEタイプの定数定義
 * imageEmbedder.ts などで共通使用
 */

/** サポートする画像拡張子 */
export const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
]);

/** 画像拡張子とMIMEタイプのマッピング */
export const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** デフォルトのMIMEタイプ */
export const DEFAULT_MIME_TYPE = "application/octet-stream";

/** URLプロトコルのプレフィックス（外部リソース判定用） */
export const EXTERNAL_URL_PREFIXES = ["http://", "https://", "data:", "vscode-webview:"] as const;

/** Markdown拡張子 */
export const MARKDOWN_EXTENSION = ".md";
