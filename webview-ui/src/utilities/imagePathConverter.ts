// ローカルファイルリンク用のカスタムスキーム（Extension側と同じ値）
// 表示用URIから元のパス表記への復元は拡張機能側（src/util/imagePathConverter.ts）が行う
export const LOCAL_FILE_SCHEME = "vscode-local-file";

/**
 * blob URL形式の画像参照を除去する（セーフティネット）
 * blob:vscode-webview:// のようなURLはローカルファイルとして保存できないため、
 * 保存時に除去して不正なURLがファイルに残らないようにする
 * @param markdown Markdownテキスト
 * @returns blob URLの画像参照が除去されたMarkdownテキスト
 */
export function removeBlobImageReferences(markdown: string): string {
  // ![alt](blob:...) パターンを除去（行ごと削除して空行にならないよう配慮）
  return markdown.replace(/!\[[^\]]*\]\(blob:[^)]+\)\n?/g, "");
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
  const [encodedPathWithQuery, anchor] = pathPart.split("#");
  // 同じファイルの別表記を区別するためのクエリ（拡張機能側で付与）は取り除く
  const encodedPath = encodedPathWithQuery.split("?")[0];

  return {
    filePath: decodeURIComponent(encodedPath),
    anchor: anchor ? `#${anchor}` : undefined,
  };
}
