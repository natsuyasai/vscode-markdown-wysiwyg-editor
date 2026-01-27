import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// ローカルファイルリンク用のカスタムスキーム
export const LOCAL_FILE_SCHEME = "vscode-local-file";

/**
 * Markdown内の相対画像パスをWebView URIに変換する
 * @param markdown Markdownテキスト
 * @param documentDir ドキュメントのディレクトリパス
 * @param webview WebViewインスタンス
 * @returns 変換後のMarkdownテキスト
 */
export function convertImagePathsToWebviewUri(
  markdown: string,
  documentDir: string,
  webview: vscode.Webview
): string {
  // ![alt](path) パターンをマッチ
  // 括弧内に括弧が含まれるケースにも対応
  return markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match: string, alt: string, imagePath: string): string => {
      // URLまたはdata URIの場合はそのまま
      if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:") ||
        imagePath.startsWith("vscode-webview:")
      ) {
        return match;
      }

      // 相対パスを絶対パスに変換
      const absolutePath = path.resolve(documentDir, imagePath);

      // ファイルが存在するか確認（存在しない場合は変換しない）
      if (!fs.existsSync(absolutePath)) {
        return match;
      }

      // WebView URIに変換
      const webviewUri = webview.asWebviewUri(vscode.Uri.file(absolutePath));
      return `![${alt}](${webviewUri.toString()})`;
    }
  );
}

/**
 * HTML内の画像パスをWebView URIに変換する（<img src="...">形式）
 * @param html HTMLテキスト
 * @param documentDir ドキュメントのディレクトリパス
 * @param webview WebViewインスタンス
 * @returns 変換後のHTMLテキスト
 */
export function convertHtmlImagePathsToWebviewUri(
  html: string,
  documentDir: string,
  webview: vscode.Webview
): string {
  // <img src="..."> パターンをマッチ
  return html.replace(
    /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
    (match: string, before: string, imagePath: string, after: string): string => {
      // URLまたはdata URIの場合はそのまま
      if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:") ||
        imagePath.startsWith("vscode-webview:")
      ) {
        return match;
      }

      // 相対パスを絶対パスに変換
      const absolutePath = path.resolve(documentDir, imagePath);

      // ファイルが存在するか確認（存在しない場合は変換しない）
      if (!fs.existsSync(absolutePath)) {
        return match;
      }

      // WebView URIに変換
      const webviewUri = webview.asWebviewUri(vscode.Uri.file(absolutePath));
      return `<img ${before}src="${webviewUri.toString()}"${after}>`;
    }
  );
}

/**
 * Markdown内のローカルファイルリンクをカスタムスキームURIに変換する
 * アンカーリンク（#で始まる）やHTTP(S) URLはそのまま
 * @param markdown Markdownテキスト
 * @param documentDir ドキュメントのディレクトリパス
 * @returns 変換後のMarkdownテキスト
 */
export function convertLinkPathsToLocalFileUri(markdown: string, documentDir: string): string {
  // [text](path) パターンをマッチ（画像リンク ![...] は除外）
  // 否定先読みで画像リンクを除外
  return markdown.replace(
    /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g,
    (match: string, text: string, linkPath: string): string => {
      // アンカーリンク（#で始まる）の場合はそのまま
      if (linkPath.startsWith("#")) {
        return match;
      }

      // URL（http://, https://, mailto:, etc.）の場合はそのまま
      if (
        linkPath.startsWith("http://") ||
        linkPath.startsWith("https://") ||
        linkPath.startsWith("mailto:") ||
        linkPath.startsWith("tel:") ||
        linkPath.startsWith(LOCAL_FILE_SCHEME + ":")
      ) {
        return match;
      }

      // アンカー部分を分離（例: file.md#section → file.md と #section）
      const [filePath, anchor] = linkPath.split("#");
      const anchorPart = anchor ? `#${anchor}` : "";

      // ファイルパスが空の場合（純粋なアンカーリンク）
      if (!filePath) {
        return match;
      }

      // 相対パスを絶対パスに変換
      const absolutePath = path.resolve(documentDir, filePath);

      // ファイルが存在するか確認（存在しない場合は変換しない）
      if (!fs.existsSync(absolutePath)) {
        return match;
      }

      // カスタムスキームURIに変換（パスをエンコード）
      const encodedPath = encodeURIComponent(absolutePath);
      return `[${text}](${LOCAL_FILE_SCHEME}:${encodedPath}${anchorPart})`;
    }
  );
}

/**
 * 画像パスとリンクパスの両方を変換する
 * @param markdown Markdownテキスト
 * @param documentDir ドキュメントのディレクトリパス
 * @param webview WebViewインスタンス
 * @returns 変換後のMarkdownテキスト
 */
export function convertAllPathsToWebviewUri(
  markdown: string,
  documentDir: string,
  webview: vscode.Webview
): string {
  // まず画像パスを変換
  let result = convertImagePathsToWebviewUri(markdown, documentDir, webview);
  // 次にリンクパスを変換
  result = convertLinkPathsToLocalFileUri(result, documentDir);
  return result;
}
