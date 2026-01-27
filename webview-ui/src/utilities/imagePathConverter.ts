// ローカルファイルリンク用のカスタムスキーム（Extension側と同じ値）
export const LOCAL_FILE_SCHEME = "vscode-local-file";

/**
 * WebView URI形式の画像パスを相対パスに戻す
 * @param markdown Markdownテキスト
 * @param baseUri WebView URI形式のベースURI
 * @returns 相対パスに戻されたMarkdownテキスト
 */
export function revertImagePathsFromWebviewUri(markdown: string, baseUri: string): string {
  if (!baseUri) {
    return markdown;
  }

  // baseUriの末尾にスラッシュがない場合は追加
  const normalizedBaseUri = baseUri.endsWith("/") ? baseUri : `${baseUri}/`;

  // ![alt](baseUri/path) パターンを ![alt](path) に戻す
  // baseUriに含まれる特殊文字をエスケープ
  const escapedBaseUri = normalizedBaseUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedBaseUri}([^)]+)\\)`, "g");

  return markdown.replace(regex, "![$1]($2)");
}

/**
 * HTML内のWebView URI形式の画像パスを相対パスに戻す
 * @param html HTMLテキスト
 * @param baseUri WebView URI形式のベースURI
 * @returns 相対パスに戻されたHTMLテキスト
 */
export function revertHtmlImagePathsFromWebviewUri(html: string, baseUri: string): string {
  if (!baseUri) {
    return html;
  }

  // baseUriの末尾にスラッシュがない場合は追加
  const normalizedBaseUri = baseUri.endsWith("/") ? baseUri : `${baseUri}/`;

  // <img src="baseUri/path"> パターンを <img src="path"> に戻す
  const escapedBaseUri = normalizedBaseUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(<img\\s+[^>]*?src=["'])${escapedBaseUri}([^"']+)(["'][^>]*>)`, "gi");

  return html.replace(regex, "$1$2$3");
}

/**
 * カスタムスキームURIのリンクパスを相対パスに戻す
 * @param markdown Markdownテキスト
 * @param documentDir ドキュメントのディレクトリパス（相対パス計算用）
 * @returns 相対パスに戻されたMarkdownテキスト
 */
export function revertLinkPathsFromLocalFileUri(markdown: string, documentDir: string): string {
  // [text](vscode-local-file:encodedPath) パターンを [text](relativePath) に戻す
  // 否定後読き (?<!!) で画像リンク (![...]) を除外
  const regex = new RegExp(
    `(?<!!)\\[([^\\]]*)\\]\\(${LOCAL_FILE_SCHEME}:([^)#]+)(#[^)]*)?\\)`,
    "g"
  );

  return markdown.replace(regex, (match: string, text: string, encodedPath: string, anchor?: string): string => {
    // パスをデコード
    const absolutePath = decodeURIComponent(encodedPath);

    // 絶対パスから相対パスを計算
    const relativePath = getRelativePath(documentDir, absolutePath);

    return `[${text}](${relativePath}${anchor ?? ""})`;
  });
}

/**
 * 絶対パスから相対パスを計算する
 * @param fromDir 基準となるディレクトリ
 * @param toPath 対象のファイルパス
 * @returns 相対パス
 */
function getRelativePath(fromDir: string, toPath: string): string {
  // パスを正規化（Windowsのバックスラッシュをスラッシュに変換）
  const normalizedFromDir = fromDir.replace(/\\/g, "/");
  const normalizedToPath = toPath.replace(/\\/g, "/");

  // 同じディレクトリの場合
  const fromParts = normalizedFromDir.split("/").filter(Boolean);
  const toParts = normalizedToPath.split("/").filter(Boolean);

  // 共通のプレフィックスを見つける
  let commonLength = 0;
  for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }

  // 戻る階層数
  const upCount = fromParts.length - commonLength;

  // 相対パスを構築
  const relativeParts: string[] = [];
  for (let i = 0; i < upCount; i++) {
    relativeParts.push("..");
  }
  for (let i = commonLength; i < toParts.length; i++) {
    relativeParts.push(toParts[i]);
  }

  return relativeParts.join("/") || ".";
}

/**
 * 画像パスとリンクパスの両方を相対パスに戻す
 * @param markdown Markdownテキスト
 * @param baseUri WebView URI形式のベースURI
 * @param documentDir ドキュメントのディレクトリパス
 * @returns 相対パスに戻されたMarkdownテキスト
 */
export function revertAllPathsFromWebviewUri(
  markdown: string,
  baseUri: string,
  documentDir: string
): string {
  // まず画像パスを戻す
  let result = revertImagePathsFromWebviewUri(markdown, baseUri);
  // 次にリンクパスを戻す
  result = revertLinkPathsFromLocalFileUri(result, documentDir);
  return result;
}

/**
 * カスタムスキームURIからファイルパスとアンカーを抽出する
 * @param uri カスタムスキームURI
 * @returns ファイルパスとアンカー、またはnull（無効なURIの場合）
 */
export function parseLocalFileUri(uri: string): { filePath: string; anchor?: string } | null {
  const schemePrefix = `${LOCAL_FILE_SCHEME}:`;
  if (!uri.startsWith(schemePrefix)) {
    return null;
  }

  const pathPart = uri.slice(schemePrefix.length);
  const [encodedPath, anchor] = pathPart.split("#");

  return {
    filePath: decodeURIComponent(encodedPath),
    anchor: anchor ? `#${anchor}` : undefined,
  };
}
